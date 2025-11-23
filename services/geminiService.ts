import { GoogleGenAI, Modality, FunctionDeclaration, Type } from '@google/genai';
import { GenerationOptions, GenerationResult, ChatMessage, AutomationConfig, Agent } from '../types.ts';
import { getContextForAgent } from './ragService.ts';

/**
 * Parses a generic API error and attempts to create a more user-friendly
 * and specific error message, referencing the generation options if possible.
 */
function formatApiError(error: Error, options?: GenerationOptions): Error {
    const originalMessage = error.message;

    // Handle known string-based errors first
    if (originalMessage.toLowerCase().includes('api key not valid')) {
        return new Error('Your Google API Key is not valid. Please check it in the settings.');
    }
    if (originalMessage.includes('non ISO-8859-1 code point')) {
        return new Error("Request failed. The prompt may contain special characters (e.g., emojis) that are not supported. Please remove them and try again.");
    }

    // Try to parse for detailed API errors from a JSON response
    try {
        const errorDetails = JSON.parse(originalMessage);
        const apiMessage = errorDetails?.error?.message;

        if (apiMessage) {
            const lowerApiMessage = apiMessage.toLowerCase();
            let userMessage = `Image generation failed. The API reported an error: "${apiMessage}". Please check your generation settings.`;

            if (options) {
                if (lowerApiMessage.includes('aspectratio') || lowerApiMessage.includes('aspect ratio')) {
                    userMessage = `There's an issue with the selected aspect ratio '${options.aspectRatio}'. The API reported: "${apiMessage}"`;
                } else if (lowerApiMessage.includes('guidancescale') || lowerApiMessage.includes('guidance scale')) {
                    userMessage = `There's an issue with the guidance scale value of '${options.guidanceScale}'. The API reported: "${apiMessage}"`;
                } else if (lowerApiMessage.includes('seed')) {
                    userMessage = `There's an issue with the image seed '${options.seed}'. The API reported: "${apiMessage}"`;
                } else if (lowerApiMessage.includes('samplecount') || lowerApiMessage.includes('numberofimages')) {
                    userMessage = `There's an issue with the number of images requested (${options.numImages}). The API reported: "${apiMessage}"`;
                }
            }

            if (lowerApiMessage.includes('safety policy')) {
                userMessage = `The prompt was blocked due to safety policies. Please revise your prompt. API message: "${apiMessage}"`;
            } else if (lowerApiMessage.includes('prompt')) {
                 userMessage = `There's an issue with the prompt or negative prompt. The API reported: "${apiMessage}"`;
            }
            
            return new Error(userMessage);
        }
    } catch (e) {
        // Not a JSON error message, we will use the original message.
    }

    // Fallback for other errors, returning a slightly more user-friendly message
    return new Error(`Image generation failed: ${originalMessage}`);
}


const generateWithImage = async (ai: GoogleGenAI, options: GenerationOptions): Promise<GenerationResult> => {
    if (!options.base64Image || !options.mimeType) {
        throw new Error("Image data is missing for image generation mode.");
    }
    
    const imagePart = {
      inlineData: {
        mimeType: options.mimeType,
        data: options.base64Image,
      },
    };
    const textPart = { text: options.prompt };
    const contents = { parts: [imagePart, textPart] };

    const promises = Array.from({ length: options.numImages }).map(() => 
        ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: contents,
            config: {
                responseModalities: [Modality.IMAGE],
            },
        })
    );
    
    const responses = await Promise.all(promises);

    const images = responses.map(response => {
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!imagePart?.inlineData?.data) {
             throw new Error('API returned a response without image data.');
        }
        return imagePart.inlineData.data;
    });

    return { images, seed: '' }; // Gemini Flash Image does not return a seed
};

