import { App, PluginSettingTab, Setting } from 'obsidian';
import ValidationPlugin from '../main';
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

		new Setting(containerEl)
			.setName('Target property')
			.setDesc('Frontmatter property used to identify object type (example: obj-type)')
			.addText(text => {
				text.setValue(this.plugin.settings.targetProperty)
					.setPlaceholder('obj-type')
					.onChange(async (value) => {
						this.plugin.settings.targetProperty = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(tittleContainer)
			.addButton(button => button
				.setButtonText('Add Object')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.templates.push({
						folded: false,
						propertyTypeValue: '',
						nameSuffix: '',
						objectTemplate: '',
						createNotes: true,
					});
					await this.plugin.saveSettings();
					this.display();
				}));
		
		this.createArraySettings(containerEl);
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
			.setName('Name Sufix')
			.setDesc('Appended to matching file names during validation (example: -(T))')
			.addText(text => {
				text.setValue(template.nameSuffix || '')
					.setPlaceholder('-(T)')
					.onChange(async (value) => {
						this.plugin.settings.templates[index].nameSuffix = value;
						await this.plugin.saveSettings();
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

}