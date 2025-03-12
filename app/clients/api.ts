import { fetchAuthSession } from 'aws-amplify/auth';
import axios from 'axios';
import { useEffect, useState } from 'react';

export enum Method {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

/**
 * Sends an HTTP request using the specified method, URL, and data.
 *
 * @param {Method} method - The HTTP method to use for the request (GET, POST, PUT, PATCH, DELETE).
 * @param {string} [url=''] - The URL to which the request is sent. Defaults to an empty string.
 * @param {any} [data] - The data to be sent with the request. Optional.
 * @returns {Promise<any>} - A promise that resolves to the response data.
 * @throws {Error} - Throws an error if the HTTP method is unsupported or if the request fails.
 */
const sendRequest = async (method: Method, url: string = '', data?: any) => {
  const { tokens } = await fetchAuthSession();
  const fullURL = window.location.origin.includes('localhost') ? `http://localhost:${import.meta.env.VITE_API_PORT}/${url}` : `${import.meta.env.VITE_API_FQDN}/${url}`;

  const config = {
    headers: {
      Authorization: tokens?.idToken && `Bearer ${tokens!.idToken}`,
    },
  };

  try {
    let response;
    switch (method) {
      case Method.GET:
        response = await axios.get(fullURL, { params: data, ...config });
        break;
      case Method.POST:
        response = await axios.post(fullURL, data, config);
        break;
      case Method.PUT:
        response = await axios.put(fullURL, data, config);
        break;
      case Method.PATCH:
        response = await axios.patch(fullURL, data, config);
        break;
      case Method.DELETE:
        response = await axios.delete(fullURL, config);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
    return response.data;
  } catch (error) {
    console.error(`Error in sendRequest (${method} ${url}):`, error);
    throw error;
  }
};

/**
 * Custom hook to make API requests.
 *
 * @param {Method} method - The HTTP method to use for the request (e.g., 'GET', 'POST').
 * @param {any[]} dependencies - Array of dependencies that will trigger the effect when changed.
 * @param {string} [url] - The URL to send the request to.
 * @param {any} [postData] - The data to send with the request, if applicable.
 * @returns {{ data: any, loading: boolean, error: Error | any }} - An object containing the response data, loading state, and error state.
 */
const useAPI = (method: Method, dependencies: any[], url?: string, postData?: any) => {
  const [data, setData] = useState<any>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await sendRequest(method, url, postData);
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, method, postData, ...dependencies]);

  return { data, loading, error };
};

export { sendRequest, useAPI };
