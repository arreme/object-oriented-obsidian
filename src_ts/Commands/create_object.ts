
import { App, Notice, SuggestModal, TFile } from 'obsidian';
import { TemplateConfig } from '../config_data';

export class CreateObjectHandler {
	app: App;

	constructor(app: App) {
		this.app = app;
	}

	async execute(templates: TemplateConfig[]) {
		new TemplateSuggestModal(this.app, templates, async (template: TemplateConfig) => {
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