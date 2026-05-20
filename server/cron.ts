import cron from "node-cron";
import { collection, getDocs, query, where, orderBy, limit, addDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { scrapeSource } from "./scrapers.js";
import { summarizeAndCategorize } from "./gemini.js";
import { sendDigestEmail } from "./email.js";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function sanitizeFirestoreData(data: any) {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function setupCronJobs() {
  console.log("Initializing scheduled tasks...");
  
  // Background Task: Periodic Scraping
  cron.schedule("0 * * * *", async () => {
    console.log("Running scheduled scraping task...");
    try {
      const snapshot = await getDocs(collection(db, "sources"));
      for (const sourceDoc of snapshot.docs) {
        const source = { id: sourceDoc.id, ...sourceDoc.data() } as any;
        console.log(`[Cron] Starting scrape for source: ${source.name} (${source.url})`);
        
        try {
          const items = await scrapeSource(source);
          console.log(`[Cron] Found ${items.length} items for ${source.name}`);
          
          let savedInSource = 0;
          for (const item of items) {
            if (savedInSource >= 3) break;

            const q = query(collection(db, "items"), where("fingerprint", "==", item.fingerprint));
            const existingSnapshot = await getDocs(q);
            if (existingSnapshot.empty) {
              console.log(`[Cron] Saving new item: ${item.title}`);
              await sleep(12000); 
              
              const aiResult = await summarizeAndCategorize(item);
              await addDoc(collection(db, "items"), sanitizeFirestoreData({
                ...item,
                ...aiResult,
                createdAt: new Date().toISOString()
              }));
              savedInSource++;
            }
          }
          console.log(`[Cron] Finished ${source.name}. Saved ${savedInSource} new items.`);
        } catch (sourceErr) {
          console.error(`[Cron] Error scraping source ${source.name}:`, sourceErr);
          // Continue to next source
        }
      }
    } catch (err) {
      console.error("Scheduled scrape failed:", err);
    }
  });

  // Background Task: Daily Digest (Every day at 8:00 AM)
  cron.schedule("0 8 * * *", async () => {
    console.log("Running scheduled daily digest...");
    try {
      const subSnapshot = await getDocs(collection(db, "subscriptions"));
      if (subSnapshot.empty) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const q = query(
        collection(db, "items"),
        where("createdAt", ">=", yesterday.toISOString()),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      const itemSnapshot = await getDocs(q);
        
      const items = itemSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      if (items.length === 0) return;

      for (const subDoc of subSnapshot.docs) {
        const { email, categories: userCategories } = subDoc.data() as any;
        
        // Filter items by user categories if specified
        let filteredItems = items;
        if (userCategories && userCategories.length > 0) {
          filteredItems = items.filter(item => 
            item.categories.some((cat: string) => userCategories.includes(cat))
          );
        }

        if (filteredItems.length === 0) continue;

        console.log(`Sending filtered digest (${filteredItems.length} items) to ${email}`);
        await sendDigestEmail(email, filteredItems);
      }
    } catch (err) {
      console.error("Scheduled digest failed:", err);
    }
  });
}
