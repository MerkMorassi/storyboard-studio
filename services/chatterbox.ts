// services/chatterbox.ts

export interface ChatterboxRequest {
    text: string;
    audioRef: string; // Base64 Data URL
    exaggeration: number;
    temperature: number;
    seed_num: number;
    cfg_weight: number;
}

/**
 * MOCK ChatterboxService
 * This is a placeholder as the actual service implementation was not provided.
 * It simulates an API call and returns an empty audio buffer.
 */
export const ChatterboxService = {
    async synthesize(req: ChatterboxRequest): Promise<ArrayBuffer> {
        console.log("Synthesizing with Chatterbox (MOCK):", req);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // In a real implementation, you would make a fetch call here.
        // For now, we return an empty ArrayBuffer.
        // A real WAV file would have a header, but for a mock, this is sufficient
        // to test the component's logic flow.
        const emptyBuffer = new ArrayBuffer(0);
        
        return emptyBuffer;
    }
};
