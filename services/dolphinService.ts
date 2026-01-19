
import { getDolphinUrl } from './apiKeyService';

/**
 * Dolphin Service (Sovereign Engine)
 * Interfaces with the merkmorassi/mythos-dolphin private LLM via OpenAI Standard Protocol.
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
    // 1. Get URL (e.g., https://merkmorassi-mythos-dolphin.hf.space)
    const dolphinBaseUrl = getDolphinUrl();
    if (!dolphinBaseUrl) {
        return { text: "", error: "Dolphin LLM URL is not configured in System Settings." };
    }

    // 2. Construct Endpoint (The New Standard)
    const DOLPHIN_ENDPOINT = `${dolphinBaseUrl}/v1/chat/completions`;

    if (!hfToken) throw new Error("Dolphin Core requires a Hugging Face Token.");

    try {
        // 3. Construct Payload (OpenAI Format)
        // We no longer manually construct <|im_start|>; the server handles the chat template.
        const payload = {
            model: "mythos-dolphin", // Optional, but good practice
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1024,
            stream: false
        };

        const response = await fetch(DOLPHIN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${hfToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        // 4. Handle Errors
        if (response.status === 503) {
            return { text: "", error: "Dolphin Hardware is booting. Please wait 60 seconds." };
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Dolphin Engine] Fault: ${response.status}`, errorText);
            throw new Error(`Dolphin Engine Fault (${response.status}). Check server logs.`);
        }

        // 5. Parse Response (OpenAI Format)
        const json = await response.json();
        
        if (json.choices && json.choices.length > 0) {
            const content = json.choices[0].message.content;
            return { text: content.trim() };
        }

        throw new Error("Invalid response structure from Sovereign Engine.");

    } catch (e) {
        console.error("[Dolphin Engine] Fault:", e);
        return { text: "", error: e instanceof Error ? e.message : "Dolphin link failed." };
    }
};

export const refineNsfwPrompt = async (prompt: string, hfToken: string): Promise<string> => {
    const systemPrompt = "You are a creative assistant. Rewrite the user's prompt to be more vivid and detailed. Output ONLY the rewritten prompt.";
    const response = await runDolphinInference(prompt, systemPrompt, hfToken);
    if (response.error) {
        console.warn("[Dolphin NSFW Refine] Failed, using original prompt.", response.error);
        return prompt;
    }
    return response.text;
};
