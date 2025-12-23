
import { Client } from "@gradio/client";

// Cache connected clients to avoid re-handshaking on every request where possible
const clientCache = new Map<string, any>();

export interface GradioOptions {
    hfToken?: string;
}

/**
 * Connects to a Gradio Space (or private endpoint) via the JS Client.
 * Handles caching and authentication tokens.
 */
export const getGradioClient = async (spaceId: string, options?: GradioOptions): Promise<any> => {
    // If we have a cached client for this space, return it.
    // Note: If tokens change, we might ideally want to invalidate, but for this app's session scope it's fine.
    if (clientCache.has(spaceId)) {
        return clientCache.get(spaceId);
    }

    try {
        const connectOptions = options?.hfToken 
            ? { hf_token: options.hfToken as `hf_${string}` } 
            : {};
            
        const client = await Client.connect(spaceId, connectOptions as any);
        clientCache.set(spaceId, client);
        return client;
    } catch (error) {
        console.error(`[GradioService] Failed to connect to Space: ${spaceId}`, error);
        throw new Error(`Failed to connect to AI Service (${spaceId}). Please check your connection and Hugging Face token.`);
    }
};

/**
 * Helper to directly run a prediction against a Gradio endpoint.
 */
export const predictGradio = async (spaceId: string, endpoint: string, payload: any, options?: GradioOptions): Promise<any> => {
    const client = await getGradioClient(spaceId, options);
    return await client.predict(endpoint, payload);
};
