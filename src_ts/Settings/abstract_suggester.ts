
import { AbstractInputSuggest, App, normalizePath, TFile, TFolder } from 'obsidian';

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	private folders: TFolder[];
	private inputEl: HTMLInputElement;

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);

		this.inputEl = inputEl;
		this.folders = this.app.vault.getAllFolders(true);
	}

	getSuggestions(inputStr: string): TFolder[] {
		const inputLower = inputStr.toLowerCase();

		return this.folders.filter((folder) => folder.path.toLowerCase().includes(inputLower));
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
	private files: TFile[];
	private inputEl: HTMLInputElement;

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);

		this.inputEl = inputEl;
        this.files = this.app.vault.getFiles();
	}

	getSuggestions(inputStr: string): TFile[] {
		const inputLower = inputStr.toLowerCase();

		return this.files.filter((f) => f.path.toLowerCase().includes(inputLower));
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