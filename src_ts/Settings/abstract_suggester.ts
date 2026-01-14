
import { AbstractInputSuggest, App, normalizePath, TFile, TFolder } from 'obsidian';

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	private inputEl: HTMLInputElement;

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);

		this.inputEl = inputEl;
	}

	getSuggestions(inputStr: string): TFolder[] {
		const inputLower = inputStr.toLowerCase();

		return this.app.vault.getAllFolders(true).filter((folder) => folder.path.toLowerCase().includes(inputLower));
	}

	renderSuggestion(value: TFolder, el: HTMLElement): void {
		el.setText(normalizePath(value.path));
	}

	selectSuggestion(value: TFolder): void {
		this.inputEl.value = normalizePath(value.path);
		const event = new Event("input");
		this.inputEl.dispatchEvent(event);
		this.close();
	}
}

export class FileSuggest extends AbstractInputSuggest<TFile> {
	private inputEl: HTMLInputElement;

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);

		this.inputEl = inputEl;
	}

	getSuggestions(inputStr: string): TFile[] {
		const inputLower = inputStr.toLowerCase();

		return this.app.vault.getFiles().filter((f) => f.path.toLowerCase().includes(inputLower));
	}

	renderSuggestion(value: TFile, el: HTMLElement): void {
		el.setText(normalizePath(value.path));
	}

	selectSuggestion(value: TFile): void {
		this.inputEl.value = normalizePath(value.path);
		const event = new Event("input");
		this.inputEl.dispatchEvent(event);
		this.close();
	}
}

export class PropertySuggest extends AbstractInputSuggest<string> {
	private inputEl: HTMLInputElement;

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);

		this.inputEl = inputEl;
	}

	getSuggestions(inputStr: string): string[] {
		const inputLower = inputStr.toLowerCase();

		return this.getAllProperties().filter((f) => f.toLowerCase().includes(inputLower));
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value);
	}

	selectSuggestion(value: string): void {
		this.inputEl.value = value;
		const event = new Event("input");
		this.inputEl.dispatchEvent(event);
		this.close();
	}

	private getAllProperties(): Array<string> {
        const properties = new Set<string>();
        
        // Get all markdown files in the vault
        const files = this.app.vault.getMarkdownFiles();
        
        // Iterate through each file
        files.forEach((file: TFile) => {
            // Get the cached metadata for this file
            const cache = this.app.metadataCache.getFileCache(file);
            
            // If frontmatter exists, add all property keys
            if (cache?.frontmatter) {
                Object.keys(cache.frontmatter).forEach(key => {
                    // Skip the 'position' key as it's added by Obsidian internally
                    if (key !== 'position') {
                        properties.add(key);
                    }
                });
            }
        });
        
        return Array.from(properties);
    }
}