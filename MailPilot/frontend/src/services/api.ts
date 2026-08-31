import axios from 'axios';

// Get API URL from env, default to local backend if not set
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Crucial for sending/receiving HTTP-Only cookies
});

// Generic error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Optionally trigger global toast notifications here or handle 401s (e.g. redirect to login)
    if (error.response?.status === 401) {
      // Clear any frontend state if necessary. 
      // Redirection is usually handled in the React Context or components, but can be done here.
    }
    return Promise.reject(error);
  }
);
