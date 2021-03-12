type Numbers = number | Numbers[];
type Point = [x: number, y: number];
type RoundMode = "up" | "down" | "ceil" | "floor" | "halfup" | "halfdown" | "halfeven" | "halfceil" | "halffloor";

interface ObjectConstructor {
    /**
     * @example
     * enum Type { Start, Progress, End }
     * console.log(Object(Type).reckon(/\D+/));
     * // Output: 3
     */
    <E extends Enum | StringEnum>(value: E): Object & E;

    /**
     * Copy the values of all of the enumerable own properties from one or more source objects to a
     * target object. Returns the target object.
     * @param target The target object to copy to.
     * @param sources One or more source objects from which to copy properties
     */
    merge<T extends Dict>(target: T, ...sources: DeepPartial<T>[]): T;

    /**
     * Appends one or more new properties or sets the properties to a object. Returns the target object
     * 
     * @example
     * console.log(Object.set({ a: 10, b: true }, "a", 50, "c", "test"));
     * // Output: { a: 50, b: true, c: "test" }
     */
    set<T extends Dict, U extends Index, V>(target: T, prop: U, value?: V, ...sources: (U | V)[]): T & { [key in U]: V };

    /**
     * Deeply assign or copy the values of all of the enumerable own properties from one or more source objects to a target object. Returns the target object.
     * @param target The target object to copy to.
     * @param source The source object from which to copy properties.
     * 
     * @example
     * console.log(Object.cover(
     *     { a: { d: 3, e: 9 }, b: 4, i: ["a", "b"] },
     *     { a: { d: { g: 2 }, f: 2 }, c: 6 },
     *     { a: { d: { h: 3 } }, i: ["c"] },
     * ));
     * // Output: { a: { d: { g: 2, h: 3 }, e: 9, f: 2 }, b: 4, c: 6, i: ["c"] }
     */
    cover<T>(target: T, ...sources: Dict[]): Dict;
}

interface Object {
    /**
     * Compares with content of the other source
     * @param other The target wanted to be compared with
     * @param deep Indicate if performing deep or shallow copy the object (default: `false`)
     * @param sorted Indicate if comparing with an array of the other in order (default: `true`)
     * 
     * @example
     * const source1 = { a: 1, b: 2, c: 3 };
     * console.log(source1.equals({ a: 1, b: 2, c: 3 }));    // true
     * 
     * const source2 = { a: [1, 2, 3], b: 2, c: 3 };
     * console.log(source2.equals({ a: [1, 2, 3], b: 2, c: 3 }));    // false
     * console.log(source2.equals({ a: [1, 2, 3], b: 2, c: 3 }, true));    // true
     * console.log(source2.equals({ a: [3, 2, 1], b: 2, c: 3 }, true));    // false
     * console.log(source2.equals({ a: [3, 2, 1], b: 2, c: 3 }, true, false));    // true
     */
    equals(other: Dict, deep?: boolean, sorted?: boolean): boolean;

    /**
     * Clones the object and appends new properties or sets the properties to itself
     * @param deep Indicate if performing deep or shallow copy the object (default: `false`)
     * 
     * @example
     * const source1 = [{ a: 1 }, 2, 3, 4, 5];
     * console.log(source1.clone() === source1);    // false
     * console.log(source1.clone()[0] === source1[0]);    // true
     * console.log(source1.clone(true)[0] === source1[0]);    // false
     * 
     * const source2 = { a: [1], b: 2, c: 3 };
     * console.log(source2.clone() === source2);    // false
     * console.log(source2.clone().a === source2.a);    // true
     * console.log(source2.clone(true).a === source2.a);    // false
     */
    clone(deep?: boolean): this;

    /**
     * Performs the specified action for each properties in the object
     * @param callback Calls this function one time for each element in the object
     * @param thisArg An object to which the this keyword can refer in the callback. If thisArg is omitted, undefined is used as the this value.
     * 
     * @example
     * ({ a: 10, b: 20, c: 30 }).forEach((value, key, object) => console.log(value, key, object));
     */
    forEach<T = any>(callback: (value: T, key: string, object: this) => void, thisArg?: any): void;
    /**
     * Performs the specified async action for each properties in the object
     * @param callback Calls this function one time for each element in the object
     * @param thisArg An object to which the this keyword can refer in the callback. If thisArg is omitted, undefined is used as the this value.
     * 
     * @example
     * await ({ a: 10, b: 20, c: 30 }).forEachAsync(async (value, key, object) => await sleep().then(() => console.log(value, key, object)));    // wait for 200 ms each
     */
    forEachAsync<T = any>(callback: (value: T, key: string, object: this) => Promise<void>, thisArg?: any): Promise<void>;

