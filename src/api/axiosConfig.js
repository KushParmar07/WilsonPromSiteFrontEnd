// src/api/axiosConfig.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000', // Your backend URL
  withCredentials: true // Send cookies with requests
});

// Optional: Global error handler for 401 Unauthorized
apiClient.interceptors.response.use(
  response => response, // Pass through successful responses
  error => {
    if (error.response && error.response.status === 401) {
      // Log the error. Components should handle the redirect.
      console.error("Axios interceptor: Received 401 Unauthorized");
    }
    return Promise.reject(error); // Pass the error along
  }
);

export default apiClient;
