export interface TemplateConfig {
	folded: boolean;
	createNotes: boolean;
	propertyTypeValue: string;
	objectTemplate: string;
	
}

export interface ScopedTemplateConfig {
	folded: boolean;
	name: string;
	objectTemplate: string;
	targetFolders: string[];
}

export interface ValidationPluginSettings {
	templates: TemplateConfig[];
	scopedTemplates: ScopedTemplateConfig[];
	targetProperty: string;
	ignoreFolders: string[];
}

export const DEFAULT_SETTINGS: ValidationPluginSettings = {
	templates: [],
	scopedTemplates: [],
	targetProperty: '',
	ignoreFolders: []
};