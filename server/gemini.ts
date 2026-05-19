import { GoogleGenAI, Type } from "@google/genai";
import { FeedItem } from "../src/types";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function summarizeAndCategorize(item: Partial<FeedItem>) {
  const prompt = `
    Analyze the following news item:
    Title: ${item.title}
    Content: ${item.content}
    
    Provide:
    1. A concise 2-sentence summary.
    2. A list of 1-3 categories (e.g., Technology, Politics, Sports, Business).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            categories: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "categories"]
        }
      }
    });

    const data = JSON.parse(response.text);
    return data;
  } catch (err) {
    console.error("Gemini Error:", err);
    return {
      summary: item.content?.substring(0, 150) + "...",
      categories: ["Uncategorized"]
    };
  }
}
