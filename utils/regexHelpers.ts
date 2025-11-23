import { RegexRule, PipelineResult, ProcessingLog } from '../types';

/**
 * Parses a string like "/pattern/g" into a RegExp object.
 * Also handles strings without delimiters by assuming they are just the pattern.
 */
export const stringToRegex = (str: string): RegExp => {
        if (!str) return new RegExp('');

        // Try to match /pattern/flags format
        const match = str.match(/^\/(.*?)\/([gimsuy]*)$/);
        if (match) {
                return new RegExp(match[1], match[2]);
        }

        // Default fallback: global flag, treat whole string as pattern
        return new RegExp(str, 'g');
};

/**
 * Runs the chain of regex replacements.
 */
export const runPipeline = (sourceText: string, rules: RegexRule[]): PipelineResult => {
        // Sort by order
        const sortedRules = [...rules].sort((a, b) => a.order - b.order);

        // Inject Scrollbar Styles
        const scrollbarStyles = `
    <style>
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.3); border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(128, 128, 128, 0.5); }
    </style>
  `;

        // If source text is empty, display the replace string of all active rules (template preview)
        if (!sourceText) {
                const logs: ProcessingLog[] = [];
                let accumulatedHtml = '';

                for (const rule of sortedRules) {
                        if (!rule.active) continue;
                        accumulatedHtml += rule.replace;
                        logs.push({
                                ruleId: rule.id,
                                ruleName: rule.name,
                                matched: false,
                                matchCount: 0,
                                executionTimeMs: 0
                        });
                }

                return {
                        finalHtml: scrollbarStyles + accumulatedHtml,
                        logs
                };
        }

        let currentText = sourceText;
        const logs: ProcessingLog[] = [];

        for (const rule of sortedRules) {
                if (!rule.active) continue;

                const startTime = performance.now();
                let matchCount = 0;
                let hasError = false;
                let errorMessage = '';

                try {
                        const regex = stringToRegex(rule.regex);

                        // Count matches without altering strictly for logging (optional, can be expensive)
                        // Using replacement with a counter function to be efficient
                        const previousText = currentText;

                        currentText = currentText.replace(regex, (...args) => {
                                matchCount++;
                                // The last argument is the full string, 2nd to last is offset
                                // We handle standard $n replacement by letting the regex engine do it naturally
                                // But since we are inside a callback to count, we can't easily use the string replacement syntax directly
                                // UNLESS we don't use a callback.

                                // Revert to standard replace for logic, use match() for counting.
                                return ''; // Dummy return, we won't use this result
                        });

                        // Actual replacement
                        currentText = previousText.replace(regex, rule.replace);

                        // If the replace function wasn't used for counting (which modifies behavior), 
                        // let's do a quick match check if it's global
                        if (matchCount === 0) {
                                const matches = previousText.match(regex);
                                if (matches) matchCount = regex.flags.includes('g') ? matches.length : 1;
                        }

                } catch (e: any) {
                        hasError = true;
                        errorMessage = e.message;
                }

                logs.push({
                        ruleId: rule.id,
                        ruleName: rule.name,
                        matched: matchCount > 0,
                        matchCount,
                        executionTimeMs: performance.now() - startTime,
                        error: hasError ? errorMessage : undefined
                });
        }

        return {
                finalHtml: scrollbarStyles + currentText,
                logs
        };
};
