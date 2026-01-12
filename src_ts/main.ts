import { Plugin, Notice, SuggestModal, App, TFile } from 'obsidian';
import { ValidationSettingTab } from './settings';

export interface TemplateConfig {
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

class TemplateSuggestModal extends SuggestModal<TemplateConfig> {
	templates: TemplateConfig[];
	onChoose: (template: TemplateConfig) => void;

	constructor(app: App, templates: TemplateConfig[], onChoose: (template: TemplateConfig) => void) {
		super(app);
		this.templates = templates;
		this.onChoose = onChoose;
	}

	getSuggestions(query: string): TemplateConfig[] {
		const lowerQuery = query.toLowerCase();
		return this.templates.filter(template => {
			const fileName = this.getFileName(template.templatePath);
			return fileName.toLowerCase().includes(lowerQuery);
		});
	}

	renderSuggestion(template: TemplateConfig, el: HTMLElement) {
		const fileName = this.getFileName(template.templatePath);
		el.createEl("div", { text: fileName });
	}

	onChooseSuggestion(template: TemplateConfig, evt: MouseEvent | KeyboardEvent) {
		this.onChoose(template);
	}

	getFileName(path: string): string {
		const parts = path.split('/');
		const fileName = parts[parts.length - 1];
		return fileName.replace(/\.md$/, '');
	}
}

class TitleInputModal extends SuggestModal<string> {
	onSubmit: (title: string) => void;
	inputEl: HTMLInputElement;

	constructor(app: App, onSubmit: (title: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.setPlaceholder("Enter note title...");
	}

	getSuggestions(query: string): string[] {
		return [query];
	}

	renderSuggestion(value: string, el: HTMLElement) {
		el.createEl("div", { text: value || "Enter a title..." });
	}

	onChooseSuggestion(value: string, evt: MouseEvent | KeyboardEvent) {
		if (value.trim()) {
			this.onSubmit(value.trim());
		}
	}
}

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
		this.validateEverythingAsync();
	}

	async validateEverythingAsync() {
		await this.validatePDFsAsync();
		await this.validateTypesAsync();
	}

	validateTypes() {
		this.validateTypesAsync();
	}

	async validateTypesAsync() {
		const { vault, metadataCache, fileManager } = this.app;
		let totalCount = 0;

		for (const template of this.settings.templates) {
			if (!template.templatePath || !template.targetFolder) {
				console.warn(`Skipping incomplete template: ${template.templatePath}`);
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
				console.error(`Error validating template ${template.templatePath}:`, error);
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

		new Notice(`Validated ${fileCount} files for template: ${templateFile.basename}`);
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
		this.validatePDFsAsync();
	}

	async validatePDFsAsync() {
		const { vault, metadataCache, fileManager } = this.app;
		const { pdfSourceFolder, pdfDestFolder, pdfTemplate } = this.settings;

		if (!pdfSourceFolder || !pdfDestFolder || !pdfTemplate) {
			new Notice('PDF settings are not configured');
			return;
		}

		// Step 1: Sync existing notes with PDFs (rename PDFs to match notes)
		const targetFiles = vault.getFiles().filter(file => 
			file.path.startsWith(pdfDestFolder) && file.extension === 'md'
		);

		let renamedCount = 0;
		for (const target of targetFiles) {
			const noteName = target.basename;
			
			// Read frontmatter
			const cache = metadataCache.getFileCache(target);
			if (!cache?.frontmatter?.['resource-link']) {
				console.warn(`resource-link not found in ${noteName}`);
				continue;
			}

			// Extract link target from [[...]]
			const link = cache.frontmatter['resource-link'];
			const match = link.match(/\[\[(.+?)\]\]/);
			if (!match) {
				console.warn(`Invalid resource-link format in ${noteName}`);
				continue;
			}

			const oldPath = match[1];
			const newPath = oldPath.replace(/[^/]+\.pdf$/, `${noteName}.pdf`);
			if (oldPath === newPath) continue;

			const pdfFile = vault.getAbstractFileByPath(oldPath);
			if (!pdfFile) {
				console.warn(`Target PDF not found for ${noteName}`);
				continue;
			}

			try {
				await vault.rename(pdfFile, newPath);
				await fileManager.processFrontMatter(target, fm => {
					fm['resource-link'] = `[[${newPath}]]`;
				});
				renamedCount++;
			} catch (error) {
				console.error(`Error renaming PDF for ${noteName}:`, error);
			}
		}

		new Notice(`Renamed ${renamedCount} PDF(s)`);

		// Step 2: Create notes for PDFs that don't have one
		const sourceFiles = vault.getFiles().filter(file => 
			file.path.startsWith(pdfSourceFolder + '/') && file.extension === 'pdf'
		);

		const templateFile = vault.getAbstractFileByPath(pdfTemplate);
		if (!templateFile || !(templateFile instanceof TFile)) {
			new Notice(`Template not found: ${pdfTemplate}`);
			return;
		}

		const template = await vault.read(templateFile);
		let createdCount = 0;

		for (const file of sourceFiles) {
			const fileName = file.basename;
			const targetPath = `${pdfDestFolder}/${fileName}.md`;

			// Check if target note already exists
			if (vault.getAbstractFileByPath(targetPath)) continue;

			// Create content using template + reference
			const sourceLink = file.path;
			let newContent = template
				.replace(/resource-link:/g, `resource-link: "[[${sourceLink}]]"`)
				.replace(/resource-type:/g, 'resource-type: pdf');

			try {
				await vault.create(targetPath, newContent);
				new Notice(`Created PDF note: ${fileName}`);
				createdCount++;
			} catch (error) {
				console.error(`Error creating note for ${fileName}:`, error);
			}
		}

		new Notice(`Created ${createdCount} PDF note(s)`);
	}

	createObject() {
		new TemplateSuggestModal(this.app, this.settings.templates, async (template: TemplateConfig) => {
			await this.createObjectFromTemplate(template);
		}).open();
	}

	async createObjectFromTemplate(template: TemplateConfig) {
		const { vault, metadataCache, fileManager, workspace } = this.app;

		// Get template file
		const templateFile = vault.getAbstractFileByPath(template.templatePath);
		if (!templateFile || !(templateFile instanceof TFile)) {
			new Notice(`Template not found: ${template.templatePath}`);
			return;
		}

		// Read template content
		const templateContent = await vault.read(templateFile);

		// Prompt for note title
		const title = await this.promptForTitle();
		if (!title) return;

		// Create the file in the target folder
		const filePath = `${template.targetFolder}/${title}.md`;
		
		try {
			const file = await vault.create(filePath, templateContent);
			new Notice(`Created: ${title}`);

			// Open the file
			const leaf = workspace.getLeaf(false);
			await leaf.openFile(file);
		} catch (error) {
			new Notice(`Error creating file: ${(error as Error).message}`);
		}
	}

	async promptForTitle(): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new TitleInputModal(this.app, (title: string) => {
				resolve(title);
			});
			modal.open();
		});
	}
}