import { useState, useEffect } from 'react';
import type { Event, Post } from '../types/api';

interface NotificationItem {
  id: string;
  type: 'event' | 'post';
  title: string;
  message: string;
  timestamp: Date;
  data: Event | Post;
}

interface SSENotificationsProps {
  onEventReceived?: (event: Event) => void;
  onPostReceived?: (post: Post) => void;
  showToasts?: boolean;
  maxNotifications?: number;
}

export function SSENotifications({ 
  onEventReceived, 
  onPostReceived, 
  showToasts = true, 
  maxNotifications = 5 
}: SSENotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = (notification: NotificationItem) => {
    setNotifications(prev => {
      const newNotifications = [notification, ...prev].slice(0, maxNotifications);
      return newNotifications;
    });

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const handleNewEvent = (event: Event) => {
    const notification: NotificationItem = {
      id: `event-${event.uuid}-${Date.now()}`,
      type: 'event',
      title: 'New Event',
      message: event.title,
      timestamp: new Date(),
      data: event
    };

    addNotification(notification);
    onEventReceived?.(event);
  };

  const handleNewPost = (post: Post) => {
    const notification: NotificationItem = {
      id: `post-${post.id}-${Date.now()}`,
      type: 'post', 
      title: 'New Post',
      message: post.content.slice(0, 100) + (post.content.length > 100 ? '...' : ''),
      timestamp: new Date(),
      data: post
    };

    addNotification(notification);
    onPostReceived?.(post);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (!showToasts || notifications.length === 0) {
    return null;
  }

  return (
    <div className="sse-notifications">
      {notifications.map((notification) => (
        <div 
          key={notification.id} 
          className={`notification notification-${notification.type}`}
          onClick={() => removeNotification(notification.id)}
        >
          <div className="notification-header">
            <span className="notification-title">{notification.title}</span>
            <span className="notification-time">
              {notification.timestamp.toLocaleTimeString()}
            </span>
          </div>
          <div className="notification-message">
            {notification.message}
          </div>
          <button 
            className="notification-close"
            onClick={(e) => {
              e.stopPropagation();
              removeNotification(notification.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