    /**
     * Count the enumerable properties in the object
     * 
     * @example
     * console.log(({ a: 10, b: 15, c: 5, d: 20 }).reckon());
     * // Output: 4
     */
    reckon(): number;
    /**
     * Count the matched properties in the object
     * @param matcher An object that supports being matched against
     * 
     * @example
     * enum Type { Start, Progress, End }
     * console.log(Object(Type).reckon(/\D+/));
     * // Output: 3
     */
    reckon(matcher: RegExp): number;
    /**
     * Count the enumerable properties which meets the condition specified in a callback function
     * @param predicate Calls this function one time for each element in the array
     * @param thisArg An object to which the this keyword can refer in the callback. If thisArg is omitted, undefined is used as the this value.
     * 
     * @example
     * console.log(({ a: 10, b: 15, c: 5, d: 20 }).reckon(v => v >= 10));
     * // Output: 1
     */
    reckon<T = any>(predicate: (value: T, key: string, object: this) => boolean, thisArg?: any): number;
}

interface ArrayConstructor {
    /**
     * Builds an array in the specific length with the initial value which gotten from callback
     * @param length The length of the new array
     * @param callback Calls this function one time for each index
     * 
     * @example
     * console.log(Array.build(5, i => i));
     * // Output: [0, 1, 2, 3, 4]
     */
    build<T = any>(length: number, callback?: (index: number) => T): T[];
    /**
     * Builds an array in the specific length with the initial value
     * @param length The length of the new array
     * @param value The initial value filling up the array
     * 
     * @example
     * console.log(Array.build(5, "test"));
     * // Output: ["test", "test", "test", "test", "test"]
     */
    build<T = any>(length: number, value?: T): T[];
    /**
     * Builds an array in the specific length with the initial source
     * @param length The length of the new array
     * @param source The initial source filling up the array
     * @param clone Indicate if performing clone the initial source
     * * if `false`, performs reference copy;
     * * if `true`, performs shallow copy;
     * * and if `"deep"`, performs deep copy
     * 
     * @example
     * const source = { a: "test", b: { c: 20 } };
     * console.log(source === Array.build(5, source, true).peek()); // false
     * console.log(source.b === Array.build(5, source, true).peek().b); // true
     * console.log(source.b === Array.build(5, source, "deep").peek().b); // false
     */
    build<T extends Dict>(length: number, source?: T, clone?: boolean | "deep"): T[];

    /**
     * Builds an array with the initial values in the specific times of repeat
     * @param values The specific values to fill array section with
     * @param times The number of times to copy the values
     * 
     * @example
     * console.log(Array.repeat([4, 5, 6], 3));
     * // Output: [4, 5, 6, 4, 5, 6, 4, 5, 6]
     */
    repeat<T>(values: T[], times: number): T[];
}

interface Array<T> {
    /**
     * Appends a new elements to an array. Returns its original array
     * @param items New elements of the Array.
     * 
     * @example
     * console.log([1, 2, 3].push(5)); // 4
     * console.log([1, 2, 3].add(5)); // [1, 2, 3, 5]
     */
    add(...items: T[]): T[];

    /**
     * Matches a string or an object that supports being matched against, and removes them from an array. Returns its original array
     * @param matcher An object that supports being matched against
     * 
     * @example
     * console.log(["phone", "physics", "telephone", "elephant", "philosopher"].remove(/^ph/));
     * // Output: ["telephone", "elephant"]
     */
    remove(matcher: RegExp): this & { removed: T[] };
    /**
     * Meets the condition specified in a callback function, and removes them from an array. Returns its original array
     * @param predicate Calls this function one time for each element in the array
     * @param thisArg An object to which the this keyword can refer in the callback. If thisArg is omitted, undefined is used as the this value.
     * 
     * @example
     * console.log([15, 8, 24, 20, 3].remove(v => v.clamp(10, 20) !== v));
     * // Output: [15, 20]
     * 
     * @example
     * console.log([15, 8, 24, 20, 3].remove((v, i) => i === 2));
     * // Output: [15, 8, 20, 3]
     */
    remove(predicate: (value: T, index: number, array: this) => boolean, thisArg?: any): this & { removed: T[] };
    /**
     * Removes the specific elements from an array. Returns its original array
     * @param element The specific element to be removed from the array
     * 
     * @example
     * console.log([15, 8, 8, 15, 3].remove(15));
     * // Output: [8, 8, 3]
     * 
     * console.log(["hello", null, undefined, "world"].remove());
     * // Output: ["hello", null, "world"]
     */
    remove(element?: T | null): this & { removed: T[] };

