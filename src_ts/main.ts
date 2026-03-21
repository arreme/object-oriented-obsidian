import { Notice, Plugin, TFolder } from 'obsidian';
import { ValidationSettingTab } from './Settings/settings';
import { ValidationPluginSettings, DEFAULT_SETTINGS } from './Settings/config_data';
import { CreateObjectHandler } from './Commands/create_object';
import { ValidateTypes } from './Commands/validate_types';


export default class ValidationPlugin extends Plugin {
	settings: ValidationPluginSettings;

	async onload() {
		await this.loadSettings();

		// Command: Validate Everything
		this.addCommand({
			id: 'validate-everything',
			name: 'Validate Everything',
			callback: () => {
				this.validateEverything();
			}
		});

		// Command: Validate Types
		this.addCommand({
			id: 'validate-types',
			name: 'Validate Types',
			callback: () => {
				this.validateTypes();
			}
		});

		// Command: Create Object
		this.addCommand({
			id: 'create-object',
			name: 'Create Object',
			callback: () => {
				this.createObject();
			}
		});

		// Add settings tab
		this.addSettingTab(new ValidationSettingTab(this.app, this));

		this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
			if (!(file instanceof TFolder)) {
				return;
			}

			menu.addItem((item) => {
				item
					.setTitle('Create Object Here')
					.setIcon('plus-square')
					.onClick(() => {
						const handler = new CreateObjectHandler(this.app);
						handler.execute(this.settings.templates, file.path, this.settings.targetProperty);
					});
			});
		}));
	}

	onunload() {
		// Cleanup if needed
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async applyTargetProperty(newTargetProperty: string) {
		const trimmedNewProperty = newTargetProperty.trim();
		if (!trimmedNewProperty) {
			new Notice('Target property cannot be empty.');
			return;
		}

		const oldTargetProperty = this.settings.targetProperty?.trim();
		if (oldTargetProperty === trimmedNewProperty) {
			new Notice('Target property unchanged.');
			return;
		}

		let renamedFilesCount = 0;
		if (oldTargetProperty) {
			const { vault, fileManager } = this.app;
			const markdownFiles = vault.getMarkdownFiles();

			for (const file of markdownFiles) {
				let fileChanged = false;
				await fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
					if (!fm || !(oldTargetProperty in fm)) {
						return;
					}

					if (trimmedNewProperty in fm) {
						delete fm[oldTargetProperty];
						fileChanged = true;
						return;
					}

					const oldValue = fm[oldTargetProperty];
					delete fm[oldTargetProperty];
					fm[trimmedNewProperty] = oldValue;
					fileChanged = true;
				});

				if (fileChanged) {
					renamedFilesCount++;
				}
			}
		}

		this.settings.targetProperty = trimmedNewProperty;
		await this.saveSettings();
		new Notice(`Applied target property. Updated ${renamedFilesCount} file(s).`);
	}

	validateEverything() {
		const handler = new ValidateTypes(this.app);
		handler.validateTypesAsync(this.settings);
	}

	validateTypes() {
		const handler = new ValidateTypes(this.app);
		handler.validateTypesAsync(this.settings);
	}

	createObject() {
		const handler = new CreateObjectHandler(this.app);
		handler.execute(this.settings.templates, undefined, this.settings.targetProperty);
	}
}