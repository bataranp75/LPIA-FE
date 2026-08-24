// Satu sumber data profil guru untuk sidebar, dashboard, dan halaman profil.
// Sumber kebenaran: tabel profiles via GET /teacher/:id/profile.
// localStorage (lpia_user_data) hanya cache; setiap perubahan disiarkan
// lewat event "lpia:profile-updated" agar semua komponen ikut ter-update
// tanpa reload halaman.

import { HTTP } from '../fetch/http.js';
import { CONFIG } from '../config/index.js';

export const PROFILE_UPDATED_EVENT = 'lpia:profile-updated';

export const ProfileStore = {
    getCached() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.USER_INFO) || '{}');
        } catch {
            return {};
        }
    },

    // Merge data profil baru ke cache lalu siarkan ke seluruh halaman.
    applyUpdate(profileData = {}) {
        const current = this.getCached();

        const next = {
            ...current,
            ...(profileData.full_name !== undefined ? { full_name: profileData.full_name } : {}),
            ...(profileData.avatar_url !== undefined ? { avatar_url: profileData.avatar_url } : {}),
            ...(profileData.email !== undefined ? { email: profileData.email } : {}),
            ...(profileData.role !== undefined ? { role: profileData.role } : {})
        };

        localStorage.setItem(CONFIG.USER_INFO, JSON.stringify(next));

        window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: next }));

        return next;
    },

    // Ambil profil terbaru dari server (sumber kebenaran) lalu sinkronkan cache.
    async refresh(teacherId) {
        const id = teacherId || this.getCached().id;
        if (!id) return null;

        const response = await HTTP.get(`/teacher/${id}/profile`);
        return this.applyUpdate(response.data || {});
    },

    subscribe(callback) {
        const handler = event => callback(event.detail || this.getCached());
        window.addEventListener(PROFILE_UPDATED_EVENT, handler);
        return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handler);
    }
};
