// src/scripts/dom/landingPage.js
import { HTTP } from '../fetch/http.js';
import Swal from 'sweetalert2';
import { Fallback } from '../utils/fallback.js';

export const LandingDOM = {
    init() {
        this.handleAuthDisplay();
    
        const isHome = window.location.pathname === "/";
    
        if (isHome) {
            this.fetchAndRenderCourses();
            this.fetchAndRenderStats();
            window.retryFetchCourses = () => this.fetchAndRenderCourses();
        }
    },

    // ─────────────────────────────────────────────────────────
    //  BUTTON COMPONENT HELPER (Sinkronisasi dengan Button.astro)
    // ─────────────────────────────────────────────────────────
    getButtonHTML({ text, variant = 'primary', size = 'md', extraClass = '', dataId = '', icon = '' }) {
        const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2';
        
        const sizeMap = {
            sm: 'px-4 py-2 text-sm',
            md: 'px-6 py-2.5 text-base',
            lg: 'px-8 py-3 text-lg',
            icon: 'w-10 h-10 flex items-center justify-center text-base' // Tambahan size khusus icon bulat
        };
        
        const variantMap = {
            primary: 'bg-blue-600 text-white shadow-[0_3px_0_0_#1e40af] hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none border border-blue-700',
            outline: 'bg-white border border-slate-200 text-slate-700 shadow-[0_3px_0_0_#e5e7eb] hover:border-blue-600 hover:text-blue-600 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none',
            ghost: 'bg-transparent text-blue-600 shadow-none hover:bg-blue-50 active:bg-blue-100 border border-transparent',
            // Tambahan varian danger (merah) untuk tombol logout
            danger: 'bg-red-50 text-red-600 shadow-[0_3px_0_0_#fecaca] hover:bg-red-100 hover:text-red-700 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none border border-red-200' 
        };

        const iconHtml = icon ? `<i class="${icon}"></i>` : '';
        const idAttr = dataId ? `data-id="${dataId}"` : '';

        // Handle spasi jika text kosong (hanya icon)
        const contentHtml = text ? `${text} ${iconHtml}` : iconHtml;

        return `<button class="${base} ${sizeMap[size]} ${variantMap[variant]} ${extraClass}" ${idAttr}>
            ${contentHtml}
        </button>`;
    },
    // ─────────────────────────────────────────────────────────
    //  STATS BAR
    // ─────────────────────────────────────────────────────────
    async fetchAndRenderStats() {
        const statsBar = document.getElementById('stats-bar');
        if (!statsBar) return;

        try {
            const response = await HTTP.get('/stats/landing');
            const { total_students, total_courses, avg_rating } = response.data;

            statsBar.innerHTML = `
                <div class="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-center shadow-sm">
                    <div class="text-2xl font-black text-blue-600">${total_students.toLocaleString('id-ID')}+</div>
                    <div class="text-xs font-bold text-slate-500 mt-1">Siswa Aktif</div>
                </div>
                <div class="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-center shadow-sm">
                    <div class="text-2xl font-black text-yellow-500">${total_courses}</div>
                    <div class="text-xs font-bold text-slate-500 mt-1">Kursus Tersedia</div>
                </div>
                <div class="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-center shadow-sm">
                    <div class="text-2xl font-black text-green-600">${parseFloat(avg_rating).toFixed(1)} ⭐</div>
                    <div class="text-xs font-bold text-slate-500 mt-1">Rating Siswa</div>
                </div>
            `;
        } catch (error) {
            console.warn('Stats endpoint belum tersedia, menggunakan fallback.');
            statsBar.innerHTML = `
                <div class="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-center shadow-sm">
                    <div class="text-2xl font-black text-blue-600">—</div>
                    <div class="text-xs font-bold text-slate-500 mt-1">Siswa Aktif</div>
                </div>
                <div class="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-center shadow-sm">
                    <div class="text-2xl font-black text-yellow-500">—</div>
                    <div class="text-xs font-bold text-slate-500 mt-1">Kursus Tersedia</div>
                </div>
                <div class="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-center shadow-sm">
                    <div class="text-2xl font-black text-green-600">—</div>
                    <div class="text-xs font-bold text-slate-500 mt-1">Rating Siswa</div>
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

        courseContainer.innerHTML = Fallback.skeletonCards(3);

        try {
            const response = await HTTP.get('/courses');
            const courses = response.data;

            if (!courses || courses.length === 0) {
                courseContainer.innerHTML = Fallback.emptyState('Belum ada kelas kursus yang dipublikasikan.', 'fa-box-open');
                this.renderCarousel([]); 
                return;
            }

            this.renderCarousel(courses);

            courseContainer.innerHTML = courses.map(course => `
                <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col group">
                    <div class="w-full h-44 bg-slate-100 overflow-hidden relative">
                        <img src="${course.thumbnail_url || Fallback.defaultImage}" onerror="${Fallback.imageOnError()}" alt="${course.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    </div>
                    <div class="p-6 flex flex-col flex-grow">
                        <span class="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-md mb-3 self-start border border-blue-100">${course.category || 'General'}</span>
                        <h3 class="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">${course.title}</h3>
                        <p class="text-slate-500 text-sm mb-6 line-clamp-2 flex-grow">${course.description || 'Tidak ada deskripsi.'}</p>
                        <div class="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
                            <span class="font-bold text-blue-700 text-lg">${course.price == 0 ? 'GRATIS' : 'Rp ' + parseInt(course.price).toLocaleString('id-ID')}</span>
                            
                            ${this.getButtonHTML({
                                text: 'Detail',
                                variant: 'outline',
                                size: 'sm',
                                extraClass: 'btn-detail',
                                dataId: course.id
                            })}
                        </div>
                    </div>
                </div>
            `).join('');

            courseContainer.querySelectorAll('.btn-detail').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    window.location.href = `/courses/${e.currentTarget.dataset.id}`;
                });
            });

        } catch (error) {
            console.error('Gagal memuat kursus:', error);
            courseContainer.innerHTML = Fallback.errorState('Gagal mengambil data kursus.', 'window.retryFetchCourses()');
            this.renderCarousel([]); 
        }
    },

    // ─────────────────────────────────────────────────────────
    //  CAROUSEL LOGIC
    // ─────────────────────────────────────────────────────────
    renderCarousel(courses) {
        const track = document.getElementById('carousel-track');
        const dotsContainer = document.getElementById('carousel-dots');
        if (!track || !dotsContainer) return;

        if (!courses || courses.length === 0) {
            track.innerHTML = `<div class="w-full h-full bg-slate-200 flex items-center justify-center"><i class="fas fa-image text-6xl text-slate-400"></i></div>`;
            dotsContainer.innerHTML = '';
            return;
        }

        const activeCourses = courses.filter(c => !c.is_placement_test);
        const shuffled = activeCourses.sort(() => 0.5 - Math.random());
        const selectedCourses = shuffled.slice(0, 5);

        track.innerHTML = selectedCourses.map((course, index) => `
            <div class="carousel-slide min-w-full h-full relative">
                <img src="${course.thumbnail_url || Fallback.defaultImage}" onerror="${Fallback.imageOnError()}" alt="${course.title}" class="w-full h-full object-cover" loading="${index === 0 ? 'eager' : 'lazy'}" />
                <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
                <div class="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-20 pointer-events-none">
                    <div class="max-w-2xl pointer-events-auto">
                        <span class="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">${course.category || 'Promo'}</span>
                        <h3 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 tracking-tight drop-shadow-md">${course.title}</h3>
                        <p class="text-gray-200 text-sm md:text-base font-normal max-w-2xl line-clamp-2 mb-6">${course.description || 'Gabung sekarang dan tingkatkan keahlianmu!'}</p>
                        
                        ${this.getButtonHTML({
                            text: 'Lihat Program',
                            variant: 'primary',
                            size: 'md',
                            extraClass: 'btn-carousel-detail',
                            dataId: course.id,
                            icon: 'fas fa-arrow-right ml-1 text-sm'
                        })}
                    </div>
                </div>
            </div>
        `).join('');

        dotsContainer.innerHTML = selectedCourses.map((_, index) => `
            <button class="carousel-dot h-2.5 rounded-full border border-white/50 transition-all duration-300 focus:outline-none ${index === 0 ? 'bg-white w-8' : 'bg-white/40 w-2.5'}" data-index="${index}" aria-label="Slide ${index + 1}"></button>
        `).join('');

        track.querySelectorAll('.btn-carousel-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.location.href = `/courses/${e.currentTarget.dataset.id}`;
            });
        });

        this.initCarouselLogic(selectedCourses.length);
    },

    initCarouselLogic(totalSlides) {
        if (totalSlides <= 1) return;

        const track = document.getElementById('carousel-track');
        const dotsEl = document.querySelectorAll('.carousel-dot');
        const prevBtn = document.getElementById('carousel-prev');
        const nextBtn = document.getElementById('carousel-next');
        let current = 0;
        let timer;

        function goTo(n) {
            current = ((n % totalSlides) + totalSlides) % totalSlides;
            track.style.transform = `translateX(-${current * 100}%)`;
            
            dotsEl.forEach((dot, i) => {
                const active = i === current;
                dot.classList.toggle('bg-white', active);
                dot.classList.toggle('w-8', active);
                dot.classList.toggle('bg-white/40', !active);
                dot.classList.toggle('w-2.5', !active);
            });
        }

        function resetTimer() {
            clearInterval(timer);
            timer = setInterval(() => goTo(current + 1), 5000); 
        }

        if (prevBtn) prevBtn.onclick = () => { goTo(current - 1); resetTimer(); };
        if (nextBtn) nextBtn.onclick = () => { goTo(current + 1); resetTimer(); };

        dotsEl.forEach((dot, i) => {
            dot.onclick = () => { goTo(i); resetTimer(); };
        });

        let startX = 0;
        track.ontouchstart = (e) => { startX = e.touches[0].clientX; };
        track.ontouchend = (e) => {
            const diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                goTo(current + (diff > 0 ? 1 : -1));
                resetTimer();
            }
        };

        resetTimer();
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
            // STATE LOGIN: Tampilkan Nama (Link ke Profile) & Tombol Logout
            authContainer.innerHTML = `
                <div class="flex items-center gap-3">
                    <a href="/profile" class="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 cursor-pointer hover:bg-blue-100 transition-colors shadow-sm group">
                        <i class="fas fa-user-circle text-xl text-blue-600 group-hover:scale-110 transition-transform duration-200"></i>
                        <span class="font-semibold text-slate-800 text-sm group-hover:text-blue-700">${userData.full_name || 'Siswa'}</span>
                    </a>
                    
                    ${this.getButtonHTML({
                        text: '', 
                        variant: 'danger',
                        size: 'icon',
                        extraClass: '!rounded-full', // Memaksa agar bentuknya bulat penuh
                        dataId: 'logout-btn',
                        icon: 'fas fa-sign-out-alt'
                    })}
                </div>
            `;

            // Event Listener Tombol Logout
            document.querySelector('[data-id="logout-btn"]')?.addEventListener('click', () => {
                Swal.fire({
                    title: 'Keluar dari LPIA?',
                    text: 'Kamu harus login lagi nanti untuk mengakses kelasmu.',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#dc2626', // red-600 Tailwind
                    cancelButtonColor: '#94a3b8', // slate-400 Tailwind
                    confirmButtonText: 'Ya, Keluar',
                    cancelButtonText: 'Batal',
                    reverseButtons: true // Menukar posisi tombol agar "Batal" di kiri
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Hapus sesi dari localStorage
                        localStorage.removeItem('lpia_user_token');
                        localStorage.removeItem('lpia_user_data');
                        
                        // Notifikasi sukses sebentar lalu refresh halaman
                        Swal.fire({
                            title: 'Berhasil Keluar',
                            text: 'Sampai jumpa lagi!',
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false
                        }).then(() => {
                            window.location.reload();
                        });
                    }
                });
            });

        } else {
            // STATE LOGOUT: Tampilkan tombol Login / Daftar
            authContainer.innerHTML = this.getButtonHTML({
                text: 'Login / Daftar',
                variant: 'primary',
                size: 'sm', 
                extraClass: '',
                dataId: 'login-btn'
            });
            
            document.querySelector('[data-id="login-btn"]')?.addEventListener('click', () => {
                window.location.href = '/login';
            });
        }
    }
};