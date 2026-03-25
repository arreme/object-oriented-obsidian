import { App, Notice, SuggestModal, Modal, Setting } from 'obsidian';
import { TemplateConfig } from '../Settings/config_data';

export class CreateObjectHandler {
	app: App;

	constructor(app: App) {
		this.app = app;
	}

    async execute(templates: TemplateConfig[], destinationFolderPath?: string, targetProperty?: string) {
        const validTemplates = templates.filter(
            t => t.createNotes && t.propertyTypeValue && t.propertyTypeValue.trim() && t.objectTemplate && t.objectTemplate.trim()
        );
		
		if (validTemplates.length === 0) {
            new Notice('No valid templates configured. Set Property type value and Object Template in settings.');
			return;
		}
		
		new TemplateSuggestModal(this.app, validTemplates, async (template: TemplateConfig) => {
            await this.createObjectFromTemplate(template, destinationFolderPath, targetProperty);
		}).open();
	}

    async createObjectFromTemplate(template: TemplateConfig, destinationFolderPath?: string, targetProperty?: string) {
		const { vault, workspace } = this.app;

		const templateContent = this.withTypeFrontmatter(
            template.objectTemplate,
            targetProperty,
            template.propertyTypeValue.trim()
        );
		if (!templateContent || !templateContent.trim()) {
            new Notice(`Template content is empty for: ${template.propertyTypeValue || 'unnamed object'}`);
			return;
		}

		// Prompt for note title
		const title = await this.promptForTitle();
		if (!title) return;

        const creationFolder = destinationFolderPath ?? this.getCreationFolderPath();
        const filePath = creationFolder ? `${creationFolder}/${title}.md` : `${title}.md`;
		
		try {
			const file = await vault.create(filePath, templateContent);
            new Notice(`Created: ${file.path}`);

			// Open the file
			const leaf = workspace.getLeaf(false);
			await leaf.openFile(file);
		} catch (error) {
			new Notice(`Error creating file: ${(error as Error).message}`);
		}
	}

    private withTypeFrontmatter(content: string, targetProperty?: string, propertyTypeValue?: string): string {
        if (!targetProperty || !propertyTypeValue) {
            return content;
        }

        if (!content.startsWith('---')) {
            return `---\n${targetProperty}: ${propertyTypeValue}\n---\n${content}`;
        }

        const end = content.indexOf('\n---', 3);
        if (end === -1) {
            return `---\n${targetProperty}: ${propertyTypeValue}\n---\n${content}`;
        }

        const yamlBlock = content.slice(3, end).trim();
        const body = content.slice(end + 4);
        const lines = yamlBlock ? yamlBlock.split('\n') : [];
        const filtered = lines.filter((line) => !line.startsWith(`${targetProperty}:`));
        const nextYaml = [`${targetProperty}: ${propertyTypeValue}`, ...filtered].join('\n');

        return `---\n${nextYaml}\n---${body}`;
    }

    private getCreationFolderPath(): string {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return '';

        const parent = activeFile.parent;
        if (!parent) return '';

        return parent.path;
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
            const typeValue = template.propertyTypeValue || '';
            return typeValue.toLowerCase().includes(lowerQuery);
        });
    }

    renderSuggestion(template: TemplateConfig, el: HTMLElement) {
        const typeValue = template.propertyTypeValue || 'Unnamed object';
        el.createEl("div", { text: typeValue });
    }

    onChooseSuggestion(template: TemplateConfig, evt: MouseEvent | KeyboardEvent) {
        this.onChoose(template);
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