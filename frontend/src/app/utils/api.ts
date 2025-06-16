import axios from "axios";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001",
});

API.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    console.log("Interceptor token:", token);  // <-- add this
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


export default API;