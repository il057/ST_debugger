export interface RegexRule {
        id: string;
        name: string;
        regex: string; // The full string e.g., "/abc/g" or just "abc"
        replace: string;
        active: boolean;
        order: number;
}

export interface ProcessingLog {
        ruleId: string;
        ruleName: string;
        matched: boolean;
        matchCount: number;
        executionTimeMs: number;
        error?: string;
}

export interface PipelineResult {
        finalHtml: string;
        logs: ProcessingLog[];
}

export interface STScriptImport {
        id?: string;
        scriptName?: string;
        findRegex?: string;
        replaceString?: string;
        disabled?: boolean;
        placement?: number[];
        trimStrings?: string[];
        [key: string]: any;
}

export interface UserSettings {
        apiKey: string;
        baseUrl: string;
        theme: 'dark' | 'light';
        language: 'zh' | 'en';
        model?: string;
}