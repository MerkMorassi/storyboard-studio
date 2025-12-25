import { GoogleGenAI, GenerateContentConfig, HarmCategory, HarmBlockThreshold, Chat, Content } from "@google/genai";
import { getApiKey } from './apiKeyService';

// --- DATA INGESTION (THE BRAIN) ---
// These files MUST exist in src/data/writer/ for the build to succeed.
import structuresData from '../data/writer/structures.json';
import archetypesData from '../data/writer/archetypes.json';
import themesData from '../data/writer/novel_themes.json'; 

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

// --- SCRIBE MODULE CONFIGURATION ---
const LORE_PACK = `
=== MYTHOS DATABASE: STRUCTURES ===
${JSON.stringify(structuresData, null, 2)}

=== MYTHOS DATABASE: ARCHETYPES ===
${JSON.stringify(archetypesData, null, 2)}

=== MYTHOS DATABASE: THEMES ===
${JSON.stringify(themesData, null, 2)}
`;

const SCRIBE_SYSTEM_INSTRUCTION = `
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
                model: 'gemini-1.5-pro', // Using 1.5 Pro or 3.0 Pro for complex reasoning
                contents: { parts: [{ text: inputBlock }] },
                config: {
                    systemInstruction: LORE_PACK + "\n\n" + SCRIBE_SYSTEM_INSTRUCTION,
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
        return 'gemini-1.5-pro'; // Fallback to 1.5 Pro if 3.0 is unstable
    }
    return 'gemini-2.5-flash';
};

// ... (Paste the rest of your original file's functions: fetchModels, getEmbeddings, analyzeVideo, analyzeImage, generateSpeech, createChat, generateSdxlPrompt, generateText) ...
// The exports must remain valid.