const generateWithText = async (ai: GoogleGenAI, options: GenerationOptions): Promise<GenerationResult> => {
    if (options.model === 'gemini-2.5-flash-image') {
        const textPart = { text: options.prompt };
        const contents = { parts: [textPart] };

        const promises = Array.from({ length: options.numImages }).map(() =>
            ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: contents,
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            })
        );
        
        const responses = await Promise.all(promises);

        const images = responses.map(response => {
            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (!imagePart?.inlineData?.data) {
                 throw new Error('API returned a response without image data.');
            }
            return imagePart.inlineData.data;
        });

        return { images, seed: '' };
    }
    
    // Batch requests for Imagen 4, which has a limit of 4 images per request.
    const MAX_IMAGES_PER_REQUEST = 4;
    let allImages: string[] = [];
    let finalSeed = '';
    let remainingImages = options.numImages;

    while (remainingImages > 0) {
        const batchSize = Math.min(remainingImages, MAX_IMAGES_PER_REQUEST);
        
        const config: any = {
            numberOfImages: batchSize,
            outputMimeType: 'image/jpeg',
            aspectRatio: options.aspectRatio,
            guidanceScale: options.guidanceScale,
        };
        
        if (options.negativePrompt) {
            config.negativePrompt = options.negativePrompt;
        }
    
        // Only use the seed for the first batch to maintain consistency
        if (options.seed && !isNaN(parseInt(options.seed, 10)) && allImages.length === 0) {
            config.seed = parseInt(options.seed, 10);
        }

        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: options.prompt,
            config: config
        });
    
        if (!response.generatedImages || response.generatedImages.length === 0) {
            if (allImages.length === 0) {
              throw new Error('API returned no images.');
            } else {
              // Return what we have if a subsequent batch fails
              break;
            }
        }
        
        const batchImages = response.generatedImages.map(img => img.image.imageBytes);
        allImages.push(...batchImages);
        
        // Store the seed from the first successful batch
        if (!finalSeed) {
            finalSeed = response.generatedImages[0]?.seed ? String(response.generatedImages[0].seed) : '';
        }

        remainingImages -= batchSize;
    }
    
    return { images: allImages, seed: finalSeed };
};

const generateWithImagenEditing = async (ai: GoogleGenAI, options: GenerationOptions): Promise<GenerationResult> => {
    if (!options.base64Image || !options.mimeType) {
        throw new Error("Image data is required for image editing with Imagen.");
    }

    const MAX_IMAGES_PER_REQUEST = 4;
    let allImages: string[] = [];
    let finalSeed = '';
    let remainingImages = options.numImages;

    while (remainingImages > 0) {
        const batchSize = Math.min(remainingImages, MAX_IMAGES_PER_REQUEST);

        const config: any = {
            numberOfImages: batchSize,
            outputMimeType: 'image/jpeg',
            guidanceScale: options.guidanceScale,
        };
        
        // Only use the seed for the first batch
        if (options.seed && !isNaN(parseInt(options.seed, 10)) && allImages.length === 0) {
            config.seed = parseInt(options.seed, 10);
        }

        if (options.negativePrompt) {
            config.negativePrompt = options.negativePrompt;
        }
        
        // Add strength for image-to-image, but not for inpainting
        if (!options.maskBase64 && options.strength !== undefined) {
            config.editStrength = options.strength;
        }

        const requestPayload: any = {
            model: 'imagen-4.0-generate-001',
            prompt: options.prompt,
            image: {
                imageBytes: options.base64Image,
                mimeType: options.mimeType,
            },
            config: config,
        };

        if (options.maskBase64) {
            requestPayload.mask = {
                image: {
                    imageBytes: options.maskBase64,
                    mimeType: 'image/png', // Masks are typically PNGs
                },
            };
        }

        const response = await ai.models.generateImages(requestPayload);

        if (!response.generatedImages || response.generatedImages.length === 0) {
            if (allImages.length === 0) {
                throw new Error('API returned no images for image editing/inpainting.');
            } else {
                break; // Return what we have
            }
        }

        const batchImages = response.generatedImages.map(img => img.image.imageBytes);
        allImages.push(...batchImages);

        if (!finalSeed) {
            finalSeed = response.generatedImages[0]?.seed ? String(response.generatedImages[0].seed) : '';
        }

        remainingImages -= batchSize;
    }

    return { images: allImages, seed: finalSeed };
};


