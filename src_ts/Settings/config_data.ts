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