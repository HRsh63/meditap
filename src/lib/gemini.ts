import { GoogleGenAI } from "@google/genai";

export async function generateMedicalImage(prompt: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Attempt with the experimental image model
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          {
            text: `Professional medical-themed image: ${prompt}. Clean, modern, high-quality, professional lighting.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.warn("Medical image generation failed, using fallback:", error);
  }
  
  // High-quality medical fallback image
  return `https://picsum.photos/seed/medical-id/400/400`;
}
