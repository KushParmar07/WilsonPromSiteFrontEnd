// src/api/axiosConfig.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000', // Your Flask backend URL
  withCredentials: true // Crucial: Send cookies with every request
});

// Optional: Add interceptors for global error handling (e.g., redirect on 401)
apiClient.interceptors.response.use(
  response => response, // Pass through successful responses
  error => {
    if (error.response && error.response.status === 401) {
      // Log the error. Components should handle the redirect.
      console.error("Axios interceptor: Received 401 Unauthorized");
      // Example: Force redirect (can sometimes cause issues if multiple redirects happen)
      // const loginPath = window.location.pathname.includes('admin') ? '/admin-login' : '/';
      // if (window.location.pathname !== loginPath) {
      //    window.location.href = loginPath;
      // }
    }
    return Promise.reject(error); // Pass the error along
  }
);

export default apiClient;
