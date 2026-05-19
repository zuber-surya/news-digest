import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  doc, 
  getDoc, 
  getDocFromServer,
  writeBatch
} from "firebase/firestore";
import { db, auth } from "./server/firebase";
import { scrapeSource } from "./server/scrapers";
import { summarizeAndCategorize } from "./server/gemini";
import { sendDigestEmail } from "./server/email";
import cron from "node-cron";

dotenv.config();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
app.post("/api/subscribe", async (req, res) => {
  try {
    const { email, categories } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
    // Check if already exists in subscriptions collection
    const q = query(collection(db, "subscriptions"), where("email", "==", email));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      // Update existing subscription preferences
      const subId = snapshot.docs[0].id;
      await addDoc(collection(db, "subscriptions"), { 
        email, 
        categories: categories || [],
        updatedAt: new Date().toISOString()
      });
      return res.json({ message: "Preferences updated" });
    }

    await addDoc(collection(db, "subscriptions"), {
      email,
      categories: categories || [],
      createdAt: new Date().toISOString()
    });
    res.json({ message: "Subscription successful" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/test-digest", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const q = query(collection(db, "items"), orderBy("publishedAt", "desc"), limit(5));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    if (items.length === 0) return res.status(404).json({ error: "No news items available to send" });

    await sendDigestEmail(email, items);
    res.json({ message: "Test digest sent to " + email });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/sources", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "sources"));
    const sources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(sources);
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.GET, "sources");
    } catch (finalErr) {
      res.status(500).json({ error: (finalErr as Error).message });
    }
  }
});

app.post("/api/sources", async (req, res) => {
  try {
    const source = req.body;
    const docRef = await addDoc(collection(db, "sources"), {
      ...source,
      createdAt: new Date().toISOString()
    });
    res.json({ id: docRef.id, ...source });
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.CREATE, "sources");
    } catch (finalErr) {
      res.status(500).json({ error: (finalErr as Error).message });
    }
  }
});

app.delete("/api/sources/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const batch = writeBatch(db);
    batch.delete(doc(db, "sources", id));
    await batch.commit();
    res.json({ message: "Source decommissioned successfully" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/items", async (req, res) => {
  try {
    const q = query(collection(db, "items"), orderBy("publishedAt", "desc"), limit(50));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.LIST, "items");
    } catch (finalErr) {
      res.status(500).json({ error: (finalErr as Error).message });
    }
  }
});

