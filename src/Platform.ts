export default class Platform 
{
    /** The minimum width of screen for a television [電視螢幕或 Full HD (1080P) 解析度的最小寬度] */
    static readonly SCREEN_TELEVISION: number = 1920 - 16;
    /** The minimum width of screen for a desktop [桌上型電腦螢幕或 HD (720P) 解析度的最小寬度] */
    static readonly SCREEN_DESKTOP: number = 1280 - 16;
    /** The minimum width of screen for a laptop [筆電螢幕的最小寬度] */
    static readonly SCREEN_LAPTOP: number = 960;
    /** The minimum width of screen for a tablet [平板螢幕的最小寬度] */
    static readonly SCREEN_TABLET: number = 600;

    /** What's current screen is determined by the width (or height in landscape) of the browser [目前的螢幕類型是根據於瀏覽器的寬度 (或橫向高度)] */
    static get screen() {
        const width = Platform.orientation.isPortrait ? window.innerWidth : window.innerHeight;
        return {
            isTelevision: width >= Platform.SCREEN_TELEVISION,

            /** Whether it's a desktop (television included) */
            isDesktop: width >= this.SCREEN_DESKTOP,
            isLaptop : width >= this.SCREEN_LAPTOP && width < this.SCREEN_DESKTOP,
            isTablet : width >= this.SCREEN_TABLET && width < this.SCREEN_LAPTOP,
            isPhone  : width < this.SCREEN_TABLET,

            /** Whether it's a mobile (`isPhone` or `isTablet`) */
            isMobile: width < this.SCREEN_LAPTOP,
        };
    }

    /** What's current orientation is determined by the aspect ratio of the browser [目前的螢幕方向是根據於瀏覽器的長寬比] */
    static get orientation() {
        const ratio = window.innerWidth / window.innerHeight;
        return {
            isPortrait: ratio <= 13 / 9,
            isLandscape: ratio > 13 / 9,
        };
    }

    /** What's the system or device is determined by `userAgent` [系統或裝置類型是根據於 `userAgent`] */
    static get system() {
        const ua = navigator.userAgent;
        return {
            isWindows: ua.includes("Windows NT"),
            isWindows10: ua.includes("Windows NT 10"),
            isMacOS: ua.includes("Macintosh"),
            isLinux: ua.includes("Linux") || ua.includes("Ubuntu"),
            isUbuntu: ua.includes("Ubuntu"),

            isAndroid: ua.includes("Android") || ua.includes("Adr"),
            isIOS: !!ua.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/),
            isIPhone: ua.includes("iPhone"),
            isIPad: ua.includes("iPad"),
            
            /** Whether it's a mobile (`isAndroid`, or `isIOS`, etc.) */
            isMobile: !!ua.match(/AppleWebKit.*Mobile.*/),
        };
    }

    /** What's the browser is determined by `userAgent` [瀏覽器類型是根據於 `userAgent`] */
    static get browser() {
        const ua = navigator.userAgent;
        return {
            /** Whether it's a IE kernel */
            isTrident: ua.includes("Trident"),
            /** Whether it's a Opera kernel */
            isPresto: ua.includes("Presto"),
            /** Whether it's a Apple、Chrome、Webkit kernel */
            isWebKit: ua.includes("AppleWebKit"),
            /** Whether it's a Firefox kernel */
            isGecko: ua.includes("Gecko") && !ua.includes("KHTML"),

            /** Whether it's a WeChat */
            isWeixin: ua.includes("MicroMessenger"),
            /** Whether it's a QQ Broswer */
            isQQ: !!ua.match(/\sQQ/i),
            /** Whether it's a UC Broswer */
            isUC: ua.includes("UCBrowser"),

            /** Whether it's a Opera */
            isOpera: ua.includes("Opera"),
            /** Whether it's a Maxthon */
            isMaxthon: ua.includes("Maxthon"),
            /** Whether it's a IE */
            isIE: ua.includes("compatible") && ua.includes("MSIE") && !ua.indexOf("Opera"),
            /** Whether it's a Firefox */
            isFirefox: ua.includes("Firefox") || ua.includes("FxiOS"),
            /** Whether it's a Safari */
            isSafari: ua.includes("Safari") && ua.indexOf("Chrome") < 1,
            /** Whether it's a Chrome */
            isChrome: ua.includes("Chrome") || ua.includes("CriOS"),
            
            /** Whether it's a Web app (No head and bottom) */
            isWebApp: ua.indexOf("Safari") === -1,
        };
    }

    /** The Current language of the device */
    static get language() {
        return navigator.language;
    }

    /** Enable Eruda console for testing */
    static enableEruda() {
        const script = document.createElement("script");
              script.src = "//cdn.jsdelivr.net/npm/eruda";
              script.onload = () => {
                const eruda = (window as any).eruda;
                      eruda.init();
                      eruda.position({ x: window.innerWidth - 50, y: window.innerHeight - 165 });
                window.addEventListener("resize", () => setTimeout(() => eruda.position({ x: window.innerWidth - 50, y: window.innerHeight - 165 }), 200));
                console.info(navigator.userAgent);
              };
        document.body.appendChild(script);
    }
}
