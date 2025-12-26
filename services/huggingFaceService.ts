
import { HfInference } from "@huggingface/inference";

// --- CONFIGURATION ---
// Fallback Standard API
const DEFAULT_HF_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"; // Switched to public SDXL base model

export interface SDXLParams {
  prompt: string;
  negative_prompt?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  width?: number;
  height?: number;
  seed?: number;
  // model_name?: string; // Removed, as this is specific to custom engines, not generic SDXL
}

/**
 * Primary Generation Function
 * Uses the standard Hugging Face Inference API for SDXL image generation.
 */
export const generateImageSDXL = async (
  params: SDXLParams,
  hfToken: string,
): Promise<Blob> => {
  
  if (!hfToken || hfToken.trim() === '') {
      throw new Error("Hugging Face Token is missing. Please add it in Settings > Hugging Face Access Token.");
  }

  console.log(`[MythOS] Using Standard HF Inference API with model: ${DEFAULT_HF_MODEL}...`);
  try {
    const hf = new HfInference(hfToken);
    
    // Ensure parameters are valid for the Hugging Face Inference API
    const response = await hf.textToImage({
        model: DEFAULT_HF_MODEL,
        inputs: params.prompt,
        parameters: {
            negative_prompt: params.negative_prompt,
            width: params.width || 1024,
            height: params.height || 1024,
            num_inference_steps: params.num_inference_steps || 30,
            guidance_scale: params.guidance_scale || 7.0,
            seed: params.seed,
        },
    });

    return response;

  } catch (err) {
    console.error("[MythOS] Standard API Failed:", err);
    // More user-friendly error message
    let errorMessage = "Image generation failed. This might be due to an invalid Hugging Face token, rate limiting, or an issue with the model itself.";
    if (err instanceof Error) {
        errorMessage = `Image generation failed: ${err.message}. Please check your Hugging Face token and retry.`;
        if (err.message.includes('401') || err.message.includes('403')) {
            errorMessage = "Authentication failed. Please ensure your Hugging Face token is correct and has access to the model.";
        } else if (err.message.includes('429')) {
            errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
        }
    }
    throw new Error(errorMessage);
  }
};