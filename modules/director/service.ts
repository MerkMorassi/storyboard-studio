
import { GoogleGenAI, Type } from '@google/genai';
import { ChatMessage, AutomationConfig } from '../../types.ts';

// Defined solely for the Director module to keep it self-contained
const DIRECTOR_SYSTEM_INSTRUCTION = `
You are an expert Director of Photography (DoP) and Cinematographer. 
Your goal is to analyze images to extract technical details and help the user refine prompts for AI image generation (Stable Diffusion, Midjourney, Imagen).
When analyzing an image, focus on:
1. Subject & Action
2. Lighting (Key, Fill, Back, Hard/Soft, Source)
3. Camera & Lens (Focal length, Aperture, Angle, Film Stock)
4. Color Grading (Palette, Mood, LUT style)
5. Composition (Framing, Leading lines)

Always be concise, professional, and focus on visual descriptors.
`;

export const analyzeImage = async (apiKey: string, base64Image: string, mimeType: string): Promise<any> => {
    if (!apiKey) throw new Error("API Key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Analyze this image as a Director of Photography. 
    Return a JSON object with the following fields:
    - subject: Brief description of the subject and action.
    - lighting: Technical description of the lighting setup.
    - camera: Estimated focal length, camera angle, and lens characteristics.
    - color: Color palette, mood, and grading style.
    - composition: Framing and compositional techniques used.
    - extractedPrompt: A highly optimized, comma-separated text prompt to recreate this style and image in an AI generator.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType, data: base64Image } },
                { text: prompt }
            ]
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    subject: { type: Type.STRING },
                    lighting: { type: Type.STRING },
                    camera: { type: Type.STRING },
                    color: { type: Type.STRING },
                    composition: { type: Type.STRING },
                    extractedPrompt: { type: Type.STRING },
                }
            }
        }
    });

    if (response.text) {
        return JSON.parse(response.text);
    }
    throw new Error("Failed to analyze image.");
};

export const chatWithDirector = async (
    apiKey: string,
    history: ChatMessage[],
    userMessage: string,
    currentPrompt: string,
    ragConfig?: AutomationConfig,
    projectId?: string
): Promise<string> => {
    if (!apiKey) throw new Error("API Key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    // Build context
    let context = "";
    if (ragConfig && projectId) {
        // Optional: Retrieve relevant cinematography lore
        // For now, we can just pass the current working prompt as the primary context
    }

    const systemWithContext = `${DIRECTOR_SYSTEM_INSTRUCTION}
    
    CURRENT WORKING PROMPT:
    "${currentPrompt}"
    
    The user wants to refine or discuss the image generation based on this prompt. Update the prompt if they ask for changes.
    `;

    // Convert history for API
    const apiHistory = history
        .filter((m): m is { role: 'user' | 'model'; text: string; } => m.role !== 'tool_code')
        .map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: systemWithContext },
        contents: [...apiHistory, { role: 'user', parts: [{ text: userMessage }] }]
    });

    return response.text || "I couldn't process that request.";
};