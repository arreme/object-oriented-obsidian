import { App, PluginSettingTab, Setting, TFolder, normalizePath } from 'obsidian';
import ValidationPlugin from '../main';
import { FileSuggest, FolderSuggest } from './abstract_suggester';
import { COLLECT_TYPE, TemplateConfig } from './config_data';

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
						objectName: 'New Object',
						collectType: COLLECT_TYPE.T_PATH,
						targetFolder: '',
						objectTemplate: '',
						createNotes: true,
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

		const titleElement = titleRow.createEl('div', {
			text: template.objectName || `Object ${index + 1}`,
			cls: 'template-title'
		});

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
			.setName('Object Name')
			.setDesc('The name of your object')
			.addText(text => {
				text.setValue(template.objectName)
					.setPlaceholder('My Object Name')
					.onChange(async (value) => {
						this.plugin.settings.templates[index].objectName = value;
						await this.plugin.saveSettings();
						titleElement.textContent = value;
					});
			});

		new Setting(bodyDiv)  
			.setName('Select Folder Type')
			.setDesc('How to select the target folder')
			.addDropdown((dropdown) =>  
			dropdown  
				.addOption(COLLECT_TYPE[COLLECT_TYPE.T_PATH], 'Path Selector')
				.addOption(COLLECT_TYPE[COLLECT_TYPE.T_REGEX], 'Regex Selector')  
				.setValue(COLLECT_TYPE[template.collectType])  
				.onChange(async (value) => {  
					this.plugin.settings.templates[index].collectType = COLLECT_TYPE[value as keyof typeof COLLECT_TYPE];  
					await this.plugin.saveSettings();  
					this.display();
				})  
			);
		
		if (template.collectType == COLLECT_TYPE.T_PATH){
			this.targetFolderSetting(bodyDiv,template,index);
		} else if (template.collectType == COLLECT_TYPE.T_REGEX) {
			this.regexSetting(bodyDiv,template,index);
		}
		

		new Setting(bodyDiv)
			.setName('Object Template')
			.setDesc('Paste the template content (frontmatter)')
			.addTextArea(textArea => {
				textArea.setValue(template.objectTemplate)
					.setPlaceholder('---\nhiking-start:\nhiking-difficulty:\n---')
					.onChange(async (value) => {
						this.plugin.settings.templates[index].objectTemplate = value;
						await this.plugin.saveSettings();
					});
				textArea.inputEl.rows = 10;
				textArea.inputEl.cols = 50;
			});
		
		new Setting(bodyDiv)
			.setName('Appear in object creation')
			.setDesc('Tell if you want this object to appear in the object creation modal')
			.addToggle(toggle => {
				toggle.setValue(template.createNotes)
					.onChange(async (value) => {
						this.plugin.settings.templates[index].createNotes = value;
						await this.plugin.saveSettings();
					});
			});

		if (index < this.plugin.settings.templates.length - 1) {
			templateDiv.createEl('hr');
		}
	}

	private regexSetting(bodyDiv: HTMLDivElement, template: TemplateConfig, index: number) {
		// Create a container to hold both the setting and results
		const container = bodyDiv.createDiv();
		
		let resultsDiv: HTMLDivElement;
		
		new Setting(container)
			.setName('Regex Filter')
			.setDesc('Regex filter to apply folders')
			.addText(text => {
				text.setValue(template.targetFolder)
					.setPlaceholder('Your regex filter')
					.onChange(async (value) => {
						this.plugin.settings.templates[index].targetFolder = value;
						await this.plugin.saveSettings();
						// Clear results when regex changes
						if (resultsDiv) {
							resultsDiv.setText('');
						}
					});
			})
			.addButton(button => {
				button
					.setButtonText('Test Regex')
					.setTooltip('Test regex filter against vault folders')
					.onClick(() => {
						const regexValue = this.plugin.settings.templates[index].targetFolder;
						
						if (!regexValue) {
							resultsDiv.setText('No regex filter defined');
							return;
						}
						
						try {
							const regex = new RegExp(regexValue);
							const allFolders = this.plugin.app.vault.getAllFolders()
								.map(folder => folder.path);

							//const filteredFolders = allFolders.filter(folder => filteredFolders.)
							
							const matchingFolders = allFolders.filter(path => regex.test(path));
							
							if (matchingFolders.length === 0) {
								resultsDiv.setText('No folders match this regex');
							} else {
								resultsDiv.setText('-> '+matchingFolders.join('\n-> '));
							}
						} catch (error) {
							resultsDiv.setText(`Invalid regex: ${error.message}`);
						}
					});
			});
		
		// Create results div below the setting
		resultsDiv = container.createDiv({
			cls: 'regex-test-results',
			attr: {
				style: 'margin: 8px; padding: 8px; round-borders: 10px; font-family: monospace; font-size: 0.9em; white-space: pre-wrap; overflow-y: auto; background-color: var(--background-secondary);'
			}
		});
	}

	private targetFolderSetting(bodyDiv: HTMLDivElement, template: TemplateConfig, index: number) {
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
	}
}