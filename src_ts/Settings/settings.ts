import { App, PluginSettingTab, Setting, normalizePath } from 'obsidian';
import ValidationPlugin from '../main';
import { FileSuggest, FolderSuggest } from './abstract_suggester';
import { TemplateConfig } from './config_data';

export class ValidationSettingTab extends PluginSettingTab {
	plugin: ValidationPlugin;

	constructor(app: App, plugin: ValidationPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Object Oriented Obsidian Settings' });

		// Templates section
		const tittleContainer = containerEl.createDiv({ cls: 'add-object-container' });
		tittleContainer.createEl('h3', { text: 'Object Definitions' });

		new Setting(tittleContainer)
			.addButton(button => button
				.setButtonText('Add Object')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.templates.push({
						folded: false,
						templatePath: '',
						targetFolder: ''
					});
					await this.plugin.saveSettings();
					this.display();
				}));
		
		this.createArraySettings(containerEl);

		this.pdfSettings(containerEl);
	}

	private pdfSettings(containerEl: HTMLElement) {
		containerEl.createEl('h3', { text: 'PDF Validation Settings' });

		new Setting(containerEl)  
			.setName('PDF Source Folder')
			.setDesc('Folder to scan for PDFs')
			.addSearch(search => {
				new FolderSuggest(this.plugin.app, search.inputEl);

				search.setValue(this.plugin.settings.pdfSourceFolder)
					.setPlaceholder('Search source folder')  
					.onChange(async (value) => {  
						this.plugin.settings.pdfSourceFolder = normalizePath(value.trim());  
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('PDF Destination Folder')
			.setDesc('Folder to move processed PDFs')
			.addSearch(search => {
				new FolderSuggest(this.plugin.app, search.inputEl);

				search.setValue(this.plugin.settings.pdfDestFolder)
					.setPlaceholder('Search target folder')  
					.onChange(async (value) => {  
						this.plugin.settings.pdfDestFolder = normalizePath(value.trim());  
						await this.plugin.saveSettings();
					});  
				
			});

		new Setting(containerEl)
			.setName('PDF Template')
			.setDesc('Template to use for PDF notes')
			.addSearch(search => {
				new FileSuggest(this.plugin.app, search.inputEl);

				search.setValue(this.plugin.settings.pdfTemplate)
					.setPlaceholder('Search a template')  
					.onChange(async (value) => { 
						console.log("AAAB");
						this.plugin.settings.pdfTemplate = value; 
						await this.plugin.saveSettings();
					}
				);  
				
			});
	}

	private createArraySettings(containerEl: HTMLElement) {
		this.plugin.settings.templates.forEach(
			(template, index) => this.processTemplate(containerEl, template, index)
		);
	}

	private processTemplate(containerEl: HTMLElement, template: TemplateConfig, index: number) {
		const templateDiv = containerEl.createDiv({ cls: 'template-container' });

		// ── Header (fold toggle lives here)
		const titleRow = templateDiv.createDiv({ cls: 'template-title-row' });

		const templateName = this.getFileName(template.templatePath);
		const titleElement = titleRow.createEl('div', {
			text: templateName || `Object ${index + 1}`,
			cls: 'template-title'
		});

		// Fold state (local, visual only)

		titleRow.onClickEvent(async (evt) => {
			// Prevent toggle when clicking the Remove button
			if ((evt.target as HTMLElement).closest('button')) return;

			this.plugin.settings.templates[index].folded = !template.folded;
			await this.plugin.saveSettings();
			bodyDiv.toggleClass('is-collapsed', this.plugin.settings.templates[index].folded);
		});

		new Setting(titleRow)
			.addButton(button => button
				.setButtonText('Remove')
				.setWarning()
				.onClick(async () => {
					this.plugin.settings.templates.splice(index, 1);
					await this.plugin.saveSettings();
					this.display();
				})
			);

		// ── Body (foldable content)
		const bodyDiv = templateDiv.createDiv({ cls: 'template-body' });
		bodyDiv.toggleClass('is-collapsed', this.plugin.settings.templates[index].folded);

		new Setting(bodyDiv)
			.setName('Object Path')
			.setDesc('Object source template')
			.addSearch(search => {
				new FileSuggest(this.plugin.app, search.inputEl);

				search.setValue(template.templatePath)
					.setPlaceholder('path/to/template.md')
					.onChange(async (value) => {
						this.plugin.settings.templates[index].templatePath = value;
						await this.plugin.saveSettings();
						titleElement.textContent = this.getFileName(value) || `Object ${index + 1}`;
					});
			});

		new Setting(bodyDiv)
			.setName('Target Folder')
			.setDesc('Folder to check object validity')
			.addSearch(search => {
				new FolderSuggest(this.plugin.app, search.inputEl);

				search.setValue(template.targetFolder)
					.setPlaceholder('path/to/target/folder')
					.onChange(async (value) => {
						this.plugin.settings.templates[index].targetFolder = normalizePath(value.trim());
						await this.plugin.saveSettings();
					});
			});

		if (index < this.plugin.settings.templates.length - 1) {
			templateDiv.createEl('hr');
		}
	}

	private getFileName(path: string): string {
		if (!path) return '';
		const parts = path.split('/');
		const fileName = parts[parts.length - 1];
		return fileName.replace(/\.md$/, '');
	}
}