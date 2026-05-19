import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { google } from "googleapis";
import { Source, FeedItem } from "../src/types";
import crypto from "crypto";

const parser = new Parser();

export async function scrapeSource(source: Source): Promise<Partial<FeedItem>[]> {
  switch (source.type) {
    case "rss":
      return scrapeRss(source);
    case "html":
      return scrapeHtml(source);
    case "youtube":
      return scrapeYouTube(source);
    default:
      return [];
  }
}

async function scrapeRss(source: Source): Promise<Partial<FeedItem>[]> {
  const feed = await parser.parseURL(source.url);
  return feed.items.map(item => {
    // Extract image - common locations: enclosure, media:content, or inside content html
    let imageUrl = item.enclosure?.url;
    
    // Check media:content (handled by some parsers as 'media:content' or similar in metadata)
    if (!imageUrl && (item as any)["media:content"]) {
      imageUrl = (item as any)["media:content"]["$"]?.url;
    }

    return {
      title: item.title || "Untitled",
      url: item.link || source.url,
      content: item.content || item.contentSnippet || "",
      imageUrl: imageUrl,
      publishedAt: item.isoDate || new Date().toISOString(),
      sourceId: source.id,
      fingerprint: generateFingerprint(item.link || item.title || ""),
      contentType: "text"
    };
  });
}

async function scrapeHtml(source: Source): Promise<Partial<FeedItem>[]> {
  const response = await fetch(source.url);
  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Basic heuristic: find links that look like news/articles
  const items: Partial<FeedItem>[] = [];
  $("a").each((i, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.length < 5) return;
    
    // Resolve relative URLs
    const fullUrl = new URL(href, source.url).toString();
    const title = $(el).text().trim();
    
    // Try to find a global OG image if individual ones aren't found
    const globalOgImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');

    // Improved image detection: look for img in link, parent, or nearby containers. Fallback to OG image.
    let imageUrl = $(el).find("img").attr("src") || 
                  $(el).parent().find("img").attr("src") ||
                  $(el).closest("div").find("img").attr("src") ||
                  $(el).closest("article").find("img").attr("src");
    
    if (!imageUrl && globalOgImage) imageUrl = globalOgImage;
    
    if (title.length > 20) {
      items.push({
        title,
        url: fullUrl,
        imageUrl: imageUrl ? new URL(imageUrl, source.url).toString() : undefined,
        publishedAt: new Date().toISOString(),
        sourceId: source.id,
        fingerprint: generateFingerprint(fullUrl),
        contentType: "text"
      });
    }
  });
  
  return items.slice(0, 10); // Limit links found by default
}

async function scrapeYouTube(source: Source): Promise<Partial<FeedItem>[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || !source.channelId) return [];

  const youtube = google.youtube({ version: "v3", auth: apiKey });
  const res = await youtube.search.list({
    channelId: source.channelId,
    part: ["snippet"],
    order: "date",
    maxResults: 10
  });

  return (res.data.items || []).map(item => ({
    title: item.snippet?.title || "Untitled Video",
    url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
    content: item.snippet?.description || "",
    imageUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
    publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
    sourceId: source.id,
    fingerprint: generateFingerprint(item.id?.videoId || ""),
    contentType: "video"
  }));
}

function generateFingerprint(data: string): string {
  return crypto.createHash("md5").update(data).digest("hex");
}
