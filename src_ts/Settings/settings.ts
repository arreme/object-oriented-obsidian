import { App, PluginSettingTab, Setting, normalizePath } from 'obsidian';
import ValidationPlugin from '../main';
import { TemplateConfig, ScopedTemplateConfig } from './config_data';
import { FolderSuggest } from './abstract_suggester';

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

		let targetPropertyDraft = this.plugin.settings.targetProperty;

		new Setting(containerEl)
			.setName('Target property')
			.setDesc('Frontmatter property used to identify object type (example: obj-type). Changes are applied only when you press Apply.')
			.addText(text => {
				text.setValue(this.plugin.settings.targetProperty)
					.setPlaceholder('obj-type')
					.onChange((value) => {
						targetPropertyDraft = value.trim();
					});
			})
			.addButton(button => button
				.setButtonText('Apply')
				.setCta()
				.onClick(async () => {
					await this.plugin.applyTargetProperty(targetPropertyDraft);
					this.display();
				}));

		containerEl.createEl('h3', { text: 'Ignore Folders' });
		new Setting(containerEl)
			.setDesc('Files inside these folders are skipped during validation.')
			.addButton(button => button
				.setButtonText('Add Ignore Folder')
				.onClick(async () => {
					this.plugin.settings.ignoreFolders.push('');
					await this.plugin.saveSettings();
					this.display();
				}));

		this.renderIgnoreFolders(containerEl);

		new Setting(tittleContainer)
			.addButton(button => button
				.setButtonText('Add Property Object')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.templates.push({
						folded: false,
						propertyTypeValue: '',
						objectTemplate: '',
						createNotes: true,
					});
					await this.plugin.saveSettings();
					this.display();
				}))
			.addButton(button => button
				.setButtonText('Add Scoped Object')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.scopedTemplates.push({
						folded: false,
						name: '',
						objectTemplate: '',
						targetFolders: [],
					});
					await this.plugin.saveSettings();
					this.display();
				}));
		
		containerEl.createEl('h3', { text: 'Property Objects' });
		this.createArraySettings(containerEl);
		containerEl.createEl('h3', { text: 'Scoped Objects' });
		this.createScopedArraySettings(containerEl);
	}

	private createArraySettings(containerEl: HTMLElement) {
		this.plugin.settings.templates.forEach(
			(template, index) => this.processTemplate(containerEl, template, index)
		);
	}

	private renderIgnoreFolders(containerEl: HTMLElement) {
		this.plugin.settings.ignoreFolders.forEach((folder, index) => {
			new Setting(containerEl)
				.setName(`Ignore folder ${index + 1}`)
				.addSearch(search => {
					new FolderSuggest(this.plugin.app, search.inputEl);
					search
						.setValue(folder)
						.setPlaceholder('path/to/folder')
						.onChange(async (value) => {
							this.plugin.settings.ignoreFolders[index] = normalizePath(value.trim());
							await this.plugin.saveSettings();
						});
				})
				.addButton(button => button
					.setButtonText('Remove')
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.ignoreFolders.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					}));
		});
	}

	private processTemplate(containerEl: HTMLElement, template: TemplateConfig, index: number) {
		const templateDiv = containerEl.createDiv({ cls: 'template-container' });

		// ── Header (fold toggle lives here)
		const titleRow = templateDiv.createDiv({ cls: 'template-title-row' });

		const templateName = template.propertyTypeValue?.trim();
		const titleElement = titleRow.createEl('div', {
			text: templateName || `Object ${index + 1}`,
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
			.setName('Property type value')
			.setDesc('Template applies when target property equals this value (example: task)')
			.addText(text => {
				text.setValue(template.propertyTypeValue || '')
					.setPlaceholder('task')
					.onChange(async (value) => {
						const trimmed = value.trim();
						this.plugin.settings.templates[index].propertyTypeValue = trimmed;
						await this.plugin.saveSettings();
						titleElement.textContent = trimmed || `Object ${index + 1}`;
					});
			});

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

	private createScopedArraySettings(containerEl: HTMLElement) {
		this.plugin.settings.scopedTemplates.forEach(
			(template, index) => this.processScopedTemplate(containerEl, template, index)
		);
	}

	private processScopedTemplate(containerEl: HTMLElement, template: ScopedTemplateConfig, index: number) {
		const templateDiv = containerEl.createDiv({ cls: 'template-container' });

		const titleRow = templateDiv.createDiv({ cls: 'template-title-row' });

		const label = template.name?.trim()
			|| (template.targetFolders.length > 0
				? template.targetFolders.filter(f => f.trim()).join(', ') || `Scoped Object ${index + 1}`
				: `Scoped Object ${index + 1}`);

		const titleElement = titleRow.createEl('div', {
			text: label,
			cls: 'template-title'
		});

		titleRow.onClickEvent(async (evt) => {
			if ((evt.target as HTMLElement).closest('button')) return;
			this.plugin.settings.scopedTemplates[index].folded = !template.folded;
			await this.plugin.saveSettings();
			bodyDiv.toggleClass('is-collapsed', this.plugin.settings.scopedTemplates[index].folded);
		});

		new Setting(titleRow)
			.addButton(button => button
				.setButtonText('Remove')
				.setWarning()
				.onClick(async () => {
					this.plugin.settings.scopedTemplates.splice(index, 1);
					await this.plugin.saveSettings();
					this.display();
				})
			);

		const bodyDiv = templateDiv.createDiv({ cls: 'template-body' });
		bodyDiv.toggleClass('is-collapsed', this.plugin.settings.scopedTemplates[index].folded);

		new Setting(bodyDiv)
			.setName('Name')
			.setDesc('Display name for this scoped object')
			.addText(text => {
				text.setValue(template.name || '')
					.setPlaceholder('My scoped object')
					.onChange(async (value) => {
						const trimmed = value.trim();
						this.plugin.settings.scopedTemplates[index].name = trimmed;
						await this.plugin.saveSettings();
						titleElement.textContent = trimmed || `Scoped Object ${index + 1}`;
					});
			});

		// Target folders list
		new Setting(bodyDiv)
			.setName('Target folders')
			.setDesc('All files in these folders will be validated against this template.')
			.addButton(button => button
				.setButtonText('Add Folder')
				.onClick(async () => {
					this.plugin.settings.scopedTemplates[index].targetFolders.push('');
					await this.plugin.saveSettings();
					this.display();
				}));

		template.targetFolders.forEach((folder, folderIndex) => {
			new Setting(bodyDiv)
				.setName(`Folder ${folderIndex + 1}`)
				.addSearch(search => {
					new FolderSuggest(this.plugin.app, search.inputEl);
					search
						.setValue(folder)
						.setPlaceholder('path/to/folder')
						.onChange(async (value) => {
							this.plugin.settings.scopedTemplates[index].targetFolders[folderIndex] = normalizePath(value.trim());
							await this.plugin.saveSettings();
						});
				})
				.addButton(button => button
					.setButtonText('Remove')
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.scopedTemplates[index].targetFolders.splice(folderIndex, 1);
						await this.plugin.saveSettings();
						this.display();
					}));
		});

		new Setting(bodyDiv)
			.setName('Object Template')
			.setDesc('Paste the template content (frontmatter)')
			.addTextArea(textArea => {
				textArea.setValue(template.objectTemplate)
					.setPlaceholder('---\nhiking-start:\nhiking-difficulty:\n---')
					.onChange(async (value) => {
						this.plugin.settings.scopedTemplates[index].objectTemplate = value;
						await this.plugin.saveSettings();
					});
				textArea.inputEl.rows = 10;
				textArea.inputEl.cols = 50;
			});

		if (index < this.plugin.settings.scopedTemplates.length - 1) {
			templateDiv.createEl('hr');
		}
	}

}