import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { google } from "googleapis";
import { Source, FeedItem } from "../src/types.js";
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
  try {
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
  } catch (err) {
    console.error(`RSS scrape failed for ${source.name} (${source.url}):`, err);
    return [];
  }
}

async function scrapeHtml(source: Source): Promise<Partial<FeedItem>[]> {
  try {
    const response = await fetch(source.url);
    if (!response.ok) {
      console.warn(`HTML scrape failed for ${source.name} (${source.url}): Status ${response.status}`);
      return [];
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Basic heuristic: find links that look like news/articles
    const items: Partial<FeedItem>[] = [];
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      if (!href || href.startsWith("#") || href.length < 5) return;
      
      // Resolve relative URLs
      try {
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
      } catch (urlErr) {
        // Skip invalid URLs
      }
    });
    
    return items.slice(0, 10); // Limit links found by default
  } catch (err) {
    console.error(`HTML scrape failed for ${source.name} (${source.url}):`, err);
    return [];
  }
}

async function scrapeYouTube(source: Source): Promise<Partial<FeedItem>[]> {
  try {
    let channelId = source.channelId;
    
    // If no channelId, try to extract it from the URL
    if (!channelId && source.url.includes("youtube.com")) {
      const response = await fetch(source.url);
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Look for channel ID in metadata
      channelId = $('meta[itemprop="channelId"]').attr("content") || 
                  $('link[rel="canonical"]').attr("href")?.split("/channel/")[1] ||
                  html.match(/"externalId":"(.*?)"/)?.[1];
    }

    if (!channelId) {
      console.warn(`Could not resolve channelId for ${source.name}`);
      return [];
    }

    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const feed = await parser.parseURL(rssUrl);

    return feed.items.map(item => ({
      title: item.title || "Untitled Video",
      url: item.link || "",
      content: item.contentSnippet || item.content || "",
      imageUrl: (item as any).mediaGroups?.[0]?.contents?.[0]?.url || 
                `https://i.ytimg.com/vi/${(item as any).id?.split(":")[2]}/hqdefault.jpg`,
      publishedAt: item.isoDate || new Date().toISOString(),
      sourceId: source.id,
      fingerprint: generateFingerprint(item.link || item.title || ""),
      contentType: "video"
    }));
  } catch (err) {
    console.error(`YouTube RSS scrape failed for ${source.name}:`, err);
    return [];
  }
}

function generateFingerprint(data: string): string {
  return crypto.createHash("md5").update(data).digest("hex");
}
