export type Point = { x: number, y: number, z?: number };
export type Rect = { x: number, y: number, width: number, height: number, right?: number, bottom?: number };
export type Vector = [number, number, ...number[]];
export type Polygon = [number, number, number, number, number, number, ...number[]];
export type Radius = number | [number, number, number, number];

export type LoaderOptions = {
    group?: string,
    progress?: (ratio: number, data: { count: number, total: number, url: string, res: any }) => void,
    type?: string | Dict<string>,
    priority?: number,
    cache?: boolean,
    ignoreCache?: boolean,
    useWorkerLoader?: boolean
};

export class GeoUtils {
    /** Check if the point is on the line [檢查點是否在線上] */
    static isOnLine([px, py]: number[], [sx, sy, tx, ty]: number[]) {
        const isCross = GeoUtils.getCross([sx, sy, px, py], [sx, sy, tx, ty]) === 0;
        const isBetween = Math.min(sx, tx) <= px && px <= Math.max(sx, tx) && Math.min(sy, ty) <= py && py <= Math.max(sy, ty);
        return isCross && isBetween;
    }

    /** Check if the point is in the circle [檢查點是否在圓形中] **/
    static isInCircle([px, py]: number[], [cx, cy, radius]: number[]) {
        return GeoUtils.getDistance([px, py], [cx, cy]) <= radius;
    }

    /** Check if the point is in the polygon [檢查點是否在多邊形中] **/
    static isInPolygon([px, py]: number[], polygon: Polygon) {
        GeoUtils.assertPolygon(polygon);

        let isInside = false;
        for (let i = 0, j = polygon.length - 2, max = polygon.length; i < max; j = i, i += 2) {
            const sx = polygon[i], sy = polygon[i + 1];
            const tx = polygon[j], ty = polygon[j + 1];
            const intersect = ((sy > py) !== (ty > py)) && (px < (tx - sx) * (py - sy) / (ty - sy) + sx);

            if (intersect) isInside = !isInside;
        }
        return isInside;
    }

