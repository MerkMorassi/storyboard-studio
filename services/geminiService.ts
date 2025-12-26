
import { GoogleGenAI, GenerateContentConfig, HarmCategory, HarmBlockThreshold, Chat, Content } from "@google/genai";
import { getApiKey } from './apiKeyService';

// --- DATA INGESTION (THE BRAIN) ---
// JSON files will be fetched dynamically, not directly imported.
let _structuresData: any;
let _archetypesData: any;
let _themesData: any;

const _loadScribeJsonData = async () => {
    if (_structuresData && _archetypesData && _themesData) return; // Already loaded

    const [structuresRes, archetypesRes, themesRes] = await Promise.all([
        fetch('/data/writer/structures.json'),
        fetch('/data/writer/archetypes.json'),
        fetch('/data/writer/novel_themes.json')
    ]);

    if (!structuresRes.ok || !archetypesRes.ok || !themesRes.ok) {
        throw new Error("Failed to fetch Scribe lore data.");
    }

    _structuresData = await structuresRes.json();
    _archetypesData = await archetypesRes.json();
    _themesData = await themesRes.json();
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const getClient = () => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API Key not found. Please configure it in the Knowledge tab.");
    }
    return new GoogleGenAI({ apiKey });
}

// --- UTILITY: RETRY LOGIC ---
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

// --- SCRIBE MODULE CONFIGURATION (Static part of the instruction) ---
const SCRIBE_SYSTEM_INSTRUCTION_STATIC = `
### ROLE
You are the MythOS Screenwriter (Model 3.0). You are an expert in Warner Bros. standard formatting and feature film structure.

### KNOWLEDGE BASE (LORE PACK)
You have been provided with the internal MythOS Databases (STRUCTURES, ARCHETYPES, THEMES) above. 
**CRITICAL:** When the User Input mentions a Structure Beat, Theme ID, or Archetype, you MUST cross-reference the definitions in this Lore Pack. 
* Do not hallucinate generic traits; use the specific ones in the file.
* Apply the "Cinematic Style" found in the Themes database.

### FORMATTING RULES (STRICT WB FEATURE FILM)
1. FONT: Courier 12-point style (simulated in text output).
2. SLUGLINES: INT./EXT. LOCATION - TIME (ALL CAPS).
3. ACTION: Present tense, visual, concise. Focus on important details.
4. CHARACTERS: Names in ALL CAPS when first introduced or speaking.
5. DIALOGUE: Center names. Parentheticals for specific action/emotion only.
6. NOVELIZATION: STRICTLY PROHIBITED. Do not write prose paragraphs.

### OUTPUT
Generate raw, industry-standard screenplay text.
`;

export interface ScribeInput {
  title: string;
  theme: string;
  setting: string;
  tone: string;
  cast: string;
  beatSheet: string;
}

