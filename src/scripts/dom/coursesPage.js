// src/scripts/dom/coursesPage.js
import { HTTP } from '../fetch/http.js';
import { Fallback } from '../utils/fallback.js';

export const CoursesPageDOM = {
    timer: null, // Wadah untuk set timer debounce

    init() {
        const container = document.getElementById('courses-grid-page');
        if (!container) return;

        this.searchInput = document.getElementById('course-search-input');
        this.categoryFilter = document.getElementById('course-category-filter');

        // 1. Baca URL Parameter saat halaman pertama kali dimuat
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('search')) this.searchInput.value = urlParams.get('search');
        if (urlParams.has('category')) {
            const cat = urlParams.get('category');
            // Pastikan option-nya ada sebelum diset
            if (this.categoryFilter.querySelector(`option[value="${cat}"]`)) {
                this.categoryFilter.value = cat;
            }
        }

        this.addEventListeners();
        this.fetchCourses();
        
        // Expose untuk tombol retry saat error
        window.retryFetchCoursesList = () => this.fetchCourses();
    },

    addEventListeners() {
        // Event Listener untuk Search (Menggunakan DEBOUNCE 600ms)
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.timer); // Batalkan timer sebelumnya
            this.timer = setTimeout(() => {
                this.updateURLAndFetch(); // Eksekusi setelah user berhenti mengetik selama 600ms
            }, 600); 
        });

        // Event Listener untuk Filter (Langsung eksekusi tanpa debounce)
        this.categoryFilter.addEventListener('change', () => {
            this.updateURLAndFetch();
        });
    },

    updateURLAndFetch() {
        const searchVal = this.searchInput.value.trim();
        const catVal = this.categoryFilter.value;

        const url = new URL(window.location);
        
        // Update URL secara diam-diam (tanpa reload halaman)
        if (searchVal) url.searchParams.set('search', searchVal);
        else url.searchParams.delete('search');

        if (catVal && catVal !== 'all') url.searchParams.set('category', catVal);
        else url.searchParams.delete('category');

        window.history.pushState({}, '', url);

        // Fetch data dengan query baru
        this.fetchCourses();
    },

    async fetchCourses() {
        const container = document.getElementById('courses-grid-page');
        container.innerHTML = Fallback.skeletonCards(8); // Skeleton 8 kotak

        // Ambil query dari URL yang baru saja di-update
        const urlParams = new URLSearchParams(window.location.search);
        const search = urlParams.get('search') || '';
        const category = urlParams.get('category') || 'all';

        // Rakit URL Endpoint Backend
        let apiEndpoint = '/courses';
        const queryParts = [];
        if (search) queryParts.push(`search=${encodeURIComponent(search)}`);
        if (category !== 'all') queryParts.push(`category=${encodeURIComponent(category)}`);
        
        if (queryParts.length > 0) {
            apiEndpoint += `?${queryParts.join('&')}`;
        }

        try {
            const response = await HTTP.get(apiEndpoint);
            this.render(response.data);
        } catch (error) {
            container.innerHTML = Fallback.errorState('Gagal memuat daftar kursus.', 'window.retryFetchCoursesList()');
        }
    },

    render(courses) {
        const container = document.getElementById('courses-grid-page');
        
        if (!courses || courses.length === 0) {
            container.innerHTML = Fallback.emptyState('Tidak ada kursus yang sesuai dengan pencarianmu.', 'fa-search-minus');
            container.className = "col-span-full w-full"; // Buat penuh 1 baris
            return;
        }

        // Kembalikan ke format grid
        container.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6";
        
        container.innerHTML = courses.map(course => `
            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer" onclick="window.location.href='/courses/${course.id}'">
                <div class="w-full h-40 bg-slate-100 relative overflow-hidden">
                    <img src="${course.thumbnail_url || Fallback.defaultImage}" onerror="${Fallback.imageOnError()}" alt="${course.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out">
                    <div class="absolute top-3 left-3 bg-white/90 backdrop-blur text-blue-700 text-[10px] font-black px-2.5 py-1 rounded shadow-sm uppercase tracking-wider">
                        ${course.category || 'General'}
                    </div>
                </div>
                <div class="p-5 flex flex-col flex-grow">
                    <h3 class="font-bold text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">${course.title}</h3>
                    <p class="text-sm text-slate-500 mb-6 line-clamp-2 flex-grow">${course.description || 'Pelajari materi ini dan tingkatkan keahlianmu sekarang.'}</p>
                    
                    <div class="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                        <span class="font-black text-blue-700 text-base">
                            ${course.price == 0 ? 'GRATIS' : 'Rp ' + parseInt(course.price).toLocaleString('id-ID')}
                        </span>
                        <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <i class="fas fa-arrow-right text-xs"></i>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
};