    /**
     * Removes the duplicated value. Returns a new array
     * 
     * @example
     * console.log([2, 3, 4, 3, 2, 5].deduplicate());
     * // Output: [2, 3, 4, 5]
     */
    deduplicate(): T[];
    /**
     * Removes the duplicated value based on return of the callback. Returns a new array
     * 
     * @example
     * const store = [{ fruit: "Apple", amount: 1 }, { fruit: "Banana", amount: 2 }, { fruit: "Apple", amount: 3 }, { fruit: "Guava", amount: 4 }, { fruit: "Banana", amount: 5 }];
     * console.log(store.deduplicate(v => v.fruit));
     * // Output: [{ fruit: "Apple", amount: 1 }, { fruit: "Banana", amount: 2 }, { fruit: "Guava", amount: 4 }]
     * 
     * console.log(store.deduplicate(v => v.fruit, true));
     * // Output: [{ fruit: "Apple", amount: 3 }, { fruit: "Guava", amount: 4 }, { fruit: "Banana", amount: 5 }]
     */
    deduplicate(callback: (value: T, index: number, array: this) => any, last?: boolean, thisArg?: any): T[];

    /**
     * Retrieve the specific element with negativable index
     * 
     * @example
     * console.log([15, 8, 24, 20, 3].get(2)); // 24
     * console.log([15, 8, 24, 20, 3].get(-2)); // 20
     */
    get(index: number): T;

    /**
     * Retrieve the last element, but does not get deleted from the array
     * 
     * @example
     * console.log([15, 8, 24, 20, 3].get(-1)); // 3
     * console.log([15, 8, 24, 20, 3].peek()); // 3
     * console.log([].peek()); // undefined
     * console.log([].peek(20)); // 20
     */
    peek(): T | undefined;
    peek(initial: T): T;

    /**
     * Picks some elements from the array. Returns a new array
     * 
     * @example
     * console.log([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].pick(2, 3, -3, 2));
     * // Output: [3, 4, 5, 8, 9]
     */
    pick(start: number, count?: number, ...params: number[]): T[];

    /**
     * Calculate the total of number-like in an array
     * @param callback Calls this function one time for each element in the array
     * @param thisArg An object to which the this keyword can refer in the callback. If thisArg is omitted, undefined is used as the this value.
     * 
     * @example
     * console.log([10, "0b11", "0x11", true, "string"].total());
     * console.log([{ data: 10 }, { data: "0b11" }, { data: "0x11" }, { data: true }, { data: "string" }].total(v => v.data));
     * // Output: 10 + 17 + 3 + 1 + 0
     */
    total(callback?: (value: T, index: number, array: this) => Primitive, thisArg?: any): number;

    /**
     * Counts the duplicate values in an array and returns a statistic object
     * 
     * @example
     * console.log(["a", "b", "c", "c", "e", "a", "b", "c"].statize());
     * // Output: { a: 2, b: 2, c: 3, e: 1 }
     * 
     * console.log([1, 2, 3, 2, 3, 4, 2].statize());
     * // Output: { 1: 1, 2: 3, 3: 2, 4: 1 }
     */
    statize<U extends Index = Index>(): Record<U, number>;
    /**
     * Counts the duplicate values based on the property name of the object in an array and returns a statistic object
     * 
     * @example
     * console.log([{ class: "A1", name: "Jack" }, { class: "C2", name: "May" }, { class: "A1", name: "Alice" }].statize("class"));
     * // Output: { A1: 2, C2: 1 }
     */
    statize<U extends Index = Index>(prop: keyof T): Record<U, number>;

