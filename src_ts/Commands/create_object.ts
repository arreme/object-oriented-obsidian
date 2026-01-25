import { App, Notice, SuggestModal, Modal, Setting, TFolder } from 'obsidian';
import { TemplateConfig, COLLECT_TYPE } from '../Settings/config_data';
import { FolderSuggest } from 'src_ts/Settings/abstract_suggester';

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

		const templateContent = template.objectTemplate;
		if (!templateContent || !templateContent.trim()) {
			new Notice(`Template content is empty for: ${template.objectName}`);
			return;
		}

		if (!template.targetFolder) {
			new Notice(`Target folder not set for template`);
			return;
		}


		// If collect_type is T_REGEX, show folder selection modal
		if (template.collectType === COLLECT_TYPE.T_REGEX) {
			this.regexCreate(template);
		} else {
			this.openSuggestName(template.targetFolder, templateContent);
		}
	}

	private regexCreate(template: TemplateConfig) {
		try {
			const regex = new RegExp(template.targetFolder);
			const allFolders = this.app.vault.getAllLoadedFiles()
				.filter(file => file instanceof TFolder)
				.map(folder => folder.path);
			
			const matchingFolders = allFolders.filter(path => regex.test(path));
			
			if (matchingFolders.length === 0) {
				new Notice('No folders match the regex filter');
				return;
			}

			// Show folder selection modal
			new FolderSelectionModal(this.app, matchingFolders, async (path: string) => {
				await this.openSuggestName(path, template.objectTemplate);
			}).open();
		} catch (error) {
			new Notice(`Invalid regex: ${(error as Error).message}`);
		}
	}

	private async openSuggestName(targetFolderPath: string, templateContent: string) {
		// Prompt for note title
		const title = await this.promptForTitle();
		if (!title) return;

		// Create the file in the target folder
		const filePath = `${targetFolderPath}/${title}.md`;
		
		try {
			const file = await this.app.vault.create(filePath, templateContent);
			new Notice(`Created: ${title}`);

			// Open the file
			const leaf = this.app.workspace.getLeaf(false);
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

class FolderSelectionModal extends SuggestModal<string> {
	folders: string[];
	onChoose: (folder: string) => void;


	constructor(app: App, folders: string[], onChoose: (template: string) => void) {
        super(app);
        this.folders = folders;
        this.onChoose = onChoose;
    }

	getSuggestions(query: string): string[] {
		const lowerQuery = query.toLowerCase();
		return this.folders.filter(folder => {
			const folderName = this.getFolderName(folder);
			return folderName.toLowerCase().includes(lowerQuery) || 
				   folder.toLowerCase().includes(lowerQuery);
		});
	}

	renderSuggestion(folder: string, el: HTMLElement) {
		const folderName = this.getFolderName(folder);
		el.createEl("div", { text: folderName });
		// Optionally show full path as subtitle
		if (folder !== folderName) {
			el.createEl("small", { text: folder, cls: "suggestion-note" });
		}
	}

	onChooseSuggestion(template: string, evt: MouseEvent | KeyboardEvent) {
        this.onChoose(template);
    }

	getFolderName(path: string): string {
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
            const folderName = template.objectName;
            return folderName.toLowerCase().includes(lowerQuery);
        });
    }

    renderSuggestion(template: TemplateConfig, el: HTMLElement) {
        const folderName = template.objectName;
        el.createEl("div", { text: folderName });
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