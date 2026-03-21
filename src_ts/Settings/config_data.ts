export interface TemplateConfig {
	folded: boolean;
	createNotes: boolean;
	propertyTypeValue: string;
	nameSuffix: string;
	objectTemplate: string;
	
}

export interface ValidationPluginSettings {
	templates: TemplateConfig[];
	targetProperty: string;
}

export const DEFAULT_SETTINGS: ValidationPluginSettings = {
	templates: [],
	targetProperty: ''
};