    /**
     * Indexize the elements by the property name of the object
     * 
     * @example
     * console.log([{ class: "A1", name: "Jack" }, { class: "C2", name: "May" }, { class: "A1", name: "Alice" }].indexize("class"));
     * // Output: { A1: { class: "A1", name: "Alice" }, C2: { class: "C2", name: "May" } }
     */
    indexize<U extends Index = Index>(prop: keyof T): Record<U, T>;

    /**
     * Group the elements by the property name of the object
     * 
     * @example
     * console.log([{ class: "A1", name: "Jack" }, { class: "C2", name: "May" }, { class: "A1", name: "Alice" }].group("class"));
     * // Output: { A1: [{ class: "A1", name: "Jack" }, { class: "A1", name: "Alice" }], C2: [{ class: "C2", name: "May" }] }
     */
    group<U extends Index = Index>(prop: keyof T): Record<U, T[]>;
    /**
     * Group the elements by the specific amount
     * 
     * @example
     * console.log([15, 8, 24, 20, 3, 24, 4].group(3));
     * // Output: [[15, 8, 24], [20, 3, 24], [4]]
     */
    group(amount: number): T[][];

    /**
     * Serizlize an array into a object by the values of the array
     * 
     * @example
     * console.log(Array.from(Array(5).keys()).serialize(0));
     * // Output: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
     * 
     * console.log(Array.from({ length: 3 }, (v, i) => `p${ i + 1 }`).serialize(false));
     * // Output: { p1: false, p2: false, p3: false }
     * 
     * console.log(["first", "second", "third"].serialize((v, i) => ({ num: i + 1 })));
     * // Output: { first: { num: 1 }, second: { num: 2 }, third: { num: 3 } }
     */
    serialize<U>(callback: (value: T, index: number, array: this) => U, thisArg?: any): T extends PropertyKey ? Record<T, U> : unknown;
    serialize<U>(value: U): T extends PropertyKey ? Record<T, U> : unknown;

    /**
     * Determines whether an array includes a certain element, returning true or false as appropriate.
     * @param searchElement The element to search for.
     * @param fromIndex The position in this array at which to begin searching for searchElement.
     */
    includes<U extends T>(searchElement: T | Empty, fromIndex?: number): searchElement is U;

    /**
     * Performs the specified async action for each element in an array
     * @param callback Calls this function one time for each element in the array
     * @param thisArg An object to which the this keyword can refer in the callback. If thisArg is omitted, undefined is used as the this value.
     * 
     * @example
     * await [10, 20, 30].forEachAsync(async (value, index, array) => await sleep().then(() => console.log(value, index, array)));    // wait for 200 ms each
     */
    forEachAsync(callback: (value: T, index: number, array: this) => Promise<void>, thisArg?: any): Promise<void>;
    /**
     * Performs the specified action for each element in an array, in descending order
     * @param callback Calls this function one time for each element in the array
     * @param thisArg An object to which the this keyword can refer in the callback. If thisArg is omitted, undefined is used as the this value.
     * 
     * @example
     * [10, 20, 30].forEachRight((value, index, array) => console.log(value, index, array));
     */
    forEachRight(callback: (value: T, index: number, array: this) => void, thisArg?: any): void;
    /**
     * Performs the specified async action for each element in an array
     * @param callback Calls this function one time for each element in the array
     * @param thisArg An object to which the this keyword can refer in the callback. If thisArg is omitted, undefined is used as the this value.
     * 
     * @example
     * await [10, 20, 30].forEachRightAsync(async (value, index, array) => await sleep().then(() => console.log(value, index, array)));    // wait for 200 ms each
     */
    forEachRightAsync(callback: (value: T, index: number, array: this) => Promise<void>, thisArg?: any): Promise<void>;
}

interface ReadonlyArray<T> extends Array<T> {}

interface Math {
    /**
     * Calculates the total of the values
     * 
     * @example
     * console.log(Math.sum([1, [2, 3]], 4)); // 10
     */
    sum(...values: Numbers[]): number;

    /** Get the greatest common divisor of a list of numbers */
    gcd(a: number, b: number, ...args: number[]): number;

    /** Get the least common multiple of a list of numbers */
    lcm(a: number, b: number, ...args: number[]): number;

    /** Clamps the value within the inclusive minimum and maximum bounds */
    clamp(value: number, min?: number, max?: number): number;

