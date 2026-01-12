
import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult } from "./types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchBookInfo = async (query: string): Promise<Omit<SearchResult, 'coverUrl'> & { tempBase64: string }> => {
  const ai = getAI();
  
  const textResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Busca detalles del libro "${query}". Devuelve JSON con: title, author, year, summary, tags, imagePrompt.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          author: { type: Type.STRING },
          year: { type: Type.STRING },
          summary: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          imagePrompt: { type: Type.STRING }
        },
        required: ["title", "author", "year", "summary", "tags", "imagePrompt"]
      }
    }
  });

  const bookData = JSON.parse(textResponse.text || '{}');

  const imageResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { 
      parts: [{ 
        text: `A professional book cover for "${bookData.title}" by ${bookData.author}. 
        The cover MUST clearly display the title "${bookData.title}" and the author name "${bookData.author}" in elegant, readable typography. 
        Style: ${bookData.imagePrompt}. High quality graphic design, cinematic lighting.` 
      }] 
    },
    config: { imageConfig: { aspectRatio: "2:3" } }
  });

  let tempBase64 = "";
  const part = imageResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData) {
    tempBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  }

  return { ...bookData, tempBase64 };
};

export const getAuthorBio = async (authorName: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Biografía literaria breve de ${authorName}.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return response.text || "No disponible.";
};
