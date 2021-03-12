import BaseLangFile from "@/utils/langs/BaseLangFile";
import { Singletonize } from "@/utils/mvvm/Decorators";
import { LayaUtils } from "@/utils";

export type Locale = { code: string, name: string, messages?: Dict<string>, config?: Dict<string> };
type LangsOutline = Dict<Omit<Locale, "code">>;

@Singletonize()
export default class LangManager extends Laya.EventDispatcher
{
    static readonly instance: LangManager;

    private _localeCode!: string;

    private _langsOutline!: LangsOutline;
    private _langPath!: string;
    private _langFile!: BaseLangFile;

    private _langRegExp!: RegExp;

// #[Public Methods] ---------- + ---------- + ---------- + ----------
    /**
     * Initialize the path to the language file and set the default language
     * @param localeCode The code of the default language
     * @param outlinePath The path to language's outline
     * @param langPath The paths of all languages' files, and replace any languages with `{*}`
     * @param langClass The class for defining the indexes of language
     * @param onCompleted The callback for completing loading the languages' files
     */
    init<T extends BaseLangFile>(localeCode: string, outlinePath: string, langPath: string, langClass: { new(): T }, onCompleted?: () => void) {
        if (!langPath.includes("{*}"))
            throw new Error(`The path to the language's file has to include '{*}'] (Path: ${ langPath })`);

        this._langPath = langPath;
        this._langFile = new langClass();
        this.setOutline(outlinePath).once(Laya.Event.LOADED, this, () => this.setLocale(localeCode, onCompleted));
    }

    /** Set the code of new language [設置新語系的編碼] */
    setLocale(localeCode: string, onCompleted?: () => void) {
        this._langFile.setPath(this._langPath.replace("{*}", this._localeCode = localeCode));
        onCompleted && this._langFile.once(Laya.Event.COMPLETE, this, onCompleted);
    }

    /** Set the default text into the specific root node */
    setDefaltText(root: (Laya.Node | fgui.GComponent) & Dict) {
        const rootTags = this._langFile.getDefaltTexts(root.constructor.name.replace(/(UI)?(_\w+)?/g, ""));

        if (root instanceof Laya.Node) {
            rootTags?.forEach((text, tag) => {
                const child = tag.resolve<Laya.Node>(root);

                if (child) {
                    if (child instanceof Laya.HTMLDivElement) child.innerHTML = text;
                    else if (child instanceof Laya.TextInput || child instanceof Laya.Input) child.prompt = text;
                    else if (child instanceof Laya.Label || child instanceof Laya.Text) child.text = text;
                    else if (child instanceof Laya.Button) child.label = text;
                    else if (child instanceof Laya.ComboBox) child.labels = text;
                }
                else console.info(`The root \`${ root.constructor.name }\` doesn't have the specific child \`${ tag }\``);
            });
            this.replaceSkins(root);
        }
        else if (root instanceof fgui.GComponent) {
            rootTags?.forEach((text, tag) => {
                const child = tag.resolve<fgui.GObject & { title: string, titleObject?: fgui.GTextField }>(root);

                if (child) {
                    if (child instanceof fgui.GTextInput) child.promptText = text;
                    else if (child instanceof fgui.GBasicTextField) child.text = text;
                    else if (child.titleObject) child.title = text;
                    else console.info(`The root \`${ root.constructor.name }\` doesn't have the specific child \`${ tag }.title\``);
                }
                else console.info(`The root \`${ root.constructor.name }\` doesn't have the specific child \`${ tag }\``);
            });
        }
    }

    /** Get the file of the current languages */
    getLangFile<T extends BaseLangFile>() {
        return this._langFile as T;
    }

// #[Private Methods] ---------- + ---------- + ---------- + ----------
    /** Load and set the outline of languages */
    private setOutline(path: string) {
        if (path.search(/\.json$/) === -1) 
            throw new Error(`The path to the languages' outline doesn't support non-.json files (Path: ${ path })`);

        Laya.loader.load(path, Laya.Handler.create(this, (outline: LangsOutline) => {
            this._langsOutline = outline;
            this._langRegExp = new RegExp(`/(${ Object.keys(outline).join("|") })/`, "g");

            Laya.loader.clearRes(path);
            this.event(Laya.Event.LOADED);
        })
        , null, Laya.Loader.JSON);

        return this;
    }

    /** Replace the texture of the node and its children according to the current language */
    private replaceSkins(parent: Laya.Node & { skin?: string }) {
        parent.skin &&= parent.skin.replace(this._langRegExp, `/${ this._localeCode }/`);
        LayaUtils.getChildren(parent, Laya.UIComponent, child => this.replaceSkins(child));
    }

    // #[Accessors] ---------- + ---------- + ---------- + ----------
    /** The information of current language */
    get locale() {
        return Object.assign({ code: this._localeCode }, this._langsOutline[this._localeCode]) as Locale;
    }

    /** The outline of all the languages */
    get langsOutline() {
        return this._langsOutline;
    }
}
