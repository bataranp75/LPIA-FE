// src/scripts/config/index.js

// Cek apakah web sedang dibuka di localhost
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const CONFIG = {
    // Jika di localhost, coba BE lokal dulu, baru Railway. Jika di production, sebaliknya.
    API_TARGETS: isLocalhost 
        ? ['http://localhost:3000/api/v1', 'https://lpia-backend-deploy.up.railway.app/api/v1']
        : ['https://lpia-backend-deploy.up.railway.app/api/v1', 'http://localhost:3000/api/v1'],
        
    STORAGE_KEY: 'lpia_user_token',
    USER_INFO: 'lpia_user_data'
};