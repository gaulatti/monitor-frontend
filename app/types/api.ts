export interface Post {
  id: string;
  content: string;
  author: string;
  source: string;
  uri: string;
  posted_at: string;
  relevance: number;
  lang: string;
  hash: string;
  author_id: string | null;
  author_name: string;
  author_handle: string;
  author_avatar: string;
  media: string[];
  linkPreview: string;
  original: string | null;
  received_at: string;
  categories: string[];
}

export interface PostEntry {
  id: string;
  text: string;
  source: string;
  tags: string[];
  timestamp: string;
  category: string;
  author: string;
  author_name: string;
  author_handle: string;
  author_avatar: string;
  relevance: number;
  posted_at: string;
  primaryCategory?: string;
  uri: string;
  media: string[];
  linkPreview: string;
  lang: string;
}

export type CategoryKey = "all" | "relevant" | "business" | "world" | "politics" | "technology" | "weather";

export interface Category {
  key: CategoryKey;
  label: string;
  accent: string;
}
