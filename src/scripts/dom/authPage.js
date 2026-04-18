import { HTTP } from '../fetch/http.js';
import { CONFIG } from '../config/index.js';
import Swal from 'sweetalert2';

export const AuthDOM = {
    init() {
        this.form = document.getElementById('auth-form');
        this.authTitle = document.getElementById('auth-title');
        this.submitBtn = document.getElementById('submit-btn');
        this.isLogin = true;

        if (this.form) {
            this.addEventListeners();
        }
    },

    addEventListeners() {
        // Toggle Login/Register
        document.querySelectorAll('.toggle-auth').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.isLogin = !this.isLogin;
                this.updateUI();
            });
        });

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    },

    updateUI() {
        const nameField = document.getElementById('name-field');
        if (this.isLogin) {
            this.authTitle.innerText = 'Masuk ke LPIA';
            this.submitBtn.innerText = 'Masuk';
            nameField?.classList.add('hidden');
        } else {
            this.authTitle.innerText = 'Daftar Akun Baru';
            this.submitBtn.innerText = 'Daftar';
            nameField?.classList.remove('hidden');
        }
    },

// src/scripts/dom/authPage.js

async handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(this.form);
    const payload = Object.fromEntries(formData.entries());

    // Hanya validasi 8 karakter jika user sedang DAFTAR (Register)
    if (!this.isLogin && payload.password.length < 8) {
        return Swal.fire('Peringatan', 'Password baru minimal 8 karakter.', 'warning');
    }

    try {
        this.setLoading(true);
        const endpoint = this.isLogin ? '/auth/login' : '/auth/register';
        
        // Memanggil HTTP wrapper
        const response = await HTTP.post(endpoint, payload);

        if (response.status === 'success') {
            // Gunakan property sesuai authController (access_token & user)
            localStorage.setItem(CONFIG.STORAGE_KEY, response.access_token);
            localStorage.setItem(CONFIG.USER_INFO, JSON.stringify(response.user));

            Swal.fire('Berhasil!', `Selamat datang, ${response.user.full_name}`, 'success')
                .then(() => window.location.href = '/');
        }
    } catch (error) {
        // Tampilkan error 401 atau error validasi dari server
        Swal.fire('Gagal', error.message || 'Cek email dan password kamu', 'error');
    } finally {
        this.setLoading(false);
    }
},

    setLoading(state) {
        if (!this.submitBtn) return;
        this.submitBtn.disabled = state;
        this.submitBtn.innerHTML = state ? 
            '<i class="fas fa-spinner fa-spin mr-2"></i> Memproses...' : 
            (this.isLogin ? 'Masuk' : 'Daftar');
    }
};