export const generateImagesFromApi = async (apiKey: string, options: GenerationOptions): Promise<GenerationResult> => {
    if (!apiKey) {
        throw new Error("API Key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
        if (options.base64Image && options.mimeType) {
            if (options.model === 'imagen-4.0-generate-001' || options.maskBase64) {
                return await generateWithImagenEditing(ai, options);
            } else {
                return await generateWithImage(ai, options);
            }
        } else {
            return await generateWithText(ai, options);
        }
    } catch (error) {
        console.error("Error generating images:", error);
        if (error instanceof Error) {
            throw formatApiError(error, options);
        }
        throw new Error("An unknown error occurred during image generation.");
    }
};

export const upscaleImage = async (apiKey: string, base64Image: string): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key is missing for upscaling.");
    }
    const ai = new GoogleGenAI({ apiKey });
    
    const contents = { 
        parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: "Upscale this image to high definition. Enhance details, improve sharpness and clarity. Make it 4k resolution." }
        ]
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: contents,
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const upscaledImagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!upscaledImagePart?.inlineData?.data) {
             throw new Error('API returned a response without upscaled image data.');
        }
        return upscaledImagePart.inlineData.data;

    } catch (error) {
        console.error("Error upscaling image:", error);
        if (error instanceof Error) {
            throw formatApiError(error);
        }
        throw new Error("An unknown error occurred during image upscaling.");
    }
};

