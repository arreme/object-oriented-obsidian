import { App, PluginSettingTab, Setting, normalizePath } from 'obsidian';
import ValidationPlugin from '../main';
import { TemplateConfig, ScopedTemplateConfig } from './config_data';
import { FolderSuggest } from './abstract_suggester';

export class ValidationSettingTab extends PluginSettingTab {
    plugin: ValidationPlugin;

    constructor(app: App, plugin: ValidationPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Object Oriented Obsidian' });

        // ─── Global Settings ──────────────────────────────────────────
        containerEl.createEl('h3', { text: 'Global Settings' });

        let targetPropertyDraft = this.plugin.settings.targetProperty;
        new Setting(containerEl)
            .setName('Target property')
            .setDesc('Frontmatter key used to identify object type (e.g. obj-type). Press Apply to save and migrate existing notes.')
            .addText(text =>
                text
                    .setValue(this.plugin.settings.targetProperty)
                    .setPlaceholder('obj-type')
                    .onChange(v => { targetPropertyDraft = v.trim(); })
            )
            .addButton(btn =>
                btn.setButtonText('Apply').setCta().onClick(async () => {
                    await this.plugin.applyTargetProperty(targetPropertyDraft);
                    this.display();
                })
            );

        // ─── Ignored Folders ─────────────────────────────────────────
        containerEl.createEl('h3', { text: 'Ignored Folders' });
        new Setting(containerEl)
            .setDesc('Files in these folders are skipped during all validation.')
            .addButton(btn =>
                btn.setButtonText('Add folder').onClick(async () => {
                    this.plugin.settings.ignoreFolders.push('');
                    await this.plugin.saveSettings();
                    this.display();
                })
            );

        this.plugin.settings.ignoreFolders.forEach((folder, i) => {
            new Setting(containerEl)
                .addSearch(search => {
                    new FolderSuggest(this.plugin.app, search.inputEl);
                    search
                        .setValue(folder)
                        .setPlaceholder('path/to/folder')
                        .onChange(async v => {
                            this.plugin.settings.ignoreFolders[i] = normalizePath(v.trim());
                            await this.plugin.saveSettings();
                        });
                })
                .addButton(btn =>
                    btn.setButtonText('Remove').setWarning().onClick(async () => {
                        this.plugin.settings.ignoreFolders.splice(i, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    })
                );
        });

        // ─── Object Definitions ───────────────────────────────────────
        containerEl.createEl('h3', { text: 'Object Definitions' });

        new Setting(containerEl)
            .setDesc('Property objects are matched by a frontmatter value. Scoped objects apply to all files in specific folders.')
            .addButton(btn =>
                btn.setButtonText('Add Property Object').setCta().onClick(async () => {
                    this.plugin.settings.templates.push({
                        folded: false,
                        propertyTypeValue: '',
                        objectTemplate: '',
                        createNotes: true,
                    });
                    await this.plugin.saveSettings();
                    this.display();
                })
            )
            .addButton(btn =>
                btn.setButtonText('Add Scoped Object').setCta().onClick(async () => {
                    this.plugin.settings.scopedTemplates.push({
                        folded: false,
                        name: '',
                        objectTemplate: '',
                        targetFolders: [],
                    });
                    await this.plugin.saveSettings();
                    this.display();
                })
            );

        // Filter input
        let filterQuery = '';
        new Setting(containerEl)
            .addSearch(search => {
                search.setPlaceholder('Filter objects by name…').onChange(v => {
                    filterQuery = v.toLowerCase();
                    this.renderObjectList(listEl, filterQuery);
                });
                search.inputEl.style.width = '100%';
            });

        const listEl = containerEl.createDiv();
        this.renderObjectList(listEl, filterQuery);
    }

    private renderObjectList(container: HTMLElement, query: string) {
        container.empty();

        const propMatches = this.plugin.settings.templates
            .map((t, i) => ({ t, i }))
            .filter(({ t }) => !query || (t.propertyTypeValue || '').toLowerCase().includes(query));

        const scopedMatches = this.plugin.settings.scopedTemplates
            .map((t, i) => ({ t, i }))
            .filter(({ t }) =>
                !query ||
                (t.name || '').toLowerCase().includes(query) ||
                t.targetFolders.some(f => f.toLowerCase().includes(query))
            );

        if (propMatches.length === 0 && scopedMatches.length === 0) {
            const msg = container.createEl('p', {
                text: query ? 'No objects match the filter.' : 'No objects defined yet. Add one above.',
                cls: 'setting-item-description',
            });
            msg.style.padding = '10px 0';
            return;
        }

        if (propMatches.length > 0) {
            container.createEl('h4', { text: 'Property Objects' });
            for (const { t, i } of propMatches) {
                this.renderPropertyTemplate(container, t, i);
            }
        }

        if (scopedMatches.length > 0) {
            container.createEl('h4', { text: 'Scoped Objects' });
            for (const { t, i } of scopedMatches) {
                this.renderScopedTemplate(container, t, i);
            }
        }
    }

    private createCollapsible(
        container: HTMLElement,
        label: string,
        isOpen: boolean
    ): { card: HTMLElement; titleSpan: HTMLSpanElement; header: HTMLElement; body: HTMLElement } {
        const card = container.createDiv();
        card.style.cssText = [
            'border: 1px solid var(--background-modifier-border)',
            'border-radius: var(--radius-m, 6px)',
            'margin-bottom: 8px',
            'overflow: hidden',
        ].join(';');

        const header = card.createDiv();
        header.style.cssText = [
            'display: flex',
            'align-items: center',
            'justify-content: space-between',
            'padding: 10px 16px',
            'cursor: pointer',
            'font-weight: var(--font-semibold, 600)',
            'background: var(--background-secondary)',
        ].join(';');
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');

        const titleSpan = header.createSpan({ text: label });

        const body = card.createDiv();
		body.style.paddingTop = '8px';
		body.style.paddingLeft = '4px';
		body.style.paddingRight = '4px';
        if (!isOpen) body.style.display = 'none';

        header.addEventListener('click', async (e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            const open = body.style.display !== 'none';
            body.style.display = open ? 'none' : '';
        });

        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!(e.target as HTMLElement).closest('button')) {
                    const open = body.style.display !== 'none';
                    body.style.display = open ? 'none' : '';
                }
            }
        });

        return { card, titleSpan, header, body };
    }

    private renderPropertyTemplate(container: HTMLElement, template: TemplateConfig, index: number) {
        const label = template.propertyTypeValue?.trim() || `Property Object ${index + 1}`;
        const { header, titleSpan, body } = this.createCollapsible(container, label, !template.folded);

        header.addEventListener('click', async (e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            const isOpen = body.style.display !== 'none';
            this.plugin.settings.templates[index].folded = isOpen;
            await this.plugin.saveSettings();
        });

        const removeBtn = header.createEl('button', { text: 'Remove' });
        removeBtn.classList.add('mod-warning');
        removeBtn.addEventListener('click', async e => {
            e.stopPropagation();
            this.plugin.settings.templates.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
        });

        new Setting(body)
            .setName('Property type value')
            .setDesc('Template applies when the target property equals this value (e.g. task)')
            .addText(text =>
                text
                    .setValue(template.propertyTypeValue || '')
                    .setPlaceholder('task')
                    .onChange(async v => {
                        const trimmed = v.trim();
                        this.plugin.settings.templates[index].propertyTypeValue = trimmed;
                        await this.plugin.saveSettings();
                        titleSpan.textContent = trimmed || `Property Object ${index + 1}`;
                    })
            );

        new Setting(body)
            .setName('Object template')
            .setDesc('Frontmatter structure enforced during validation')
            .addTextArea(ta => {
                ta.setValue(template.objectTemplate)
                    .setPlaceholder('---\nhiking-start:\nhiking-difficulty:\n---')
                    .onChange(async v => {
                        this.plugin.settings.templates[index].objectTemplate = v;
                        await this.plugin.saveSettings();
                    });
                ta.inputEl.rows = 8;
                ta.inputEl.style.width = '100%';
                ta.inputEl.style.fontFamily = 'var(--font-monospace)';
            });

        new Setting(body)
            .setName('Appear in object creation')
            .setDesc('Show this object type in the Create Object modal')
            .addToggle(toggle =>
                toggle.setValue(template.createNotes).onChange(async v => {
                    this.plugin.settings.templates[index].createNotes = v;
                    await this.plugin.saveSettings();
                })
            );
    }

    private renderScopedTemplate(container: HTMLElement, template: ScopedTemplateConfig, index: number) {
        const label =
            template.name?.trim() ||
            template.targetFolders.filter(f => f.trim()).join(', ') ||
            `Scoped Object ${index + 1}`;

        const { header, titleSpan, body } = this.createCollapsible(container, label, !template.folded);

        header.addEventListener('click', async (e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            const isOpen = body.style.display !== 'none';
            this.plugin.settings.scopedTemplates[index].folded = isOpen;
            await this.plugin.saveSettings();
        });

        const removeBtn = header.createEl('button', { text: 'Remove' });
        removeBtn.classList.add('mod-warning');
        removeBtn.addEventListener('click', async e => {
            e.stopPropagation();
            this.plugin.settings.scopedTemplates.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
        });

        new Setting(body)
            .setName('Name')
            .setDesc('Display name for this scoped object')
            .addText(text =>
                text
                    .setValue(template.name || '')
                    .setPlaceholder('My scoped object')
                    .onChange(async v => {
                        const trimmed = v.trim();
                        this.plugin.settings.scopedTemplates[index].name = trimmed;
                        await this.plugin.saveSettings();
                        titleSpan.textContent = trimmed || `Scoped Object ${index + 1}`;
                    })
            );

        new Setting(body)
            .setName('Target folders')
            .setDesc('All markdown files in these folders are validated against this template')
            .addButton(btn =>
                btn.setButtonText('Add folder').onClick(async () => {
                    this.plugin.settings.scopedTemplates[index].targetFolders.push('');
                    await this.plugin.saveSettings();
                    this.display();
                })
            );

        template.targetFolders.forEach((folder, fi) => {
            new Setting(body)
                .setName(`Folder ${fi + 1}`)
                .addSearch(search => {
                    new FolderSuggest(this.plugin.app, search.inputEl);
                    search
                        .setValue(folder)
                        .setPlaceholder('path/to/folder')
                        .onChange(async v => {
                            this.plugin.settings.scopedTemplates[index].targetFolders[fi] = normalizePath(v.trim());
                            await this.plugin.saveSettings();
                        });
                })
                .addButton(btn =>
                    btn.setButtonText('Remove').setWarning().onClick(async () => {
                        this.plugin.settings.scopedTemplates[index].targetFolders.splice(fi, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    })
                );
        });

        new Setting(body)
            .setName('Object template')
            .setDesc('Frontmatter structure applied to all files in the target folders')
            .addTextArea(ta => {
                ta.setValue(template.objectTemplate)
                    .setPlaceholder('---\nhiking-start:\nhiking-difficulty:\n---')
                    .onChange(async v => {
                        this.plugin.settings.scopedTemplates[index].objectTemplate = v;
                        await this.plugin.saveSettings();
                    });
                ta.inputEl.rows = 8;
                ta.inputEl.style.width = '100%';
                ta.inputEl.style.fontFamily = 'var(--font-monospace)';
            });
    }
}