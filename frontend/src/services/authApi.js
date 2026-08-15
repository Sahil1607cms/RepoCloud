import axios from "axios";

export default axios.create({
  baseURL: import.meta.env.VITE_AUTH_URL || import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
});