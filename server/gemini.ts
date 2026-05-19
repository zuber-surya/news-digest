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
    1. A concise 2-sentence summary focused on technical impact for engineers.
    2. A list of 1-4 specific categories strictly from this taxonomy:
       - AI Companies: OpenAI, Anthropic, DeepSeek, Google AI, Meta AI, Mistral
       - AWS Services: Bedrock, SageMaker, Redshift, Glue, Lambda, EMR, OpenSearch
       - Technical Topics: Generative AI, RAG, AI Agents, Vector Databases, Data Engineering, LLMs, MLOps
       - Content Type: Blog Post, YouTube Video, Product Update, Release Notes, Tutorial
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
