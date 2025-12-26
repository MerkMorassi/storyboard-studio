import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Content, Type, Modality } from "@google/genai";
import { MythosData } from './mythosData';

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

/**
 * Initializes the Gemini API client.
 * API key is obtained exclusively from process.env.API_KEY.
 */
const getClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

const apiCallWithRetry = async <T>(apiFunction: () => Promise<T>, maxRetries = 3): Promise<T> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await apiFunction();
        } catch (error) {
            if (attempt === maxRetries - 1 || (error instanceof Error && !error.message.includes('rate limit'))) {
                throw error;
            }
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
            console.warn(`[API Retry] Attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${Math.round(delay/1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error("API call failed after multiple retries.");
};

const SCRIBE_SYSTEM_INSTRUCTION_STATIC = `
### ROLE
You are the MythOS Screenwriter (Model 3.5). You are an expert in Warner Bros. standard formatting and feature film structure.

### KNOWLEDGE BASE
You have been provided with internal MythOS Databases (STRUCTURES, ARCHETYPES, THEMES).
**CRITICAL:** When input mentions a Structure Beat, Theme ID, or Archetype, you MUST cross-reference these definitions.
* Do not hallucinate generic traits; use the specific ones in the file.
* Apply the "Cinematic Style" found in the Themes database.

### FORMATTING RULES (STRICT WB FEATURE FILM)
1. FONT: Courier 12-point style (simulated in text output).
2. SLUGLINES: INT./EXT. LOCATION - TIME (ALL CAPS).
3. ACTION: Present tense, visual, concise.
4. DIALOGUE: Centered names (simulated with spaces).
`;

export interface ScribeInput {
  workingTitle: string;
  genre: string;
  theme: string;
  setting: string;
  tone: string;
  cast: string;
  beatSheet: string;
  logline: string;
  treatment: string;
  fundamentalStoryQuestions: string;
  archetypalCharacters: string;
  sceneGenerationQuestions: string;
}

export interface ScribeOutlineInput {
  title: string;
  genre: string;
  theme: string;
  setting: string;
  tone: string;
  cast: string;
  beatSheet: string;
}

export interface ScribeOutlineOutput {
  workingTitle: string;
  logline: string;
  treatment: string;
  fundamentalStoryQuestions: string[];
  archetypalCharacters: string[];
  sceneGenerationQuestions: string[];
}

export const runScribeAgent = async (input: ScribeInput): Promise<string> => {
    return apiCallWithRetry(async () => {
        const ai = getClient();
        
        const LORE_PACK_DYNAMIC = `
=== MYTHOS DATABASE: STRUCTURES ===
${JSON.stringify(MythosData.structures, null, 2)}

=== MYTHOS DATABASE: ARCHETYPES ===
${JSON.stringify(MythosData.archetypes, null, 2)}

=== MYTHOS DATABASE: THEMES ===
${JSON.stringify(MythosData.themes, null, 2)}
`;
        const systemInstructionFinal = LORE_PACK_DYNAMIC + "\n\n" + SCRIBE_SYSTEM_INSTRUCTION_STATIC;

        const inputBlock = `
COMMAND: WRITE 40-SCENE SCREENPLAY
Label the result as "FIRST DRAFT".

METADATA:
WORKING TITLE: ${input.workingTitle}
GENRE: ${input.genre}
LOGLINE: ${input.logline}
THEME ID: ${input.theme} 
SETTING: ${input.setting}
TONE: ${input.tone}

=== TREATMENT ===
${input.treatment}

=== CAST ===
${input.cast}

=== CORE SCENE BEATS ===
${input.beatSheet}

TASK:
Write the complete 40-scene screenplay. Ensure continuous narrative flow.
Utilize sensory details and narrative hooks appropriate for the theme '${input.theme}' and Genre constraints.
`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview', // Industry-leading complex text task
                contents: { parts: [{ text: inputBlock }] },
                config: {
                    systemInstruction: systemInstructionFinal,
                    maxOutputTokens: 8192,
                    temperature: 0.7,
                    safetySettings
                }
            });
            
            const text = response.text;
            if (!text || !text.trim()) throw new Error("Scribe returned empty prose.");
            return text;
        } catch (error) {
            console.error("Scribe Agent Error:", error);
            throw error instanceof Error ? new Error(`Scribe Error: ${error.message}`) : new Error("Scribe execution failed.");
        }
    });
};

export const runScribeOutlineAgent = async (input: ScribeOutlineInput): Promise<ScribeOutlineOutput> => {
    return apiCallWithRetry(async () => {
        const ai = getClient();

        const LORE_PACK_DYNAMIC = `
=== MYTHOS DATABASE: STRUCTURES ===
${JSON.stringify(MythosData.structures, null, 2)}

=== MYTHOS DATABASE: ARCHETYPES ===
${JSON.stringify(MythosData.archetypes, null, 2)}

=== MYTHOS DATABASE: THEMES ===
${JSON.stringify(MythosData.themes, null, 2)}
`;
        const systemInstructionFinal = LORE_PACK_DYNAMIC + "\n\n" + SCRIBE_SYSTEM_INSTRUCTION_STATIC;

        const inputBlock = `
COMMAND: GENERATE SCREENPLAY OUTLINE

STORY DETAILS:
TITLE: ${input.title}
GENRE: ${input.genre}
THEME ID: ${input.theme}
SETTING: ${input.setting}
TONE: ${input.tone}
CAST:
${input.cast}
CORE SCENE BEATS:
${input.beatSheet}

TASK:
Generate a working title, logline, treatment, fundamental questions, archetypes list, and scene generation questions.

OUTPUT FORMAT:
Return a JSON object matching the Schema.
`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview', // High-speed basic text task
                contents: { parts: [{ text: inputBlock }] },
                config: {
                    maxOutputTokens: 4096,
                    systemInstruction: systemInstructionFinal,
                    temperature: 0.5,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            workingTitle: { type: Type.STRING },
                            logline: { type: Type.STRING },
                            treatment: { type: Type.STRING },
                            fundamentalStoryQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                            archetypalCharacters: { type: Type.ARRAY, items: { type: Type.STRING } },
                            sceneGenerationQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ["workingTitle", "logline", "treatment", "fundamentalStoryQuestions", "archetypalCharacters", "sceneGenerationQuestions"]
                    },
                    safetySettings
                }
            });
            
            const jsonText = response.text;
            if (!jsonText) throw new Error("Scribe Outline Agent returned empty JSON.");
            return JSON.parse(jsonText.trim());

        } catch (error) {
            console.error("Scribe Outline Agent Error:", error);
            throw error instanceof Error ? new Error(`Scribe Outline Error: ${error.message}`) : new Error("Scribe outline execution failed.");
        }
    });
};

export const getModelForTask = (queryText: string) => 'gemini-3-pro-preview';
export const fetchModels = async () => [
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)' }
];
export const getEmbeddings = async (text: string) => {
    return apiCallWithRetry(async () => {
        const ai = getClient();
        const response = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: { parts: [{ text }] }
        });
        return response.embeddings?.[0]?.values || null;
    });
};
export const generateText = async (prompt: string) => {
    return apiCallWithRetry(async () => {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }]
        });
        return response.text || "";
    });
};
export const generateSpeech = async (text: string, voice: string, rate: number) => {
    return apiCallWithRetry(async () => {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
                    speakingRate: rate
                }
            }
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
    });
};
export const createChat = (systemPrompt?: string, history?: Content[]) => {
    const ai = getClient();
    return ai.chats.create({ 
        model: 'gemini-3-pro-preview', 
        history, 
        config: { 
            systemInstruction: systemPrompt,
            safetySettings 
        } 
    });
};
