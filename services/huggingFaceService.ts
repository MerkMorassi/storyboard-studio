
const HF_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

export interface SDXLParams {
    prompt: string;
    negative_prompt?: string;
    num_inference_steps?: number;
    guidance_scale?: number;
    width?: number;
    height?: number;
    seed?: number;
}

export const generateImageSDXL = async (
    params: SDXLParams,
    hfToken: string
): Promise<Blob> => {
    if (!hfToken) {
        throw new Error("Hugging Face Access Token is missing. Please configure it in Settings.");
    }

    const payload = {
        inputs: params.prompt,
        parameters: {
            negative_prompt: params.negative_prompt,
            num_inference_steps: params.num_inference_steps || 25,
            guidance_scale: params.guidance_scale || 7.5,
            width: params.width || 1024,
            height: params.height || 1024,
            seed: params.seed, // If undefined, HF usually randomizes, or we can handle it
        }
    };

    const response = await fetch(HF_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${hfToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face API Error (${response.status}): ${errorText}`);
    }

    return await response.blob();
};
