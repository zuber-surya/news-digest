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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
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
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code;
      
      // If it's a transient error (503 Unavailable or 429 Rate Limit), retry
      if (status === 503 || status === 429 || err?.message?.includes("503")) {
        const delay = 2000 * Math.pow(2, attempt);
        console.warn(`Gemini API busy (Status: ${status}), retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }
      
      console.error("Gemini Critical Error:", err);
      break; // Non-retryable error
    }
  }

  // Fallback if all retries fail or non-retryable error occurred
  return {
    summary: item.content?.substring(0, 150) + "...",
    categories: ["Uncategorized"]
  };
}
