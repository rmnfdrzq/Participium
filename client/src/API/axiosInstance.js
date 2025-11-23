import axios from "axios";

const SERVER_URL = "http://localhost:3001";

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: SERVER_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Can add tokens or other logic before request
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Return data directly
    return response.data;
  },
  async (error) => {
    // Error handling
    if (error.response) {
      // Server responded with error code
      const errorData = error.response.data;

      // If error field exists, throw it (as in original code)
      if (errorData?.error) {
        throw errorData.error;
      }

      // If errorData is a string, throw it
      if (typeof errorData === "string") {
        throw errorData;
      }

      // If errorData is an object, throw it entirely (for getUserInfo)
      if (typeof errorData === "object") {
        throw errorData;
      }

      // In other cases, throw Error
      throw new Error(error.response.statusText);
    } else if (error.request) {
      // Request was sent but no response received
      throw new Error("Network error: No response from server");
    } else {
      // Error in request setup
      throw error;
    }
  }
);

export default axiosInstance;
