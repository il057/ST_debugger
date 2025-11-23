import { GoogleGenAI, Type, FunctionDeclaration, Tool } from "@google/genai";
import { RegexRule, UserSettings } from "../types";

// Define the tools for the AI to manipulate the app state
const updateRuleTool: FunctionDeclaration = {
        name: 'updateRule',
        description: '更新现有的正则规则，或如果ID不存在则创建新规则。',
        parameters: {
                type: Type.OBJECT,
                properties: {
                        id: { type: Type.STRING, description: '要更新的规则ID' },
                        regex: { type: Type.STRING, description: '新的正则模式 (例如 /abc/g).' },
                        replace: { type: Type.STRING, description: '新的 HTML 替换字符串。' },
                        name: { type: Type.STRING, description: '规则的描述性名称。' }
                },
                required: ['id']
        }
};

const addRuleTool: FunctionDeclaration = {
        name: 'addRule',
        description: '在管道末尾添加一个全新的规则。',
        parameters: {
                type: Type.OBJECT,
                properties: {
                        name: { type: Type.STRING, description: '规则名称' },
                        regex: { type: Type.STRING, description: '正则模式' },
                        replace: { type: Type.STRING, description: '替换 HTML' }
                },
                required: ['name', 'regex', 'replace']
        }
};

const updateSourceTextTool: FunctionDeclaration = {
        name: 'updateSourceText',
        description: '更新用于测试的原始源文本。',
        parameters: {
                type: Type.OBJECT,
                properties: {
                        text: { type: Type.STRING, description: '新的源文本' }
                },
                required: ['text']
        }
};

const tools: Tool[] = [{
        functionDeclarations: [updateRuleTool, addRuleTool, updateSourceTextTool]
}];

export interface ChatMessage {
        role: 'user' | 'model';
        content: string;
}

