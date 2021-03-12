import { Class, ClassDecorator, Debounce } from "@/utils/mvvm/Decorators";
import DeepProxy, { DeepProxies, TrapThisType } from "@/utils/mvvm/DeepProxy";

type ModuleOptions = {
    /** The name for registering the Model, it will be useful to find out this Model through ViewModel */
    name: string,
} & ViewModuleOptions;
type ViewModuleOptions = {
    /** Filter the properties by name to trace the change of these properties (default: `/^[^_]/`, only trace non-underscore-prefix properties) */
    propFilter?: RegExp,
    /** Filter the getters by name to cache the change of these getters (default: `/^[^_]/`, only cache non-underscore-prefix properties) */
    cacheFilter?: RegExp,
    /** The Ignored properties to DeepProxy */
    ignores?: string[],
};
type WatchOptions = {
    /** Check if these paths will be deeply traced (default: `true`)  */
    deep?: boolean,
    /** The priority to handle the callback, it will be helpful when there are tons of same paths (default: `0`) */
    priority?: number,
    /** Check if the callback will be triggered with debounce method in the specific milliseconds (default: `0`) */
    debounce?: false | number,
    /** Indicate if run this method immediately once the scene is enabled */
    immediate?: boolean,
};

export type Watcher = { proto: Base<Dict>, path: string, prop: PropertyKey } & WatchOptions;
export type Watchers = { models: Watcher[], locals: Watcher[] };
type Module = { prototype: Class, target?: object };
type GetterCache = { target: object, prop: PropertyKey, path: string, value?: any, reflections: string[] };

const viewModels: ViewModel[] = [];
const modules: Dict<Module> = {};
const uncaches: { target: Base<Dict>, prop: PropertyKey }[] = [];

const defaultFilter = /^[^_]/;

export const models: Dict<Model> = {};

// #[Decorators] ---------- + ---------- + ----------
/** Track the properties/data of the Model by DeepProxy */
export function Module(options: ModuleOptions): ClassDecorator<Base<Dict>> {
    options.propFilter || (options.propFilter = defaultFilter);
    options.cacheFilter || (options.cacheFilter = defaultFilter);

    return target => {
        const prototype = class extends target {
            constructor(...args: any[]) {
                super(...args);

                return this._proxy = new DeepProxy(this, {
                    get(target, prop, receiver) {
                        return getter.call(this, options, target, prop, receiver);
                    },
                    set(target, prop, value, receiver) {
                        return setter.call(this, options, target, prop, value, receiver, Model);
                    },
                    deleteProperty(target, prop) {
                        setter.call(this, options, target, prop, undefined, undefined, Model);
                        return Reflect.deleteProperty(target, prop);
                    },
                }, options.name, options.ignores);
            }
        };

        const module = modules[options.name] = { prototype } as Module;
        Object.defineProperty(models, options.name, {
            get() {
                return module.target || (module.target = new prototype());
            },
        });
        return prototype;
    };
}

/** Track the properties/data of the ViewModel by DeepProxy */
export function ViewModule(options: ViewModuleOptions = {}): ClassDecorator<Base<Dict>> {
    options.propFilter || (options.propFilter = defaultFilter);
    options.cacheFilter || (options.cacheFilter = defaultFilter);
    options.ignores || (options.ignores = []);
    options.ignores.push("models");

    return target => {
        return class extends target {
            constructor(...args: any[]) {
                super(...args);

                return this._proxy = new DeepProxy(this, {
                    get(target, prop, receiver) {
                        return getter.call(this, options, target, prop, receiver);
                    },
                    set(target, prop, value, receiver) {
                        return setter.call(this, options, target, prop, value, receiver, ViewModel);
                    },
                    deleteProperty(target, prop) {
                        setter.call(this, options, target, prop, undefined, undefined, ViewModel);
                        return Reflect.deleteProperty(target, prop);
                    },
                }, undefined, options.ignores);
            }
        };
    };
}

/** Watch the specific paths and handle the callback when these paths are triggered */
export function Watch(paths: string | string[], options?: WatchOptions): MethodDecorator {
    typeof paths === "string" && (paths = [paths]);
    options || (options = {});
    options.deep === undefined && (options.deep = true);
    options.priority === undefined && (options.priority = 0);
    options.debounce === undefined && (options.debounce = 0);

    return (target: any, prop, desc: PropertyDescriptor) => {
        if (typeof options!.debounce === "number")
            Debounce(options!.debounce, c => [c[c.length - 1][0], c[0][1]])(target, prop, desc);

        const watchers = getProperty(getPrototypeOf(target, Base), "watchers");

        for (const path of paths) {
            if (path.indexOf("models.") === 0)
                watchers.models.push({ proto: target, path: path.substr(7), prop, ...options });
            else watchers.locals.push({ proto: target, path, prop, ...options });
        }
    };
}

