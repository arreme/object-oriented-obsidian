import { App, Notice, TFile } from 'obsidian';
import { ValidationPluginSettings } from 'src_ts/config_data';

export class ValidatePDF {
    app: App;
    
    constructor(app: App) {
        this.app = app;
    }

    async validatePDFsAsync(settings: ValidationPluginSettings) {
		const { vault, metadataCache, fileManager } = this.app;
		const { pdfSourceFolder, pdfDestFolder, pdfTemplate } = settings;

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
			if (oldPath === newPath){
                const pdfFile = vault.getAbstractFileByPath(oldPath);
                if (!pdfFile) {
                    try {
                        await vault.delete(target);
                        new Notice(`Removed orphaned note: ${noteName}`);
                    } catch (error) {
                        console.error(`Error removing note ${noteName}:`, error);
                    }
                }
                continue;
            } 

			const pdfFile = vault.getAbstractFileByPath(oldPath);
			if (!pdfFile) {
				console.warn(`Target PDF not found for ${noteName}`);
                new Notice("AAA");
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
}