    /** Check if two lines are intersected [檢查兩條線是否相交] */
    static isInterLine([px, py, qx, qy]: number[], [sx, sy, tx, ty]: number[]) {
        const st_ps = GeoUtils.getCross([sx, sy, tx, ty], [px, py, sx, sy]);
        const pq_ps = GeoUtils.getCross([px, py, qx, qy], [px, py, sx, sy]);
        const pq_st = GeoUtils.getCross([px, py, qx, qy], [sx, sy, tx, ty]);

        // 當角度為 0 或 180 度時，平行或共線而不相交
        if (pq_st !== 0) {
            const ua = st_ps / pq_st;
            const ub = pq_ps / pq_st;
            if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) return true;
        }
        return false;
    }

    /** Check if line and polygon are intersected [檢查線與多邊形是否相交] */
    static isInterPolygon([px, py, qx, qy]: number[], polygon: Polygon) {
        GeoUtils.assertPolygon(polygon);

        for (let i = 0, j = polygon.length - 2, max = polygon.length; i < max; j = i, i += 2) {
            if (GeoUtils.isInterLine([px, py, qx, qy], [polygon[i], polygon[i + 1], polygon[j], polygon[j + 1]]))
                return true;
        }
        return false;
    }

    /** Check if the two circles are overlapped [檢查兩個圓形是否重疊] */
    static isOverCircles([cx0, cy0, radius0]: number[], [cx1, cy1, radius1]: number[]) {
        return GeoUtils.getDistance([cx0, cy0], [cx1, cy1]) < (radius0 + radius1);
    }

    /** Check if the circle and polygons are overlapped [檢查圓形與多邊形是否重疊] */
    static isOverCirclePolygon([cx, cy, radius]: number[], polygon: Polygon) {
        GeoUtils.assertPolygon(polygon);

        // 檢查圓心是否在多邊形內
        if (GeoUtils.isInPolygon([cx, cy], polygon))
            return true;

        // 檢查多邊形每邊到圓心的距離是否小於半徑，則相交
        for (let i = 0, j = polygon.length - 2, max = polygon.length; i < max; j = i, i += 2) {
            if (GeoUtils.getDistanceLine([cx, cy], [polygon[i], polygon[i + 1], polygon[j], polygon[j + 1]]) < radius)
                return true;
        }
        return false;
    }

    /** Check if the two polygons are overlapped [檢查兩個多邊形是否重疊] */
    static isOverPolygons(polygon0: Polygon, polygon1: Polygon) {
        GeoUtils.assertPolygon(polygon0);
        GeoUtils.assertPolygon(polygon1);

        for (let i = 0, j = polygon0.length - 2, max = polygon0.length; i < max; j = i, i += 2) {
            // 檢查 polygon0 是否在 polygon1 內
            if (GeoUtils.isInPolygon([polygon0[i], polygon0[i + 1]], polygon1))
                return true;

            // 檢查兩多邊形的邊是否相交
            if (GeoUtils.isInterPolygon([polygon0[i], polygon0[i + 1], polygon0[j], polygon0[j + 1]], polygon1))
                return true;
        }
        for (let i = 0, j = polygon1.length - 2, max = polygon1.length; i < max; j = i, i += 2) {
            // 檢查 polygon1 是否在 polygon0 內
            if (GeoUtils.isInPolygon([polygon1[i], polygon1[i + 1]], polygon0))
                return true;
        }
    }

    /** Get the distance between two points [取得兩點間的距離] */
    static getDistance([px, py]: number[], [sx, sy]: number[]) {
        const dx = sx - px, dy = sy - py;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get the distance between point and line [取得點與線的距離]
     * @param isSegment 視為線段時，若點不垂足於線段內，則計算點與線段端點的距離
     */
    static getDistanceLine([px, py]: number[], [sx, sy, tx, ty]: number[], isSegment = true) {
        const dx = tx - sx, dy = ty - sy;
        const d = dx * dx + dy * dy;
        const t = ((px - sx) * dx + (py - sy) * dy) / d;

        let target: [number, number] = [sx + t * dx, sy + t * dy];

        if (isSegment) {
            if (d !== 0) {
                if (t < 0) target = [sx, sy];
                else if (t > 1) target = [tx, ty];
            }
            else target = [sx, sy];
        }
        return GeoUtils.getDistance([px, py], [target[0], target[1]]);
    }

    /** Get the area of the circle [取得圓的面積] */
    static getCircleArea(radius0: number, radius1?: number) {
        if (radius1 === undefined) radius1 = radius0;
        return radius0 * radius1 * Math.PI;
    }

    /** Get the area of the polygon [取得多邊形的面積] */
    static getPolygonArea(polygon: Polygon) {
        GeoUtils.assertPolygon(polygon);

        let area = 0;
        for (let i = 0, j = polygon.length - 2, max = polygon.length; i < max; j = i, i += 2)
            area += polygon[i] * polygon[j + 1] - polygon[i + 1] * polygon[j];

        return Math.abs(area / 2);
    }

    /** Get the bound of the polygon [取得多邊形的邊界] */
    static getBound(polygon: Polygon): Rect {
        GeoUtils.assertPolygon(polygon);

        const xs: number[] = [], ys: number[] = [];
        for (let i = 0, max = polygon.length; i < max; i++) {
            if (i % 2 === 0) xs.push(polygon[i]);
            else ys.push(polygon[i]);
        }

        const x = Math.min(...xs), right = Math.max(...xs);
        const y = Math.min(...ys), bottom = Math.max(...ys);
        return { x, y, right, bottom, width: right - x, height: bottom - y };
    }

    /** Get the cross product of two vectors, (p to q) and (s to t) [取得兩向量的向量積、叉積] */
    static getCross([px, py, qx, qy]: number[], [sx, sy, tx, ty]: number[]) {
        return (ty - sy) * (qx - px) - (tx - sx) * (qy - py);
    }

    /** Convert the rectangle to the polygon */
    static toPolygon(rect: Rect): Polygon;
    static toPolygon(x: number, y: number, width: number, height: number): Polygon;
    static toPolygon(x: Rect | number, y = 0, width = 0, height = 0) {
        if (typeof x !== "number")
            ({ x, y, width, height } = x);

        return [x, y, x + width, y, x + width, y + height, x, y + height];
    }

    /** Assert if it is the polygon */
    private static assertPolygon(polygon: Polygon) {
        if (polygon.length < 6 && polygon.length % 2 !== 0)
            throw new Error("The length of the polygon's array must be not less than 6 and be even [多邊形的陣列長度必須不少於 6 個且必為偶數]");
    }
}
    
export class StringUtils {
    static readonly ROUND_NUM_SYMBOLS = "⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";

