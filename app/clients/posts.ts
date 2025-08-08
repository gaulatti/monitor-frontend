import axios from 'axios';
import type { Post, Event } from '../types/api';

const API_BASE_URL = 'https://api.monitor.gaulatti.com';

export interface PostsParams {
  limit?: number;
  before?: string;
  categories?: string;
}

export const postsAPI = {
  async getAllPosts(params?: PostsParams): Promise<Post[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/posts`, {
        params: params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  },

  async getPostsByCategory(category: string, params?: PostsParams): Promise<Post[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/posts`, {
        params: { 
          categories: category,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching posts for category ${category}:`, error);
      throw error;
    }
  },

  async getAllEvents(): Promise<Event[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/events`);
      return response.data.events || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }
};
