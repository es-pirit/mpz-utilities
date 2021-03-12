export type Class<T extends object = {}> = { new(...args: any[]): T };
export type ClassDecorator<T extends object = {}> = <U extends Class<T>>(target: U) => void | U;

type CancelableObject = Record<PropertyKey, any> & { _cancelers: Record<PropertyKey, Function> };

export const singletons = {} as Dict<ISingleton & Dict>;

// #[Class Decorators] ---------- + ---------- + ----------
export interface ISingleton {
    /** Destroy the data of this singleton */
    destroy? (...args: any[]): void;
}
/** Transform a normal `class` into a singleton one which can only be constructed once. */
export function Singletonize(name?: string): ClassDecorator {
    return target => {
        return class Singleton extends target implements ISingleton {
            private static _instance: Singleton | null;

            constructor(...args: any[]) {
                if (Singleton._instance) return Singleton._instance;
                else {
                    super(...args);
                    name && (singletons[name] = this);
                    return Singleton._instance = this;
                }
            }

            destroy(...args: any[]) {
                // @ts-ignore
                super.destroy(...args);

                Object.keys(this).forEach(key => delete (this as any)[key]);
                Singleton._instance = null;
                name && delete singletons[name];
            }

            static get instance() {
                return new this();
            }
        };
    };
}

// #[Method Decorators] ---------- + ---------- + ----------
/**
 * The function will can only be called if the condition is `true`.
 * @param condition if the result is `true`, the function will be executed
 */
export function Assert<T extends object = any>(condition: ((this: T, target: T) => any) | string): MethodDecorator {
    return (target, prop, desc: PropertyDescriptor) => {
        const origin = desc.value as Function;

        desc.value = typeof condition === "string" ?
            function (this: { [key: string]: Function }, ...args: any[]) {
                if (this[condition].call(this)) origin.apply(this, args);
            } :
            function (this: T, ...args: any[]) {
                if (condition.call(this, this)) origin.apply(this, args);
            };
    }
}

/**
 * The function will can only be called some times (default is `1` time).
 * @param times the maximum of times for the execution
 */
export function Once(times = 1): MethodDecorator {
    const list = [] as { this: CancelableObject, prop: string | symbol, count: number }[];

    return (target, prop, desc: PropertyDescriptor) => {
        const origin = desc.value as Function;

        desc.value = function (this: CancelableObject, ...args: any[]) {
            // Get or initialize the needed data
            let data = list.find(v => v.this === this && v.prop === prop);
            if (!data) {
                list.push(data = { this: this, prop, count: 0 });
                this._cancelers || (this._cancelers = {});
                this._cancelers[prop as string] = (function () {
                    list.splice(list.findIndex(v => v == data), 1);
                }).bind(this);
            }

            // Run the logic of the method
            if (data.count >= times) return;

            origin.apply(this, args);
            data.count++;
        };
    }
}

/**
 * The function will delay its execution for the specific milliseconds (default is `200` milliseconds).
 * ```
 * duration = 10:
 * in :   2  5                23           36 39   44
 * ---: |----+----|----+----|----+----|----+----|----+----|---->
 * out:   >-->-----12-15       >--------33  >-->---->46-49---54
 * ```
 * @param duration the milliseconds for delaying its execution
 */
export function Delay(duration = 200): MethodDecorator {
    const list = [] as { this: CancelableObject, prop: string | symbol, timeouts: number[] }[];

    return (target, prop, desc: PropertyDescriptor) => {
        const origin = desc.value as Function;

        desc.value = function (this: CancelableObject, ...args: any[]) {
            // Get or initialize the needed data
            let data = list.find(v => v.this === this && v.prop === prop);
            if (!data) {
                list.push(data = { this: this, prop, timeouts: [] });
                this._cancelers || (this._cancelers = {});
                this._cancelers[prop as string] = (function () {
                    while (data!.timeouts.length > 0)
                        window.clearTimeout(data!.timeouts.pop());
                    list.splice(list.findIndex(v => v == data), 1);
                }).bind(this);
            }

            // Run the logic of the method
            data.timeouts.push(window.setTimeout(origin.bind(this), duration, ...args));
        };
    }
}

