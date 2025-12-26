
import { GoogleGenAI, GenerateContentConfig, HarmCategory, HarmBlockThreshold, Chat, Content, Type } from "@google/genai";
import { getApiKey } from './apiKeyService';

// --- DATA INGESTION (THE BRAIN) ---
// JSON files will be fetched dynamically, not directly imported.
let _structuresData: any;
let _archetypesData: any;
let _themesData: any;

const _loadScribeJsonData = async () => {
    if (_structuresData && _archetypesData && _themesData) return; // Already loaded

    const files = [
        { name: 'structures.json', url: '/data/writer/structures.json', target: '_structuresData' },
        { name: 'archetypes.json', url: '/data/writer/archetypes.json', target: '_archetypesData' },
        { name: 'novel_themes.json', url: '/data/writer/novel_themes.json', target: '_themesData' }
    ];

    for (const file of files) {
        try {
            const res = await fetch(file.url);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const rawText = await res.text();
            if (!rawText.trim()) {
                throw new Error("Response was empty.");
            }
            // Dynamically assign to the correct state variable
            if (file.target === '_structuresData') _structuresData = JSON.parse(rawText);
            else if (file.target === '_archetypesData') _archetypesData = JSON.parse(rawText);
            else if (file.target === '_themesData') _themesData = JSON.parse(rawText);

        } catch (error) {
            console.error(`Error loading Scribe JSON data from ${file.name}:`, error);
            throw new Error(`Failed to load Scribe lore data from ${file.name}. Ensure the file exists and contains valid JSON. Details: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
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

// --- COMPREHENSIVE SCREENPLAY TEMPLATE (From User's Prompt) ---
const COMPREHENSIVE_SCREENPLAY_TEMPLATE = `
Title: [Insert Title Here]

Logline: [Insert logline that captures the essence of the story in one sentence.]

Treatment: [Insert 1-2 page summary of the story that includes the characters, setting, and major plot points.]

Fundamental Story Development Questions:

1. What is the protagonist's main goal?
2. What is the antagonist's main goal?
3. What is the central conflict between the protagonist and antagonist?
4. What is at stake for the protagonist if they fail to achieve their goal?
5. What is the protagonist's character flaw or weakness?
6. What event/incident sets the story in motion?
7. What is the midpoint twist that raises the stakes?
8. What is the climax of the story?
9. What is the resolution of the story?

List of Archetypal Characters:

1. Protagonist
2. Antagonist
3. Mentor
4. Love Interest
5. Sidekick
6. Threshold Guardian
7. Shapeshifter
8. Trickster

Act I:

Scene 1: Opening Image - Introduce the protagonist and their ordinary world.
Scene 2: Theme Stated - Establish the theme of the story.
Scene 3: Catalyst - The event or incident that sets the story in motion.
Scene 4: Debate - The protagonist considers the situation and decides whether to act.
Scene 5: Break into Two - The protagonist commits to their goal and enters a new world.

Act II:

Scene 6: B Story - Introduce the secondary plotline or love interest.
Scene 7: Fun and Games - The protagonist enjoys some initial success in pursuit of their goal.
Scene 8: Midpoint - A twist or revelation raises the stakes and changes the direction of the story.
Scene 9: Bad Guys Close In - The antagonist gains the upper hand and puts pressure on the protagonist.
Scene 10: All is Lost - The protagonist suffers a major setback and their goal seems out of reach.

Act III:

Scene 11: Dark Night of the Soul - The protagonist confronts their character flaw and questions their ability to succeed.
Scene 12: Break into Three - The protagonist regains their focus and commits to a new plan.
Scene 13: Finale - The protagonist faces the antagonist in a final showdown.
Scene 14: Final Image - The story concludes with a final image that mirrors the opening image.

Screenplay Style Guide:

* Use Courier 12pt font
* Scene headings are in ALL CAPS and indicate the location of the scene
* Action lines are in present tense and describe the action of the scene
* Dialogue is indented 1.5 inches from the left margin and includes the character name in ALL CAPS followed by their dialogue
* Parentheticals can be used to indicate tone or actions while speaking
* Transitions such as CUT TO:, FADE OUT:, and DISSOLVE TO: should be used sparingly.

Example Scene:

INT. COFFEE SHOP - DAY

JANE sits at a table, sipping coffee and scrolling through her phone. Across the room, she spots TOM, her ex-boyfriend.

JANE
(to herself)
What is he doing here?

Tom approaches, a hesitant look on his face.

TOM
Hey, Jane. Can we talk?

JANE
(skeptical)
I don't think there's anything left to say.

TOM
(pleading)
Please, just hear me out.

Jane takes a deep breath and prepares herself for the conversation.

Questions for Generating 40 Scenes:

1. What is the opening image that introduces the protagonist and their ordinary world?
2. How does the protagonist discover their goal?
3. Who is the antagonist and what is their motive
`;

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
  workingTitle: string; // Renamed from title for clarity
  genre: string; // New field
  theme: string;
  setting: string;
  tone: string;
  cast: string;
  beatSheet: string;
  // New fields for comprehensive screenplay generation
  logline: string;
  treatment: string;
  fundamentalStoryQuestions: string; // Markdown text or bullet list
  archetypalCharacters: string;     // Markdown text or bullet list
  sceneGenerationQuestions: string; // Markdown text or bullet list
}

export interface ScribeOutlineInput {
  title: string; // Original input title
  genre: string; // New field
  theme: string;
  setting: string;
  tone: string;
  cast: string;
  beatSheet: string;
}

export interface ScribeOutlineOutput {
  workingTitle: string; // New field
  logline: string;
  treatment: string;
  fundamentalStoryQuestions: string[];
  archetypalCharacters: string[];
  sceneGenerationQuestions: string[];
}


// --- MAIN SCRIBE AGENT (For generating full screenplay) ---
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
COMMAND: WRITE 40-SCENE SCREENPLAY

Utilize all provided information to generate a 40-scene feature-length screenplay.
Each scene should be approximately 3 pages long (simulated in text output).
Adhere strictly to Warner Bros. feature film screenplay formatting.

METADATA:
WORKING TITLE: ${input.workingTitle}
GENRE: ${input.genre}
LOGLINE: ${input.logline}
THEME ID: ${input.theme} 
(Refer to 'novel_themes.json' in LORE PACK for thematic resonance)
SETTING: ${input.setting}
TONE: ${input.tone}

=== TREATMENT ===
${input.treatment}

=== FUNDAMENTAL STORY QUESTIONS ===
${input.fundamentalStoryQuestions}

=== ARHETYPAL CHARACTERS ===
${input.archetypalCharacters}

=== CAST ===
${input.cast}

=== CORE SCENE BEATS (for story progression) ===
${input.beatSheet}

=== QUESTIONS FOR SCENE GENERATION (Address these throughout the 40 scenes) ===
${input.sceneGenerationQuestions}

TASK:
Write the complete 40-scene screenplay. Ensure continuous narrative flow, character development, and rising stakes across the three-act structure (approx. 13-14 scenes per act).
Utilize sensory details and narrative hooks appropriate for the theme '${input.theme}' and Genre constraints.
Expand on the provided beats and questions to create detailed scenes with action and dialogue.
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

// --- SCRIBE OUTLINE AGENT (For generating initial outline details) ---
export const runScribeOutlineAgent = async (input: ScribeOutlineInput): Promise<ScribeOutlineOutput> => {
    return apiCallWithRetry(async () => {
        const ai = getClient();
        await _loadScribeJsonData();

        const LORE_PACK_DYNAMIC = `
=== MYTHOS DATABASE: STRUCTURES ===
${JSON.stringify(_structuresData, null, 2)}

=== MYTHOS DATABASE: ARCHETYPES ===
${JSON.stringify(_archetypesData, null, 2)}

=== MYTHOS DATABASE: THEMES ===
${JSON.stringify(_themesData, null, 2)}
`;
        // Combine Lore Pack with the static system instruction, then add the template
        const systemInstructionFinal = LORE_PACK_DYNAMIC + "\n\n" + SCRIBE_SYSTEM_INSTRUCTION_STATIC + "\n\n" + COMPREHENSIVE_SCREENPLAY_TEMPLATE;

        const inputBlock = `
COMMAND: GENERATE SCREENPLAY OUTLINE

Utilize the provided story details and cross-reference the Comprehensive Screenplay Template and Lore Pack to fill the following JSON structure.
Focus ONLY on the narrative blueprint details.

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
Generate a concise Working Title (derived from the original Title and theme/genre), a concise Logline, a 1-2 page Treatment, fill in the Fundamental Story Development Questions, identify 8 Archetypal Characters, and propose 8 Questions for Generating 40 Scenes based on the above story details and the provided Comprehensive Screenplay Template.

OUTPUT FORMAT:
Return a JSON object matching the ScribeOutlineOutput interface.

`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: { parts: [{ text: inputBlock }] },
                config: {
                    maxOutputTokens: 4096, // Increased for longer JSON output
                    thinkingConfig: { thinkingBudget: 512 }, // Added as per guidelines for Gemini 3 with maxOutputTokens
                    systemInstruction: systemInstructionFinal,
                    temperature: 0.5,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            workingTitle: { type: Type.STRING }, // New property in schema
                            logline: { type: Type.STRING },
                            treatment: { type: Type.STRING },
                            fundamentalStoryQuestions: { 
                                type: Type.ARRAY, 
                                items: { type: Type.STRING } 
                            },
                            archetypalCharacters: { 
                                type: Type.ARRAY, 
                                items: { type: Type.STRING } 
                            },
                            sceneGenerationQuestions: { 
                                type: Type.ARRAY, 
                                items: { type: Type.STRING } 
                            },
                        },
                        required: ["workingTitle", "logline", "treatment", "fundamentalStoryQuestions", "archetypalCharacters", "sceneGenerationQuestions"]
                    },
                    safetySettings
                }
            });
            
            const jsonText = response.text;
            if (!jsonText || !jsonText.trim()) throw new Error("Scribe Outline Agent returned empty JSON.");
            
            // Attempt to parse the JSON string.
            const parsedOutput: ScribeOutlineOutput = JSON.parse(jsonText.trim());
            return parsedOutput;

        } catch (error) {
            console.error("Scribe Outline Agent Error:", error);
            throw error instanceof Error ? new Error(`Scribe Outline Error: ${error.message}`) : new Error("Scribe outline execution failed.");
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