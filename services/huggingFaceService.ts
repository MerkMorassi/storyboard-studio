import { HfInference } from "@huggingface/inference";

// --- MYTHOS PROPRIETARY DOCKER CONFIGURATION ---
// Root technical subdomain for the merkmorassi hardware.
const PROPRIETARY_SUBDOMAIN = "https://merkmorassi-mythos-engine.hf.space";
const CINEMATIC_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

export interface SDXLParams {
  prompt: string;
  negative_prompt?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  width?: number;
  height?: number;
  seed?: number;
  useSuperiorEngine?: boolean;
}

/**
 * Primary Generation Function
 * Direct-links to the merkmorassi hardware cluster.
 */
export const generateImageSDXL = async (
  params: SDXLParams,
  hfToken: string,
): Promise<Blob> => {
  
  if (!hfToken || hfToken.trim() === '') {
      throw new Error("Handshake Failed: Hugging Face Token is missing. Access Settings to restore link.");
  }

  // --- PROPRIETARY HARDWARE CORE PATH ---
  if (params.useSuperiorEngine) {
    const payload = {
        prompt: params.prompt,
        negative_prompt: params.negative_prompt || "blurry, low quality, text, watermark, bad anatomy",
        seed: params.seed || Math.floor(Math.random() * 2147483647),
        width: params.width || 1024,
        height: params.height || 1024,
        guidance_scale: params.guidance_scale || 7.5,
        num_inference_steps: params.num_inference_steps || 40
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hfToken}`,
        'X-Wait-For-Model': 'true',
        'Accept': 'image/png, application/json' 
    };

    console.log(`[MythOS] Direct-Linking to GPU Core: ${PROPRIETARY_SUBDOMAIN}...`);
    
    try {
        // Step 1: Attempt generation at the primary route
        let response = await fetch(`${PROPRIETARY_SUBDOMAIN}/generate`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            cache: 'no-store'
        });

        // Step 2: Fallback to root if /generate is 404
        if (response.status === 404) {
            console.log("[MythOS] /generate 404, attempting root POST...");
            response = await fetch(`${PROPRIETARY_SUBDOMAIN}/`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                cache: 'no-store'
            });
        }

        const contentType = response.headers.get('content-type') || '';
        
        // If we get JSON back, it might be an error message or status instead of the image blob
        if (contentType.includes('application/json')) {
            const json = await response.json();
            // If the user's engine returns status at root even for POST, we know it's a diagnostic response
            if (json.status === "ONLINE" && !json.image) {
                throw new Error(`Target endpoint reached, but no image data returned. The engine is ONLINE but the POST request was rejected. Details: ${JSON.stringify(json)}`);
            }
            if (json.error || json.detail) {
                throw new Error(`Engine reported error: ${json.error || json.detail}`);
            }
        }

        // If we get HTML, Hugging Face is likely intercepting the request (Sleeping/Building/Auth Error)
        if (contentType.includes('text/html')) {
            const status = response.status;
            if (status === 401 || status === 403) {
                throw new Error(`Access Denied (${status}). Your HF Token is invalid or lacks 'Read' permissions for this private Space.`);
            }
            if (status === 404) {
                throw new Error("Space Path Not Found (404). The Docker container is not listening on the expected API route.");
            }
            // Check for HF specific headers that indicate sleeping
            if (response.headers.get('x-error-code') === 'SPACE_SLEEPING') {
                throw new Error("Hardware is Sleeping. Please wake it manually at: https://huggingface.co/spaces/merkmorassi/mythos-engine");
            }
            throw new Error(`Hardware Interface Error: Received HTML instead of image. Status: ${status}`);
        }

        if (response.ok) {
            console.log(`[MythOS] Neural Link Established.`);
            return await response.blob();
        }

        throw new Error(`Engine Fault (${response.status}): The hardware cluster refused the request.`);

    } catch (err) {
        console.error("[MythOS] Cluster Handshake Failure:", err);
        throw err instanceof Error ? err : new Error("Fatal hardware link error.");
    }
  }

  // --- STANDARD FALLBACK ---
  try {
    const hf = new HfInference(hfToken);
    return await hf.textToImage({
        model: CINEMATIC_MODEL,
        inputs: params.prompt,
        parameters: {
            negative_prompt: params.negative_prompt,
            width: params.width || 1024,
            height: params.height || 1024,
            num_inference_steps: params.num_inference_steps || 30,
            guidance_scale: params.guidance_scale || 7.5,
            seed: params.seed,
        },
        headers: { "X-Wait-For-Model": "true" } 
    });
  } catch (err) {
    throw new Error("Standard neural link failed.");
  }
};