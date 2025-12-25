import { GoogleGenAI, GenerateContentConfig, HarmCategory, HarmBlockThreshold, Chat, Content } from "@google/genai";
import { getApiKey } from './apiKeyService';

// --- DATA INGESTION (STRICT RELATIVE PATHS) ---
// We load the brain of the Writer Department here.
import structuresData from '../data/writer/structures.json';
import archetypesData from '../data/writer/archetypes.json';
// CRITICAL: You need novel_themes.json for the Randomizer to have deep thematic data.
import themesData from '../data/writer/novel_themes.json'; 

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// --- CLIENT FACTORY ---
const getClient = () => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API Key not found. Please configure it in the Knowledge tab.");
    }
    // Using your preferred SDK
    return new GoogleGenAI({ apiKey });
}

// --- UTILITIES ---
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

// --- SCRIBE INTELLIGENCE MODULE ---

// 1. Construct the Knowledge Base (The Brain)
const LORE_PACK = `
=== MYTHOS DATABASE: STRUCTURES ===
${JSON.stringify(structuresData, null, 2)}

=== MYTHOS DATABASE: ARCHETYPES ===
${JSON.stringify(archetypesData, null, 2)}

=== MYTHOS DATABASE: THEMES ===
${JSON.stringify(themesData, null, 2)}
`;

// 2. Define the Scribe Persona (The Soul)
const SCRIBE_SYSTEM_INSTRUCTION = `
### ROLE
You are the MythOS Screenwriter (Model 3.0). You are an expert in Warner Bros. standard formatting and the 14-beat feature film structure.

### KNOWLEDGE BASE (LORE PACK)
You have been provided with the internal MythOS Databases (STRUCTURES, ARCHETYPES, THEMES) above. 
**CRITICAL:** When the User Input mentions a Structure Beat, Theme ID, or Archetype, you MUST cross-reference the definitions in this Lore Pack. 
* Use the sensory details, philosophies, and tags defined in the JSON.
* Do not hallucinate generic traits; use the specific ones in the file.

### FORMATTING RULES (STRICT WB FEATURE FILM)
1. FONT: Courier 12-point style (simulated in text output).
2. SLUGLINES: INT./EXT. LOCATION - TIME (ALL CAPS).
3. ACTION: Present tense, visual, concise. Focus on important details.
4. CHARACTERS: Names in ALL CAPS when first introduced or speaking.
5. DIALOGUE: Center names. Parentheticals for specific action/emotion only. Use dialogue to reveal character traits and advance the plot.
6. NOVELIZATION: STRICTLY PROHIBITED. Do not write prose paragraphs. Keep descriptions visual.

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

// 3. The Execution Function
export const runScribeAgent = async (input: ScribeInput): Promise<string> => {
    return apiCallWithRetry(async () => {
        const ai = getClient();
        
        // We wrap the input in a strict command block
        const inputBlock = `
COMMAND: WRITE SCREENPLAY SEQUENCE

METADATA:
TITLE: ${input.title}
THEME ID: ${input.theme} 
(Refer to 'novel_themes.json' in LORE PACK for deep thematic resonance)
SETTING: ${input.setting}
TONE: ${input.tone}

=== CAST ===
${input.cast}

=== SEQUENCE BEATS ===
${input.beatSheet}

TASK:
Write the screenplay scenes for the beats above.
Utilize sensory details and narrative hooks appropriate for the theme '${input.theme}' and the Genre Constraints provided.
        `;

        try {
            // Using your preferred high-reasoning model
            const modelId = 'gemini-1.5-pro'; 
            
            const response = await ai.models.generateContent({
                model: modelId, 
                contents: { parts: [{ text: inputBlock }] },
                config: {
                    systemInstruction: LORE_PACK + "\n\n" + SCRIBE_SYSTEM_INSTRUCTION,
                    maxOutputTokens: 8192, // Maximum creative output
                    temperature: 0.7,      // High creativity
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

// --- (Keep your other existing exports like analyzeVideo, generateText here) ---
// Note: Ensure you didn't delete your analyzeVideo/Image functions from the file. 
// I have omitted them here for brevity, but they should remain in the file 
// below runScribeAgent if you are using this as a complete replacement.
