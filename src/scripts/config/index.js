// src/scripts/config/index.js

// Cek apakah web sedang dibuka di localhost
// Paksa URL production tanpa fallback untuk memastikan Astro menggunakan URL baru
const API_URL = "https://lms-backend-production-c723.up.railway.app/api/v1";

export const CONFIG = {
  API_TARGETS: [API_URL],
  STORAGE_KEY: "lpia_user_token",
  USER_INFO: "lpia_user_data",
};
