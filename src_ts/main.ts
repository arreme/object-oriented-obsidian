import { Notice, Plugin } from 'obsidian';
import { ValidationSettingTab } from './settings';

export interface TemplateConfig {
	name: string;
	templatePath: string;
	targetFolder: string;
}

export interface ValidationPluginSettings {
	templates: TemplateConfig[];
	pdfSourceFolder: string;
	pdfDestFolder: string;
	pdfTemplate: string;
}

export const DEFAULT_SETTINGS: ValidationPluginSettings = {
	templates: [],
	pdfSourceFolder: '',
	pdfDestFolder: '',
	pdfTemplate: ''
};

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

	// Command implementations (placeholders)
	validateEverything() {
		console.log('Validate Everything - Not implemented yet');
	}

	validateTypes() {
		this.validateTypesAsync();
	}

	async validateTypesAsync() {
		const { vault, metadataCache, fileManager } = this.app;
		let totalCount = 0;

		for (const template of this.settings.templates) {
			if (!template.templatePath || !template.targetFolder) {
				console.warn(`Skipping incomplete template: ${template.name}`);
				continue;
			}

			try {
				const count = await this.validateTemplate(
					vault,
					metadataCache,
					fileManager,
					template.templatePath,
					template.targetFolder
				);
				totalCount += count;
			} catch (error) {
				console.error(`Error validating template ${template.name}:`, error);
			}
		}

		new Notice(`Validation complete. Reviewed ${totalCount} files.`);
	}

	async validateTemplate(
		vault: any,
		metadataCache: any,
		fileManager: any,
		templatePath: string,
		targetFolder: string
	): Promise<number> {
		// Get template file
		const templateFile = vault.getAbstractFileByPath(templatePath);
		if (!templateFile) {
			throw new Error(`Template file not found: ${templatePath}`);
		}

		// Get template frontmatter
		const templateCache = metadataCache.getFileCache(templateFile);
		const templateFM = templateCache?.frontmatter;
		if (!templateFM) {
			throw new Error(`Template has no YAML frontmatter: ${templatePath}`);
		}

		// Read template content and extract ordered keys
		const templateContent = await vault.read(templateFile);
		const orderedKeys = this.extractOrderedKeysFromFrontmatter(templateContent);

		if (orderedKeys.length === 0) {
			console.warn(`No keys found in template: ${templatePath}`);
			return 0;
		}

		// Get all markdown files in target folder
		const files = vault.getFiles().filter(
			(f: any) => f.path.startsWith(targetFolder) && f.extension === "md"
		);

		let fileCount = 0;

		for (const file of files) {
			await fileManager.processFrontMatter(file, (fm: any) => {
				const newFm = { ...fm };
				let modified = false;
				let i = 0;

				// Check if keys match and are in order
				modified = Object.keys(fm).length !== orderedKeys.length;

				for (const key of Object.keys(fm)) {
					if (key !== orderedKeys[i]) {
						delete fm[key];
						modified = true;
						continue;
					}
					i++;
				}

				if (!modified) return;

				// Rebuild frontmatter in correct order
				for (const key of orderedKeys) {
					fm[key] = key in newFm ? newFm[key] : templateFM[key];
				}

				fileCount++;
			});
		}

		new Notice(`Validated ${fileCount} files for template: ${templatePath}`);
		return fileCount;
	}

	extractOrderedKeysFromFrontmatter(content: string): string[] {
		if (!content.startsWith("---")) return [];

		const end = content.indexOf("\n---", 3);
		if (end === -1) return [];

		const yamlBlock = content.slice(3, end).trim();
		const lines = yamlBlock.split("\n");
		const keys: string[] = [];

		for (const line of lines) {
			// Ignore array items and empty lines
			if (!line || line.startsWith("  -")) continue;

			// Top-level key only (not indented)
			if (!line.startsWith(" ")) {
				const idx = line.indexOf(":");
				if (idx !== -1) {
					keys.push(line.slice(0, idx).trim());
				}
			}
		}

		return keys;
	}

	validatePDFs() {
		console.log('Validate PDFs - Not implemented yet');
	}

	createObject() {
		console.log('Create Object - Not implemented yet');
	}
}