    /** Cut the string in the specific amount of bytes, and get the real amount of bytes */
    static cut(text: string, numBytes?: number) {
        if (numBytes !== undefined && numBytes <= 0)
            throw new TypeError("The parameter `trim` can't be less than or equal to `0`");

        let bytes = 0, result = text;

        for (let i = 0, max = text.length; i < max; i++) {
            let code = text.charCodeAt(i);
            while (code > 0) {
                code = code >> 8;
                bytes++;

                if (numBytes !== undefined && result === text && bytes >= numBytes)
                    result = text.substr(0, i + 1);
            }
        }
        return { text: result, bytes };
    }
}
    
export class ColorUtils {
    /** Input `rgb(#, #, #)` or `rgba(#, #, #, #)` in css format, and output `#rrggbb` in html format */
    static toHex(rgb: string): string;
    /** Input red, green, blue in number that range from `0` to `255`, and output `#rrggbb` in html format */
    static toHex(r: number, g: number, b: number): string;
    static toHex(r: string | number, g?: number, b?: number) {
        let hexs: string[] = [];

        // The opacity of RGBA is ignored [忽略 RGBA 的不透明度]
        if (typeof r === "string")
             hexs = r.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i)!;
        else hexs = ["", `${ r }`, `${ g }`, `${ b }`];

        return (hexs?.length === 4) ? `#${ `0${ (+hexs[1]).toString(16) }`.slice(-2) }${ `0${ (+hexs[2]).toString(16) }`.slice(-2) }${ `0${ (+hexs[3]).toString(16) }`.slice(-2) }` : "";
    }
    
    /** Input `#rrggbb` in html format, and output `rgb(#, #, #)` or `rgba(#, #, #, #)` in css format */
    static toRgb(hex: string, opacity?: number, cssFormat?: true): string;
    /** Input `#rrggbb` in html format, and output a RGBA object */
    static toRgb(hex: string, opacity?: number, cssFormat?: false): { r: number, g: number, b: number, a: number };
    static toRgb(hex: string, opacity = 1, cssFormat = true) {
        const rgb = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        const result = rgb && { r: +`0x${ rgb[1] }`, g: +`0x${ rgb[2] }`, b: +`0x${ rgb[3] }`, a: opacity };

        if (cssFormat) {
            if (opacity >= 1) return result ? `rgb(${ result.r }, ${ result.g }, ${ result.b })` : "";
            else return result ? `rgba(${ result.r }, ${ result.g }, ${ result.b }, ${ opacity })` : "";
        }
        else return result;
    }
}

export class FuncUtils {
    /** Delay execute the specific function */
    static debounce(callback: (updates: any) => void, delay = 500) {
        let timeout: number;

        return function(this: any, ...args: any[]) {
            clearTimeout(timeout);
            timeout = window.setTimeout(() => callback.apply(this, (args as any)), delay);
        };
    }

    /**
     * Use `awiat` to wait for the specific milliseconds [使用 `awiat` 等待特定毫秒數]
     * @param timeout The specific milliseconds (default: `200`)
     * 
     * @example
     * await sleep(1000);    // wait for 1 second
     * await sleep(2000, resolve => done && resolve());    // wait for 2 seconds, or end it early if done
     */
    static sleep(timeout = 200, callback?: (resolve: () => void, timeoutId: number) => void) {
        let timeoutId: number;
        return new Promise<void>(resolve => {
            timeoutId = window.setTimeout(resolve, timeout);
            callback?.(resolve, timeoutId);
        }).then(() => window.clearTimeout(timeoutId));
    }

    /**
     * Loop to check if the result is `true` or non-null [循環檢查結果是否為 `true` 或非空值]
     * @param attempt The number of attempt to check the result (default: `0`, Infinite loop)
     * 
     * @example
     * await check(() => fromServer.data, 1000);    // including the first time, loop to check if the `fromServer.data` has any value
     */
    static async check<T>(predicate: () => false | T, interval?: number): Promise<T>;
    static async check<T>(predicate: () => false | T, interval?: number, attempt?: number): Promise<T | undefined>;
    static async check<T>(predicate: () => false | T, interval = 200, attempt = 0) {
        attempt = (attempt <= 0) ? -1 : attempt;

        while (attempt !== 0) {
            const result = predicate();
            if (typeof result === "number" || result) return result;
            if (attempt > 0) attempt--;

            await FuncUtils.sleep(interval);
        }
    }

    static setProps<T>(target: Dict, matcher: string | RegExp, handle: (key: string, value: T) => void) {
        Object.keys(target).forEach(prop => (prop.match(matcher)?.length === 1) && handle(prop, target[prop]));
    }
}

