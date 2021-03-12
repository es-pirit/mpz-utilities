const AsyncFunction = (async () => {}).constructor;
const Generator = (function* () {}).constructor;

Object.defineProperties(Object, {
    merge: describe(Object.assign),
    set: describe(function (target, ...sources) {
        sources.forEach((v, i) => i % 2 || (target[v] = sources[i + 1]));
        return target;
    }),
    cover: describe(function (target, ...sources) {
        sources.forEach(v => v.forEach((e, k) => {
            if (typeof e === "object" && !Array.isArray(e))
                Object.cover((typeof target[k] !== "object") ? (target[k] = {}) : target[k], e);
            else target[k] = e;
        }));
        return target;
    }),
});

Object.defineProperties(Object.prototype, {
    equals: describe(function (other, deep = false, sorted = true) {
        const entries = Object.entries(this);
        if (typeof this !== typeof other || entries.length !== Object.entries(other).length) return false;

        if (deep)
            return entries.every(([k, v]) => (typeof v === "object") ? v.equals(other[k], true, sorted) : v === other[k]);
        else return entries.every(([k, v]) => v === other[k]);
    }),
    clone: describe(function (deep = false) {
        if (deep) {
            const result = {};
            this.forEach((v, k) => Object.set(result, k, (typeof v === "object") ? v.clone(true) : v));
            return result;
        }
        return Object.assign({}, this);
    }),
    forEach: describe(function (callback, thisArg) {
        thisArg && (callback = callback.bind(thisArg));
        for (const k in this)
            callback(this[k], k, this);
    }),
    forEachAsync: describe(async function (callback, thisArg) {
        thisArg && (callback = callback.bind(thisArg));
        for (const k in this)
            await callback(this[k], k, this);
    }),
    reckon: describe(function (predicate, thisArg) {
        if (predicate instanceof RegExp)
            return Object.keys(this).filter(k => k.search(predicate) > -1).length;
        else if (typeof predicate === "function") {
            thisArg && (predicate = predicate.bind(thisArg));
            return Object.entries(this).filter(([k, v]) => predicate(v, k, this)).length;
        }
        return Object.keys(this).length;
    }, false),
});

Object.defineProperties(Array, {
    build: describe(function (length, value, clone) {
        if (clone && typeof value === "object")
            return new Array(length).fill(null).map(() => value.clone(clone === "deep"));
        else if (typeof value === "function")
            return new Array(length).fill(null).map((v, i) => value(i));
        else return new Array(length).fill(value);
    }),
    repeat: describe(function (values, times) {
        return new Array(times).fill(values).flat();
    }),
});

