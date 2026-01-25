export enum COLLECT_TYPE{
	T_PATH,
	T_REGEX,
}

export interface TemplateConfig {
	folded: boolean;
	object_name: string;
	collect_type: number;
	createNotes: boolean;
	targetFolder: string;
	objectTemplate: string;
	
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