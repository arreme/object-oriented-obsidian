import { App, Notice, parseYaml } from 'obsidian';
import { ValidationPluginSettings, ScopedTemplateConfig } from '../Settings/config_data';

export class ValidateTypes {
    app: App;

    constructor(app: App) {
        this.app = app;
    }

    async validateTypesAsync(settings: ValidationPluginSettings) {
        const { vault, fileManager } = this.app;
        let totalCount = 0;
        const targetProperty = settings.targetProperty?.trim();
        const ignoreFolders = (settings.ignoreFolders || [])
            .map((folder) => folder.trim())
            .filter((folder) => folder.length > 0);

        if (!targetProperty) {
            new Notice('Target property is not configured. Set it in plugin settings.');
            return;
        }

        for (const template of settings.templates) {
            if (!template.objectTemplate || !template.propertyTypeValue?.trim()) {
                console.warn('Skipping incomplete template: missing object template or property type value.');
                continue;
            }

            try {
                const count = await this.validateTemplate(
                    vault,
                    fileManager,
                    template.objectTemplate,
                    targetProperty,
                    template.propertyTypeValue.trim(),
                    ignoreFolders
                );
                totalCount += count;
            } catch (error) {
                console.error(`Error validating template for value ${template.propertyTypeValue}:`, error);
            }
        }

        new Notice(`Validation complete. Reviewed ${totalCount} files.`);

        // Validate scoped templates
        let scopedTotalCount = 0;
        for (const scopedTemplate of (settings.scopedTemplates || [])) {
            if (!scopedTemplate.objectTemplate || !scopedTemplate.targetFolders?.length) {
                console.warn('Skipping incomplete scoped template: missing object template or target folders.');
                continue;
            }

            const validFolders = scopedTemplate.targetFolders
                .map(f => f.trim())
                .filter(f => f.length > 0);

            if (validFolders.length === 0) continue;

            try {
                const count = await this.validateScopedTemplate(
                    vault,
                    fileManager,
                    scopedTemplate,
                    validFolders,
                    ignoreFolders
                );
                scopedTotalCount += count;
            } catch (error) {
                console.error(`Error validating scoped template:`, error);
            }
        }

        if (scopedTotalCount > 0) {
            new Notice(`Scoped validation complete. Reviewed ${scopedTotalCount} files.`);
        }
    }

    private async validateTemplate(
        vault: any,
        fileManager: any,
        templateContent: string,
        targetProperty: string,
        propertyTypeValue: string,
        ignoreFolders: string[]
    ): Promise<number> {
        // Parse template frontmatter using Obsidian's built-in parser
        const templateFM = this.parseFrontmatterWithObsidian(templateContent);
        if (!templateFM) {
            throw new Error(`Template has no valid YAML frontmatter for property type: ${propertyTypeValue}`);
        }

        // Build expected key order with targetProperty always first.
        const templateOrderedKeys = this.extractOrderedKeysFromFrontmatter(templateContent)
            .filter((key) => key !== targetProperty);
        const orderedKeys = [targetProperty, ...templateOrderedKeys];

        const templateValues: Record<string, unknown> = {
            ...templateFM,
            [targetProperty]: propertyTypeValue,
        };

        // Get all markdown files in vault and validate only those matching targetProperty/propertyTypeValue
        const files = vault.getFiles().filter(
            (f: any) => f.extension === "md" && !this.isIgnoredFile(f.path, ignoreFolders)
        );

        let fileCount = 0;

        for (const file of files) {
            let matchesTemplate = false;
            let frontmatterModified = false;

            await fileManager.processFrontMatter(file, (fm: any) => {
                if (!fm || !(targetProperty in fm)) return;

                const typeValue = String(fm[targetProperty] ?? '').trim();
                if (typeValue !== propertyTypeValue) return;

                matchesTemplate = true;

                const currentFm = { ...fm };
                const currentKeys = Object.keys(currentFm);
                let modified = currentKeys.length !== orderedKeys.length;

                if (!modified) {
                    for (let i = 0; i < currentKeys.length; i++) {
                        if (currentKeys[i] !== orderedKeys[i]) {
                            modified = true;
                            break;
                        }
                    }
                }

                if (!modified) {
                    for (const key of orderedKeys) {
                        if (key === targetProperty) {
                            if (String(currentFm[key] ?? '').trim() !== propertyTypeValue) {
                                modified = true;
                            }
                            continue;
                        }

                        if (!(key in currentFm)) {
                            modified = true;
                            break;
                        }
                    }
                }

                if (!modified) return;

                for (const key of Object.keys(fm)) {
                    delete fm[key];
                }

                for (const key of orderedKeys) {
                    if (key === targetProperty) {
                        fm[key] = propertyTypeValue;
                    } else {
                        fm[key] = key in currentFm ? currentFm[key] : templateValues[key];
                    }
                }

                frontmatterModified = true;
            });

            if (!matchesTemplate) {
                continue;
            }

            if (frontmatterModified) {
                fileCount++;
            }
        }
        
        new Notice(`Validated ${fileCount} files for ${targetProperty}: ${propertyTypeValue}`);
        return fileCount;
    }