Object.defineProperties(Array.prototype, {
    add: describe(function (...items) {
        this.push(...items);
        return this;
    }),
    remove: describe(function (predicate, thisArg) {
        const removed = [];
        if (predicate instanceof RegExp)
            this.forEachRight((v, i) => (typeof v === "string" || typeof v === "number") && (v.toString().search(predicate) > -1) && removed.unshift(this.splice(i, 1)[0]));
        else if (typeof predicate === "function") {
            thisArg && (predicate = predicate.bind(thisArg));
            this.forEachRight((v, i) => predicate(v, i, this) && removed.unshift(this.splice(i, 1)[0]));
        }
        else this.forEachRight((v, i) => (v === predicate) && removed.unshift(this.splice(i, 1)[0]));
        return Object.set(this, "removed", removed);
    }),
    deduplicate: describe(function (callback, last = false, thisArg) {
        thisArg && (callback = callback.bind(thisArg));
        if (callback) {
            const map = this.map(callback, thisArg);
            return last ?
                map.reduceRight((p, v, i) => map.lastIndexOf(v) === i ? p : (p.splice(i, 1) && p), this.concat()) :
                map.reduceRight((p, v, i) => map.indexOf(v) === i ? p : (p.splice(i, 1) && p), this.concat());
        }
        return this.filter((v, i) => this.indexOf(v) === i);
    }),
    get: describe(function (index) {
        return this[index >= 0 ? index : (this.length + index)];
    }),
    peek: describe(function (initial) {
        return this.length ? this[this.length - 1] : initial;
    }),
    pick: describe(function (...params) {
        params = params.map((v, i) => i % 2 ? v : (v >= 0 ? v : this.length + v));
        return this.filter((v, i) => params.some((p, j) => (j % 2 === 0) && (i >= p && i < p + (params[j + 1] || 1))));
    }),
    total: describe(function (callback, thisArg) {
        thisArg && (callback = callback.bind(thisArg));
        return callback ?
            this.reduce((p, v, i, a) => p + (+callback(v, i, a) || 0), 0) :
            this.reduce((p, v) => p + (+v || 0), 0);
    }),
    statize: describe(function (key) {
        return key ?
            this.reduce((p, e) => {
                const v = e[key];
                p[v] = (p[v] || 0) + 1;
                return p;
            }, {}) :
            this.reduce((p, v) => {
                p[v] = (p[v] || 0) + 1
                return p;
            }, {});
    }),
    indexize: describe(function (key) {
        return this.reduce((p, e) => Object.set(p, e[key], e), {});
    }),
    group: describe(function (key) {
        return (typeof key === "string") ?
            this.reduce((p, e) => {
                const v = e[key];
                p[v] ? p[v].push(e) : Object.set(p, v, [e]);
                return p;
            }, {}) :
            this.reduce((p, e) => {
                const peek = p.peek();
                peek && peek.length < key ? peek.push(e) : p.push([e]);
                return p;
            }, []);
    }),
    serialize: describe(function (callback, thisArg) {
        if (typeof callback === "function") {
            thisArg && callback.bind(thisArg);
            return this.reduce((p, v, i, a) => Object.set(p, v, callback(v, i, a)), {});
        }
        return this.reduce((p, v) => Object.set(p, v, callback), {});
    }),
    equals: describe(function (other, deep = false, sorted = true) {
        if (!Array.isArray(other) || this.length !== other.length) return false;

        return deep ? (
            sorted ?
                this.every((v, i) => (typeof v === "object") ? v.equals(other[i], true, true) : v === other[i]) :
                this.every((v, i) => (typeof v === "object") ? v.equals(other[i], true, false) : other.includes(v))
            ) :
            sorted ? this.every((v, i) => v === other[i]) : this.every(v => other.includes(v));
    }),
    clone: describe(function (deep = false) {
        return deep ?
            this.reduce((p, v) => p.add((typeof v === "object") ? v.clone(true) : v), []) :
            this.concat();
    }),
    forEachAsync: describe(async function (callback, thisArg) {
        thisArg && (callback = callback.bind(thisArg));
        for (const i in this)
            await callback(this[i], i, this);
    }),
    forEachRight: describe(function (callback, thisArg) {
        thisArg && (callback = callback.bind(thisArg));
        for (let i = this.length - 1; i >= 0; i--)
            callback(this[i], i, this);
    }),
    forEachRightAsync: describe(async function (callback, thisArg) {
        thisArg && (callback = callback.bind(thisArg));
        for (let i = this.length - 1; i >= 0; i--)
            await callback(this[i], i, this);
    }),
});

