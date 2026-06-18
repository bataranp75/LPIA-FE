// src/scripts/dom/profilePage.js
import { HTTP } from '../fetch/http.js';
import { Fallback } from '../utils/fallback.js';
import Swal from 'sweetalert2';
import { CONFIG } from '../config/index.js';

export const ProfileDOM = {
    allData: { courses: [], transactions: [], certificates: [] },

    init() {
        const page = document.getElementById('profile-page');
        if (!page) return;

        const token = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (!token) {
            window.location.href = '/login';
            return;
        }

        this.initTabs();
        this.initProfileUpdate();
        this.initSearchFilters();
        this.initDangerZone();
        this.initLogout(); 
        this.initMobileMenu();
        
        // Load data initial
        this.loadProfileData();
        this.loadMyCourses();
        this.loadMyCertificates();
        this.loadTransactions();
    },

    // ─────────────────────────────────────────────────────────
    //  UI & TABS LOGIC
    // ─────────────────────────────────────────────────────────
    initMobileMenu() {
        const toggleBtn = document.getElementById('mobile-menu-toggle');
        const nav = document.getElementById('profile-nav');
        const icon = document.getElementById('mobile-menu-icon');

        if (toggleBtn && nav) {
            toggleBtn.addEventListener('click', () => {
                nav.classList.toggle('hidden');
                nav.classList.toggle('flex');
                icon.classList.toggle('rotate-180');
            });
        }
    },

initTabs() {
        const tabs = document.querySelectorAll('.profile-tab:not(#btn-logout-profile)');
        const sections = document.querySelectorAll('.profile-section');
        const nav = document.getElementById('profile-nav');
        const mobileText = document.getElementById('mobile-menu-text');
        const mobileIcon = document.getElementById('mobile-menu-icon');

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetId = e.currentTarget.dataset.target;
                const text = e.currentTarget.dataset.text;
                const iconClass = e.currentTarget.dataset.icon;

                // Update teks dan icon pada tombol dropdown mobile
                if (mobileText && text && iconClass) {
                    mobileText.innerHTML = `<i class="fas ${iconClass} w-5 text-center"></i> ${text}`;
                }

                // Tutup dropdown otomatis di mode mobile setelah menu diklik
                if (window.innerWidth < 1024 && nav) { // 1024px adalah breakpoint lg di Tailwind
                    nav.classList.add('hidden');
                    nav.classList.remove('flex');
                    mobileIcon?.classList.remove('rotate-180');
                }

                // Logika ganti tab Danger Zone
                if(targetId === 'section-danger') {
                    sections.forEach(sec => sec.classList.add('hidden'));
                    document.getElementById(targetId)?.classList.remove('hidden');
                    return;
                }

                // Reset warna semua tab biasa (menggunakan w-full)
                tabs.forEach(t => {
                    if (t.dataset.target !== 'section-danger') {
                        t.className = 'profile-tab flex items-center gap-3 px-4 py-3.5 text-left rounded-xl transition-all font-bold text-sm w-full text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent';
                    }
                });

                // Set tab aktif
                e.currentTarget.className = 'profile-tab flex items-center gap-3 px-4 py-3.5 text-left rounded-xl transition-all font-bold text-sm w-full text-blue-700 bg-blue-50 border border-blue-100 shadow-sm';

                // Tampilkan section
                sections.forEach(sec => sec.classList.add('hidden'));
                document.getElementById(targetId)?.classList.remove('hidden');
            });
        });
    },

    updateBannerStyle(level) {
        const banner = document.getElementById('profile-banner');
        const bgIcon = document.getElementById('banner-bg-icon');
        const levelBadge = document.getElementById('user-display-level-badge');
        
        const config = {
            beginner: { color: 'bg-blue-600', icon: 'fa-user-graduate', badge: 'bg-white/20' },
            amateur:  { color: 'bg-indigo-600', icon: 'fa-user-tie', badge: 'bg-yellow-400/30' },
            pro:      { color: 'bg-slate-900', icon: 'fa-crown', badge: 'bg-blue-500/40' }
        };

        const style = config[level?.toLowerCase()] || config.beginner;
        banner.className = `${style.color} rounded-3xl p-10 mb-8 text-white shadow-lg relative overflow-hidden flex items-center gap-6 transition-all duration-500`;
        bgIcon.innerHTML = `<i class="fas ${style.icon}"></i>`;
        levelBadge.className = `inline-flex items-center gap-2 ${style.badge} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm`;
    },

    // ─────────────────────────────────────────────────────────
    //  DATA FETCHING & RENDER (Dengan Penanganan Error 401)
    // ─────────────────────────────────────────────────────────
    handleAuthError(error) {
        if (error.message.includes('401') || error.message.includes('Token')) {
            Swal.fire('Sesi Habis', 'Sesi login kamu sudah berakhir atau tidak valid. Silakan login kembali.', 'warning').then(() => {
                localStorage.clear();
                window.location.href = '/login';
            });
        } else {
            console.error(error);
        }
    },

    async loadProfileData() {
        try {
            const response = await HTTP.get('/users/profile');
            const user = response.data;
            
            document.getElementById('user-display-name').innerText = user.full_name;
            document.getElementById('user-level-text').innerText = user.current_level;
            document.getElementById('input-full-name').value = user.full_name;
            document.getElementById('input-email').value = JSON.parse(localStorage.getItem(CONFIG.USER_INFO) || '{}').email;
            
            this.updateBannerStyle(user.current_level);
        } catch (error) { this.handleAuthError(error); }
    },

    async loadMyCourses() {
        const container = document.getElementById('my-courses-list');
        if (!container) return;
        container.innerHTML = Fallback.skeletonCards(2);

        try {
            const response = await HTTP.get('/users/my-courses');
            this.allData.courses = response.data;
            this.renderCourses(this.allData.courses);
        } catch (error) { 
            this.handleAuthError(error);
            container.innerHTML = Fallback.errorState('Gagal memuat kursus Anda.'); 
        }
    },

    renderCourses(data) {
        const container = document.getElementById('my-courses-list');
        if (!data || data.length === 0) {
            container.innerHTML = Fallback.emptyState('Tidak ada kursus yang ditemukan.', 'fa-box-open');
            container.classList.remove('md:grid-cols-2');
            return;
        }
        container.classList.add('md:grid-cols-2');
        container.innerHTML = data.map(trx => {
            const course = trx.courses;
            return `
                <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div class="h-36 bg-slate-100 relative overflow-hidden">
                        <img src="${course.thumbnail_url || Fallback.defaultImage}" onerror="${Fallback.imageOnError()}" alt="${course.title}" class="w-full h-full object-cover">
                        <div class="absolute top-3 left-3 bg-white/90 backdrop-blur text-blue-700 text-xs font-bold px-2 py-1 rounded shadow-sm uppercase">${course.category || 'Kelas'}</div>
                    </div>
                    <div class="p-5 flex flex-col flex-grow">
                        <h3 class="font-bold text-slate-900 text-lg mb-2 line-clamp-2">${course.title}</h3>
                        <p class="text-sm text-slate-500 mb-6 line-clamp-2 flex-grow">${course.description || 'Lanjutkan progres belajarmu di sini.'}</p>
                        <a href="/courses/${course.id}/learn" class="w-full inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 px-4 py-2.5 text-sm bg-blue-600 text-white shadow-[0_3px_0_0_#1e40af] hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none border border-blue-700">
                            Mulai Belajar <i class="fas fa-play text-xs ml-1"></i>
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    },

    async loadMyCertificates() {
        const container = document.getElementById('my-certificates-list');
        if (!container) return;
        container.innerHTML = `<div class="animate-pulse h-24 bg-slate-100 rounded-xl"></div>`;

        try {
            const response = await HTTP.get('/users/my-certificates');
            this.allData.certificates = response.data;
            this.renderCertificates(this.allData.certificates);
        } catch (error) { this.handleAuthError(error); }
    },

    renderCertificates(data) {
        const container = document.getElementById('my-certificates-list');
        if (!data || data.length === 0) {
            container.innerHTML = Fallback.emptyState('Belum ada sertifikat.', 'fa-award');
            return;
        }
        container.innerHTML = data.map(cert => `
            <div class="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between hover:border-blue-300 transition-colors">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center text-2xl border border-yellow-200 shadow-sm"><i class="fas fa-medal"></i></div>
                    <div>
                        <h4 class="font-bold text-slate-900">${cert.courses?.title || 'Sertifikat Kelulusan'}</h4>
                        <p class="text-sm text-slate-500">Diterbitkan: ${new Date(cert.issued_at).toLocaleDateString('id-ID')}</p>
                    </div>
                </div>
                <a href="${cert.certificate_url}" target="_blank" class="px-4 py-2 text-sm bg-white border border-slate-200 text-slate-700 font-bold rounded-lg shadow-[0_3px_0_0_#e5e7eb] hover:text-blue-600 hover:-translate-y-0.5 transition-all">Unduh PDF</a>
            </div>
        `).join('');
    },

    async loadTransactions() {
        try {
            const res = await HTTP.get('/users/transactions');
            this.allData.transactions = res.data;
            this.renderTransactions(res.data);
        } catch (error) { this.handleAuthError(error); }
    },

    renderTransactions(data) {
        const body = document.getElementById('transaction-table-body');
        if (!body) return;
        if (!data || data.length === 0) {
            // Ubah colspan menjadi 3 karena Order ID dihapus
            body.innerHTML = `<tr><td colspan="3" class="text-center py-6 text-slate-500 text-sm">Tidak ada transaksi ditemukan.</td></tr>`;
            return;
        }
        body.innerHTML = data.map(t => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="py-4 font-bold text-slate-800">${t.courses?.title || 'Produk'}</td>
                <td class="py-4">
                    <span class="px-2 py-1 rounded-md text-[10px] font-black uppercase ${t.status_pembayaran === 'success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${t.status_pembayaran}</span>
                </td>
                <td class="py-4 font-bold text-blue-600">Rp ${parseInt(t.amount).toLocaleString()}</td>
            </tr>
        `).join('');
    },
    // ─────────────────────────────────────────────────────────
    //  INTERACTIONS (SEARCH, UPDATE, DELETE, LOGOUT)
    // ─────────────────────────────────────────────────────────
    initSearchFilters() {
        const sections = ['kursus', 'sertifikat', 'riwayat'];
        sections.forEach(s => {
            const container = document.getElementById(`search-container-${s}`);
            const temp = document.getElementById('search-filter-template');
            if (container && temp) {
                container.appendChild(temp.content.cloneNode(true));
                const input = container.querySelector('.search-input');
                input.addEventListener('input', (e) => this.handleSearch(s, e.target.value));
            }
        });
    },

    handleSearch(type, query) {
        const q = query.toLowerCase();
        if (type === 'kursus') {
            const filtered = this.allData.courses.filter(c => c.courses?.title?.toLowerCase().includes(q));
            this.renderCourses(filtered);
        } else if (type === 'sertifikat') {
            const filtered = this.allData.certificates.filter(c => c.courses?.title?.toLowerCase().includes(q));
            this.renderCertificates(filtered);
        } else if (type === 'riwayat') {
            const filtered = this.allData.transactions.filter(t => t.courses?.title?.toLowerCase().includes(q) || t.order_id.toLowerCase().includes(q));
            this.renderTransactions(filtered);
        }
    },

    initProfileUpdate() {
        document.getElementById('form-update-profile')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = document.getElementById('input-full-name').value;
            try {
                const res = await HTTP.put('/users/update', { full_name: newName });
                if (res.status === 'success') {
                    Swal.fire('Berhasil', 'Profilmu sudah diperbarui!', 'success');
                    
                    // Update cache nama di localStorage
                    const localData = JSON.parse(localStorage.getItem(CONFIG.USER_INFO));
                    localData.full_name = newName;
                    localStorage.setItem(CONFIG.USER_INFO, JSON.stringify(localData));
                    
                    this.loadProfileData();
                }
            } catch (error) { Swal.fire('Gagal', error.message, 'error'); }
        });
    },

    initLogout() {
        document.getElementById('btn-logout-profile')?.addEventListener('click', () => {
            Swal.fire({
                title: 'Yakin mau keluar?',
                text: 'Kamu harus login lagi nanti untuk mengakses profil.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#94a3b8',
                confirmButtonText: 'Ya, Keluar',
                cancelButtonText: 'Batal',
                reverseButtons: true
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.clear();
                    window.location.href = '/login';
                }
            });
        });
    },

    initDangerZone() {
        document.getElementById('btn-delete-account')?.addEventListener('click', () => {
            Swal.fire({
                title: 'Hapus Akun Selamanya?',
                text: 'Semua data belajar akan hangus. Masukkan kata "HAPUS" untuk konfirmasi.',
                input: 'text',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                confirmButtonText: 'Ya, Hapus',
                preConfirm: (value) => {
                    if (value !== 'HAPUS') Swal.showValidationMessage('Teks konfirmasi salah!');
                    return value === 'HAPUS';
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await HTTP.delete('/users/delete');
                        localStorage.clear();
                        window.location.href = '/';
                    } catch (e) { Swal.fire('Error', e.message, 'error'); }
                }
            });
        });
    }
};