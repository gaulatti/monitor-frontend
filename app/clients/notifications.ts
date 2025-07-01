import type { Post } from "../types/api";

export interface NotificationPayload {
  id: string;
  content: string;
  source: string;
  author: string;
  relevance: number;
  posted_at: string;
  categories: string[];
}

export class NotificationsClient {
  private eventSource: EventSource | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = 'https://api.monitor.gaulatti.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Connect to the SSE notifications endpoint
   */
  connect(onMessage: (post: Post) => void, onError?: (error: Event) => void): () => void {
    if (this.eventSource) {
      this.disconnect();
    }

    const url = `${this.baseUrl}/notifications`;
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const payload: NotificationPayload = JSON.parse(event.data);
        
        // Transform notification payload to Post format
        const post: Post = {
          id: payload.id,
          content: payload.content,
          source: payload.source,
          author: payload.author,
          relevance: payload.relevance,
          posted_at: payload.posted_at,
          categories: payload.categories,
        };

        onMessage(post);
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      if (onError) {
        onError(error);
      }
    };

    this.eventSource.onopen = () => {
      console.log('SSE connection established');
    };

    // Return cleanup function
    return () => this.disconnect();
  }

  /**
   * Disconnect from the SSE endpoint
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('SSE connection closed');
    }
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}

export const notificationsClient = new NotificationsClient();
