// src/scripts/dom/authPage.js
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
        // Gunakan event delegation atau pastikan elemen ada
        const toggleBtns = document.querySelectorAll('.toggle-auth');
        toggleBtns.forEach(btn => {
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
        const toggleText = document.querySelector('.toggle-auth');
        const toggleContainer = toggleText?.parentElement;

        if (this.isLogin) {
            this.authTitle.innerText = 'Masuk ke LPIA';
            this.submitBtn.innerText = 'Masuk';
            nameField?.classList.add('hidden');
            if(nameField) nameField.querySelector('input').removeAttribute('required');
            
            // Perbarui class Tailwind pada link
            if(toggleContainer) toggleContainer.innerHTML = 'Belum punya akun? <a href="#" class="toggle-auth text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors">Daftar Sekarang</a>';
        } else {
            this.authTitle.innerText = 'Daftar Akun Baru';
            this.submitBtn.innerText = 'Daftar';
            nameField?.classList.remove('hidden');
            if(nameField) nameField.querySelector('input').setAttribute('required', 'true');
            
            // Perbarui class Tailwind pada link
            if(toggleContainer) toggleContainer.innerHTML = 'Sudah punya akun? <a href="#" class="toggle-auth text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors">Masuk Sekarang</a>';
        }

        // Re-attach listener karena innerHTML diubah
        this.addEventListeners();
    },

    async handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(this.form);
        const payload = Object.fromEntries(formData.entries());

        if (!this.isLogin && payload.password.length < 8) {
            return Swal.fire({
                title: 'Password Lemah',
                text: 'Supaya akunmu aman, gunakan password minimal 8 karakter ya.',
                icon: 'warning',
                confirmButtonColor: '#2563eb' // Warna biru Tailwind (blue-600)
            });
        }

        try {
            this.setLoading(true);
            const endpoint = this.isLogin ? '/auth/login' : '/auth/register';
            
            const response = await HTTP.post(endpoint, payload);

            if (response.status === 'success' || response.message?.includes('berhasil')) {
                if (this.isLogin) {
                    localStorage.setItem(CONFIG.STORAGE_KEY, response.access_token);
                    localStorage.setItem(CONFIG.USER_INFO, JSON.stringify(response.user));

                    Swal.fire({
                        title: 'Berhasil Masuk!', 
                        text: `Selamat datang kembali, ${response.user.full_name}`, 
                        icon: 'success',
                        confirmButtonColor: '#2563eb'
                    }).then(() => window.location.href = '/');
                } else {
                    Swal.fire({
                        title: 'Pendaftaran Berhasil!', 
                        text: 'Silakan masuk menggunakan akun baru kamu.', 
                        icon: 'success',
                        confirmButtonColor: '#2563eb'
                    }).then(() => {
                        this.isLogin = true;
                        this.form.reset();
                        this.updateUI();
                    });
                }
            }
        } catch (error) {
            // ─────────────────────────────────────────────────────────
            //  SMART ERROR FALLBACK MAPPER
            // ─────────────────────────────────────────────────────────
            let friendlyTitle = 'Ups, Terjadi Kesalahan';
            let friendlyMessage = 'Gagal terhubung ke server. Pastikan koneksi internetmu lancar dan coba lagi.';
            
            // Ubah ke huruf kecil semua agar lebih mudah dideteksi
            const errorStr = (error.message || '').toLowerCase();

            if (errorStr.includes('email atau password salah') || errorStr.includes('invalid login credentials') || errorStr.includes('belum dikonfirmasi')) {
                friendlyTitle = 'Gagal Masuk';
                friendlyMessage = 'Email atau password yang kamu masukkan sepertinya keliru. Jika kamu baru saja mendaftar, pastikan kamu sudah mengklik link verifikasi di kotak masuk emailmu ya.';
            } 
            else if (errorStr.includes('sudah terdaftar') || errorStr.includes('already registered')) {
                friendlyTitle = 'Email Sudah Terdaftar';
                friendlyMessage = 'Email ini sudah memiliki akun. Silakan pindah ke halaman "Masuk" untuk melanjutkan.';
            }
            else if (errorStr.includes('password minimal')) {
                friendlyTitle = 'Password Kurang Kuat';
                friendlyMessage = 'Pastikan kamu menggunakan minimal 8 karakter untuk password barumu.';
            }
            else if (errorStr.trim() !== '') {
                // Jika error tidak masuk kategori di atas tapi ada isinya, tampilkan aslinya
                friendlyMessage = error.message;
            }

            Swal.fire({
                title: friendlyTitle,
                text: friendlyMessage,
                icon: 'error',
                confirmButtonText: 'Oke, Saya Paham',
                confirmButtonColor: '#dc2626' // Warna merah Tailwind (red-600) untuk error
            });

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