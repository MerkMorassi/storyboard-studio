
import { HfInference } from "@huggingface/inference";
import { getCinematicCoreUrl } from './apiKeyService';

// --- MYTHOS PROPRIETARY DOCKER CONFIGURATION ---
// Root technical subdomain for the merkmorassi hardware.
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
    const PROPRIETARY_SUBDOMAIN = getCinematicCoreUrl();
    if (!PROPRIETARY_SUBDOMAIN) {
        throw new Error("MythOS Cinematic Core URL is not configured in System Settings.");
    }

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
    
    // Probing sequence: Try standard endpoints in order
    const endpointsToProbe = [
        `${PROPRIETARY_SUBDOMAIN}/generate`,
        `${PROPRIETARY_SUBDOMAIN}/`,
        `${PROPRIETARY_SUBDOMAIN}/predict`,
        `${PROPRIETARY_SUBDOMAIN}/api/generate`
    ];

    let lastError: Error | null = null;

    for (const endpoint of endpointsToProbe) {
        try {
            console.log(`[MythOS] Probing endpoint: ${endpoint}`);
            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                cache: 'no-store'
            });

            if (response.status === 404) {
                console.warn(`[MythOS] 404 at ${endpoint}, trying next...`);
                continue; // Try next endpoint
            }

            const contentType = response.headers.get('content-type') || '';

            // Check for HTML response (Cold Boot / Error Page)
            if (contentType.includes('text/html')) {
                const status = response.status;
                if (status === 401 || status === 403) {
                    throw new Error(`Access Denied (${status}). HF Token lacks permissions.`);
                }
                if (response.headers.get('x-error-code') === 'SPACE_SLEEPING') {
                    throw new Error("Hardware Sleeping. Visit space to wake.");
                }
                // If HTML but 200/500, it's likely a generic UI page, not our API
                console.warn(`[MythOS] Received HTML at ${endpoint}, skipping.`);
                continue; 
            }

            // Check for JSON response
            if (contentType.includes('application/json')) {
                const json = await response.json();
                if (json.error || json.detail) {
                    throw new Error(`Engine Error: ${json.error || json.detail}`);
                }
                // If it returns status but no image, treat as failure for this endpoint
                if (json.status === "ONLINE" && !json.image) {
                     console.warn(`[MythOS] Endpoint ${endpoint} returned status only.`);
                     continue;
                }
                // Some endpoints return { image: "base64..." }
                if (json.image || json.images) {
                     // Handle base64 response if necessary, but preferred is direct blob
                     // For now, assume blob return is standard for this specific engine unless wrapped
                }
            }

            if (response.ok) {
                console.log(`[MythOS] Connection Successful at ${endpoint}`);
                return await response.blob();
            }
            
            throw new Error(`Engine Fault (${response.status}) at ${endpoint}`);

        } catch (err) {
            lastError = err instanceof Error ? err : new Error("Unknown error");
            // If it's a specific logic error (like Access Denied), stop trying
            if (lastError.message.includes("Access Denied") || lastError.message.includes("Hardware Sleeping")) {
                throw lastError;
            }
            // Otherwise continue loop
        }
    }

    // If we get here, all endpoints failed
    console.error("[MythOS] All probes failed.");
    throw lastError || new Error("Space Path Not Found (404). The Docker container is not listening on known API routes.");
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