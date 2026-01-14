import { App, Notice } from 'obsidian';
import { ValidationPluginSettings } from 'src_ts/Settings/config_data';

export class ValidateTypes {
    app: App;

    constructor(app: App) {
        this.app = app;
    }

    async validateTypesAsync(settings: ValidationPluginSettings) {
        const { vault, metadataCache, fileManager } = this.app;
        let totalCount = 0;

        for (const template of settings.templates) {
            if (!template.objectTemplate || !template.targetFolder) {
                console.warn(`Skipping incomplete template: ${this.getFolderName(template.targetFolder)}`);
                continue;
            }

            try {
                const count = await this.validateTemplate(
                    vault,
                    metadataCache,
                    fileManager,
                    template.objectTemplate,
                    template.targetFolder
                );
                totalCount += count;
            } catch (error) {
                console.error(`Error validating template ${this.getFolderName(template.targetFolder)}:`, error);
            }
        }

        new Notice(`Validation complete. Reviewed ${totalCount} files.`);
    }

    async validateTemplate(
        vault: any,
        metadataCache: any,
        fileManager: any,
        templateContent: string,
        targetFolder: string
    ): Promise<number> {
        // Extract ordered keys and default values from template content
        const orderedKeys = this.extractOrderedKeysFromFrontmatter(templateContent);
        const templateFM = this.extractFrontmatterValues(templateContent);

        if (orderedKeys.length === 0) {
            console.warn(`No keys found in template for folder: ${this.getFolderName(targetFolder)}`);
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

        new Notice(`Validated ${fileCount} files for folder: ${this.getFolderName(targetFolder)}`);
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

    extractFrontmatterValues(content: string): Record<string, any> {
        if (!content.startsWith("---")) return {};

        const end = content.indexOf("\n---", 3);
        if (end === -1) return {};

        const yamlBlock = content.slice(3, end).trim();
        const lines = yamlBlock.split("\n");
        const values: Record<string, any> = {};

        for (const line of lines) {
            // Ignore array items and empty lines
            if (!line || line.startsWith("  -")) continue;

            // Top-level key only (not indented)
            if (!line.startsWith(" ")) {
                const idx = line.indexOf(":");
                if (idx !== -1) {
                    const key = line.slice(0, idx).trim();
                    let value = line.slice(idx + 1).trim();
                    
                    // Parse value
                    if (value === '') {
                        values[key] = '';
                    } else if (value.startsWith('"') && value.endsWith('"')) {
                        values[key] = value.slice(1, -1);
                    } else if (!isNaN(Number(value))) {
                        values[key] = Number(value);
                    } else {
                        values[key] = value;
                    }
                }
            }
        }

        return values;
    }

    private getFolderName(path: string): string {
        if (!path) return '';
        const parts = path.split('/');
        return parts[parts.length - 1];
    }
}