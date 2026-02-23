import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AspectRatio, BrandData, PortalSection } from "../types";

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

// 6. Analyze Brand from URL
export const analyzeBrand = async (url: string): Promise<BrandData> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: `Analyze the visual identity and brand voice of the website: ${url}. 
      Extract the following:
      1. Primary and secondary colors (hex codes).
      2. Font families used (or similar Google Fonts).
      3. Tone of voice (e.g., professional, playful, corporate).
      4. Layout style (e.g., minimalist, brutalist, corporate).
      
      Return ONLY a JSON object.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            colors: { type: Type.ARRAY, items: { type: Type.STRING } },
            fonts: { type: Type.ARRAY, items: { type: Type.STRING } },
            tone: { type: Type.STRING },
            layoutStyle: { type: Type.STRING }
          },
          required: ["colors", "fonts", "tone", "layoutStyle"]
        } as any
      }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis generated.");
    return JSON.parse(text) as BrandData;
  } catch (error) {
    console.error("Brand Analysis Error:", error);
    // Fallback if analysis fails
    return {
      colors: ["#0f172a", "#3b82f6"],
      fonts: ["Inter", "sans-serif"],
      tone: "Professional",
      layoutStyle: "Clean and Modern"
    };
  }
};

// 7. Generate Portal HTML
export const generatePortalHtml = async (
  clientName: string,
  brand: BrandData, 
  context: string, 
  sections: PortalSection[]
): Promise<string> => {
  const ai = getAIClient();
  
  const prompt = `
    Create a complete, single-file HTML portal for a client named "${clientName}".
    
    BRAND GUIDELINES:
    - Colors: ${brand.colors.join(', ')}
    - Fonts: ${brand.fonts.join(', ')}
    - Tone: ${brand.tone}
    - Layout: ${brand.layoutStyle}

    CONTEXT/CONTENT:
    ${context}

    REQUIRED SECTIONS (Create these sections in order):
    ${sections.map(s => `- ${s.title}: ${s.description}`).join('\n')}

    TECHNICAL REQUIREMENTS:
    - Use Tailwind CSS via CDN (already included in the environment, just use classes).
    - Use Google Fonts if needed (import them).
    - The design should be high-quality, responsive, and match the brand style.
    - Do NOT use external JS/CSS files other than Tailwind and Fonts.
    - Use https://picsum.photos for placeholders if images are needed (add referrerPolicy="no-referrer").
    - Return ONLY the HTML code, starting with <!DOCTYPE html>.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview', // Better for coding
      contents: prompt,
    });

    let html = response.text || "";
    // Clean up markdown code blocks if present
    html = html.replace(/```html/g, '').replace(/```/g, '');
    return html;
  } catch (error) {
    console.error("Portal Generation Error:", error);
    throw error;
  }
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