import { HTTP } from '../fetch/http.js';
import Swal from 'sweetalert2';

export const LandingDOM = {
    init() {
        this.handleAuthDisplay();
        this.fetchAndRenderCourses();
        this.fetchAndRenderStats();
    },

    // ─────────────────────────────────────────────────────────
    //  STATS BAR (ambil dari DB: total siswa aktif, total kursus, avg rating)
    // ─────────────────────────────────────────────────────────
    async fetchAndRenderStats() {
        const statsBar = document.getElementById('stats-bar');
        if (!statsBar) return;

        try {
            const response = await HTTP.get('/stats/landing');
            const { total_students, total_courses, avg_rating } = response.data;

            statsBar.innerHTML = `
                <div class="bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 text-center">
                    <div class="text-2xl font-black text-primary">${total_students.toLocaleString('id-ID')}+</div>
                    <div class="text-xs font-bold text-gray-500">Siswa Aktif</div>
                </div>
                <div class="bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 text-center">
                    <div class="text-2xl font-black text-yellow-500">${total_courses}</div>
                    <div class="text-xs font-bold text-gray-500">Kursus Tersedia</div>
                </div>
                <div class="bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 text-center">
                    <div class="text-2xl font-black text-green-600">${parseFloat(avg_rating).toFixed(1)} ⭐</div>
                    <div class="text-xs font-bold text-gray-500">Rating Siswa</div>
                </div>
            `;
        } catch (error) {
            // Fallback jika endpoint belum tersedia
            console.warn('Stats endpoint belum tersedia, menggunakan fallback.');
            statsBar.innerHTML = `
                <div class="bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 text-center">
                    <div class="text-2xl font-black text-primary">—</div>
                    <div class="text-xs font-bold text-gray-500">Siswa Aktif</div>
                </div>
                <div class="bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 text-center">
                    <div class="text-2xl font-black text-yellow-500">—</div>
                    <div class="text-xs font-bold text-gray-500">Kursus Tersedia</div>
                </div>
                <div class="bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 text-center">
                    <div class="text-2xl font-black text-green-600">—</div>
                    <div class="text-xs font-bold text-gray-500">Rating Siswa</div>
                </div>
            `;
        }
    },

    // ─────────────────────────────────────────────────────────
    //  COURSES LIST
    // ─────────────────────────────────────────────────────────
    async fetchAndRenderCourses() {
        const courseContainer = document.getElementById('course-list');
        if (!courseContainer) return;

        try {
            const response = await HTTP.get('/courses');
            const courses = response.data;

            if (!courses || courses.length === 0) {
                courseContainer.innerHTML = `
                    <p class="text-center col-span-3 text-gray-400 font-bold py-12">
                        Belum ada kursus tersedia.
                    </p>`;
                return;
            }

            courseContainer.innerHTML = courses.map(course => `
                <div class="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:-translate-y-1 transition-transform group">
                    <div class="w-full h-44 bg-blue-50 overflow-hidden">
                        <img
                            src="${course.thumbnail_url || 'https://placehold.co/400x220/dbeafe/3b82f6?text=LPIA'}"
                            alt="${course.title}"
                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                        />
                    </div>
                    <div class="p-5">
                        <span class="inline-block bg-blue-100 text-primary text-xs font-bold px-2 py-1 rounded-md mb-3">
                            ${course.category || 'General'}
                        </span>
                        <h3 class="text-lg font-black text-gray-900 mb-1 group-hover:text-primary transition-colors line-clamp-2">
                            ${course.title}
                        </h3>
                        <p class="text-gray-500 text-sm mb-4 line-clamp-2">${course.description || ''}</p>
                        <div class="flex justify-between items-center pt-3 border-t-2 border-dashed border-gray-100">
                            <span class="font-black text-primary text-lg">
                                ${course.price == 0 ? 'GRATIS' : 'Rp ' + parseInt(course.price).toLocaleString('id-ID')}
                            </span>
                            <button
                                class="btn-detail px-4 py-2 rounded-xl border-[3px] border-gray-900 font-black text-sm bg-white
                                       shadow-[0_3px_0_0_#1f2937] active:shadow-none active:translate-y-[3px] transition-all
                                       hover:bg-primary hover:text-white hover:border-primary"
                                data-id="${course.id}"
                            >
                                Detail
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            // Event listener tombol detail
            courseContainer.querySelectorAll('.btn-detail').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    window.location.href = `/courses/${id}`;
                });
            });

        } catch (error) {
            console.error('Gagal memuat kursus:', error);
            courseContainer.innerHTML = `
                <p class="text-red-500 text-center col-span-3 font-bold py-12">
                    Gagal mengambil data kursus. Coba lagi nanti.
                </p>`;
        }
    },

    // ─────────────────────────────────────────────────────────
    //  AUTH DISPLAY
    // ─────────────────────────────────────────────────────────
    handleAuthDisplay() {
        const authContainer = document.getElementById('auth-container');
        if (!authContainer) return;

        const token    = localStorage.getItem('lpia_user_token');
        const userData = JSON.parse(localStorage.getItem('lpia_user_data') || '{}');

        if (token) {
            authContainer.innerHTML = `
                <div class="flex items-center gap-2 bg-blue-50 border-2 border-primary rounded-full px-4 py-2 cursor-pointer hover:bg-blue-100 transition-colors">
                    <i class="fas fa-user-circle text-xl text-primary"></i>
                    <span class="font-black text-gray-800 text-sm">${userData.full_name || 'Siswa'}</span>
                </div>
            `;
        } else {
            authContainer.innerHTML = `
                <button id="login-btn"
                    class="px-6 py-2 rounded-xl border-[3px] border-gray-900 bg-primary text-white font-black text-sm
                           shadow-[0_4px_0_0_#1e3a5f] active:shadow-none active:translate-y-[4px] transition-all">
                    Login / Daftar
                </button>
            `;
            document.getElementById('login-btn')?.addEventListener('click', () => {
                window.location.href = '/login';
            });
        }
    }
};