    /**
     * Check if the value is in the specific range
     * @param inclusive Indicate if including the minimum and the maximum (default: `true`)
     */
    inRange(value: number, min: number, max: number, inclusive?: boolean): boolean;

    toRadian(degrees: number): number;
    toDegree(radians: number): number;

    /**
     * Returns a pseudorandom number between minimum and maximum
     * @param inclusive Indicate if including the maximum (default: `false`)
     */
    randomInt(min?: number, max?: number, inclusive?: boolean): number;

    /**
     * Ratate the point `(x, y)` by the specific `degree` around the center
     * @param center (default: `(0, 0)`)
     */
    rotate(x: number, y: number, degree: number, center?: Point): Point;
}

interface Number {
    /** Clamps the number within the inclusive minimum and maximum bounds */
    clamp(min?: number, max?: number): number;

    /**
     * Rounds a number
     * 
     * |          | `up` | `down` | `ceil` | `floor` | `halfup` | `halfdown` | `halfeven` | `halfceil` | `halffloor` |
     * | -------: | ---: | -----: | -----: | ------: | -------: | ---------: | ---------: | ---------: | ----------: |
     * |  **5.5** |    6 |      5 |      6 |       5 |        6 |          5 |          6 |          6 |           5 |
     * |  **2.5** |    3 |      2 |      3 |       2 |        3 |          2 |          2 |          3 |           2 |
     * |  **1.6** |    2 |      1 |      2 |       1 |        2 |          1 |          2 |          2 |           2 |
     * |  **1.1** |    2 |      1 |      2 |       1 |        2 |          1 |          1 |          1 |           1 |
     * |  **1.0** |    1 |      1 |      1 |       1 |        1 |          1 |          1 |          1 |           1 |
     * | **-1.0** |   -1 |     -1 |     -1 |      -1 |       -1 |         -1 |         -1 |         -1 |          -1 |
     * | **-1.1** |   -2 |     -1 |     -1 |      -2 |       -1 |         -1 |         -1 |         -1 |          -1 |
     * | **-1.6** |   -2 |     -1 |     -1 |      -2 |       -2 |         -2 |         -2 |         -2 |          -2 |
     * | **-2.5** |   -3 |     -2 |     -2 |      -3 |       -3 |         -2 |         -2 |         -2 |          -3 |
     * | **-5.5** |   -6 |     -5 |     -5 |      -6 |       -6 |         -5 |         -6 |         -5 |          -6 |
     */
    round(digits?: number, mode?: RoundMode): number;

    /**
     * Get a formatted number with the specific separator.
     * @param config default: `{ digits: 0, round: "halfup", zero: false, prefix: "", suffix: "", group: { primary: 3, secondary: 0, fraction: 3 }, separator: { integer: ",", decimal: ".", fraction: " " } }`
     * 
     * @example
     * console.log((-1024.5678).format("p"));    // -1,024.567 8
     * console.log((-1024.5678).format("p", { digits: 4, round: "down", prefix: "$ ", group: { integer: 2, fraction: 0 } }));    // $ -10,24.5678
     * console.log((-1024.5678).format("p", { digits: 7, zero: "#", suffix: " £", separator: { integer: ".", decimal: ",", fraction: "." } }));    // -1.024,567.8### £
     */
    format(type: "p" | "separated", config?: DeepPartial<{
        digits: number, round: RoundMode, zero: boolean | string, prefix: string, suffix: string,
        group: { primary: number, secondary: number, fraction: number }, separator: { integer: number, decimal: number, fraction: number },
    }>): string;
    /**
     * Get a shorten number with `"k"`, `"M"`, `"G"`, `"T"`, or etc.
     * @param config default: `{ digits: 0, round: "down", zero: false, separator: { unit: "" } }`
     * 
     * @example
     * console.log((-1024.5678).format("s"));    // -1k
     * console.log((-102456789).format("s", { digits: 2, zero: "0", round: "up" }));    // -102.46M
     * console.log((-1024.5678).format("s", { digits: 1, zero: true, separator: { unit: " " } }));    // -1.0 k
     */
    format(type: "s" | "shorten", config?: DeepPartial<{ digits: number, round: RoundMode, zero: boolean | string, separator: { unit: string } }>): string;
    /**
     * Get a number in exponential notation
     * @param config default: `{ round: "halfup", zero: false, separator: { exponent: "e" } }`
     * 
     * @example
     * console.log((-1024.5678).format("e"));    // -1.0245678e+3
     * console.log((-1024.5678).format("e", { digits: 1, zero: true }));    // -1.0e+3
     * console.log((-1024.5678).format("e", { digits: 4, separator: { exponent: " × 10^" } }));    // -1.0246 × 10^+3
     */
    format(type: "e" | "exponential", config?: DeepPartial<{ digits: number, round: RoundMode, zero: boolean | string, separator: { exponent: string } }>): string;
    /**
     * Get a number in fraction notation
     * @param config default: `separator: { decimal: " ", fraction: "/" }`
     * 
     * @example
     * console.log((-1024.5678).format("f"));    // -1024 2839/5000
     * console.log((-.10245678).format("f"));    // -5122839/50000000
     * console.log((-1024.5678).format("f", { separator: { decimal: " & " } }));    // -1024 & 2839/5000
     */
    format(type: "f" | "fraction", config?: DeepPartial<{ separator: { decimal: string, fraction: string } }>): string;
    /**
     * Get a fixed number in the specific amount of decimal places
     * @param config default: `{ digits: 0, round: "halfup", zero: "0" }`
     * 
     * @example
     * console.log((-1024.5678).format("x"));    // -1025
     * console.log((-1024.5678).format("x", { digits: 2, round: "down" }));    // -1024.56
     * console.log((-1024.5678).format("x", { digits: 6, zero: "#" }));    // -1024.5678##
     */
    format(type: "x" | "fixed", config?: DeepPartial<{ digits: number, round: RoundMode, zero: boolean | string }>): string;
}