/** Uncache the specific getter in ViewModel */
export function Uncache(): MethodDecorator {
    return (target: any, prop, desc: PropertyDescriptor) => {
        desc.get && uncaches.push({ target, prop });
    }
}

let reflections: string[] | undefined;

function getter(this: TrapThisType, options: ViewModuleOptions & { name?: string }, target: object, prop: PropertyKey, receiver: any) {
    if (target instanceof Base && this.meta?.enumerable) {
        const hasGetter = this.meta.modifiable && typeof this.meta.descriptor?.get === "function";
        const path = (options.name ? [options.name] : [] as PropertyKey[]).concat(...this.path, prop);

        if (hasGetter) {
            if (typeof prop === "string" && prop.search(options.cacheFilter!) !== 0) return this.nest();
            if (uncaches.find(v => comparePrototype(target, v.target, Base) && v.prop === prop)) return this.nest();

            const prototype = getPrototypeOf(this.root, Base);
            const getterCaches = getProperty(prototype, "getterCaches");

            const cache = getterCaches.find(cache => cache.target === target && cache.prop === prop);

            if (cache) return cache.value || (cache.value = this.nest());
            else {
                const prev = reflections;
                reflections = [stringifyPath(path)];
                const value = this.nest();

                getterCaches.push({ target, prop, path: stringifyPath(path), value, reflections });
                reflections = prev?.concat(reflections);
                return value;
            }
        }
        else reflections?.push(stringifyPath(path));
    }
    return this.nest();
}

function setter<T extends Base<Dict>>(this: TrapThisType<T>, options: ViewModuleOptions & { name?: string }, target: object, prop: PropertyKey, value: any, receiver: any, until: Class<T>) {
    if (this.meta?.enumerable) {
        const prototype = getPrototypeOf(this.root, Base);
        const getterCaches = getProperty(prototype, "getterCaches");

        const hasGetter = this.meta.modifiable && typeof this.meta.descriptor?.get === "function";
        const old = hasGetter ? getterCaches.find(cache => cache.target === target && cache.prop === prop)?.value : Reflect.get(target, prop, receiver);
        const path = [...this.path, prop];
        const pass = path.every(p => typeof p !== "string" || p.search(options.propFilter!) === 0);

        if (pass) {
            const watchers = getProperty(prototype, "watchers").locals;
            const selected = getWatchers(getterCaches, path, watchers, this.root);

            options.name && viewModels.forEach(viewModel => {
                const path = [options.name!, ...this.path, prop];
                const watchers = getProperty(getPrototypeOf(viewModel, Base), "watchers").models;

                selected.push(...getWatchers(getterCaches, path, watchers, viewModel, ViewModel));
            });

            selected
                .filter((watcher, index) => selected.indexOf(watcher) === index)
                .sort((a, b) => b.priority! - a.priority!)
                .forEach(watcher => {
                    if (watcher.same)
                        (watcher.root as any)[watcher.prop]?.(value, old);
                    else {
                        const data = propertyOf(watcher.path, watcher.root.models) || propertyOf(watcher.path, watcher.root);
                        const meta = new Meta(value, old, path);
                        (watcher.root as any)[watcher.prop]?.(data, meta);
                    }
                });
        }
    }
    return Reflect.set(target, prop, value, receiver);
}

function getWatchers<T extends Base<Dict>>(getterCaches: GetterCache[], path: PropertyKey[], watchers: Watcher[], root: Base<Dict>, until?: Class<T>) {
    const selected: (Watcher & { root: Base<Dict>, same: boolean })[] = [];

    stringifyPath(path, (pathStr, i) => {
        const same = (i === path.length - 1);

        selected.push(...watchers
            .filter(watcher => (!until || comparePrototype(root, watcher.proto, until)) && watcher.path === pathStr && (watcher.deep || same))
            .map(watcer => ({ ...watcer, root, same }))
        );
        getterCaches.forEach(cache => {
            if (cache.reflections.includes(pathStr)) {
                selected.push(...watchers
                    .filter(watcher => watcher.path === cache.path && (watcher.deep || same))
                    .map(watcer => ({ ...watcer, root, same }))
                );
                delete cache.value;
            }
        });
    });
    return selected;
}

// #[Classes] ---------- + ---------- + ----------
class Base<T extends Dict> {
    protected _proxy!: this;

    revoke() {
        // Remove relative watched items from watchers
        // const watchers = getProperty(getPrototypeOf(this, Base), "watchers");
        // const proto = getPrototypeOf(this, -1, ViewModel);

        // (["locals", "models"] as (keyof Watchers)[]).forEach(prop => {
        //     const item = watchers[prop];
        //
        //     for (let i = item.length - 1; i >= 0; i--)
        //         (item[i].proto === proto) && item.splice(i, 1);
        // });

        // DeepProxy.revokeAll(this);
    }

