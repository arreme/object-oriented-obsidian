import { Plugin, Notice, TFile } from 'obsidian';
import { ValidationSettingTab } from './settings';
import { ValidationPluginSettings, DEFAULT_SETTINGS } from './config_data';
import { CreateObjectHandler } from './Commands/create_object';
import { ValidatePDF } from './Commands/validate_pdfs';
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

		// Command: Validate PDFs
		this.addCommand({
			id: 'validate-pdfs',
			name: 'Validate PDFs',
			callback: () => {
				this.validatePDFs();
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
		this.validateEverythingAsync();
	}

	async validateEverythingAsync() {
		const pdfHandler = new ValidatePDF(this.app);
		await pdfHandler.validatePDFsAsync(this.settings);
		const validateHandler = new ValidateTypes(this.app);
		await validateHandler.validateTypesAsync(this.settings);
	}

	validateTypes() {
		const handler = new ValidateTypes(this.app);
		handler.validateTypesAsync(this.settings);
	}

	validatePDFs() {
		const handler = new ValidatePDF(this.app);
		handler.validatePDFsAsync(this.settings);
	}

	createObject() {
		const handler = new CreateObjectHandler(this.app);
		handler.execute(this.settings.templates);
	}
}