interface String {
    /**
     * Resolves the path-like string and returns the result from the source
     * @param source The source object from which to fetch properties.
     * @param separator A string that identifies character or characters to use in separating the string (Default: `/\[|\]|\.|\/|:/g`)
     * 
     * @example
     * console.log("coding.levels[2]".resolve({ coding: { levels: ["fresh", "junior", "senior"] } }));
     * // Output: "senior"
     */
    resolve<T = any>(source: Dict, separator?: string | RegExp): T | undefined;
    /**
     * Resolves the path-like string and returns the split result
     * @param separator A string that identifies character or characters to use in separating the string (Default: `/\[|\]|\.|\/|:/g`)
     * 
     * @example
     * console.log("https://www.google.com.tw/".resolve());
     * // Output: ["https", "www", "google", "com", "tw"]
     * 
     * console.log("coding.levels[2]".resolve());
     * // Output: ["coding", "levels", "2"]
     */
    resolve(source?: null, separator?: string | RegExp): string[];

    /**
     * Format the string by replacing `{n}` or `{params.path}` with arguments or sources
     * @param args The arguments or sources which to replace and format the string
     * 
     * @example
     * console.log("I'm { name }, a { 2:[female|male|asexual] } { coding.levels[2] } programmer. I already had {0} years of working experience.".format(5, { name: "Puzz" }, true, { coding: { levels: ["fresh", "junior", "senior"] } }));
     * // Output: I'm Puzz, a male senior programmer. I already had 5 years of working experience.
     * 
     * @example
     * const text = "There { 0:[are|is|are] } { 0:[no|an|*] } apple{ 0:[s||s] }.";
     * console.log(text.format(0));    // There are no apples.
     * console.log(text.format(1));    // There is an apple.
     * console.log(text.format(5));    // There are 5 apples.
     */
    format(...args: any[]): string;

    /**
     * Case the string to `kebab-case`, `snake_case` or `CONSTANT_CASE`
     * @param snake Indicate if converting to `snake_case` or `CONSTANT_CASE` (default: `false`)
     * @param upperCase Indicate if converting each terms in upper case (default: `true` if the parameter `snake` is `true`; otherwise, `false`)
     * 
     * @example
     * console.log("mixedWITH spaces_Underscores-And-hyphens".toSnackCase());
     * // Output: mixed-with-spaces-underscores-and-hyphens
     * console.log("mixedWITH spaces_Underscores-And-hyphens".toSnackCase(true));
     * // Output: MIXED_WITH_SPACES_UNDERSCORES_AND_HYPHENS
     * console.log("mixedWITH spaces_Underscores-And-hyphens".toSnackCase(true, false));
     * // Output: mixed_with_spaces_underscores_and_hyphens
     */
    toKebabCase(snake?: boolean, upperCase?: boolean): string;
    /**
     * Case the string with the specified separator string
     * @param separator A string used to separate one element of an array from the next in the resulting String
     * @param upperCase Indicate if converting each terms in upper case (default: `false`)
     * 
     * @example
     * console.log("mixedWITH spaces_Underscores-And-hyphens".toSnackCase("."));
     * // Output: mixed.with.spaces.underscores.and.hyphens
     */
    toKebabCase(separator?: string, upperCase?: boolean): string;

