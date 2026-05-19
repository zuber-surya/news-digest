export type SourceType = 'rss' | 'html' | 'youtube';

export interface Source {
  id?: string;
  name: string;
  url: string;
  type: SourceType;
  channelId?: string;
  defaultCategory?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export interface FeedItem {
  id?: string;
  title: string;
  url: string;
  summary: string;
  content: string;
  publishedAt: string;
  sourceId: string;
  sourceName?: string;
  categories: string[];
  imageUrl?: string;
  fingerprint: string;
  contentType: string;
  createdAt: string;
}

export interface Subscription {
  id?: string;
  userId: string;
  sourceIds: string[];
  schedule: string; // cron expression
  lastDigestSentAt?: string;
}

export interface Digest {
  id?: string;
  userId: string;
  subscriptionId: string;
  itemIds: string[];
  sentAt: string;
  status: 'pending' | 'sent' | 'failed';
}
