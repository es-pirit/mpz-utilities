import { Class } from "@/utils/mvvm/Decorators";

export interface TrapThisType<T extends object = object> {
    /** Return its proxy or value of the next nested child */
    nest(target?: object): unknown;
    path: PropertyKey[];
    root: T;
    meta?: {
        descriptor: PropertyDescriptor | null,
        enumerable: boolean,
        modifiable?: boolean | null,
    };
}

interface DeepProxyHandler<T extends object> {
    getPrototypeOf? (this: TrapThisType<T>, target: object): object | null;
    setPrototypeOf? (this: TrapThisType<T>, target: object, v: any): boolean;
    isExtensible? (this: TrapThisType<T>, target: object): boolean;
    preventExtensions? (this: TrapThisType<T>, target: object): boolean;
    getOwnPropertyDescriptor? (this: TrapThisType<T>, target: object, p: PropertyKey): PropertyDescriptor | undefined;
    has? (this: TrapThisType<T>, target: object, p: PropertyKey): boolean;
    get? (this: TrapThisType<T>, target: object, p: PropertyKey, receiver: any): any;
    set? (this: TrapThisType<T>, target: object, p: PropertyKey, value: any, receiver: any): boolean;
    deleteProperty? (this: TrapThisType<T>, target: object, p: PropertyKey): boolean;
    defineProperty? (this: TrapThisType<T>, target: object, p: PropertyKey, attributes: PropertyDescriptor): boolean;
    enumerate? (this: TrapThisType<T>, target: object): PropertyKey[];
    ownKeys? (this: TrapThisType<T>, target: object): PropertyKey[];
    apply? (this: TrapThisType<T>, target: object, thisArg: any, argArray?: any): any;
    construct? (this: TrapThisType<T>, target: object, argArray: any, newTarget?: any): object;
}

export type DeepProxies = {
    _deepProxies: { proxy: DeepProxy<object>, revoke: () => void }[],
};

/** Define which are traps that can get the property name */
const PropTraps = ["has", "get", "set", "deleteProperty", "defineProperty", "getOwnPropertyDescriptor"];

class DeepProxy<T extends object> {
    static readonly ignores = [] as Class[];

    /** The original proxy */
    private _origin: object & DeepProxies;

    /** The deep proxies pool */
    private _proxiesPool: { target: object, proxy: object, revoke: () => void }[] = [];

    constructor(public readonly target: T & Partial<DeepProxies>, private readonly handler: DeepProxyHandler<T>, public readonly name?: string, private readonly ignores: string[] = []) {
        handler.get || (handler.get = function () { return this.nest() });

        if (!target._deepProxies)
            Object.defineProperty(target, "_deepProxies", { value: [], configurable: true });

        const { proxy, revoke } = this.createProxy(target);
        const deepProxies = target._deepProxies!;
        deepProxies.push({
            proxy: this,
            revoke: () => {
                this._proxiesPool.forEach(p => p.revoke());
                this._proxiesPool.length = 0;

                // Remove the relative data of DeepProxy before revoking itself
                deepProxies.splice(deepProxies.findIndex(v => v.proxy === this), 1);
                if (deepProxies.length <= 0)
                    delete target._deepProxies;
                revoke();
            },
        });
        return (this._origin = proxy as any) as any;
    }

