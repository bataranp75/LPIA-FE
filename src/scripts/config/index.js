// src/scripts/config/index.js

// Cek apakah web sedang dibuka di localhost
// Paksa URL production tanpa fallback untuk memastikan Astro menggunakan URL baru
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
   window.location.hostname === "127.0.0.1");

// Mengambil URL dari variabel Railway, dengan fallback ke URL Backend Production
const envApiUrl = import.meta.env.PUBLIC_API_URL;
const productionApiUrl = "https://lms-backend-production-c723.up.railway.app/api/v1";

export const CONFIG = {
  API_TARGETS: isLocalhost
    ? ["http://localhost:3000/api/v1"]
    : [envApiUrl || productionApiUrl],

  STORAGE_KEY: "lpia_user_token",
  USER_INFO: "lpia_user_data",
};