export class HtmlUtils {
    /** @example Utils.addStyles(".class", { width: "100px", height: 100px, ... }); */
    static addStyles(selectors: string, styles: { [key: string]: string }) {
        document.querySelectorAll(selectors).forEach(elem => {
            if (elem instanceof HTMLElement)
                Object.keys(styles).forEach(key => (elem.style as any)[key] = styles[key]);
        });
    }

    /** @example Utils.addClass(".class", "className" | ["className1, className2"]); */
    static addClass(selectors: string, classes: string | string[]) {
        if (typeof classes === "string") classes = [classes];

        document.querySelectorAll(selectors).forEach(elem => {
            if (elem instanceof HTMLElement) (classes as string[]).forEach(className => elem.classList.add(className));
        });
    }

    /** @example Utils.removeClass(".class", "className" | ["className1, className2"]); */
    static removeClass(selectors: string, classes: string | string[]) {
        if (typeof classes === "string") classes = [classes];

        document.querySelectorAll(selectors).forEach(elem => {
            if (elem instanceof HTMLElement) (classes as string[]).forEach(className => elem.classList.remove(className));
        });
    }
}

export class LayaUtils {
    /**
     * Encode the svg for Layabox by using html tags to draw the image
     * 
     * @caution 
     * Use `Sprite.loadImage()` to directly load svg data will be fail sometimes, suggest that call this function after calling `Laya.loader.load()` to load svg data
     * 
     * @example 
     * const svgContent = `
     *     <div style="font-size:40px">
     *         <em>I</em> like 
     *         <span style="color: white; text-shadow: 0px 1px 0px #999, 0px 2px 0px #888, 0px 3px 0px #777, 0px 4px 0px #666, 0px 5px 0px #555, 0px 6px 0px #444, 0px 7px 0px #333, 0px 8px 7px #001135;">cheese</span>
     *     </div>`;
     * const svg = LayaUtils.encodeSvg(svgContent, 400, 200, 1.5, true);
     * await new Promise(resolve => Laya.loader.load(svg, Laya.Handler.create(this, textures => resolve(textures))));
     * 
     * const sp = new Laya.Sprite();
     *       sp.loadImage(svg);
     *       Laya.stage.addChild(sp);
     */
    static encodeSvg(content: string, width: number, height: number, scale?: number, useForeignObject?: true): string;
    /**
     * Encode the svg for Layabox by using svg tags to draw the image
     * 
     * @caution 
     * Use `Sprite.loadImage()` to directly load svg data will be fail sometimes, suggest that call this function after calling `Laya.loader.load()` to load svg data
     * 
     * @example 
     * const svgContent = `<path fill="#000000" d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z" />`;
     * const svg = LayaUtils.encodeSvg(svgContent, 24, 24, 8);
     * await new Promise(resolve => Laya.loader.load(svg, Laya.Handler.create(this, textures => resolve(textures))));
     * 
     * const sp = new Laya.Sprite();
     *       sp.loadImage(svg);
     *       Laya.stage.addChild(sp2);
     */
    static encodeSvg(content: string, width: number, height: number, scale?: number, useForeignObject?: false): string;
    static encodeSvg(content: string, width: number, height: number, scale = 1, useForeignObject = false) {
        if (useForeignObject)
            content = `<foreignObject width='100%' height='100%'><body xmlns='http://www.w3.org/1999/xhtml' style="margin: 0; width: 100%; height: 100%">${ content }</body></foreignObject>`;

        content = `<svg xmlns='http://www.w3.org/2000/svg' width='${ width * scale }' height='${ height * scale }' viewBox='0 0 ${ width } ${ height }'>${ content }</svg>`;
        return `data:image/svg+xml,${ content.replace(/\s+/g, " ").replace(/"/g, "'").replace(/%/g, "%25").replace(/#/g, "%23").replace(/{/g, "%7B").replace(/}/g, "%7D").replace(/</g, "%3C").replace(/>/g, "%3E") }`;
    }

    /**
     * Get the children of the specific type or filtered by the specific condition from the parent
     * @param type   the type of the children
     * @param filter the filter's condition of the children
     */
    static getChildren<T extends Laya.Node>(parent: Laya.Node, type?: { new(): T }, filter?: (child: T, index: number) => void | boolean): T[];
    static getChildren<T extends fgui.GObject>(parent: fgui.GComponent, type?: { new(): T }, filter?: (child: T, index: number) => void | boolean): T[];
    static getChildren<T extends Laya.Node | fgui.GObject>(parent: Laya.Node | fgui.GComponent, type?: { new(): T }, filter?: (child: T, index: number) => void | boolean) {
        const children: T[] = [];
        for (let i = 0, max = parent.numChildren; i < max; i++) {
            const child = parent.getChildAt(i) as T;
            const isType = type ? (child instanceof type) : true;
            const isFilter = filter ? filter(child, i) : true;
            
            if (isType && isFilter) children.push(child);
        }
        return children;
    }

