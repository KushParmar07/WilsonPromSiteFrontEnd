// src/api/axiosConfig.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000', // Replace with your backend URL
  withCredentials: true 
});

apiClient.interceptors.response.use(
  response => response, 
  error => {
    if (error.response && error.response.status === 401) { 
      console.error("Axios interceptor: Received 401 Unauthorized");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
