import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Rss, 
  Settings, 
  List, 
  Send, 
  Plus, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Database,
  Mail,
  Youtube,
  Globe,
  X,
  Trash2
} from "lucide-react";
import { api } from "./lib/api";
import { Source, FeedItem } from "./types";

const CATEGORIES = {
  "AI Companies": ["OpenAI", "Anthropic", "DeepSeek", "Google AI", "Meta AI", "Mistral"],
  "AWS Services": ["Bedrock", "SageMaker", "Redshift", "Glue", "Lambda", "EMR", "OpenSearch"],
  "Technical Topics": ["Generative AI", "RAG", "AI Agents", "Vector Databases", "Data Engineering", "LLMs", "MLOps"]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"feed" | "sources" | "digests">("feed");
  const [sources, setSources] = useState<Source[]>([]);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [confirmation, setConfirmation] = useState<{ 
    title: string; 
    message: string; 
    onConfirm: () => void; 
    actionLabel: string;
    isDestructive?: boolean;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, i] = await Promise.all([api.getSources(), api.getItems()]);
      
      if (s && 'error' in (s as any)) throw new Error((s as any).error);
      if (i && 'error' in (i as any)) throw new Error((i as any).error);

      setSources(Array.isArray(s) ? s : []);
      setItems(Array.isArray(i) ? i : []);
    } catch (err: any) {
      console.error("Failed to load data", err);
      setError(`System connection error: ${err.message || 'Check terminal logs'}`);
      setSources([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalSync = async () => {
    setLoading(true);
    try {
      const res = await api.syncAllSources();
      if ('error' in res) throw new Error(res.error as string);
      await loadData();
    } catch (err) {
      setError("Global synchronization protocol failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setConfirmation({
      title: "Purge Intelligence Repository?",
      message: "All technical briefings will be cleared and a fresh system-wide sync will be initiated. This action cannot be undone.",
      actionLabel: "Execute Purge",
      isDestructive: true,
      onConfirm: async () => {
        setLoading(true);
        setConfirmation(null);
        try {
          await api.resetItems();
          setTimeout(loadData, 3000);
        } catch (err) {
          setError("Purge protocol failed");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteSource = (id: string, name: string) => {
    setConfirmation({
      title: "Decommission Node?",
      message: `Confirm decommissioning of intelligence node "${name}". This will stop future ingestion from this endpoint.`,
      actionLabel: "Decommission",
      isDestructive: true,
      onConfirm: async () => {
        setConfirmation(null);
        try {
          await api.deleteSource(id);
          loadData();
        } catch (err) {
          setError("Failed to decommission source");
        }
      }
    });
  };

  if (loading && items.length === 0) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white text-slate-900">
        <RefreshCw size={40} className="animate-indigo-500 animate-spin mb-8" />
        <h1 className="text-xl font-bold tracking-tight">ENGINEERED INTELLIGENCE</h1>
        <p className="text-sm font-medium text-slate-400 mt-2 uppercase tracking-widest">Initializing Protocol</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-slate-900 font-sans">
      {error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-white text-rose-600 px-6 py-3 text-sm font-medium rounded-full shadow-2xl border border-rose-100 flex items-center gap-2">
          <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
          {error}
        </div>
      )}
      
      {/* Modern Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 border-b border-slate-200 backdrop-blur-md bg-white/80 flex items-center justify-between px-6 lg:px-12 z-50">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-900/10 transition-transform group-hover:scale-110">
              <Database size={18} />
            </div>
            <span className="font-bold tracking-tight text-xl text-slate-800">Engineered Intelligence</span>
          </div>
          
          <div className="hidden md:flex items-center gap-1">
            <button 
              onClick={() => setActiveTab("feed")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "feed" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}
            >
              Intelligence
            </button>
            <button 
              onClick={() => setActiveTab("sources")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "sources" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}
            >
              Registry
            </button>
            <button 
              onClick={() => setActiveTab("digests")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "digests" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}
            >
              Logistics
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleReset}
            disabled={loading}
            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-30"
            title="Purge Repository"
          >
            <Trash2 size={18} />
          </button>
          <button 
            onClick={handleGlobalSync}
            disabled={loading}
            className="group flex items-center gap-2 text-xs font-semibold bg-brand-primary text-white px-5 py-2.5 rounded-xl hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/25 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
            Sync System
          </button>
        </div>
      </nav>

      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 lg:py-16">
          <AnimatePresence mode="wait">
            {activeTab === "feed" && (
              <motion.section 
                key="feed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
              >
                {items.length === 0 && !loading && (
                  <div className="col-span-full py-32 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                    <Database size={48} className="text-slate-300 mb-4" />
                    <p className="text-slate-400 font-medium">System repository is empty</p>
                  </div>
                )}
                {items.map((item, idx) => (
                  <div key={item.id} className="bg-white rounded-[32px] border border-slate-100 overflow-hidden flex flex-col h-full card-hover">
                    <div className="h-48 overflow-hidden relative group bg-slate-100 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300">
                          {item.contentType === "video" ? <Youtube size={48} strokeWidth={1.5} /> : <Database size={48} strokeWidth={1.5} />}
                          <span className="text-[10px] font-bold uppercase tracking-widest mt-4 opacity-50">Intelligence Node</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {item.contentType === "video" && (
                        <div className="absolute top-4 right-4 bg-rose-600 text-white p-1.5 rounded-lg shadow-lg">
                          <Youtube size={14} />
                        </div>
                      )}
                    </div>
                    
                    <div className="p-7 flex flex-col flex-1">
                      <div className="flex justify-between items-center mb-5">
                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase py-1 px-2.5 bg-slate-50 rounded-full">
                          ID-{String(idx + 1).padStart(3, '0')}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          {new Date(item.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      
                    <h3 className="text-lg font-bold leading-snug text-slate-800 mb-4 line-clamp-2 hover:text-brand-primary transition-colors cursor-pointer" onClick={() => setSelectedItem(item)}>
                      {item.title}
                    </h3>

                    <p className="text-[13px] leading-relaxed text-slate-500 mb-6 line-clamp-3 font-medium cursor-pointer" onClick={() => setSelectedItem(item)}>
                      {item.summary}
                    </p>

                      <div className="mt-auto">
                        <div className="flex flex-wrap gap-1.5 mb-6">
                          {item.categories.slice(0, 3).map(cat => (
                            <span key={cat} className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg uppercase tracking-tight">
                              {cat}
                            </span>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-5 border-t border-slate-50">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                            {item.sourceName || "System Agent"}
                          </span>
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:text-brand-secondary transition-colors group/link"
                          >
                            Read More 
                            <ExternalLink size={12} className="transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.section>
            )}

            {activeTab === "sources" && (
              <motion.section 
                key="sources"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12"
              >
                <div className="lg:col-span-5">
                  <SourceForm onAdded={loadData} />
                </div>
                
                <div className="lg:col-span-7">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Active Channels</h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">Registry of configured ingestion endpoints</p>
                    </div>
                    <span className="text-[11px] font-bold font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                      {sources.length} NODES
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {sources.map(source => (
                      <div key={source.id} className="flex bg-white rounded-2xl p-5 border border-slate-100 items-center card-hover">
                        <div className="mr-5 flex items-center justify-center w-12 h-12 rounded-xl bg-slate-50 text-brand-primary">
                          {source.type === "rss" && <Rss size={20} />}
                          {source.type === "youtube" && <Youtube size={20} />}
                          {source.type === "html" && <Globe size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800 truncate">{source.name}</div>
                          <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{source.url}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => api.triggerScrape(source.id!)}
                            className="p-3 bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 hover:text-brand-primary transition-all rounded-xl shadow-sm"
                            title="Trigger System Sync"
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSource(source.id!, source.name)}
                            className="p-3 bg-white border border-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all rounded-xl shadow-sm"
                            title="Decommission Node"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.section>
            )}

            {activeTab === "digests" && (
              <motion.section 
                key="digests"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-xl mx-auto py-24 text-center bg-white border border-slate-100 rounded-[48px] px-12 shadow-xl shadow-slate-200/50"
              >
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <Mail size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-3xl font-bold text-slate-800 tracking-tight mb-4">Transmission Hub</h3>
                <p className="text-[15px] font-medium text-slate-500 leading-relaxed max-w-sm mx-auto mb-10">
                  Register your communication endpoint for daily intelligence payloads.
                </p>
                
                <SubscriptionForm />
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {selectedItem && (
          <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
        {confirmation && (
          <ConfirmationModal 
            {...confirmation} 
            onClose={() => setConfirmation(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfirmationModal({ 
  title, 
  message, 
  onConfirm, 
  onClose, 
  actionLabel, 
  isDestructive 
}: { 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onClose: () => void;
  actionLabel: string;
  isDestructive?: boolean;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative z-10 p-8 lg:p-10 text-center"
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${isDestructive ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
          <Trash2 size={28} />
        </div>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight mb-3">{title}</h3>
        <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">{message}</p>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onClose}
            className="py-4 bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`py-4 text-white text-xs font-bold uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-opacity-20 ${
              isDestructive ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-brand-primary hover:bg-brand-secondary shadow-indigo-600/20'
            }`}
          >
            {actionLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ItemModal({ item, onClose }: { item: FeedItem; onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12"
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl relative z-10 flex flex-col overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-20 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="overflow-y-auto flex-1">
          <div className="w-full h-[300px] lg:h-[400px] relative bg-slate-50 flex items-center justify-center overflow-hidden">
            {item.imageUrl ? (
              <>
                <img 
                  src={item.imageUrl} 
                  alt={item.title} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-200">
                {item.contentType === "video" ? <Youtube size={80} strokeWidth={1} /> : <Database size={80} strokeWidth={1} />}
              </div>
            )}
          </div>

          <div className="px-8 lg:px-16 py-12">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-xs font-bold text-slate-400 font-mono tracking-widest uppercase py-1.5 px-3 bg-slate-100 rounded-full">
                {item.sourceName || "SYSTEM"}
              </span>
              <span className="text-sm font-medium text-slate-400">
                {new Date(item.publishedAt).toLocaleDateString(undefined, { 
                  weekday: 'long',
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>

            <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 leading-tight mb-8">
              {item.title}
            </h2>

            <div className="flex flex-wrap gap-2 mb-10">
              {item.categories.map(cat => (
                <span key={cat} className="text-sm font-bold bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-xl uppercase tracking-tight">
                  {cat}
                </span>
              ))}
            </div>

            <div className="prose prose-slate max-w-none">
              <p className="text-lg lg:text-xl text-slate-600 leading-relaxed font-medium">
                {item.summary}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 lg:px-16 border-t border-slate-100 bg-slate-50/50 flex justify-center">
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center gap-3 bg-brand-primary text-white px-10 py-5 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-brand-primary/30 hover:bg-brand-secondary transition-all"
          >
            Read Original Article 
            <ExternalLink size={18} className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SubscriptionForm() {
  const [email, setEmail] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const toggleCategory = (cat: string) => {
    setSelectedCats(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await api.subscribe(email, selectedCats);
      if ("error" in res) {
        setStatus("error");
        setMessage(res.error as string);
      } else {
        setStatus("success");
        setMessage(res.message);
      }
    } catch (err) {
      setStatus("error");
      setMessage("Transmission failed. Check network connection.");
    }
  };

  const handleTest = async () => {
    if (!email) {
      setStatus("error");
      setMessage("Endpoint identity required for test dispatch.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await api.triggerTestDigest(email);
      if ("error" in res) {
        setStatus("error");
        setMessage(res.error as string);
      } else {
        setStatus("success");
        setMessage(res.message);
      }
    } catch (err) {
      setStatus("error");
      setMessage("Test dispatch failed. Verify SMTP configuration.");
    }
  };

  return (
    <div className="space-y-8 max-w-xl mx-auto">
      <form onSubmit={handleSubscribe} className="space-y-8">
        <div className="space-y-4">
          <div className="relative group">
            <input 
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="USER@NETWORK.LOCAL"
              className="w-full bg-slate-50 border border-slate-200 px-5 py-5 rounded-2xl text-base font-semibold focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary/30 transition-all text-center tracking-widest placeholder:text-slate-300"
            />
          </div>

          <div className="space-y-6 text-left">
            {Object.entries(CATEGORIES).map(([group, cats]) => (
              <div key={group} className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{group}</h4>
                <div className="flex flex-wrap gap-2">
                  {cats.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        selectedCats.includes(cat)
                          ? "bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            type="submit"
            disabled={status === "loading"}
            className="w-full py-5 bg-brand-primary text-white text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/25 disabled:opacity-50"
          >
            {status === "loading" ? "Processing..." : "Link Profile"}
          </button>
          <button 
            type="button"
            onClick={handleTest}
            disabled={status === "loading"}
            className="w-full py-5 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Test Sync
          </button>
        </div>
      </form>
      
      {message && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className={`text-xs font-bold uppercase tracking-wider p-5 rounded-2xl border text-center ${status === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}
        >
          {message}
        </motion.div>
      )}
    </div>
  );
}

function SourceForm({ onAdded }: { onAdded: () => void }) {
  const [formData, setFormData] = useState({ name: "", url: "", type: "rss" as const });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.addSource(formData);
      setFormData({ name: "", url: "", type: "rss" });
      onAdded();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 lg:p-10 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
      <div className="flex items-center gap-3 pb-6 border-b border-slate-50">
        <div className="w-10 h-10 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center">
          <Plus size={20} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">New Registry</h3>
          <p className="text-sm text-slate-500 font-medium">Add a new ingestion node</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Identity</label>
          <input 
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary/30 transition-all placeholder:text-slate-300"
            placeholder="SYSTEM_FEED_X"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Protocol / URL</label>
          <input 
            required
            type="url"
            value={formData.url}
            onChange={e => setFormData({ ...formData, url: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary/30 transition-all placeholder:text-slate-300"
            placeholder="https://service.ext/feed"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Methodology</label>
          <div className="relative">
            <select 
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary/30 transition-all appearance-none cursor-pointer text-slate-700"
            >
              <option value="rss">RSS_STANDARD_V2</option>
              <option value="html">HTML_DOM_SCRAPE</option>
              <option value="youtube">GOOGLE_YT_API</option>
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown size={16} />
            </div>
          </div>
        </div>
      </div>

      <button 
        disabled={submitting}
        className="w-full py-4.5 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-3 disabled:opacity-50"
      >
        {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
        Execute Registry
      </button>
    </form>
  );
}
