export interface Post {
  id: string;
  content: string;
  author: string;
  source: string;
  relevance: number;
  posted_at: string;
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
  relevance: number;
  posted_at: string;
  primaryCategory?: string;
}

export type CategoryKey = "all" | "relevant" | "business" | "world" | "politics" | "technology" | "weather";

export interface Category {
  key: CategoryKey;
  label: string;
  accent: string;
}