    runImmediateWatcher() {
        const watchers = (this as unknown as { watchers: Watchers }).watchers;
        watchers.locals.forEach(v => v.immediate && comparePrototype(this, v.proto, Base) && (this as any)[v.prop](propertyOf(v.path, this)));
        watchers.models.forEach(v => v.immediate && comparePrototype(this, v.proto, Base) && (this as any)[v.prop](propertyOf(v.path, this.models)));
    }

    get models() {
        return models as T;
    }
}

export class Model<T extends Dict = Dict> extends Base<T> {
    revoke() {
        //TODO To confirm if `module.target` and `this` are same proxy
        const module = Object.values(modules).find(module => module.target === this);
        module && (delete module.target);

        super.revoke();
    }
}

export class ViewModel<T extends Dict = Dict<Model>> extends Base<T> {
    constructor() {
        super();
        viewModels.push(this);
    }

    revoke() {
        (this as Partial<DeepProxies>)._deepProxies?.forEach(v => {
            const i = viewModels.indexOf(v.proxy.target as this);
            if (i >= 0) viewModels.splice(i, 1);
        });
        super.revoke();
    }
}

export class Meta<T = any> {
    constructor(public value: T, public old: T, public path: PropertyKey[]) {}
}

// #[Methods] ---------- + ---------- + ----------
/**
 * @param deep for non-zero positive integer, try to get prototype from the end of extended class
 */
function getPrototypeOf(target: any, deep?: number): object;
/**
 * @param deep for negative integer, try to get prototype from the start of base class (if it's `0`, the function is same as `getPrototypeOf(target, clazz)`)
 */
function getPrototypeOf<T extends object = object>(target: any, deep?: number, base?: Class<T>): T;
function getPrototypeOf<T extends object = object>(target: any, clazz?: Class<T>): T;
function getPrototypeOf<T extends object = object, U extends object = object>(target: any, clazz?: Class<T> | number, base?: Class<U>) {
    let prototype = Object.getPrototypeOf(target);
    if (typeof clazz === "number") {
        if (base) {
            if (clazz > 1) throw new TypeError("The parameter `deep` need to be negative integer, if there's parameter `base` class");
            else {
                const prototypes = [prototype];
                while (prototype instanceof base)
                    prototypes.push(prototype = getPrototypeOf(prototype));
                return prototypes[prototypes.length + clazz - 2];
            }
        }
        else {
            if (clazz >= 2) return getPrototypeOf(prototype, clazz - 1);
            else if (clazz === 1) return prototype;
            else throw new TypeError("The parameter `deep` need to be non-zero positive integer, if there's no parameter `base` class");
        }
    }
    else if (clazz)
        return (prototype instanceof clazz) ? getPrototypeOf(prototype, clazz) : target;
    else return prototype;
}

/** Repeatly compare the prototype of `target` to `to` until the specific constructor */
function comparePrototype(target: any, to: any, until: Class = Object) {
    while (target !== to) {
        if (!target || target.constructor === until) return false;
        target = getPrototypeOf(target);
    }
    return true;
}

function getProperty(target: any, prop: "watchers"): Watchers;
function getProperty(target: any, prop: "getterCaches"): GetterCache[];
function getProperty(target: any, prop: string) {
    let value = target[prop];
    if (!target[prop]) {
        switch (prop) {
            case "watchers":
                value = { models: [], locals: [] };
                break;
            case "getterCaches":
                value = [];
                break;
        }
        Object.defineProperty(target, prop, { value, configurable: true, writable: true });
    }
    return value;
}

function stringifyPath(path: PropertyKey[], forEach?: (pathStr: string, i: number) => void) {
    let pathStr = "";

    path.forEach((node, i) => {
        switch (typeof node) {
            case "string":
                pathStr += isNaN(+node) ? ((pathStr ? "." : "") + node) : `[${ node }]`;
                break;
            case "number":
                pathStr += `[${ node }]`;
                break;
            case "symbol":
                pathStr += (pathStr ? "." : "") + node.toString();
                break;
        }
        forEach?.(pathStr, i);
    });
    return pathStr;
}

/**
 * Get or set a property on the parsed path.
 * @param forceSet indicate if the setting mode is forced to enabled
 */
export function propertyOf<T = Dict>(path: string | string[], source: Dict, value?: T, forceSet = false): Dict | T {
    (typeof path === "string") && (path = path.resolve());

    if (value || forceSet) {
        const lastIndex = path.length - 1;
        return path.reduce((o, p, i) => (i === lastIndex) ? (o[p] = value) : o[p], source);
    }
    else return path.reduce((o, p) => o[p], source);
}
