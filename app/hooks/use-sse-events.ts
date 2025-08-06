import { useEffect, useRef } from 'react';
import { notificationsClient } from '../clients/notifications';
import type { Post, Event } from '../types/api';

interface UseSSEEventsOptions {
  onPost?: (post: Post) => void;
  onEvent?: (event: Event) => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
}

/**
 * Custom hook for listening to Server-Sent Events (SSE) for posts and events
 */
export function useSSEEvents(options: UseSSEEventsOptions = {}) {
  const { onPost, onEvent, onError, autoConnect = true } = options;
  const disconnectRef = useRef<(() => void) | null>(null);
  const isConnectedRef = useRef(false);

  const connect = () => {
    if (isConnectedRef.current) {
      return; // Already connected
    }

    console.log('Connecting to SSE events...');
    const disconnect = notificationsClient.connect(onPost, onEvent, onError);
    disconnectRef.current = disconnect;
    isConnectedRef.current = true;
    return disconnect;
  };

  const disconnect = () => {
    if (disconnectRef.current) {
      console.log('Disconnecting from SSE events...');
      disconnectRef.current();
      disconnectRef.current = null;
      isConnectedRef.current = false;
    }
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, onPost, onEvent, onError]);

  return {
    connect,
    disconnect,
    isConnected: () => isConnectedRef.current,
  };
}
