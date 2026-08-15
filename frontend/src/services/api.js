import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:9000";

// Creating axios object preconfigured for API server
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default api;