app.post("/api/items/reset", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "items"));
    if (snapshot.empty) {
      return res.json({ message: "Repository already empty. Starting sync..." });
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    // Trigger global sync in background
    triggerGlobalSync().catch(err => console.error("Background sync failed:", err));
    
    res.json({ message: "Repository cleared. System synchronization initiated." });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

async function triggerGlobalSync() {
  console.log("Initiating global system synchronization...");
  const snapshot = await getDocs(collection(db, "sources"));
  for (const sourceDoc of snapshot.docs) {
    const source = { id: sourceDoc.id, ...sourceDoc.data() } as any;
    try {
      const items = await scrapeSource(source);
      let saved = 0;
      for (const item of items) {
        if (saved >= 5) break; // Limit initial reset-sync per source

        const existingQuery = query(collection(db, "items"), where("fingerprint", "==", item.fingerprint));
        const existingSnapshot = await getDocs(existingQuery);
        if (existingSnapshot.empty) {
          await sleep(10000); // Respect rate limit
          const aiResult = await summarizeAndCategorize(item);
          await addDoc(collection(db, "items"), {
            ...item,
            ...aiResult,
            createdAt: new Date().toISOString()
          });
          saved++;
        }
      }
    } catch (err) {
      console.error(`Sync failed for ${source.name}:`, err);
    }
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

app.post("/api/scrape", async (req, res) => {
  try {
    const { sourceId } = req.body;
    const sourceDoc = await getDoc(doc(db, "sources", sourceId));
    if (!sourceDoc.exists()) {
      return res.status(404).json({ error: "Source not found" });
    }
    const source = { id: sourceDoc.id, ...sourceDoc.data() } as any;
    const items = await scrapeSource(source);
    
    let savedCount = 0;
    // Limit to 3 items per manual scrape to avoid quick rate limit hits and request timeouts
    const processingItems = items.slice(0, 3);

    for (const item of processingItems) {
      // Check if already exists
      const existingQuery = query(collection(db, "items"), where("fingerprint", "==", item.fingerprint));
      const existingSnapshot = await getDocs(existingQuery);
      
      if (existingSnapshot.empty) {
        // AI Phase: Summarize and Categorize
        // Respect rate limit: 13 seconds per item (approx 4.6 per min) to be safe for free tier
        if (savedCount > 0) await sleep(13000); 

        const aiResult = await summarizeAndCategorize(item);
        
        await addDoc(collection(db, "items"), {
          ...item,
          ...aiResult,
          createdAt: new Date().toISOString()
        });
        savedCount++;
      }
    }
    
    res.json({ message: `Processed ${processingItems.length} items, saved ${savedCount} new items` });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

async function seedSources() {
  try {
    const snapshot = await getDocs(collection(db, "sources"));
    if (snapshot.empty) {
      console.log("Seeding engineering intelligence sources...");
      const defaults = [
        // AI Blogs
        { name: "OPENAI_BLOG", url: "https://openai.com/news/rss.xml", type: "rss" },
        { name: "ANTHROPIC_NEWS", url: "https://www.anthropic.com/index.xml", type: "rss" },
        { name: "DEEPSEEK_UPDATES", url: "https://blog.deepseek.com/feed/", type: "rss" },
        { name: "GOOGLE_AI_BLOG", url: "https://blog.google/technology/ai/rss/", type: "rss" },
        { name: "META_AI_NEWS", url: "https://ai.meta.com/blog/rss/", type: "rss" },
        
        // AWS What's New
        { name: "AWS_WHATS_NEW", url: "https://aws.amazon.com/about-aws/whats-new/recent/feed/", type: "rss" },
        { name: "AWS_BEDROCK_RELEASES", url: "https://aws.amazon.com/blogs/aws/tag/amazon-bedrock/feed/", type: "rss" },
        { name: "AWS_SAGEMAKER_UPDATES", url: "https://aws.amazon.com/blogs/aws/tag/amazon-sagemaker/feed/", type: "rss" },
        { name: "AWS_BIG_DATA_BLOG", url: "https://aws.amazon.com/blogs/big-data/feed/", type: "rss" },
        
        // Technical Blogs
        { name: "THE_RUNDOWN_AI", url: "https://therundownai.beehiiv.com/rss", type: "rss" },
        { name: "AI_NEWS_NETWORK", url: "https://www.artificialintelligence-news.com/feed/", type: "rss" },
        { name: "DATABRICKS_BLOG", url: "https://www.databricks.com/feed", type: "rss" },
        
        // YouTube Technical Channels
        { name: "AWS_EVENTS_YT", url: "https://www.youtube.com/@AWSEvents/videos", type: "youtube" },
        { name: "AI_EXPLAINED_YT", url: "https://www.youtube.com/@AIExplained/videos", type: "youtube" },
        { name: "ANDREJ_KARPATHY_YT", url: "https://www.youtube.com/@AndrejKarpathy/videos", type: "youtube" }
      ];
      for (const source of defaults) {
        await addDoc(collection(db, "sources"), {
          ...source,
          createdAt: new Date().toISOString()
        });
      }
      console.log("Seeding complete.");
    }
  } catch (err) {
    console.error("Seeding failed:", err);
  }
}

async function startServer() {
  await seedSources();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Background Task: Periodic Scraping
cron.schedule("0 * * * *", async () => {
  console.log("Running scheduled scraping task...");
  try {
    const snapshot = await getDocs(collection(db, "sources"));
    for (const sourceDoc of snapshot.docs) {
      const source = { id: sourceDoc.id, ...sourceDoc.data() } as any;
      console.log(`Scraping source: ${source.name}`);
      const items = await scrapeSource(source);
      
      let savedInSource = 0;
      // Process max 3 new items per source in background to spread load
      for (const item of items) {
        if (savedInSource >= 3) break;

        const existingQuery = query(collection(db, "items"), where("fingerprint", "==", item.fingerprint));
        const existingSnapshot = await getDocs(existingQuery);
        if (existingSnapshot.empty) {
          // Respect rate limit: 12 seconds per item (5/min safe)
          await sleep(12000); 
          
          const aiResult = await summarizeAndCategorize(item);
          await addDoc(collection(db, "items"), {
            ...item,
            ...aiResult,
            createdAt: new Date().toISOString()
          });
          savedInSource++;
        }
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
      const { email, categories: userCategories } = subDoc.data();
      
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

startServer();