    private parseFrontmatterWithObsidian(content: string): Record<string, any> | null {
        if (!content.startsWith("---")) return null;

        const end = content.indexOf("\n---", 3);
        if (end === -1) return null;

        const yamlBlock = content.slice(3, end).trim();

        try {
            // Use Obsidian's built-in YAML parser
            const parsed = parseYaml(yamlBlock);
            return parsed || {};
        } catch (error) {
            console.error("Error parsing YAML:", error);
            return null;
        }
    }

    private extractOrderedKeysFromFrontmatter(content: string): string[] {
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

    private isIgnoredFile(filePath: string, ignoreFolders: string[]): boolean {
        return ignoreFolders.some((folder) => filePath === folder || filePath.startsWith(`${folder}/`));
    }

    private isInTargetFolders(filePath: string, targetFolders: string[]): boolean {
        return targetFolders.some((folder) => filePath.startsWith(`${folder}/`));
    }

    private async validateScopedTemplate(
        vault: any,
        fileManager: any,
        scopedTemplate: ScopedTemplateConfig,
        targetFolders: string[],
        ignoreFolders: string[]
    ): Promise<number> {
        const templateFM = this.parseFrontmatterWithObsidian(scopedTemplate.objectTemplate);
        if (!templateFM) {
            throw new Error('Scoped template has no valid YAML frontmatter.');
        }

        const orderedKeys = this.extractOrderedKeysFromFrontmatter(scopedTemplate.objectTemplate);
        const templateValues: Record<string, unknown> = { ...templateFM };

        const files = vault.getFiles().filter(
            (f: any) => f.extension === 'md'
                && this.isInTargetFolders(f.path, targetFolders)
                && !this.isIgnoredFile(f.path, ignoreFolders)
        );

        let fileCount = 0;

        for (const file of files) {
            let frontmatterModified = false;

            await fileManager.processFrontMatter(file, (fm: any) => {
                if (!fm) return;

                const currentFm = { ...fm };
                const currentKeys = Object.keys(currentFm);
                let modified = currentKeys.length !== orderedKeys.length;

                if (!modified) {
                    for (let i = 0; i < currentKeys.length; i++) {
                        if (currentKeys[i] !== orderedKeys[i]) {
                            modified = true;
                            break;
                        }
                    }
                }

                if (!modified) {
                    for (const key of orderedKeys) {
                        if (!(key in currentFm)) {
                            modified = true;
                            break;
                        }
                    }
                }

                if (!modified) return;

                for (const key of Object.keys(fm)) {
                    delete fm[key];
                }

                for (const key of orderedKeys) {
                    fm[key] = key in currentFm ? currentFm[key] : templateValues[key];
                }

                frontmatterModified = true;
            });

            if (frontmatterModified) {
                fileCount++;
            }
        }

        const folderLabel = targetFolders.join(', ');
        new Notice(`Validated ${fileCount} files in scoped folders: ${folderLabel}`);
        return fileCount;
    }
}