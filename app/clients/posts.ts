import axios from 'axios';
import type { Post } from '../types/api';

const API_BASE_URL = 'https://api.monitor.gaulatti.com';

export const postsAPI = {
  async getAllPosts(): Promise<Post[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/posts`);
      return response.data;
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  },

  async getPostsByCategory(category: string): Promise<Post[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/posts`, {
        params: { category }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching posts for category ${category}:`, error);
      throw error;
    }
  }
};
