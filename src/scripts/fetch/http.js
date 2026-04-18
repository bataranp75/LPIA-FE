import { CONFIG } from '../config/index.js';

export const HTTP = {
    // Variabel internal untuk menyimpan API mana yang "hidup"
    activeBaseUrl: null,

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const token = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // 1. Tentukan target URL (Gunakan yang sudah terdeteksi aktif, atau mulai dari Production)
        const targets = this.activeBaseUrl 
            ? [this.activeBaseUrl] 
            : [CONFIG.PRODUCTION_API, CONFIG.LOCAL_API];

        for (const baseUrl of targets) {
            try {
                const response = await fetch(`${baseUrl}${endpoint}`, { 
                    ...options, 
                    headers 
                });

                // Jika berhasil, simpan baseUrl ini sebagai yang aktif agar request berikutnya cepat
                this.activeBaseUrl = baseUrl;
                
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                return await response.json();

            } catch (error) {
                // Jika ini adalah target terakhir dan masih gagal, baru lempar error
                if (baseUrl === targets[targets.length - 1]) {
                    console.error('All API targets failed:', error);
                    throw error;
                }
                console.warn(`Gagal terhubung ke ${baseUrl}, mencoba fallback...`);
            }
        }
    },

    get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
    post(endpoint, data) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) }); },
    put(endpoint, data) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }); },
    delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};