    /**
     * @example
     * graphics.fillText("Text", border, border, LayaUtils.getFont(24, true), "#ffffff", "center");
     */
    static getFont(size: number, bold = false, italic = false, font = Laya.Text.defaultFont) {
        return `${ bold ? "Bold" : "" } ${ italic ? "isItalic" : "" } ${ size }px ${ font }`;
    }

    /**
     * Measure the dimension of the text
     * @param size If given parameter `border`, it will calculate the compatible font size
     */
    static measureText(text: string, size: number | { max: number, min?: number, border?: { width?: number, height?: number } }, bold = false, italic = false, font = Laya.Text.defaultFont) {
        typeof size === "number" && (size = { max: size });

        let fontSize = size.max;
        const { width, height } = Object.assign(new Laya.Text(), { text, fontSize, bold, italic, font });

        if (size.border) {
            const ratio = Math.min(1, size.border.width ? (size.border.width / width) : 1, size.border.height ? (size.border.height / height) : 1);
            fontSize = Math.max(fontSize * ratio >> 0, size.min || 0);
        }
        return { width, height, fontSize };
    }

    static loadedFuiAssets = [] as string[];
    static loadRes(url: string | string[], options?: LoaderOptions) {
        Array.isArray(url) || (url = [url]);

        return new Promise<{ url: string, res: any }[]>(resolve => {
            const urls = url as string[];
            const data: { url: string, res: any }[] = [];
            const total = urls.length;

            const complete = (url: string) => Laya.Handler.create(this, (res: any) => {
                const count = data.push({ url, res });
                options?.progress?.(count / total, { count, total, url, res });
                count >= total && resolve(data);
            });
            const progress = (url: string) => Laya.Handler.create(this, (p: number) => {
                const count = data.length + p;
                options?.progress?.(count / total, { count, total, url, res: undefined });
            });

            urls.forEach(url => {
                const ext = url.match(/\.(\w+)$/)?.[1];
                const type = (typeof options?.type === "object") ? ext && options.type[ext] : options?.type;

                if (ext === "fui" && this.loadedFuiAssets.indexOf(url) === -1) {
                    fgui.UIPackage.loadPackage(url.replace(".fui", ""), complete(url), progress(url));
                    this.loadedFuiAssets.push(url);
                }
                else Laya.loader.load(url, complete(url), undefined, type, options?.priority, options?.cache, options?.group, options?.ignoreCache, options?.useWorkerLoader);
            });
        });
    }

    static callLater<T>(callback?: () => T) {
        return new Promise<T>(resolve => {
            Laya.timer.callLater(undefined, resolve, [callback?.()]);
        });
    }

    /** Register the bitmap fonts */
    static registerBmpFonts(fonts: string[], autoScaleSize = false) {
        return new Promise<void>(resolve => {
            fonts.forEach(font => {
                let count = 0;
                const bmpFont = new Laya.BitmapFont();
                      bmpFont.loadFont(`res/casino/fonts/${ font }.fnt`, new Laya.Handler(this, () => {
                        bmpFont.autoScaleSize = autoScaleSize;
                        Laya.Text.registerBitmapFont(font, bmpFont);

                        if (++count >= fonts.length) resolve();
                      }));
            });
        });
    }

    /**
     * Parse the data from FairyGUI
     * @param data the format need to be `key=value` in each line
     */
    static parseData(data: string) {
        return data.split("\n").reduce((p, v) => {
            const split = v.split("=");
            return Object.set(p, split[0], split[1]);
        }, {} as Dict<string>);
    }
}

export function writable<T extends Dict>(target: T): Writable<T>;
export function writable<T extends Dict, U extends boolean>(target: T, deep: U): U extends true ? DeepWritable<T> : Writable<T>;
export function writable(target: Dict) {
    return target;
}

export function readonly<T extends Dict>(target: T): Readonly<T>;
export function readonly<T extends Dict, U extends boolean>(target: T, deep: U): U extends true ? DeepReadonly<T> : Readonly<T>;
export function readonly(target: Dict) {
    return target;
}
