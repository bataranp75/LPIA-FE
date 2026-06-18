// src/scripts/fetch/http.js
import { CONFIG } from "../config/index.js";

export const HTTP = {
  activeBaseUrl: null,

  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const token = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const targets = this.activeBaseUrl
      ? [this.activeBaseUrl]
      : CONFIG.API_TARGETS;

    for (let i = 0; i < targets.length; i++) {
      const baseUrl = targets[i];

      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          ...options,
          headers,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const error = new Error(
            data.message || `HTTP Error: ${response.status}`,
          );
          error.status = response.status;
          error.data = data;
          throw error;
        }

        this.activeBaseUrl = baseUrl;
        return data;
      } catch (error) {
        if (error.status) {
          throw error;
        }

        if (i === targets.length - 1) {
          throw error;
        }

        console.warn(`Gagal terhubung ke ${baseUrl}, mencoba fallback...`);
      }
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  },

  post(endpoint, data) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  put(endpoint, data) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  patch(endpoint, data) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  },
};