// 通过反代使用OpenAI兼容API
async function sendMessageViaProxy(
        history: ChatMessage[],
        currentRules: RegexRule[],
        currentText: string,
        settings: UserSettings,
        onToolCall: (name: string, args: any) => Promise<any>
): Promise<string> {
        const apiKey = settings.apiKey || process.env.API_KEY || '';
        const baseUrl = settings.baseUrl?.trim().endsWith('/')
                ? settings.baseUrl.trim().slice(0, -1)
                : settings.baseUrl?.trim();

        const systemInstruction = `You are an expert Regex & HTML Engineer for the "Tavern Regex Debugger" app.
User is building a regex replacement pipeline to convert raw text into rich HTML UI.

CURRENT STATE:
=== Source Text ===
${currentText}

=== Current Rules (${currentRules.length} total) ===
${currentRules.map((r, i) => `[${i + 1}] ID: ${r.id}
    Name: ${r.name}
    Active: ${r.active}
    Regex: ${r.regex}
    Replace: ${r.replace}`).join('\n\n')}

Your goal is to help the user write correct regex, fix HTML structure, and debug pipeline issues.

CRITICAL INSTRUCTIONS:
1. **LANGUAGE**: You MUST reply in ${settings.language === 'zh' ? 'SIMPLIFIED CHINESE (中文)' : 'ENGLISH'}.
2. **TOOL USAGE**: You have tools to DIRECTLY MODIFY the app state:
   - updateRule: Update existing rules (name, regex, replace)
   - addRule: Create new rules
   - updateSourceText: Modify the source text
3. **WHEN TO USE TOOLS**:
   - When user asks to "fix", "change", "update", "add" anything
   - When you identify issues that need correction
   - DO NOT just tell the user what to change - USE THE TOOLS to make the changes
4. **AFTER TOOL USE**: Briefly confirm what you changed in ${settings.language === 'zh' ? 'Chinese' : 'English'}.
5. **RULE IDs**: Always use the exact ID from the current rules list above.
`;

        const messages = [
                { role: 'system', content: systemInstruction },
                ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : h.role, content: h.content }))
        ];

        // 转换工具格式为OpenAI格式
        const openaiTools = [
                {
                        type: 'function',
                        function: {
                                name: 'updateRule',
                                description: '更新现有的正则规则，或如果ID不存在则创建新规则。',
                                parameters: {
                                        type: 'object',
                                        properties: {
                                                id: { type: 'string', description: '要更新的规则ID' },
                                                regex: { type: 'string', description: '新的正则模式 (例如 /abc/g).' },
                                                replace: { type: 'string', description: '新的 HTML 替换字符串。' },
                                                name: { type: 'string', description: '规则的描述性名称。' }
                                        },
                                        required: ['id']
                                }
                        }
                },
                {
                        type: 'function',
                        function: {
                                name: 'addRule',
                                description: '在管道末尾添加一个全新的规则。',
                                parameters: {
                                        type: 'object',
                                        properties: {
                                                name: { type: 'string', description: '规则名称' },
                                                regex: { type: 'string', description: '正则模式' },
                                                replace: { type: 'string', description: '替换 HTML' }
                                        },
                                        required: ['name', 'regex', 'replace']
                                }
                        }
                },
                {
                        type: 'function',
                        function: {
                                name: 'updateSourceText',
                                description: '更新用于测试的原始源文本。',
                                parameters: {
                                        type: 'object',
                                        properties: {
                                                text: { type: 'string', description: '新的源文本' }
                                        },
                                        required: ['text']
                                }
                        }
                }
        ];

        const requestBody: any = {
                model: settings.model || 'gemini-2.0-flash-exp',
                messages: messages,
                temperature: 0.4,
                tools: openaiTools,
                tool_choice: 'auto'
        };

        let currentMessages = [...messages];
        const maxTurns = 5;
        let turns = 0;
        let useTools = true;

        let lastAssistantContent: string | null = null;
        while (turns < maxTurns) {
                console.log('[sendMessageViaProxy] turn', turns, 'currentMessages length', currentMessages.length, 'useTools', useTools);

                const bodyToSend = { ...requestBody, messages: currentMessages };
                if (!useTools) {
                        delete bodyToSend.tools;
                        delete bodyToSend.tool_choice;
                }

                let response;
                try {
                        response = await fetch(`${baseUrl}/v1/chat/completions`, {
                                method: 'POST',
                                headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${apiKey}`
                                },
                                body: JSON.stringify(bodyToSend)
                        });
                } catch (error) {
                        console.warn(`[sendMessageViaProxy] Fetch failed (turn ${turns}, useTools ${useTools})`, error);
                        if (useTools) {
                                // Don't retry on 429
                                if (error.message && error.message.includes('429')) {
                                        throw error;
                                }
                                console.warn('[sendMessageViaProxy] Retrying without tools...');
                                useTools = false;
                                continue;
                        }
                        throw error;
                }

                if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        const status = response.status;
                        if (status === 429) {
                                throw new Error(settings.language === 'zh' ? '请求过多 (429)，请稍后重试。' : 'Too many requests (429), please try again later.');
                        }
                        throw new Error(errorData.error?.message || `HTTP ${status}`);
                }

                const data = await response.json();
                console.log('[sendMessageViaProxy] raw response data:', data);
                const choice = data.choices[0];

                if (!choice) {
                        throw new Error('No response from AI');
                }

                const message = choice.message;

                // 如果有工具调用
                if (message.tool_calls && message.tool_calls.length > 0) {
                        turns++;
                        // Sanitize assistant message to ensure only necessary fields are sent back
                        const assistantMsg = {
                                role: 'assistant',
                                content: message.content || null,
                                tool_calls: message.tool_calls
                        };
                        currentMessages.push(assistantMsg as any);

                        for (const toolCall of message.tool_calls) {
                                const functionName = toolCall.function.name;
                                const functionArgs = JSON.parse(toolCall.function.arguments);

                                console.log('AI calling tool via proxy:', functionName, functionArgs);

                                try {
                                        const result = await onToolCall(functionName, functionArgs);
                                        currentMessages.push({
                                                role: 'tool',
                                                tool_call_id: toolCall.id,
                                                content: JSON.stringify({ result: 'Success', data: result })
                                        } as any);
                                } catch (e: any) {
                                        console.error('Tool call error:', e);
                                        currentMessages.push({
                                                role: 'tool',
                                                tool_call_id: toolCall.id,
                                                content: JSON.stringify({ error: e.message })
                                        } as any);
                                }
                        }
                } else {
                        // 没有工具调用，通常是文本回复（assistant）
                        console.log('[sendMessageViaProxy] assistant message received:', message.content);

                        // 防止无限循环：如果和上次文本相同，则直接返回
                        if (message.content && message.content === lastAssistantContent) {
                                console.warn('[sendMessageViaProxy] repeated assistant response, returning to avoid loop.');
                                return message.content;
                        }

                        if (message.content) {
                                // 将assistant消息加入历史
                                currentMessages.push(message);

                                // 将文本回复打包成与 tool 调用相同的格式，方便前端和工具处理
                                const toolLikeMsg = {
                                        role: 'tool',
                                        tool_call_id: `assistant-text-${Date.now()}`,
                                        content: JSON.stringify({ result: 'Success', data: message.content })
                                } as any;
                                console.log('[sendMessageViaProxy] pushing tool-like assistant message:', toolLikeMsg);
                                currentMessages.push(toolLikeMsg);

                                // 记录为上一条内容并返回文本
                                lastAssistantContent = message.content;
                                return message.content || '';
                        }
                        return message.content || '';
                }
        }

        // 如果循环结束但有最后一条assistant消息，返回它
        const lastMessage = currentMessages[currentMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
                return lastMessage.content;
        }

        return settings.language === 'zh' ? '已达到最大工具调用次数' : 'Maximum tool calls reached';
}

export const sendMessageToAI = async (
        history: ChatMessage[],
        currentRules: RegexRule[],
        currentText: string,
        settings: UserSettings,
        onToolCall: (name: string, args: any) => Promise<any>
): Promise<string> => {

        const systemInstruction = `You are an expert Regex & HTML Engineer for the "Tavern Regex Debugger" app.
User is building a regex replacement pipeline to convert raw text into rich HTML UI.

CURRENT STATE:
=== Source Text ===
${currentText}

=== Current Rules (${currentRules.length} total) ===
${currentRules.map((r, i) => `[${i + 1}] ID: ${r.id}
    Name: ${r.name}
    Active: ${r.active}
    Regex: ${r.regex}
    Replace: ${r.replace}`).join('\n\n')}

Your goal is to help the user write correct regex, fix HTML structure, and debug pipeline issues.

CRITICAL INSTRUCTIONS:
1. **LANGUAGE**: You MUST reply in ${settings.language === 'zh' ? 'SIMPLIFIED CHINESE (中文)' : 'ENGLISH'}.
2. **TOOL USAGE**: You have tools to DIRECTLY MODIFY the app state:
   - updateRule: Update existing rules (name, regex, replace)
   - addRule: Create new rules
   - updateSourceText: Modify the source text
3. **WHEN TO USE TOOLS**:
   - When user asks to "fix", "change", "update", "add" anything
   - When you identify issues that need correction
   - DO NOT just tell the user what to change - USE THE TOOLS to make the changes
4. **AFTER TOOL USE**: Briefly confirm what you changed in ${settings.language === 'zh' ? 'Chinese' : 'English'}.
5. **RULE IDs**: Always use the exact ID from the current rules list above.
`;

        // Determine API Key and Transport
        const apiKey = settings.apiKey || process.env.API_KEY || '';

        if (!apiKey) {
                return settings.language === 'zh'
                        ? "错误：未配置 API Key。请点击右上角设置按钮输入您的 Gemini API Key。"
                        : "Error: API Key not configured. Please enter your Gemini API Key in settings.";
        }

        try {
                // 判断是否使用反代
                const isDirect = !settings.baseUrl || settings.baseUrl.includes('googleapis.com');

                if (!isDirect) {
                        // 使用反代时，通过fetch直接调用OpenAI兼容API
                        console.log('[sendMessageToAI] using proxy via sendMessageViaProxy.');
                        return await sendMessageViaProxy(history, currentRules, currentText, settings, onToolCall);
                }

                // 直连Google API
                const clientOptions: any = { apiKey };
                const ai = new GoogleGenAI(clientOptions);

                const modelName = settings.model || 'gemini-2.0-flash-exp';

                // 构建完整的历史记录(不包括最后一条消息)
                const chatHistory = history.slice(0, -1).map(h => ({
                        role: h.role,
                        parts: [{ text: h.content }]
                }));

                const chat = ai.chats.create({
                        model: modelName,
                        config: {
                                systemInstruction,
                                temperature: 0.4,
                                tools,
                        },
                        history: chatHistory
                });

                const lastMsg = history[history.length - 1];
                console.log('[sendMessageToAI] sending message via GoogleGenAI chat.sendMessage', { modelName, lastMsgContent: lastMsg.content });
                let response = await chat.sendMessage({ message: lastMsg.content });
                console.log('[sendMessageToAI] raw response:', response);

                // Handle Function Calls
                const maxTurns = 5;
                let turns = 0;

                let finalResponseText = "";

                while (response.candidates && response.candidates[0].content.parts.some(p => p.functionCall) && turns < maxTurns) {
                        turns++;
                        const parts = response.candidates[0].content.parts;
                        const toolResponseParts = [];

                        for (const part of parts) {
                                if (part.functionCall) {
                                        const call = part.functionCall;
                                        console.log("AI calling tool:", call.name, call.args);

                                        try {
                                                const result = await onToolCall(call.name, call.args);
                                                toolResponseParts.push({
                                                        functionResponse: {
                                                                name: call.name,
                                                                response: { result: "Success", data: result }
                                                        }
                                                });
                                        } catch (e: any) {
                                                console.error("Tool call error:", e);
                                                toolResponseParts.push({
                                                        functionResponse: {
                                                                name: call.name,
                                                                response: { error: e.message }
                                                        }
                                                });
                                        }
                                }
                        }

                        if (toolResponseParts.length > 0) {
                                console.log('[sendMessageToAI] sending toolResponseParts back to model', toolResponseParts);
                                response = await chat.sendMessage({ message: toolResponseParts });
                                console.log('[sendMessageToAI] new response after tool responses:', response);
                        } else {
                                break;
                        }
                }

                if (response.text) {
                        finalResponseText = response.text;
                }

                // Debug: print final response
                console.log('[sendMessageToAI] finalResponseText:', finalResponseText);
                console.log('[sendMessageToAI] final raw response object:', response);
                // For debugging/consistency: construct a tool-like representation of the assistant reply
                const toolLikeAssistant = {
                        role: 'tool',
                        tool_call_id: `assistant-text-${Date.now()}`,
                        content: JSON.stringify({ result: 'Success', data: finalResponseText })
                } as any;
                console.log('[sendMessageToAI] tool-like assistant message (for consistency):', toolLikeAssistant);

                return finalResponseText;

        } catch (error: any) {
                if (error.message && error.message.includes('429')) {
                        return settings.language === 'zh'
                                ? "请求过多 (429)，请稍后手动重试。"
                                : "Too many requests (429). Please retry manually later.";
                }
                const errorMsg = settings.language === 'zh'
                        ? `通信错误: ${error.message || "未知错误"}。请检查 API Key 和 Base URL 设置。`
                        : `Communication Error: ${error.message || "Unknown error"}. Check API Key and Base URL settings.`;
                return errorMsg;
        }
};

export const fetchAvailableModels = async (settings: UserSettings): Promise<string[]> => {
        const apiKey = settings.apiKey || process.env.API_KEY || '';
        if (!apiKey) throw new Error("No API Key");

        let fetchUrl;
        const fetchOptions: RequestInit = {
                method: 'GET',
                headers: {
                        'Content-Type': 'application/json',
                },
        };

        const isDirect = !settings.baseUrl || settings.baseUrl.includes('googleapis.com');

        if (isDirect) {
                // Gemini Direct
                fetchUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        } else {
                // Proxy (OpenAI Compatible)
                if (!settings.baseUrl || !settings.baseUrl.trim()) {
                        throw new Error('反向代理地址不能为空。');
                }
                // 清理URL，确保末尾没有多余的斜杠
                const cleanBaseUrl = settings.baseUrl.trim().endsWith('/')
                        ? settings.baseUrl.trim().slice(0, -1)
                        : settings.baseUrl.trim();

                fetchUrl = `${cleanBaseUrl}/v1/models`;
                fetchOptions.headers['Authorization'] = `Bearer ${apiKey}`;
        }

        try {
                const response = await fetch(fetchUrl, fetchOptions);

                if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        const errorMessage = errorData.error?.message || `HTTP 错误, 状态码: ${response.status}`;
                        throw new Error(errorMessage);
                }

                const data = await response.json();
                console.log('API返回数据:', data); // 调试日志

                // 根据连接方式，解析不同结构的返回数据
                let models: string[] = [];
                if (isDirect) {
                        // 解析 Gemini 的 `data.models` 数组
                        if (data.models && Array.isArray(data.models)) {
                                models = data.models
                                        .filter((model: any) => model.supportedGenerationMethods && model.supportedGenerationMethods.includes('generateContent'))
                                        .map((model: any) => model.name.replace('models/', ''));
                        }
                } else {
                        // 解析兼容OpenAI的返回数据，支持多种格式
                        if (data.data && Array.isArray(data.data)) {
                                // 格式1: { data: [{ id: "model-name" }] }
                                models = data.data.map((model: any) => model.id || model.name || String(model));
                        } else if (Array.isArray(data)) {
                                // 格式2: 直接返回数组 [{ id: "model-name" }] 或 ["model-name"]
                                models = data.map((model: any) => model.id || model.name || String(model));
                        } else if (data.models && Array.isArray(data.models)) {
                                // 格式3: { models: [...] }
                                models = data.models.map((model: any) => model.id || model.name || String(model));
                        }
                }

                console.log('解析后的模型列表:', models); // 调试日志

                if (models.length === 0) {
                        throw new Error('未能从API响应中解析出任何模型。请检查API返回格式。');
                }

                return models.sort();

        } catch (error: any) {
                throw error;
        }
};