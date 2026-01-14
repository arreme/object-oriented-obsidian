import { App, Notice, parseYaml } from 'obsidian';
import { ValidationPluginSettings } from 'src_ts/Settings/config_data';

export class ValidateTypes {
    app: App;

    constructor(app: App) {
        this.app = app;
    }

    async validateTypesAsync(settings: ValidationPluginSettings) {
        const { vault, fileManager } = this.app;
        let totalCount = 0;

        for (const template of settings.templates) {
            if (!template.objectTemplate || !template.targetFolder) {
                console.warn(`Skipping incomplete template: ${this.getFolderName(template.targetFolder)}`);
                continue;
            }

            try {
                const count = await this.validateTemplate(
                    vault,
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

    private async validateTemplate(vault: any, fileManager: any, templateContent: string, targetFolder: string): Promise<number> {
        // Parse template frontmatter using Obsidian's built-in parser
        const templateFM = this.parseFrontmatterWithObsidian(templateContent);
        if (!templateFM) {
            throw new Error(`Template has no valid YAML frontmatter for folder: ${this.getFolderName(targetFolder)}`);
        }

        // Extract ordered keys from template content
        const orderedKeys = this.extractOrderedKeysFromFrontmatter(templateContent);

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

        new Notice(`Validated ${fileCount} files for template: ${this.getFolderName(targetFolder)}`);
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

    private getFolderName(path: string): string {
        if (!path) return '';
        const parts = path.split('/');
        return parts[parts.length - 1];
    }
}