/**
 * The function will postpone its execution until after the specific milliseconds have elapsed since the last time it was invoked (default is `200` milliseconds).
 * ```
 * duration = 10:
 * in :   2  5                23           36 39   44
 * ---: |----+----|----+----|----+----|----+----|----+----|---->
 * out:   x  >--------15       >--------33  x  x    >--------54
 * ```
 * @param duration the milliseconds for postponing its execution
 */
export function Debounce(duration = 200, collectible: boolean | ((collection: any[]) => any[]) = false): MethodDecorator {
    const list = [] as { this: CancelableObject, prop: string | symbol, timeout: number, collection: any[] }[];

    return (target, prop, desc: PropertyDescriptor) => {
        const origin = desc.value as Function;

        desc.value = function (this: CancelableObject, ...args: any[]) {
            // Get or initialize the needed data
            let data = list.find(v => v.this === this && v.prop === prop);
            if (!data) {
                list.push(data = { this: this, prop, timeout: -1, collection: [] });
                this._cancelers || (this._cancelers = {});
                this._cancelers[prop as string] = (function () {
                    window.clearTimeout(data!.timeout);
                    list.splice(list.findIndex(v => v == data), 1);
                }).bind(this);
            }

            // Run the logic of the method
            window.clearTimeout(data.timeout);
            data.collection.push(args);
            data.timeout = window.setTimeout((function (this: CancelableObject) {
                origin.apply(this, collectible ? [...(typeof collectible === "function" ? collectible(data!.collection!) : args), data!.collection] : args);
                this._cancelers[prop as string]();
            }).bind(this), duration);
        };
    }
}

/**
 * When the function invoked repeatedly, it will only actually call the first function at most once per every specific milliseconds (default is `200` milliseconds).
 * ```
 * duration = 10:
 * in :   2  5                23           36 39   44
 * ---: |----+----|----+----|----+----|----+----|----+----|---->
 * out:   2--x------          23---------  36--x----x-
 * ```
 * @param duration the milliseconds for pausing its execution
 */
export function Throttle(duration = 200): MethodDecorator {
    const list = [] as { this: CancelableObject, prop: string | symbol, date?: Date }[];

    return (target, prop, desc: PropertyDescriptor) => {
        const origin = desc.value as Function;

        desc.value = function (this: CancelableObject, ...args: any[]) {
            // Get or initialize the needed data
            let data = list.find(v => v.this === this && v.prop === prop);
            if (!data) {
                list.push(data = { this: this, prop });
                this._cancelers || (this._cancelers = {});
                this._cancelers[prop as string] = (function () {
                    list.splice(list.findIndex(v => v == data), 1);
                }).bind(this);
            }

            // Run the logic of the method
            if (data.date && new Date().getTime() - data.date.getTime() < duration) return;

            data.date = new Date();
            origin.apply(this, args);
        };
    }
}

/**
 * When the function invoked repeatedly, it will only actually call the last function until after the specific milliseconds have elapsed since the first time it was invoked (default is `200` milliseconds).
 * ```
 * duration = 10:
 * in :   2  5                23           36 39   44
 * ---: |----+----|----+----|----+----|----+----|----+----|---->
 * out:   x-->-----12          >--------33  x--x---->46
 * ```
 * @param duration the milliseconds for auditing its execution
 */
export function Audit(duration = 200): MethodDecorator {
    const list = [] as { this: CancelableObject, prop: string | symbol, timeout: number, args?: any[] }[];

    return (target, prop, desc: PropertyDescriptor) => {
        const origin = desc.value as Function;

        desc.value = function (this: CancelableObject, ...args: any[]) {
            // Get or initialize the needed data
            let data = list.find(v => v.this === this && v.prop === prop);
            if (!data) {
                list.push(data = { this: this, prop, timeout: -1 });
                this._cancelers || (this._cancelers = {});
                this._cancelers[prop as string] = (function () {
                    window.clearTimeout(data!.timeout);
                    list.splice(list.findIndex(v => v == data), 1);
                }).bind(this);
            }

            // Run the logic of the method
            data.args || (data.timeout = window.setTimeout((function (this: CancelableObject) {
                origin.apply(this, data!.args);
                this._cancelers[prop as string]();
            }).bind(this), duration));

            data.args = args;
        };
    }
}

