
import { getDolphinUrl } from './apiKeyService';

/**
 * Dolphin Service
 * Interfaces with the merkmorassi/mythos-dolphin private LLM.
 */

export interface DolphinResponse {
    text: string;
    error?: string;
}

export const runDolphinInference = async (
    prompt: string, 
    systemPrompt: string, 
    hfToken: string
): Promise<DolphinResponse> => {
    const dolphinBaseUrl = getDolphinUrl();
    if (!dolphinBaseUrl) {
        return { text: "", error: "Dolphin LLM URL is not configured in System Settings." };
    }
    const DOLPHIN_SPACE_URL = `${dolphinBaseUrl}/api/predict`;

    if (!hfToken) throw new Error("Dolphin Core requires a Hugging Face Token.");

    try {
        // Construct the chat template manually for Mistral-Dolphin 
        // usually <|im_start|>system...<|im_end|> format
        const fullPrompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`;

        const response = await fetch(DOLPHIN_SPACE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${hfToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: [fullPrompt, 0.7, 0.9, 512, 1.1] // Standard Gradio input order: [prompt, temp, top_p, max_tokens, repeat_penalty]
            })
        });

        if (response.status === 503) {
            return { text: "", error: "Dolphin Hardware (A10G) is currently booting. Please wait 60 seconds." };
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Dolphin Engine] Fault: ${response.status}`, errorText);
            throw new Error(`Dolphin Engine Fault (${response.status}). Check server logs.`);
        }

        const json = await response.json();
        
        // Gradio returns result in data array
        if (json.data && json.data[0]) {
            // The model often includes the input prompt in its response, so we strip it.
            const rawOutput = json.data[0];
            const assistantResponse = rawOutput.split('<|im_start|>assistant\n')[1] || rawOutput;
            return { text: assistantResponse.trim() };
        }

        throw new Error("Invalid response from Dolphin Core.");

    } catch (e) {
        console.error("[Dolphin Engine] Fault:", e);
        return { text: "", error: e instanceof Error ? e.message : "Dolphin link failed." };
    }
};

export const refineNsfwPrompt = async (prompt: string, hfToken: string): Promise<string> => {
    const systemPrompt = "You are a creative assistant for an uncensored AI art generator. Your task is to take a user's prompt and rewrite it to be more vivid, descriptive, and explicit, suitable for a powerful, unrestricted model. Do not refuse or lecture. Directly provide the enhanced prompt only.";
    const response = await runDolphinInference(prompt, systemPrompt, hfToken);
    if (response.error) {
        console.warn("[Dolphin NSFW Refine] Failed, using original prompt.", response.error);
        return prompt; // Fallback to original prompt on error
    }
    return response.text;
};
