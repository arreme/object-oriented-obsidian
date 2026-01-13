import { TFolder } from "obsidian";

export interface TemplateConfig {
	templatePath: string;
	targetFolder: string;
}

export interface ValidationPluginSettings {
	templates: TemplateConfig[];
	pdfSourceFolder: string;
	pdfDestFolder: string;
	pdfTemplate: string;
	testSetting: string;
}

export const DEFAULT_SETTINGS: ValidationPluginSettings = {
	templates: [],
	pdfSourceFolder: '',
	pdfDestFolder: '',
	pdfTemplate: '',
	testSetting: ''
};