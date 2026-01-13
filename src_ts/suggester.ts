import { App, TFolder, TextComponent } from 'obsidian';

export class Suggester {
    app: App;

    constructor(app: App){
        this.app = app;
    }

    addFileSuggestions(textComponent: TextComponent, onSelect: (value: string) => Promise<void>) {
		const inputEl = textComponent.inputEl;
		const files = this.app.vault.getMarkdownFiles();
		let suggestionEl: HTMLElement | null = null;

		const showSuggestions = () => {
			const query = inputEl.value.toLowerCase();
			
			// Remove existing suggestions
			if (suggestionEl) {
				suggestionEl.remove();
			}

			const filteredFiles = files.filter(file => 
				file.path.toLowerCase().includes(query)
			).slice(0, 10); // Limit to 10 results

			if (filteredFiles.length === 0) return;

			suggestionEl = createDiv({ cls: 'suggestion-container' });
			suggestionEl.style.cssText = `
				position: absolute;
				top: 100%;
				left: 0;
				right: 0;
				background: var(--background-primary);
				border: 1px solid var(--background-modifier-border);
				border-radius: 4px;
				max-height: 200px;
				overflow-y: auto;
				z-index: 1000;
				margin-top: 4px;
				box-shadow: var(--shadow-s);
			`;
			
			// Ensure parent has position: relative
			if (inputEl.parentElement) {
				inputEl.parentElement.style.position = 'relative';
			}

			filteredFiles.forEach(file => {
				const item = suggestionEl!.createDiv({ cls: 'suggestion-item' });
				item.style.cssText = `
					padding: 6px 10px;
					cursor: pointer;
				`;
				item.setText(file.path);
				
				item.addEventListener('mouseenter', () => {
					item.style.backgroundColor = 'var(--background-modifier-hover)';
				});
				item.addEventListener('mouseleave', () => {
					item.style.backgroundColor = '';
				});
				item.addEventListener('click', async () => {
					inputEl.value = file.path;
					await onSelect(file.path);
					suggestionEl?.remove();
					suggestionEl = null;
				});
			});

			inputEl.parentElement?.appendChild(suggestionEl);
		};

		inputEl.addEventListener('input', showSuggestions);
		inputEl.addEventListener('focus', showSuggestions);
		inputEl.addEventListener('blur', () => {
			setTimeout(() => {
				suggestionEl?.remove();
				suggestionEl = null;
			}, 200);
		});
	}

	addFolderSuggestions(textComponent: TextComponent, onSelect: (value: string) => Promise<void>) {
		const inputEl = textComponent.inputEl;
		const folders = this.getAllFolders();
		let suggestionEl: HTMLElement | null = null;

		const showSuggestions = () => {
			const query = inputEl.value.toLowerCase();
			
			// Remove existing suggestions
			if (suggestionEl) {
				suggestionEl.remove();
			}

			const filteredFolders = folders.filter(folder => 
				folder.toLowerCase().includes(query)
			).slice(0, 10); // Limit to 10 results

			if (filteredFolders.length === 0) return;

			suggestionEl = createDiv({ cls: 'suggestion-container' });
			suggestionEl.style.cssText = `
				position: absolute;
				top: 100%;
				left: 0;
				right: 0;
				background: var(--background-primary);
				border: 1px solid var(--background-modifier-border);
				border-radius: 4px;
				max-height: 200px;
				overflow-y: auto;
				z-index: 1000;
				margin-top: 4px;
				box-shadow: var(--shadow-s);
			`;
			
			// Ensure parent has position: relative
			if (inputEl.parentElement) {
				inputEl.parentElement.style.position = 'relative';
			}

			filteredFolders.forEach(folder => {
				const item = suggestionEl!.createDiv({ cls: 'suggestion-item' });
				item.style.cssText = `
					padding: 6px 10px;
					cursor: pointer;
				`;
				item.setText(folder);
				
				item.addEventListener('mouseenter', () => {
					item.style.backgroundColor = 'var(--background-modifier-hover)';
				});
				item.addEventListener('mouseleave', () => {
					item.style.backgroundColor = '';
				});
				item.addEventListener('click', async () => {
					inputEl.value = folder;
					await onSelect(folder);
					suggestionEl?.remove();
					suggestionEl = null;
				});
			});

			inputEl.parentElement?.appendChild(suggestionEl);
		};

		inputEl.addEventListener('input', showSuggestions);
		inputEl.addEventListener('focus', showSuggestions);
		inputEl.addEventListener('blur', () => {
			setTimeout(() => {
				suggestionEl?.remove();
				suggestionEl = null;
			}, 200);
		});
	}

	getAllFolders(): string[] {
		const folders: string[] = [];
		const recurse = (folder: TFolder) => {
			folders.push(folder.path);
			folder.children.forEach(child => {
				if (child instanceof TFolder) {
					recurse(child);
				}
			});
		};
		
		const root = this.app.vault.getRoot();
		root.children.forEach(child => {
			if (child instanceof TFolder) {
				recurse(child);
			}
		});
		
		return folders;
	}

	getFileName(path: string): string {
		if (!path) return '';
		const parts = path.split('/');
		const fileName = parts[parts.length - 1];
		return fileName.replace(/\.md$/, '');
	}
}