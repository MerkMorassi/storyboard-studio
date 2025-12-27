
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Content, Type, Modality } from "@google/genai";
import { MythosData } from './mythosData';

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

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
  positiveConstraints?: string;
  negativeConstraints?: string;
  dynamicLists?: any[];
}

export interface ScribeOutlineInput {
  title: string;
  genre: string;
  theme: string;
  setting: string;
  tone: string;
  cast: string;
  beatSheet: string;
  positiveConstraints?: string;
  negativeConstraints?: string;
  dynamicLists?: any[];
}

export interface ScribeOutlineOutput {
  workingTitle: string;
  logline: string;
  treatment: string;
  fundamentalStoryQuestions: string[];
  archetypalCharacters: string[];
  sceneGenerationQuestions: string[];
}

const getScribeSystemPrompt = (pos?: string, neg?: string, dynamicLists?: any[]) => {
    let base = `
### ROLE
You are the MythOS Studio Screenwriter. You transform story blueprints into industry-standard screenplays.

### STUDIO STANDARDS (PRIMARY OVERRIDE)
**MUST INCLUDE (Positive):** ${pos || "Standard cinematic storytelling."}
**STRICTLY FORBIDDEN (Negative/Guardrails):** ${neg || "None specified."}

### KNOWLEDGE BASE
You have access to the MythOS Lattice (Genres, Structures, Archetypes). Cross-reference all inputs with these protocols.
`;

    if (dynamicLists && dynamicLists.length > 0) {
        base += `\n### DYNAMIC DICTIONARIES\n`;
        dynamicLists.forEach(list => {
            base += `[${list.name}]: ${list.items.join(', ')}\n`;
        });
        base += `\n**RULE:** Resolve any [BracketedTags] in the prompt by selecting a relevant item from these lists.\n`;
    }

    return base;
};

export const runScribeAgent = async (input: ScribeInput): Promise<string> => {
    return apiCallWithRetry(async () => {
        const ai = getClient();
        const systemInstruction = getScribeSystemPrompt(input.positiveConstraints, input.negativeConstraints, input.dynamicLists);

        const inputBlock = `
COMMAND: WRITE 40-SCENE SCREENPLAY
Label as "FIRST DRAFT".

BLUEPRINT DATA:
TITLE: ${input.workingTitle}
GENRE: ${input.genre}
THEME: ${input.theme}
TREATMENT: ${input.treatment}
CAST: ${input.cast}
BEATS: ${input.beatSheet}

TASK:
Write the screenplay. Ensure the "Must Include" rules are central and "Strictly Forbidden" items are entirely absent.
`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: { parts: [{ text: inputBlock }] },
                config: {
                    systemInstruction,
                    maxOutputTokens: 8192,
                    temperature: 0.7,
                    safetySettings
                }
            });
            return response.text || "";
        } catch (error) {
            console.error("Scribe Agent Error:", error);
            throw error;
        }
    });
};

export const runScribeOutlineAgent = async (input: ScribeOutlineInput): Promise<ScribeOutlineOutput> => {
    return apiCallWithRetry(async () => {
        const ai = getClient();
        const systemInstruction = getScribeSystemPrompt(input.positiveConstraints, input.negativeConstraints, input.dynamicLists);

        const inputBlock = `
COMMAND: GENERATE STORY OUTLINE (JSON)

RAW BLUEPRINT:
TITLE: ${input.title}
GENRE: ${input.genre}
THEME: ${input.theme}
SETTING: ${input.setting}
BEATS: ${input.beatSheet}

TASK:
Filter this raw blueprint through the STUDIO STANDARDS. If the blueprint contradicts the Standards (Positive/Negative), the Standards WIN.
Example: If Standard is "Rated G" and Blueprint is "Slasher", pivot the story to a family-friendly spooky adventure.

OUTPUT FORMAT: JSON Schema.
`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{ text: inputBlock }] },
                config: {
                    maxOutputTokens: 4096,
                    systemInstruction,
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
            return JSON.parse(response.text.trim());
        } catch (error) {
            console.error("Scribe Outline Error:", error);
            throw error;
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