Object.defineProperties(Math, {
    sum: describe(function (...values) {
        return values.reduce((p, v) => p + (Array.isArray(v) ? Math.sum(...v) : v), 0);
    }),
    gcd: describe(function (...values) {
        //NOTE Since there is a limited precision we need to limit the value. so if (b < 0.0000001) return a;
        const gcd = (a, b) => b ? (b < 0.0000001 ? a : gcd(b, a % b)) : (b === 0 ? a : NaN);
        return values.reduce((p, v) => gcd(v, p), 0);
    }),
    lcm: describe(function (...values) {
        const lcm = (a, b) => (a * b) / Math.gcd(a, b);
        return values.reduce((p, v) => lcm(v, p), 1);
    }),
    clamp: describe(function (value, min = Number.MIN_VALUE, max = Number.MAX_VALUE) {
        max < min && ([max, min] = [min, max]);
        const mid = min > value ? min : value;
        return mid < max ? mid : max;
    }),
    inRange: describe(function (value, min, max, inclusive = true) {
        max < min && ([max, min] = [min, max]);
        return inclusive ? (value >= min && value <= max) : (value > min && value < max);
    }),
    toRadian: describe(function (degrees) {
        return (Math.PI * degrees) / 180;
    }),
    toDegree: describe(function (radians) {
        return (radians * 180) / Math.PI;
    }),
    randomInt: describe(function (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, inclusive = true) {
        return Math.floor(Math.random() * (max - min + (inclusive ? 1 : 0)) + min);
    }),
    rotate: describe(function (x, y, degree, center = [0, 0]) {
        const radian = Math.toRadian(degree), sin = Math.sin(radian), cos = Math.cos(radian);
        return [center[0] + cos * x - sin * y, center[1] + cos * y + sin * x];
    }),
});

Object.defineProperties(Number, {
    UNITS: describe(["k", "M", "G", "T", "P", "E", "Z", "Y"], false, false),
});

Object.defineProperties(Number.prototype, {
    clamp: describe(function (min, max) {
        return Math.clamp(+this, min, max);
    }),
    round: describe(function (digits = 0, mode = "halfup") {
        const abs = Math.abs(+this);
        const pow = 10 ** digits;
        const positive = (+this >= 0);

        if (mode.includes("half")) {
            const at = (Math.floor(abs * pow * 10) % 10);
            switch (mode) {
                case "halfceil" : mode = positive ? "halfup" : "halfdown"; break;
                case "halffloor": mode = positive ? "halfdown" : "halfup"; break;
            }
            switch (mode) {
                case "halfup"   : mode = (at >= 5) ? "up" : "down"; break;
                case "halfdown" : mode = (at >= 6) ? "up" : "down"; break;
                case "halfeven" : mode = (at >= 6 - Math.floor(abs * pow) % 2) ? "up" : "down"; break;
            }
        }
        switch (mode) {
            case "up"   : return Math.ceil(abs * pow) / pow * (positive ? 1 : -1);
            case "down" : return Math.floor(abs * pow) / pow * (positive ? 1 : -1);
            case "ceil" : return Math.ceil(+this * pow) / pow;
            case "floor": return Math.floor(+this * pow) / pow;
        }
    }),
    format: describe(function (type = "fixed", config = {}) {
        switch (type) {
            case "p": case "separated": {
                config = Object.cover({ round: "halfup", zero: false, prefix: "", suffix: "", group: { integer: 3, fraction: 3 }, separator: { integer: ",", decimal: ".", fraction: " " } }, config);

                const parts = `${ config.digits === undefined ? this : (+this).format("fixed", config) }`.split(".");
                const integer = config.group.integer && config.separator.integer ? parts[0].replace(new RegExp(`\\B(?=(\\d{${ config.group.integer }})+(?!\\d))`,"g"), config.separator.integer) : parts[0];
                return parts[1] ?
                    (config.prefix + integer + config.separator.decimal + (config.group.fraction && config.separator.fraction ? parts[1].replace(new RegExp(`(\\d{${ config.group.fraction }})`,"g"), `$1${ config.separator.fraction }`) : parts[1]) + config.suffix) :
                    (config.prefix + integer + config.suffix);
            }
            case "s": case "shorten": {
                config = Object.cover({ digits: 0, round: "down", zero: false, separator: { unit: "" } }, config);

                for (let i = Number.UNITS.length - 1; i >= 0; i--) {
                    const decimal = 1000 ** (i + 1);
                    if (Math.abs(+this) >= decimal)
                        return (this / decimal).format("fixed", config) + config.separator.unit + Number.UNITS[i];
                }
                return (+this).format("fixed", config);
            }
            case "e": case "exponential": {
                config = Object.cover({ round: "halfup", zero: false, separator: { exponent: "e" } }, config);

                const expo = (+this).toExponential();
                if (config.digits === undefined)
                    return expo.replace("e", config.separator.exponent);
                else {
                    const parts = expo.split("e");
                    return (+parts[0]).format("fixed", config) + config.separator.exponent + parts[1];
                }
            }
            case "f": case "fraction": {
                config = Object.cover({ separator: { decimal: " ", fraction: "/" } }, config);

                const [integer, fraction] = `${ this }`.split(".");
                if (!fraction) return integer;

                const zero = (integer === "0") || (integer === "-0");
                const den = 10 ** fraction.length;
                const div = Math.gcd(+fraction, den);
                return (zero ? (+this >= 0 ? "" : "-") : (integer + config.separator.decimal)) + (+fraction / div) + config.separator.fraction + (den / div);
            }
            default: {
                typeof config.zero === "boolean" && (config.zero = config.zero ? "0" : "");
                config = Object.cover({ digits: 0, round: "halfup", zero: "0" }, config);

                const num = (+this).round(config.digits, config.round);
                if (config.digits > 0 && config.zero) {
                    const str = num + (`${ num }`.includes(".") ? "" : ".");
                    return str + Array.build(config.digits - (str.length - str.indexOf(".") - 1), config.zero).join("");
                }
                else return `${ num }`;
            }
        }
    }),
});

