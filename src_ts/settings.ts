import { App, PluginSettingTab, Setting, TFolder, TextComponent } from 'obsidian';
import ValidationPlugin from './main';
import { Suggester } from './suggester';

export class ValidationSettingTab extends PluginSettingTab {
	plugin: ValidationPlugin;
	suggester: Suggester;

	constructor(app: App, plugin: ValidationPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.suggester = new Suggester(app);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Template Validation Settings' });

		// Templates section
		containerEl.createEl('h3', { text: 'Templates' });
		
		// Add Template button at the top
		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Add Template')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.templates.push({
						templatePath: '',
						targetFolder: ''
					});
					await this.plugin.saveSettings();
					this.display();
				}));
		
		this.createArraySettings(containerEl);

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

	createArraySettings(containerEl: HTMLElement) {
		this.plugin.settings.templates.forEach((template, index) => {
			const templateDiv = containerEl.createDiv({ cls: 'template-config-compact' });
			
			// Visual title showing template filename
			const templateName = this.suggester.getFileName(template.templatePath);
			if (templateName) {
				templateDiv.createEl('h4', { 
					text: templateName,
					cls: 'template-title'
				});
			}
			
			// Template Path with file suggestions
			new Setting(templateDiv)
				.setName('Template Path')
				.addText(text => {
					text
						.setPlaceholder('path/to/template.md')
						.setValue(template.templatePath);
					
					this.suggester.addFileSuggestions(text, async (value) => {
						this.plugin.settings.templates[index].templatePath = value;
						await this.plugin.saveSettings();
						this.display(); // Refresh to update the title
					});
				});

			// Target Folder with folder suggestions
			new Setting(templateDiv)
				.setName('Target Folder')
				.addText(text => {
					text
						.setPlaceholder('path/to/target/folder')
						.setValue(template.targetFolder);
					
					this.suggester.addFolderSuggestions(text, async (value) => {
						this.plugin.settings.templates[index].targetFolder = value;
						await this.plugin.saveSettings();
					});
				});

			// Remove button on its own line at the bottom
			new Setting(templateDiv)
				.addButton(button => button
					.setButtonText('Remove')
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.templates.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					}));

			if (index < this.plugin.settings.templates.length - 1) {
				templateDiv.createEl('hr');
			}
		});
	}
}