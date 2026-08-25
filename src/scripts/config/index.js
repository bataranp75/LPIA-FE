// src/scripts/config/index.js

// Cek apakah web sedang dibuka di localhost
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
   window.location.hostname === "127.0.0.1");

// Membaca variabel dari Railway (Astro import.meta.env)
const envApiUrl = import.meta.env.PUBLIC_API_URL;
const fallbackUrl = "https://lms-backend-production-c723.up.railway.app/api/v1";

export const CONFIG = {
  API_TARGETS: isLocalhost
    ? ["http://localhost:3000/api/v1"]
    : [envApiUrl || fallbackUrl],

  STORAGE_KEY: "lpia_user_token",
  USER_INFO: "lpia_user_data",
};