    /**
     * Case the string to `camelCase` or `PascalCase`
     * @param pascal Indicate if converting to `PascalCase` (default: `false`)
     * 
     * @example
     * console.log("mixedWITH spaces_Underscores-And-hyphens".toCamelCase());
     * // Output: mixedWithSpacesUnderscoresAndHyphens
     * console.log("mixedWITH spaces_Underscores-And-hyphens".toCamelCase(true));
     * // Output: MixedWithSpacesUnderscoresAndHyphens
     */
    toCamelCase(pascal?: boolean): string;
}

interface Window {
    /**
     * Use `awiat` to wait for the specific milliseconds
     * @param timeout The specific milliseconds (default: `200`)
     * 
     * @example
     * await sleep();    // wait for 200 ms
     * await sleep(5000);    // wait for 5 seconds
     */
    sleep(timeout: number): Promise<void>;

    /**
     * Performs the specified action for each element in an array
     * @param end The condition will be starting from `0`, ending at the specific value and its step will be `1`. Same as `[0, end, 1]`
     * @param callback Calls this function one time for each index
     * @param thisArg An object to which the this keyword can refer in the callback. If thisArg is omitted, undefined is used as the this value.
     * 
     * @example
     * forEach(10, i => console.log(i));    // 0 to 10
     */
    forEach(end: number, callback: (index: number) => void, thisArg?: any): void;
    /**
     * Performs the specified action for each element in an array
     * @param condition Indicate its `start` index, `end` index (default: `0`) and `step` value (default: depended on `start` and `end`, will be `1` or `-1`)
     * @param callback Calls this function one time for each index
     * @param thisArg An object to which the this keyword can refer in the callback. If thisArg is omitted, undefined is used as the this value.
     * 
     * @example
     * forEach([10], i => console.log(i));    // 10 to 0, Same as [10, 0, -1]
     * forEach([5, 10], i => console.log(i));    // 5 to 10, Same as [5, 10, 1]
     * forEach([10, 0, -3], i => console.log(i));    // 10, 7, 4, 1
     */
    forEach(condition: [start: number, end?: number, step?: number], callback: (index: number) => void, thisArg?: any): void;
    /**
     * Performs the specified async action for each element in an array
     * @param end The condition will be starting from `0`, ending at the specific value and its step will be `1`. Same as `[0, end, 1]`
     * @param callback Calls this function one time for each index
     * @param thisArg An object to which the this keyword can refer in the callback. If thisArg is omitted, undefined is used as the this value.
     * 
     * @example
     * await forEachAsync(10, async i => await sleep().then(() => console.log(i)));    // 0 to 10, and wait for 200 ms each
     */
    forEachAsync(end: number, callback: (index: number) => Promise<void>, thisArg?: any): Promise<void>;
    /**
     * Performs the specified async action for each element in an array
     * @param condition Indicate its `start` index, `end` index (default: `0`) and `step` value (default: depended on `start` and `end`, will be `1` or `-1`)
     * @param callback Calls this function one time for each index
     * @param thisArg An object to which the this keyword can refer in the callback. If thisArg is omitted, undefined is used as the this value.
     * 
     * @example
     * await forEachAsync([10], async i => await sleep().then(() => console.log(i)));    // 10 to 0, and wait for 200 ms each. Sames as [10, 0, -1]
     * await forEachAsync([5, 10], async i => await sleep().then(() => console.log(i)));    // 5 to 10, and wait for 200 ms each. Sames as [5, 10, 1]
     * await forEachAsync([10, 0, -3], async i => await sleep().then(() => console.log(i)));    // 10, 7, 4, 1, and wait for 200 ms each
     */
    forEachAsync(condition: [start: number, end?: number, step?: number], callback: (index: number) => Promise<void>, thisArg?: any): Promise<void>;
}
