import { Source, FeedItem } from "../types";

export const api = {
  getSources: async (): Promise<Source[]> => {
    const res = await fetch("/api/sources");
    return res.json();
  },
  addSource: async (source: Source): Promise<Source> => {
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(source),
    });
    return res.json();
  },
  getItems: async (): Promise<FeedItem[]> => {
    const res = await fetch("/api/items");
    return res.json();
  },
  triggerScrape: async (sourceId: string): Promise<{ message: string }> => {
    const res = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
    return res.json();
  },
  subscribe: async (email: string): Promise<{ message: string }> => {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },
  triggerTestDigest: async (email: string): Promise<{ message: string }> => {
    const res = await fetch("/api/test-digest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },
};
