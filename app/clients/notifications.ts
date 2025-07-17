import type { Post } from '../types/api';

export interface NotificationPayload {
  id: string;
  content: string;
  source: string;
  author: string;
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

export class NotificationsClient {
  private eventSource: EventSource | null = null;
  private baseUrl: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second
  private isReconnecting: boolean = false;

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

    const attemptConnection = () => {
      if (this.isReconnecting && this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('Max reconnection attempts reached. Stopping reconnection.');
        if (onError) {
          onError(new Event('max-reconnect-attempts'));
        }
        return;
      }

      const url = `${this.baseUrl}/notifications`;
      console.log(`Attempting SSE connection (attempt ${this.reconnectAttempts + 1})`);

      this.eventSource = new EventSource(url);

      this.eventSource.onmessage = (event) => {
        try {
          // Reset reconnection state on successful message
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;

          const payload: NotificationPayload = JSON.parse(event.data);

          // Transform notification payload to Post format
          const post: Post = {
            id: payload.id,
            content: payload.content,
            source: payload.source,
            author: payload.author,
            uri: payload.uri,
            posted_at: payload.posted_at,
            relevance: payload.relevance,
            lang: payload.lang,
            hash: payload.hash,
            author_id: payload.author_id,
            author_name: payload.author_name,
            author_handle: payload.author_handle,
            author_avatar: payload.author_avatar,
            media: payload.media,
            linkPreview: payload.linkPreview,
            original: payload.original,
            received_at: payload.received_at,
            categories: payload.categories,
          };

          onMessage(post);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);

        // Don't immediately call onError - we'll try to reconnect first
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          console.log('SSE connection closed, attempting to reconnect...');
          this.attemptReconnect(attemptConnection, onError);
        } else {
          // For other errors, just log them but don't fail completely
          console.warn('SSE error (connection still open):', error);
        }
      };

      this.eventSource.onopen = () => {
        console.log('SSE connection established successfully');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.isReconnecting = false;
      };
    };

    attemptConnection();

    // Return cleanup function
    return () => this.disconnect();
  }

  private attemptReconnect(connectionFn: () => void, onError?: (error: Event) => void) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      if (onError) {
        onError(new Event('max-reconnect-attempts'));
      }
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.eventSource) {
        this.eventSource.close();
      }
      connectionFn();
      // Exponential backoff with max delay of 30 seconds
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
    }, this.reconnectDelay);
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
