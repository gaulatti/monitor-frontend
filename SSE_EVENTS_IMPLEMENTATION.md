# Server-Sent Events (SSE) Implementation for Events

## Overview

The frontend now supports real-time Server-Sent Events (SSE) for both posts and events. This implementation allows the Events page to receive live updates when:

1. **New events are created**
2. **Existing events are updated** (status changes, new posts added to events, etc.)
3. **New posts are ingested** (can be used to show notifications or update related events)

## Architecture

### Backend SSE Implementation

The service has SSE implemented with the following endpoints:

- **SSE Endpoint**: `GET /notifications` - Returns `text/event-stream`
- **Health Check**: `GET /notifications/health` - Check SSE service health

The backend sends different types of messages:

```typescript
// Event notification
{
  type: 'event',
  data: {
    uuid: string,
    title: string,
    summary: string,
    status: 'open' | 'archived' | 'dismissed',
    created_at: string,
    updated_at: string,
    posts_count: number,
    averageRelevance?: number
  }
}

// Post notification
{
  type: 'post',
  data: {
    id: string,
    content: string,
    // ... other post fields
  }
}

// Ingested post notification (more detailed)
{
  type: 'ingested-post',
  data: {
    uuid: string,
    content: string,
    categories: Array,
    // ... other fields
  }
}
```

### Frontend SSE Implementation

#### 1. Enhanced NotificationsClient (`app/clients/notifications.ts`)

The `NotificationsClient` has been enhanced to handle multiple message types:

```typescript
// Connect to SSE with handlers for different message types
const disconnect = notificationsClient.connect(
  (post) => console.log('New post:', post),      // Handle posts
  (event) => console.log('New event:', event),   // Handle events  
  (error) => console.error('SSE error:', error)  // Handle errors
);

// For backward compatibility, posts-only connection
const disconnect = notificationsClient.connectPosts(
  (post) => console.log('New post:', post),
  (error) => console.error('SSE error:', error)
);
```

Features:
- **Automatic reconnection** with exponential backoff
- **Type-safe message parsing** for events and posts
- **Error handling** and connection status tracking
- **Backward compatibility** with existing post-only implementations

#### 2. useSSEEvents Hook (`app/hooks/use-sse-events.ts`)

A React hook that simplifies SSE integration:

```typescript
const { connect, disconnect, isConnected } = useSSEEvents({
  onEvent: (event) => {
    // Handle new/updated events
    setEvents(prev => updateEventInList(prev, event));
  },
  onPost: (post) => {
    // Handle new posts
    console.log('New post received:', post);
  },
  onError: (error) => {
    console.error('SSE connection error:', error);
  },
  autoConnect: true // Automatically connect on mount
});
```

#### 3. Events Component Integration

The Events component (`app/components/events.tsx`) now:

- **Automatically connects** to SSE on component mount
- **Updates events in real-time** when notifications are received
- **Shows connection status** with a live indicator in the header
- **Handles both new events and updates** to existing events
- **Maintains proper sorting** by creation date

## Usage Examples

### Listening to Events Only

```typescript
import { useSSEEvents } from '~/hooks/use-sse-events';

function MyComponent() {
  const [events, setEvents] = useState([]);
  
  useSSEEvents({
    onEvent: (updatedEvent) => {
      setEvents(prev => {
        const index = prev.findIndex(e => e.uuid === updatedEvent.uuid);
        if (index >= 0) {
          // Update existing event
          const newEvents = [...prev];
          newEvents[index] = { ...newEvents[index], ...updatedEvent };
          return newEvents;
        } else {
          // Add new event
          return [...prev, updatedEvent].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
      });
    }
  });
  
  return <div>{/* Your component */}</div>;
}
```

### Manual Connection Control

```typescript
import { notificationsClient } from '~/clients/notifications';

// Manual connection with full control
const disconnect = notificationsClient.connect(
  (post) => handleNewPost(post),
  (event) => handleNewEvent(event),  
  (error) => handleSSEError(error)
);

// Later, disconnect when no longer needed
disconnect();
```

## Environment Configuration

The SSE connection uses the following environment variables:

```bash
# Development (.env.local)
VITE_API_FQDN=http://localhost:3001
VITE_API_PORT=3001

# Production (.env)  
VITE_API_FQDN=http://api.monitor.gaulatti.com
VITE_API_PORT=3004
```

## Connection Status Indicator

The Events page includes a visual indicator showing the SSE connection status:

- **🟢 LIVE** - Connected and receiving real-time updates
- **🔴 OFFLINE** - Disconnected (will attempt automatic reconnection)

## Error Handling & Reconnection

The SSE client includes robust error handling:

1. **Automatic reconnection** with exponential backoff
2. **Maximum retry attempts** (5 by default)
3. **Connection state tracking**
4. **Graceful degradation** when SSE is unavailable

## Testing SSE

To test the SSE implementation:

1. **Start the service** with SSE enabled
2. **Open the Events page** in the frontend
3. **Check the connection indicator** shows "LIVE"
4. **Trigger events** from the backend (create/update events)
5. **Observe real-time updates** in the Events page

## Future Enhancements

Potential improvements for the SSE implementation:

1. **Post updates within events** - Update individual posts when they change
2. **Notification toasts** - Show user-friendly notifications for new events
3. **Event filtering** - Filter SSE messages based on user preferences  
4. **Performance optimization** - Batch updates and reduce re-renders
5. **Offline support** - Queue updates when connection is lost
