import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

//creating axios object which is preconfigured
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
//benefit api.get("/api/user") instead of axios.get("http://localhost:3000/api/user");

export default api;