Object.defineProperties(String.prototype, {
    resolve: describe(function (source, separator = /\[|\]|\.|\/|:/g) {
        const path = this.split(separator).remove(v => !v);
        return source ? path.reduce((p, v) => p[v], source) : path;
    }),
    format: describe(function (...args) {
        const source = Object.assign({}, ...args.filter(v => typeof v === "object" && !Array.isArray(v)));
        const tags = [...this.matchAll(/\{ *(.+?) *\}/g)].deduplicate(([match]) => match);
        return tags.reduce((p, [match, tag]) => {
            const options = tag.match(/(\d+):\[(.+?)\]/);
            options && (options[2] = options[2].split("|").map(v => v === "*" ? args[options[1]] : v));
            return p.replace(match, isNaN(+tag) ? (options ? options[2][(+args[options[1]]).clamp(0, options[2].length - 1)] : tag.resolve(source)) : args[tag]);
        }, this);
    }),
    toSnackCase: describe(function (separator = false, upperCase = (separator === true)) {
        return this.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
            .map(s => upperCase ? s.toUpperCase() : s.toLowerCase())
            .join(typeof separator === "string" ? separator : (separator ? "_" : "-"));
    }),
    toCamelCase: describe(function (pascal = false) {
        return this.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
            .map((s, i) => !pascal && !i ? s.toLowerCase() : s[0].toUpperCase() + s.substr(1).toLowerCase())
            .join("");
    }),
});

Object.defineProperties(window, {
    sleep: describe(function (timeout = 200) {
        return new Promise(resolve => window.setTimeout(resolve, timeout));
    }),
    forEach: describe(function (condition, callback, thisArg) {
        condition = alter(condition);
        thisArg && (callback = callback.bind(thisArg));

        for (let i = condition[0]; Math.inRange(i, condition[0], condition[1]); i = i + condition[2])
            callback(thisArg, i);
    }),
    forEachAsync: describe(async function (condition, callback, thisArg) {
        condition = alter(condition);
        thisArg && (callback = callback.bind(thisArg));

        for (let i = condition[0]; Math.inRange(i, condition[0], condition[1]); i = i + condition[2])
            await callback(thisArg, i);
    }),
});

function describe(value, writable = true, configurable = true, enumerable = false) {
    if (value.get || value.set)
        return { ...value, configurable, enumerable, writable };
    else return { value, configurable, enumerable, writable };
}

function alter(condition) {
    if (typeof condition === "number")
        condition = [0, condition, 1];
    else {
        condition[1] || (condition[1] = 0);
        condition[2] || (condition[2] = condition[0] < condition[1] ? 1 : -1);
    }
    return condition;
}