    private createProxy(target: object, path: PropertyKey[] = []) {
        const modifiedHandler: ProxyHandler<object> = {};
        const traps = Object.keys(this.handler) as (keyof ProxyHandler<object>)[];

        traps.forEach(trap => {
            const trapFunc = this.handler[trap] as Function;
            const context: Partial<TrapThisType<T>> = { root: this.target, path };

            // Update context for this trap
            switch (trap) {
                case "get":
                case "set": 
                case "has":
                case "defineProperty":
                case "getOwnPropertyDescriptor": {
                    modifiedHandler[trap] = (target: any, p: PropertyKey, ...args: any[]) => {
                        if (isRevokedProxy(target)) return undefined;

                        // Support that `Array[-n] = Array[Array.length - n]`
                        Array.isArray(target) && (typeof p !== "symbol") && !isNaN(p as number) && (+p < 0) && (p = `${ +p + target.length }`);

                        const { enumerable, modifiable } = context.meta = this.getMeta(target, p);
                        const receiver = (trap === "get" ? args[0] : (trap === "set" ? args[1] : undefined));

                        if (enumerable && modifiable) {
                            context.nest = (nestedTarget?: object) => {
                                nestedTarget || (nestedTarget = receiver ? Reflect.get(target, p, receiver) : target[p]);

                                if (isObject(nestedTarget)) {
                                    let info = this._proxiesPool.find(p => p.target === nestedTarget);

                                    info || (this._proxiesPool.push(info = { ...this.createProxy(nestedTarget!, p ? path.concat(p) : path), target: nestedTarget! }));
                                    return info.proxy;
                                }
                                return nestedTarget;
                            };
                        }
                        else {
                            context.nest = (nestedTarget?: object) => {
                                return nestedTarget || Reflect.get(target, p, receiver);
                            };
                        }
                        return trapFunc.call(context, target, p, ...args);
                    };
                    break;
                }
                case "deleteProperty": {
                    modifiedHandler[trap] = (target: any, p) => {
                        const { enumerable, modifiable } = context.meta = this.getMeta(target, p);

                        if (enumerable && modifiable) {
                            context.nest = (nestedTarget?: object) => {
                                nestedTarget || (nestedTarget = target[p]);

                                if (isObject(nestedTarget))
                                    DeepProxy.revokeChildren(this._origin, nestedTarget!, true);
                                return nestedTarget;
                            };
                        }
                        else {
                            context.nest = (nestedTarget?: object) => {
                                return nestedTarget || target[p];
                            };
                        }
                        return trapFunc.call(context, target, p);
                    };
                    break;
                }
                default: {
                    modifiedHandler[trap] = (target: any, ...args: any[]) => {
                        context.nest = (nestedTarget?: object) => {
                            return nestedTarget || target;
                        };
                        return trapFunc.call(context, target, ...args);
                    };
                }
            }
        });
        return Proxy.revocable(target, modifiedHandler);
    }

    private getMeta(target: object, p: PropertyKey) {
        const descriptor = getPropertyDescriptor(target, p);
        const enumerable = ["string", "number"].includes(typeof p) && (Array.isArray(target) ? !isNaN(p as number) : !["_deepProxies", "constructor", "prototype", ...this.ignores].includes(p as string));
        const modifiable = descriptor && (descriptor.writable || descriptor.configurable);

        return { descriptor, enumerable, modifiable };
    }

    static revoke<T extends object>(proxy: T & DeepProxies, name?: string) {
        proxy._deepProxies?.find(v => name ? (v.proxy.name === name) : (v.proxy._origin === proxy))?.revoke();
    }

    static revokeChildren<T extends object>(proxy: T & DeepProxies, child: { [key in PropertyKey]: any }, deep = false) {
        const pool = proxy._deepProxies?.find(v => v.proxy._origin === proxy)?.proxy._proxiesPool;
        if (pool) {
            deep && Object.values(child).forEach(p => isObject(p) && DeepProxy.revokeChildren(proxy, p, true));
            pool.splice(pool.findIndex(v => v.proxy === child || v.target === child), 1)[0]?.revoke();
        }
    }

    static revokeAll<T extends object>(target: T & Partial<DeepProxies>) {
        try {
            while (target._deepProxies && target._deepProxies.length > 0) {
                target._deepProxies[0].revoke();
            }
        }
        catch {}
    }

    static getTarget<T extends object>(proxy: T & DeepProxies) {
        return proxy._deepProxies?.find(v => v.proxy._origin === proxy)?.proxy.target;
    }
}

export default DeepProxy as {
    readonly ignores: Class[];

    new <T extends object>(target: T, handler: DeepProxyHandler<T>, name?: string, ignores?: string[]): T & DeepProxies;

    /** Revoke the specific deep proxy by itself */
    revoke<T extends object>(proxy: T & DeepProxies): void;
    /** Revoke the specific deep proxy by the name */
    revoke<T extends object>(proxy: T, name: string): void;

    /**
     * Revoke the one or more children proxies of the specific deep proxy
     * @param child A proxy or target of the specific deep proxy's any child
     * @param deep Determine whether to revoke all its children based on `child` property
     */
    revokeChildren<T extends object>(proxy: T & DeepProxies, child: object | Function, deep?: boolean): void;

    /** Revoke all the deep proxies of the specific target */
    revokeAll<T extends object>(target: T & Partial<DeepProxies>): void;

    /** Get the target of the specific deep proxy */
    getTarget<T extends object>(proxy: T & DeepProxies): T;
}

// #[Methods] ---------- + ---------- + ----------
export function getPropertyDescriptor(obj: any, prop: string | number | symbol): PropertyDescriptor | null {
    return obj && (Object.getOwnPropertyDescriptor(obj, prop) || getPropertyDescriptor(Object.getPrototypeOf(obj), prop));
}

function isObject(target: any) {
    if (target && typeof target === "object" && !isRevokedProxy(target))
        return !DeepProxy.ignores.some(clazz => target instanceof clazz);
    else return false;
}

function isRevokedProxy(target: object) {
    try {
        Symbol() in target;
        return false;
    }
    catch {
        return true;
    }
}
