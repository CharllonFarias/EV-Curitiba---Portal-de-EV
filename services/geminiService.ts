import { GoogleGenAI, Type } from "@google/genai";
import { AspectRatio } from "../types";

// Helper to ensure API Key is present
const getAIClient = () => {
  let apiKey = '';

  // 1. Tenta ler do process.env padrão (Node.js ou Build Tools)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    apiKey = process.env.API_KEY;
  } 
  // 2. Tenta ler do polyfill manual no window (para Netlify/Browser direto sem build process)
  else if (typeof window !== 'undefined' && (window as any).process && (window as any).process.env) {
    apiKey = (window as any).process.env.API_KEY;
  }

  if (!apiKey) {
    throw new Error("API Key is missing. Please check index.html and paste your key in the window.process configuration.");
  }
  return new GoogleGenAI({ apiKey });
};

// 1. Fast AI Responses (Gemini 2.5 Flash Lite)
export const generateFastResponse = async (prompt: string): Promise<string> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite-latest',
      contents: prompt,
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Fast AI Error:", error);
    throw error;
  }
};

// 2. Thinking Mode (Gemini 3 Pro)
export const generateThinkingResponse = async (prompt: string): Promise<string> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
      }
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Thinking AI Error:", error);
    throw error;
  }
};

// 3. Search Grounding (Gemini 3 Flash)
export const generateSearchResponse = async (prompt: string): Promise<{ text: string, links: string[] }> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "No response generated.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links: string[] = [];
    
    chunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
            links.push(chunk.web.uri);
        }
    });

    return { text, links };
  } catch (error) {
    console.error("Search AI Error:", error);
    throw error;
  }
};

// 4. Image Generation (Gemini 3 Pro Image)
export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  // Check for API Key selection for high-end models (simulated check as per instructions)
  if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
          await window.aistudio.openSelectKey();
          // Assuming successful selection to proceed
      }
  }

  // Create a NEW instance to pick up potentially selected key
  const ai = getAIClient(); 

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K"
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data received.");
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};

// 5. Image Editing (Gemini 2.5 Flash Image)
export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = getAIClient();
  // Strip prefix if present for the API call
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png', // Assuming PNG or standard image
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No edited image data received.");
  } catch (error) {
    console.error("Image Edit Error:", error);
    throw error;
  }
};