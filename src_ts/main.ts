import { Plugin, TFolder } from 'obsidian';
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
						handler.execute(this.settings.templates, file.path);
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
		handler.execute(this.settings.templates);
	}
}