import axios from 'axios';
import type { Event } from '../types/api';

const API_BASE_URL = 'https://api.monitor.gaulatti.com';

export class EventsAPI {
  /**
   * Get all events
   */
  async getAllEvents(limit?: number): Promise<Event[]> {
    try {
      const params = limit ? { limit } : {};
      const response = await axios.get(`${API_BASE_URL}/events`, { params });
      return response.data.events || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  /**
   * Get a specific event by UUID
   */
  async getEventByUuid(uuid: string): Promise<Event> {
    try {
      const response = await axios.get(`${API_BASE_URL}/events/${uuid}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching event ${uuid}:`, error);
      throw error;
    }
  }

  /**
   * Update event status
   */
  async updateEventStatus(uuid: string, status: 'open' | 'archived' | 'dismissed'): Promise<Event> {
    try {
      const response = await axios.put(`${API_BASE_URL}/events/${uuid}/status`, { status });
      return response.data;
    } catch (error) {
      console.error(`Error updating event status for ${uuid}:`, error);
      throw error;
    }
  }

  /**
   * Process cluster (group similar posts into events)
   */
  async processCluster(posts: string[]): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/events/cluster`, { 
        input: { posts } 
      });
      return response.data;
    } catch (error) {
      console.error('Error processing cluster:', error);
      throw error;
    }
  }

  /**
   * Get notification service health
   */
  async getNotificationHealth(): Promise<{ healthy: boolean; connectionCount: number; isConnected: boolean }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/notifications/health`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notification health:', error);
      throw error;
    }
  }
}

export const eventsAPI = new EventsAPI();
