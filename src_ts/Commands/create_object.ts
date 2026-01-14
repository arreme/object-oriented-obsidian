import { App, Notice, SuggestModal, Modal, Setting } from 'obsidian';
import { TemplateConfig } from '../Settings/config_data';

export class CreateObjectHandler {
	app: App;

	constructor(app: App) {
		this.app = app;
	}

	async execute(templates: TemplateConfig[]) {
		// Filter out templates without targetFolder
		const validTemplates = templates.filter(t => t.createNotes && t.targetFolder && t.targetFolder.trim());
		
		if (validTemplates.length === 0) {
			new Notice('No valid templates configured. Please set target folders in settings.');
			return;
		}
		
		new TemplateSuggestModal(this.app, validTemplates, async (template: TemplateConfig) => {
			await this.createObjectFromTemplate(template);
		}).open();
	}

	async createObjectFromTemplate(template: TemplateConfig) {
		const { vault, workspace } = this.app;

		// Use the template content directly
		const templateContent = template.objectTemplate;
		if (!templateContent || !templateContent.trim()) {
			new Notice(`Template content is empty for: ${this.getFolderName(template.targetFolder)}`);
			return;
		}

		// Validate target folder
		if (!template.targetFolder) {
			new Notice(`Target folder not set for template`);
			return;
		}

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

	private getFolderName(path: string): string {
		if (!path) return '';
		const parts = path.split('/');
		return parts[parts.length - 1];
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
            const folderName = this.getFolderName(template.targetFolder);
            return folderName.toLowerCase().includes(lowerQuery);
        });
    }

    renderSuggestion(template: TemplateConfig, el: HTMLElement) {
        const folderName = this.getFolderName(template.targetFolder);
        el.createEl("div", { text: folderName });
    }

    onChooseSuggestion(template: TemplateConfig, evt: MouseEvent | KeyboardEvent) {
        this.onChoose(template);
    }

    getFolderName(path: string): string {
        if (!path) return '';
        const parts = path.split('/');
        return parts[parts.length - 1];
    }
}

class TitleInputModal extends Modal {
    onSubmit: (title: string) => void;
    titleInput: HTMLInputElement;

    constructor(app: App, onSubmit: (title: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl("h2", { text: "Create new note" });

        new Setting(contentEl)
            .setName("Note title")
            .addText(text => {
                this.titleInput = text.inputEl;
                text.setPlaceholder("Enter note title...")
                    .onChange(value => {
                        // Optional: could add validation here
                    });
                
                // Focus the input and select on Enter
                text.inputEl.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        this.submit();
                    }
                });
            });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText("Create")
                .setCta()
                .onClick(() => {
                    this.submit();
                }))
            .addButton(btn => btn
                .setButtonText("Cancel")
                .onClick(() => {
                    this.close();
                }));

        // Focus the input after a short delay
        setTimeout(() => {
            this.titleInput.focus();
        }, 10);
    }

    submit() {
        const title = this.titleInput.value.trim();
        if (title) {
            this.onSubmit(title);
            this.close();
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}