export const generateVideoFromApi = async (
    apiKey: string,
    base64Image: string,
    prompt: string,
    onProgress: (message: string) => void
): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key is missing for video generation.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        onProgress('Starting video generation... This can take a few minutes.');
        
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: {
                imageBytes: base64Image,
                mimeType: 'image/jpeg',
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        const pollInterval = 10000;
        let pollCount = 0;

        while (!operation.done) {
            pollCount++;
            const progressMessages = [
                'The AI is dreaming up your video...',
                'Composing shots and adding motion...',
                'Rendering frames, almost there...',
                'Applying final touches...',
                'Still working, quality takes time!'
            ];
            const message = progressMessages[Math.min(pollCount - 1, progressMessages.length - 1)];
            onProgress(message);
            
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        if (operation.error) {
            throw new Error(`Video generation failed: ${operation.error.message}`);
        }

        onProgress('Fetching generated video...');
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

        if (!downloadLink) {
            throw new Error('Video generation finished, but no download link was provided.');
        }
        
        const response = await fetch(`${downloadLink}&key=${apiKey}`);

        if (!response.ok) {
            throw new Error(`Failed to download the video file. Status: ${response.statusText}`);
        }

        const videoBlob = await response.blob();
        const videoUrl = URL.createObjectURL(videoBlob);
        onProgress('Video ready!');
        return videoUrl;

    } catch (error) {
        console.error("Error generating video:", error);
        if (error instanceof Error) {
             if (error.message.toLowerCase().includes('api key not valid')) {
                throw new Error('Your Google API Key is not valid. Please check it in the settings.');
            }
            throw new Error(`Video generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during video generation.");
    }
};

export const generateCompositeImage = async (apiKey: string, base64Images: string[]): Promise<string> => {
    if (!apiKey) throw new Error("API Key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    try {
        const parts: any[] = base64Images.map(base64 => ({
            inlineData: { mimeType: 'image/jpeg', data: base64 }
        }));

        parts.push({
            text: "Analyze the key features of all the provided portraits (facial structure, hair, eyes, style). Intelligently blend these features to create a single, new, cohesive composite portrait of a person who looks like a plausible combination of all the individuals. The output should be a single, photorealistic image."
        });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE] }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!imagePart?.inlineData?.data) {
             throw new Error('API returned a response without composite image data.');
        }
        return imagePart.inlineData.data;

    } catch (error) {
        console.error("Error generating composite image:", error);
        if (error instanceof Error) {
            throw formatApiError(error);
        }
        throw new Error("An unknown error occurred during composite image generation.");
    }
};

export const generateFaceSwapFromApi = async (apiKey: string, sourceImage: string, faceImage: string): Promise<string> => {
    if (!apiKey) throw new Error("API Key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    try {
        const faceSwapPrompt = `Perform a high-quality face swap. The first image is the SOURCE image (destination body and scene). The second image is the FACE image (the face to be swapped in).

Instructions:
1. Identify the primary person in the SOURCE image.
2. Isolate the face from the FACE image.
3. Seamlessly and photorealistically replace the face in the SOURCE image with the face from the FACE image.
4. CRITICAL: Match the target lighting, skin tone, shadows, and angle of the source image precisely.
5. Preserve the original background, body, hair, and clothing from the SOURCE image.
6. The final result must be a single, cohesive image free of any digital artifacts, seams, or uncanny valley effects.`;

        const contents = {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: sourceImage } },
                { inlineData: { mimeType: 'image/jpeg', data: faceImage } },
                { text: faceSwapPrompt }
            ]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: contents,
            config: { responseModalities: [Modality.IMAGE] }
        });
        
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!imagePart?.inlineData?.data) {
             throw new Error('API returned a response without face swap image data.');
        }
        return imagePart.inlineData.data;

    } catch (error) {
        console.error("Error performing face swap:", error);
        if (error instanceof Error) {
            throw formatApiError(error);
        }
        throw new Error("An unknown error occurred during face swap generation.");
    }
};

export const generateSceneCompositeFromApi = async (apiKey: string, backgroundImage: string, characterImage: string): Promise<string> => {
    if (!apiKey) throw new Error("API Key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    try {
        const contents = {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: backgroundImage } },
                { inlineData: { mimeType: 'image/jpeg', data: characterImage } },
                { text: "This is a scene composition task. The first image is the background/scene. The second image contains the character/foreground element. Your task is to accurately isolate the main character/element from the second image and seamlessly place them into the first image (the background). It is critical that you match the lighting, shadows, perspective, and overall color grading of the background image to create a natural and realistic composite. The original background from the first image should be preserved." }
            ]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: contents,
            config: { responseModalities: [Modality.IMAGE] }
        });
        
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!imagePart?.inlineData?.data) {
             throw new Error('API returned a response without composite image data.');
        }
        return imagePart.inlineData.data;

    } catch (error) {
        console.error("Error performing scene composition:", error);
        if (error instanceof Error) {
            throw formatApiError(error);
        }
        throw new Error("An unknown error occurred during scene composition.");
    }
};

export const generateFaceRepairFromApi = async (apiKey: string, sourceImage: string): Promise<string> => {
    if (!apiKey) throw new Error("API Key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    try {
        const contents = {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: sourceImage } },
                { text: "Analyze the face of the person in this image. Enhance and repair the facial features to create a clear, high-quality portrait. Fix any blurriness, correct lighting to be more flattering, remove minor blemishes, and enhance details in the eyes, nose, and mouth. The goal is to produce a restored, high-definition version of the face while preserving the person's identity and the original background." }
            ]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: contents,
            config: { responseModalities: [Modality.IMAGE] }
        });
        
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!imagePart?.inlineData?.data) {
             throw new Error('API returned a response without face repair image data.');
        }
        return imagePart.inlineData.data;

    } catch (error) {
        console.error("Error performing face repair:", error);
        if (error instanceof Error) {
            throw formatApiError(error);
        }
        throw new Error("An unknown error occurred during face repair generation.");
    }
};

export const generatePhotorealisticImageFromApi = async (apiKey: string, sourceImage: string, prompt: string, negativePrompt: string): Promise<string> => {
    if (!apiKey) throw new Error("API Key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    try {
        let fullPrompt = "Your primary task is to convert the provided cartoonish or illustrative image into a high-quality, realistic photograph. Faithfully recreate the subject matter, composition, and overall mood of the original artwork, but render everything with photorealistic textures, lighting, shadows, and details. The final result should look like a real picture taken with a camera, not a digital painting or 3D render.";
    
        if (prompt) {
            fullPrompt += ` The user has provided the following additional positive prompts to guide the style: "${prompt}".`;
        }

        if (negativePrompt) {
            fullPrompt += ` IMPORTANT: The user has specified to avoid the following elements or styles: "${negativePrompt}".`;
        }

        fullPrompt += " The final output must be a single, cohesive, photorealistic image.";
        
        const contents = {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: sourceImage } },
                { text: fullPrompt }
            ]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: contents,
            config: { responseModalities: [Modality.IMAGE] }
        });
        
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!imagePart?.inlineData?.data) {
             throw new Error('API returned a response without a photorealistic image.');
        }
        return imagePart.inlineData.data;

    } catch (error) {
        console.error("Error generating photorealistic image:", error);
        if (error instanceof Error) {
            throw formatApiError(error);
        }
        throw new Error("An unknown error occurred during photorealistic image generation.");
    }
};

export const chatWithAgentFromApi = async (
    apiKey: string,
    ragConfig: AutomationConfig,
    projectId: string,
    agent: Agent,
    userMessage: string
): Promise<{ text: string; functionCalls?: any[] }> => {
    if (!apiKey) throw new Error("API Key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    const { generalLore, recentHistory } = await getContextForAgent(ragConfig, projectId, agent);

    const prepareGenerationPromptTool: FunctionDeclaration = {
        name: 'prepareGenerationPrompt',
        description: 'Prepares all the settings in the image generation input panel for the user. Call this tool when the user asks to set up a shot or create an image.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                prompt: { type: Type.STRING, description: 'The main positive prompt describing the scene, action, characters, and details.' },
                negativePrompt: { type: Type.STRING, description: 'Optional. A comma-separated list of things to avoid in the image.' },
                cameraAngle: { type: Type.STRING, description: 'Optional. The camera angle for the shot, e.g., "Close-up shot", "Wide angle shot".' },
                sceneType: { type: Type.STRING, enum: ['INT', 'EXT'], description: 'Whether the scene is Interior or Exterior.' },
                location: { type: Type.STRING, description: 'The location of the scene, e.g., "COFFEE SHOP".' },
                characters: { type: Type.STRING, description: 'Optional. The character(s) in the scene, e.g., "Jane Doe" or "a mysterious stranger".' },
                timeOfDay: { type: Type.STRING, enum: ['DAY', 'NIGHT'], description: 'The time of day for the scene.' }
            },
            required: ['prompt', 'sceneType', 'location', 'timeOfDay']
        }
    };

    let systemInstruction = `You are the AI Assistant "${agent.name}". Your personality, memories, and way of speaking are defined by the following "LORE BIBLE". You must stay in character at all times and never break character. You can also help the user by preparing image generation prompts when they ask for it.`;

    const loreContext = `
--- LORE BIBLE FOR ${agent.name.toUpperCase()} ---
${agent.lore || 'No specific lore provided for this assistant yet. Improvise based on their name and the conversation.'}
--- END LORE BIBLE FOR ${agent.name.toUpperCase()} ---

--- GENERAL WORLD LORE (For Context) ---
${generalLore || 'No general lore provided.'}
--- END GENERAL WORLD LORE ---
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            systemInstruction: `${systemInstruction}\n${loreContext}`,
            contents: [...recentHistory, { role: 'user', parts: [{ text: userMessage }] }],
            config: {
                tools: [{ functionDeclarations: [prepareGenerationPromptTool] }]
            }
        });

        return {
            text: response.text,
            functionCalls: response.functionCalls,
        };

    } catch (error) {
        console.error("Error in agent chat:", error);
        if (error instanceof Error) {
            throw formatApiError(error);
        }
        throw new Error("An unknown error occurred during the chat.");
    }
};