/**
 * When the function invoked repeatedly, it will only actually call the last function at most once per every specific milliseconds from the first time (default is `200` milliseconds).
 * ```
 * duration = 10:
 * in :   2  5                23           36 39   44
 * ---: |----+----|----+----|----+----|----+----|----+----|---->
 * out:   x-->-----12         ->--------32--x-->-42->------52
 * ```
 * @param duration the milliseconds for sampling its execution
 */
export function Sample(duration = 200): MethodDecorator {
    const list = [] as { this: CancelableObject, prop: string | symbol, interval: number, args?: any[] }[];

    return (target, prop, desc: PropertyDescriptor) => {
        const origin = desc.value as Function;

        desc.value = function (this: CancelableObject, ...args: any[]) {
            // Get or initialize the needed data
            let data = list.find(v => v.this === this && v.prop === prop);
            if (!data) {
                list.push(data = { this: this, prop, interval: -1 });
                this._cancelers || (this._cancelers = {});
                this._cancelers[prop as string] = (function () {
                    window.clearInterval(data!.interval);
                    list.splice(list.findIndex(v => v == data), 1);
                }).bind(this);
            }

            // Run the logic of the method
            data.args || (data.interval = window.setInterval((function (this: CancelableObject) {
                if (!data?.args) return;

                origin.apply(this, data.args);
                delete data.args;
            }).bind(this), duration));

            data.args = args;
        };
    }
}

export function cancel(target: Partial<CancelableObject>, ...methods: Function[]) {
    for (const method of methods)
        target._cancelers?.[method.name]?.();
}

// #[Property Decorators] ---------- + ---------- + ----------
type AccessorizeOptions<T = any, U extends object = any> = ({
    /** Indicate if the returned value of the setter reassign to the property */
    reassign: true,
    set: ((this: U, value: T, old: T, target: U) => T) | string,
} | {
    /** Indicate if the returned value of the setter reassign to the property */
    reassign?: false,
    set?: ((this: U, value: T, old: T, target: U) => void) | string | false,
}) & {
    get?: ((this: U, value: T, target: U) => void | T) | string,
    /** The prefix of property. (default: `"_"`) */
    prefix?: string,
}

/**
 * Transform a normal `property` into a accessor (getter/setter).
 */
export function Accessorize<T = any, U extends object = any>(options: AccessorizeOptions<T, U>): PropertyDecorator {
    return function (target, prop) {
        if (typeof prop === "symbol") return;

        options.prefix || (options.prefix = "_");

        const privateProp = options.prefix + prop;
        const get = options.get ?
            (typeof options.get === "string" ?
                function (this: any) {
                    const value = this[privateProp];
                    const modified = this[options.get as string].call(this, value);
                    return (modified === undefined) ? value : modified;
                } :
                function (this: any) {
                    const value = this[privateProp];
                    const modified = (options.get as Function).call(this, value, this);
                    return (modified === undefined) ? value : modified;
                }
            ) :
            function (this: any) {
                return this[privateProp];
            };
        const set = options.set === false ? 
            function (this: any, value: any) {
                if (this[privateProp] === undefined)
                    Object.defineProperty(this, privateProp, { value, configurable: true });
                else throw new TypeError(`Cannot set property \`${ prop }\` of #<e> which has only a getter`);
            } : 
            (options.set ?
                (typeof options.set === "string" ?
                    function (this: any, value: T) {
                        const old = this[privateProp];
                        const modified = this[options.set as string].call(this, value, old);
                        Object.defineProperty(this, privateProp, { value: options.reassign ? modified : value, configurable: true, writable: true });
                    } :
                    function (this: any, value: T) {
                        const old = this[privateProp];
                        const modified = (options.set as Function).call(this, value, old, this);
                        Object.defineProperty(this, privateProp, { value: options.reassign ? modified : value, configurable: true, writable: true });
                    }
                ) :
                function (this: any, value: any) {
                    Object.defineProperty(this, privateProp, { value, configurable: true, writable: true });
                }
            );

        Object.defineProperty(target, prop, { get, set });
    }
}
