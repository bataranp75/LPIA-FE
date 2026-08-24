import { HTTP } from '../fetch/http.js';
import { Fallback } from '../utils/fallback.js';

function escapeHtml(value = '') { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }

function normalizeTags(value) {
    if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
    if (typeof value === 'string') return value.split(',').map((tag) => tag.trim()).filter(Boolean);
    return [];
}

function formatPrice(price) {
    const value = Number(price || 0);
    if (!Number.isFinite(value) || value <= 0) return 'GRATIS';
    return `Rp ${value.toLocaleString('id-ID')}`;
}

export const CoursesPageDOM = {
    timer: null,

    init() {
        const container = document.getElementById('courses-grid-page');
        if (!container) return;

        this.searchInput = document.getElementById('course-search-input');
        this.categoryFilter = document.getElementById('course-category-filter');
        this.levelFilter = document.getElementById('course-level-filter');
        this.deliveryFilter = document.getElementById('course-delivery-filter');
        this.learningFilter = document.getElementById('course-learning-filter');

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('search')) this.searchInput.value = urlParams.get('search');
        if (urlParams.has('category')) {
            const cat = urlParams.get('category');
            if (this.categoryFilter.querySelector(`option[value="${cat}"]`)) this.categoryFilter.value = cat;
        }
        if (urlParams.has('level')) {
            const level = urlParams.get('level');
            if (this.levelFilter.querySelector(`option[value="${level}"]`)) this.levelFilter.value = level;
        }
        if (urlParams.has('delivery_type')) {
            const delivery = urlParams.get('delivery_type');
            if (this.deliveryFilter.querySelector(`option[value="${delivery}"]`)) this.deliveryFilter.value = delivery;
        }
        if (urlParams.has('learning_type')) {
            const learning = urlParams.get('learning_type');
            if (this.learningFilter.querySelector(`option[value="${learning}"]`)) this.learningFilter.value = learning;
        }

        this.addEventListeners();
        this.fetchCourses();
        window.retryFetchCoursesList = () => this.fetchCourses();
    },

    addEventListeners() {
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.timer);
            this.timer = setTimeout(() => this.updateURLAndFetch(), 600);
        });
        this.categoryFilter.addEventListener('change', () => this.updateURLAndFetch());
        this.levelFilter.addEventListener('change', () => this.updateURLAndFetch());
        this.deliveryFilter.addEventListener('change', () => this.updateURLAndFetch());
        this.learningFilter.addEventListener('change', () => this.updateURLAndFetch());
    },

    updateURLAndFetch() {
        const url = new URL(window.location);
        const setQuery = (key, value, fallback) => (value && value !== fallback ? url.searchParams.set(key, value) : url.searchParams.delete(key));
        setQuery('search', this.searchInput.value.trim(), '');
        setQuery('category', this.categoryFilter.value, 'all');
        setQuery('level', this.levelFilter.value, 'all');
        setQuery('delivery_type', this.deliveryFilter.value, 'all');
        setQuery('learning_type', this.learningFilter.value, 'all');
        window.history.pushState({}, '', url);
        this.fetchCourses();
    },

    async fetchCourses() {
        const container = document.getElementById('courses-grid-page');
        container.innerHTML = Fallback.skeletonCards(8, 'rounded-3xl border border-[#E5E4DE] bg-white');
        try {
            const response = await HTTP.get(`/courses${window.location.search}`);
            const courses = Array.isArray(response?.data) ? response.data : [];
            this.render(courses);
        } catch (error) {
            container.innerHTML = Fallback.errorState('Gagal memuat daftar kursus.', 'window.retryFetchCoursesList()');
        }
    },

    render(courses) {
        const container = document.getElementById('courses-grid-page');
        if (!courses || courses.length === 0) {
            container.className = 'grid grid-cols-1';
            container.innerHTML = `
                <div class="col-span-full rounded-3xl border border-dashed border-[#E5E4DE] bg-white p-10 text-center">
                    <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F3ED] text-[#7A7F8A]"><i class="fas fa-search-minus text-xl"></i></div>
                    <h3 class="text-lg font-semibold text-[#1A1D20]">Tidak ada kursus yang sesuai</h3>
                    <p class="mt-2 text-sm text-[#4A4E57]">Coba ubah filter kategori, level, atau jenis kelas.</p>
                </div>`;
            return;
        }

        container.className = 'grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4';
        container.innerHTML = courses.map((course) => {
            const tags = normalizeTags(course.tags).slice(0, 3);
            const teacherName = escapeHtml(course.teacher?.full_name || '');
            return `
                <article class="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#E5E4DE] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200">
                    <a href="/courses/${course.id}" class="flex h-full flex-col">
                        <div class="relative h-44 overflow-hidden bg-[#F5F3ED]">
                            <img src="${course.thumbnail_url || Fallback.defaultImage}" onerror="${Fallback.imageOnError()}" alt="${escapeHtml(course.title)}" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div class="absolute left-3 top-3 flex flex-wrap gap-2">
                                <span class="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">${escapeHtml(course.delivery_type || 'Online')}</span>
                                <span class="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-black backdrop-blur">${escapeHtml(course.learning_type || 'Regular')}</span>
                            </div>
                        </div>
                        <div class="flex flex-1 flex-col p-5">
                            <span class="text-[11px] font-semibold uppercase tracking-widest text-[#0F4C81]">${escapeHtml(course.category || 'General')}</span>
                            <h3 class="mt-2 line-clamp-2 text-base font-semibold leading-snug text-[#1A1D20]">${escapeHtml(course.title || 'Tanpa Judul')}</h3>
                            ${teacherName ? `<p class="mt-2 text-xs text-[#7A7F8A]">Oleh: ${teacherName}</p>` : ''}
                            <p class="mt-3 line-clamp-2 text-sm text-[#4A4E57]">${escapeHtml(course.description || 'Pelajari materi ini dan tingkatkan keahlianmu.')}</p>
                            <div class="mt-4 flex flex-wrap gap-2">
                                <span class="inline-flex items-center rounded-full bg-[#F5F3ED] px-2.5 py-1 text-xs font-medium text-[#4A4E57]">${escapeHtml(course.level || 'Beginner')}</span>
                                ${tags.map((tag) => `<span class="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#0F4C81]">${escapeHtml(tag)}</span>`).join('')}
                            </div>
                            <div class="mt-auto border-t border-[#F5F3ED] pt-4">
                                <div class="flex items-center justify-between gap-3">
                                    <span class="text-base font-semibold text-[#0F4C81]">${formatPrice(course.price)}</span>
                                    <span class="inline-flex h-9 items-center rounded-full border border-[#E5E4DE] px-4 text-xs font-semibold text-[#1A1D20] transition-colors group-hover:border-[#0F4C81] group-hover:text-[#0F4C81]">Lihat Detail</span>
                                </div>
                            </div>
                        </div>
                    </a>
                </article>`;
        }).join('');
    }
};
