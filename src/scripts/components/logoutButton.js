import { CONFIG } from '../config/index.js';

export const LogoutButton = {
    init() {
        const btn = document.getElementById('admin-logout-btn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
            localStorage.removeItem(CONFIG.USER_INFO);
            window.location.href = '/login';
        });
    }
};