
import { HfInference } from "@huggingface/inference";

// --- CONFIGURATION ---
// The URL to your private MythOS Engine (FastAPI)
const MYTHOS_ENGINE_URL = "https://merkmorassi-mythos-engine.hf.space"; 

// Fallback Standard API
const DEFAULT_HF_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

export interface SDXLParams {
  prompt: string;
  negative_prompt?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  width?: number;
  height?: number;
  seed?: number;
  model_name?: string; // e.g., "v15"
}

/**
 * Helper: Converts Base64 string from FastAPI to Blob for the UI
 */
const base64ToBlob = (base64: string, mimeType: string = 'image/png'): Blob => {
  // Remove data URL prefix if present
  const base64Clean = base64.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
  
  const byteCharacters = atob(base64Clean);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

/**
 * Primary Generation Function
 */
export const generateImageSDXL = async (
  params: SDXLParams,
  hfToken: string,
  useCustomEngine: boolean = true // Default to your new engine
): Promise<Blob> => {
  
  // --- PATH A: Custom MythOS Engine (FastAPI) ---
  if (useCustomEngine) {
    if (!hfToken || hfToken.trim() === '') {
        throw new Error("Hugging Face Token is MISSING. Please add it in Settings > Hugging Face Access Token to access your private engine.");
    }

    console.log(`[MythOS] Requesting shot from ${MYTHOS_ENGINE_URL}...`);
    
    // Construct payload matching app.py 'CinematicRequest'
    const payload = {
      prompt: params.prompt,
      negative_prompt: params.negative_prompt || "blurry, low quality, letterbox, text, watermark",
      seed: params.seed ?? 0,
      width: params.width || 2304,
      height: params.height || 960,
      steps: params.num_inference_steps || 30,
      guidance: params.guidance_scale || 7.0,
      model_name: params.model_name || "v15"
    };

    try {
      // EXACT URL and HEADER Logic Verification
      const response = await fetch(`${MYTHOS_ENGINE_URL}/generate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // If we get HTML back (like a 404 page), it usually means Auth failed on a Private Space
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            const status = response.status;
            if (status === 404) {
                throw new Error("Engine not found (404). This usually means your HF Token is invalid or does not have access to this Private Space.");
            }
            if (status === 401 || status === 403) {
                throw new Error("Access Denied (401/403). Check your Hugging Face Token permissions.");
            }
            if (status === 500) {
                throw new Error("Engine Server Error (500). The Space might be crashing or restarting.");
            }
            throw new Error(`Engine Error (${status}): Received HTML response instead of JSON. Check Space status.`);
        }

        const errText = await response.text();
        throw new Error(`MythOS Engine Error (${response.status}): ${errText}`);
      }

      const data = await response.json();

      if (data.status === "success" && data.image_base64) {
        console.log("[MythOS] Shot received.");
        return base64ToBlob(data.image_base64);
      } else {
        throw new Error("Invalid response from MythOS Engine: Missing image_base64");
      }

    } catch (error) {
      console.error("[MythOS] Engine Failed:", error);
      throw error;
    }
  }

  // --- PATH B: Standard Hugging Face Inference API (Legacy) ---
  else {
    console.log("[MythOS] Using Standard HF Inference API...");
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${DEFAULT_HF_MODEL}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${hfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: params.prompt,
            parameters: {
              negative_prompt: params.negative_prompt,
              width: params.width || 1024,
              height: params.height || 1024,
            },
          }),
        }
      );

      if (!response.ok) throw new Error(await response.text());
      return await response.blob();

    } catch (err) {
      console.error("[MythOS] Standard API Failed:", err);
      throw new Error("Standard HF API Generation Failed");
    }
  }
};
