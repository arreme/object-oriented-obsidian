import { App, PluginSettingTab, Setting, TFile, TFolder, TextComponent } from 'obsidian';
import ValidationPlugin from './main';

export class ValidationSettingTab extends PluginSettingTab {
	plugin: ValidationPlugin;

	constructor(app: App, plugin: ValidationPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Template Validation Settings' });

		// Templates section
		containerEl.createEl('h3', { text: 'Templates' });
		
		this.plugin.settings.templates.forEach((template, index) => {
			const templateDiv = containerEl.createDiv({ cls: 'template-config-compact' });
			
			// Single row with name and remove button
			new Setting(templateDiv)
				.setName('Name')
				.addText(text => text
					.setPlaceholder('Template name')
					.setValue(template.name)
					.onChange(async (value) => {
						this.plugin.settings.templates[index].name = value;
						await this.plugin.saveSettings();
					}))
				.addButton(button => button
					.setButtonText('Remove')
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.templates.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					}));

			// Template Path with file suggestions
			new Setting(templateDiv)
				.setName('Template Path')
				.addText(text => {
					text
						.setPlaceholder('path/to/template.md')
						.setValue(template.templatePath);
					
					this.addFileSuggestions(text, async (value) => {
						this.plugin.settings.templates[index].templatePath = value;
						await this.plugin.saveSettings();
					});
				});

			// Target Folder with folder suggestions
			new Setting(templateDiv)
				.setName('Target Folder')
				.addText(text => {
					text
						.setPlaceholder('path/to/target/folder')
						.setValue(template.targetFolder);
					
					this.addFolderSuggestions(text, async (value) => {
						this.plugin.settings.templates[index].targetFolder = value;
						await this.plugin.saveSettings();
					});
				});

			if (index < this.plugin.settings.templates.length - 1) {
				templateDiv.createEl('hr');
			}
		});

		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Add Template')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.templates.push({
						name: '',
						templatePath: '',
						targetFolder: ''
					});
					await this.plugin.saveSettings();
					this.display();
				}));

		// PDF Settings
		containerEl.createEl('h3', { text: 'PDF Settings' });

		new Setting(containerEl)
			.setName('PDF Source Folder')
			.setDesc('Folder to scan for PDFs')
			.addText(text => text
				.setPlaceholder('path/to/pdf/source')
				.setValue(this.plugin.settings.pdfSourceFolder)
				.onChange(async (value) => {
					this.plugin.settings.pdfSourceFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('PDF Destination Folder')
			.setDesc('Folder to move processed PDFs')
			.addText(text => text
				.setPlaceholder('path/to/pdf/destination')
				.setValue(this.plugin.settings.pdfDestFolder)
				.onChange(async (value) => {
					this.plugin.settings.pdfDestFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('PDF Template')
			.setDesc('Template to use for PDF notes')
			.addText(text => text
				.setPlaceholder('path/to/pdf/template.md')
				.setValue(this.plugin.settings.pdfTemplate)
				.onChange(async (value) => {
					this.plugin.settings.pdfTemplate = value;
					await this.plugin.saveSettings();
				}));
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
}