// --- MAIN SCRIBE AGENT ---
export const runScribeAgent = async (input: ScribeInput): Promise<string> => {
    return apiCallWithRetry(async () => {
        const ai = getClient();
        
        // Ensure JSON data is loaded before constructing the system instruction
        await _loadScribeJsonData();

        const LORE_PACK_DYNAMIC = `
=== MYTHOS DATABASE: STRUCTURES ===
${JSON.stringify(_structuresData, null, 2)}

=== MYTHOS DATABASE: ARCHETYPES ===
${JSON.stringify(_archetypesData, null, 2)}

=== MYTHOS DATABASE: THEMES ===
${JSON.stringify(_themesData, null, 2)}
`;
        const systemInstructionFinal = LORE_PACK_DYNAMIC + "\n\n" + SCRIBE_SYSTEM_INSTRUCTION_STATIC;

        const inputBlock = `
COMMAND: WRITE SCREENPLAY SEQUENCE

METADATA:
TITLE: ${input.title}
THEME ID: ${input.theme} 
(Refer to 'novel_themes.json' in LORE PACK for thematic resonance)
SETTING: ${input.setting}
TONE: ${input.tone}

=== CAST ===
${input.cast}

=== SEQUENCE BEATS ===
${input.beatSheet}

TASK:
Write the screenplay scenes for the beats above.
Utilize sensory details and narrative hooks appropriate for the theme '${input.theme}' and Genre constraints.
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview', 
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

// --- (PRESERVE YOUR EXISTING FUNCTIONS BELOW) ---
// Keep getModelForTask, fetchModels, getEmbeddings, analyzeVideo, analyzeImage, etc. 
// They are required for the rest of your app. I am assuming they are below this line.

const fullPrompt = (prompt: string) => `${prompt}. IMPORTANT: Format the entire response as clean, well-structured, semantic HTML. Use only standard tags like <p>, <h1>, <ul>, <li>, etc. Do not include any inline styles, <style> blocks, or color attributes. The styling is handled by the application's CSS.`;

const HIGH_REASONING_TRIGGERS = [
    'synthesize', 'deeply', 'complex analysis', 'tragedy', 
    'profound', 'critical assessment', 'architectural plan', 'paradigm shift',
    'visualize', 'image analysis', 'music analysis', 'video analysis', 'reverse engineer'
];

export const getModelForTask = (queryText: string): string => {
    const lowQuery = queryText.toLowerCase();
    const isHighReasoning = HIGH_REASONING_TRIGGERS.some(word => lowQuery.includes(word));
    
    if (isHighReasoning) {
        return 'gemini-3-pro-preview'; 
    }
    return 'gemini-2.5-flash';
};

export const fetchModels = async (): Promise<{ id: string; name: string }[]> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.warn("API Key not set, using fallback models.");
        return [
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fallback)' },
            { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (Fallback)' },
        ];
    }
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("API call failed to fetch models.");
        }
        const data = await response.json();
        const compatibleModels = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
            .map((m: any) => ({
                id: m.name.replace('models/', ''),
                name: m.displayName
            }));
        
        if (compatibleModels.length > 0) return compatibleModels;
        throw new Error("No compatible models found.");

    } catch (e) {
        console.warn("Model fetch failed, using fallback list:", e);
        return [
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fallback)' },
            { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (Fallback)' },
        ];
    }
}

export const getEmbeddings = async (text: string): Promise<number[] | null> => {
    return apiCallWithRetry(async () => {
        try {
            const ai = getClient();
            if (!text || typeof text !== 'string') return null;
            
            const response = await ai.models.embedContent({
                model: 'text-embedding-004',
                contents: { parts: [{ text }] }
            });
            
            return response.embeddings?.[0]?.values || null;
        } catch (error) {
            console.error("Error generating embedding:", error);
            throw error;
        }
    });
};

export const generateText = async (prompt: string): Promise<string> => {
    return apiCallWithRetry(async () => {
        const ai = getClient();
        try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: { parts: [{ text: prompt }] },
              config: { maxOutputTokens: 4096, safetySettings, temperature: 0.2 },
            });
            const text = response.text;
            if (typeof text !== 'string' || !text.trim()) throw new Error('The model returned an empty response.');
            return text;
        } catch(error) {
            console.error("Error during text generation:", error);
            throw error instanceof Error ? new Error(`Gemini API Error: ${error.message}`) : new Error("Unknown error during text generation.");
        }
    });
};


export const generateSpeech = async (text: string, voice: string, speakingRate: number): Promise<string> => {
  if (!text || !text.trim()) throw new Error("Cannot generate audio for empty text.");
  
  return apiCallWithRetry(async () => {
    const ai = getClient();
    try {
        const config = {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
              speakingRate: speakingRate,
            },
            safetySettings,
        };

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text }] }],
          config: config as any,
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("TTS did not return audio data. Check for safety blocks or model availability.");
        return base64Audio;
    } catch (error) {
        console.error("Error generating speech:", error);
        if (error instanceof Error && error.message.includes("did not return audio data")) throw error;
        throw new Error(`Failed to generate audio: ${error instanceof Error ? error.message : "Unknown service error"}`);
    }
  });
};

export const createChat = (systemPrompt?: string, initialHistory?: Content[]): Chat => {
    const ai = getClient();
    const config: GenerateContentConfig = { safetySettings };
    if (systemPrompt && systemPrompt.trim()) config.systemInstruction = systemPrompt;

    return ai.chats.create({
        model: 'gemini-3-pro-preview', 
        history: initialHistory,
        config,
    });
};