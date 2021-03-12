type RootsTags = { [root: string]: { [tag: string]: string } };
type LangData = { roots: RootsTags, tags: { [tag: string]: any } };

export default class BaseLangFile extends Laya.EventDispatcher
{
    /** Default text for the root node, such as `Laya.Scene`, etc. */
    protected _rootsTags!: RootsTags;

// #[Public Methods] ---------- + ---------- + ---------- + ----------
    /** Load the path to `.json` file, and update the config of the language */
    setPath(path: string) {
        if (path.search(/\.json$/) === -1)
            throw new Error(`The path to the language's file doesn't support non-.json files (Path: ${ path })`);
            
        Laya.loader.load(path, Laya.Handler.create(this, this.onLoaded, [path]), null, Laya.Loader.JSON);
        return this;
    }

    /** Get the default text of the specific root node */
    getDefaltTexts(rootName: string) {
        return this._rootsTags[rootName];
    }

// #[Private Events] ---------- + ---------- + ---------- + ----------
    /** Handle the completed language file */
    protected onLoaded(path: string, { roots, tags }: LangData) {
        // Create a list of languages
        this._rootsTags = roots;
        Object.assign(this, tags);

        this.event(Laya.Event.COMPLETE, [path]);
    }
}
