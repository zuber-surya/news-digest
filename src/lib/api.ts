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
  deleteSource: async (sourceId: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/sources/${sourceId}`, {
      method: "DELETE",
    });
    return res.json();
  },
  resetItems: async (): Promise<{ message: string }> => {
    const res = await fetch("/api/items/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return res.json();
  },
  syncAllSources: async (): Promise<{ message: string }> => {
    const res = await fetch("/api/sync/all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return res.json();
  },
  subscribe: async (email: string, categories?: string[]): Promise<{ message: string }> => {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, categories }),
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
