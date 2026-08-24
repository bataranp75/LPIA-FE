import { CONFIG } from '../config/index.js';
import { AppConfirmModal } from './appConfirmModal.js';

export const LogoutButton = {
    init() {
        const btn = document.getElementById('admin-logout-btn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            AppConfirmModal.open({
                title: 'Keluar dari Dashboard?',
                message: 'Apakah Anda yakin ingin keluar dari akun ini? Anda harus login kembali untuk mengakses dashboard.',
                type: 'danger',
                confirmText: 'Logout',
                cancelText: 'Batalkan',
                onConfirm: () => {
                    localStorage.removeItem(CONFIG.STORAGE_KEY);
                    localStorage.removeItem(CONFIG.USER_INFO);
                    window.location.href = '/login';
                }
            });
        });
    }
};
