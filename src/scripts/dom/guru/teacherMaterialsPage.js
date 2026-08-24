import { ReusableModal } from '../../components/reusableModal';
import { AppToast } from '../../components/toast';
import { TeacherCourseWorkspace } from '../../components/teacherCourseWorkspace';
import { TeacherQuestionWorkspace } from '../../components/teacherQuestionWorkspace';
import { TeacherQuestionModal } from '../../components/teacherQuestionModal';
import { TeacherQuestionApi } from '../../components/teacherQuestionApi';
import { TeacherChildModal } from '../../components/teacherChildModal';
import { AppConfirmModal } from '../../components/appConfirmModal';
import { TeacherExamWorkspace } from '../../components/teacherExamWorkspace';
import { TeacherExamApi } from '../../fetch/teacherExamApi';
import { CONFIG } from '../../config/index.js';
import { ExamSimulator } from '../../components/examSimulator';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const TeacherMaterialsPage = {
    teacherId: null,
    teacherFeatureMode: 'materi',
    courses: [],
    modules: [],
    materials: [],
    questions: [],
    examQuestions: [],
    examSetting: null,
    permissions: null,
    selectedCourse: null,
    activeWorkspaceMode: 'materi',
    activeModuleId: null,

    moduleViewMode: 'card',
    moduleSortMode: 'order',
    moduleShowAll: false,

    materialViewMode: 'card',
    materialSearchKeyword: '',
    materialCurrentPage: 1,
    materialLimit: 10,

    courseSearchKeyword: '',
    courseFilterId: 'all',
    courseSearchDebounce: null,

    searchDebounce: null,
    moduleReorderDebounce: null,
    materialReorderDebounce: null,

    isSavingModuleOrder: false,
    isSavingMaterialOrder: false,
    isSubmittingModule: false,

    lastModuleOrderSignature: '',
    lastMaterialOrderSignature: '',

    async init() {
        const userData = JSON.parse(localStorage.getItem('lpia_user_data') || '{}');

        if (!userData?.id || userData.role !== 'guru') {
            AppToast.warning('Akses hanya untuk guru.');
            window.location.href = '/login';
            return;
        }

        this.teacherId = userData.id;
        this.teacherFeatureMode = this.getFeatureModeFromUrl();
        this.activeWorkspaceMode = this.teacherFeatureMode === 'soal' ? 'soal' : 'materi';

        this.updateSidebarHighlight();
        this.updateHeaderAndBreadcrumb();

        await this.loadTeacherDashboard();
        this.renderDashboardStats();
        this.renderDashboardToolbar();
        this.renderCourses();
    },

    updateSidebarHighlight() {
        const currentMode = this.teacherFeatureMode;
        document.querySelectorAll('.guru-menu-link').forEach(link => {
            const mode = link.getAttribute('data-mode');
            const href = link.getAttribute('data-href');
            const icon = link.querySelector('i');
            if (mode) {
                if (mode === currentMode) {
                    link.className = 'flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 guru-menu-link bg-blue-50 text-blue-700 border border-blue-200';
                    if (icon) icon.className = icon.className.replace('text-center', 'text-center text-blue-600');
                } else {
                    link.className = 'flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 guru-menu-link text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent';
                    if (icon) icon.className = icon.className.replace(' text-blue-600', '');
                }
            }
        });
    },

    updateHeaderAndBreadcrumb() {
        const copy = {
            modul: {
                title: 'Kelola Modul',
                desc: 'Pilih kursus yang Anda ampu, lalu tambah, edit, hapus, dan atur urutan modul.',
                icon: 'fa-folder-open',
                accent: 'text-amber-600 bg-amber-50'
            },
            materi: {
                title: 'Kelola Materi',
                desc: 'Pilih kursus yang Anda ampu, lalu upload, edit, hapus, dan atur urutan materi PDF.',
                icon: 'fa-file-pdf',
                accent: 'text-blue-600 bg-blue-50'
            },
            soal: {
                title: 'Kelola Soal',
                desc: 'Pilih kursus yang Anda ampu, lalu kelola soal latihan berdasarkan modul.',
                icon: 'fa-circle-question',
                accent: 'text-purple-600 bg-purple-50'
            },
            ujian: {
                title: 'Kelola Ujian',
                desc: 'Pilih kursus yang Anda ampu, lalu kelola soal ujian course dan setting timer.',
                icon: 'fa-file-circle-check',
                accent: 'text-cyan-600 bg-cyan-50'
            }
        };

        const currentMode = this.teacherFeatureMode;
        const pageCopy = copy[currentMode] || copy.modul;

        const iconContainer = document.querySelector('#teacher-materials-page .mb-8 .shrink-0');
        const breadcrumbEl = document.querySelector('#teacher-materials-page .min-w-0 p');
        const titleEl = document.querySelector('#teacher-materials-page .min-w-0 h1');
        const descEl = document.querySelector('#teacher-materials-page .min-w-0 p.text-slate-400');

        if (iconContainer) {
            iconContainer.className = `hidden sm:flex w-14 h-14 rounded-2xl items-center justify-center text-xl shrink-0 ${pageCopy.accent}`;
            const icon = iconContainer.querySelector('i');
            if (icon) {
                icon.className = `fas ${pageCopy.icon}`;
            }
        }

        if (breadcrumbEl) {
            breadcrumbEl.textContent = `Dashboard Guru / ${pageCopy.title}`;
        }

        if (titleEl) {
            titleEl.textContent = pageCopy.title;
        }

        if (descEl) {
            descEl.textContent = pageCopy.desc;
        }
    },

    getCourseAggregates(course) {
        const modules = course.modules || [];
        const materialCount = modules.reduce((sum, m) => sum + (m.materials?.length || 0), 0);
        
        // Soal latihan: dari modul atau course.questions (is_exam = false)
        let questionCount = 0;
        if (Array.isArray(course.questions)) {
            questionCount = course.questions.filter(q => !q.is_exam).length;
        } else {
            questionCount = modules.reduce(
                (sum, m) => sum + (m.questions?.filter(q => !q.is_exam).length || 0),
                0
            );
        }

        // Soal ujian: dari course.questions (is_exam = true)
        let examQuestionCount = 0;
        if (Array.isArray(course.questions)) {
            examQuestionCount = course.questions.filter(q => q.is_exam).length;
        } else {
            examQuestionCount = modules.reduce(
                (sum, m) => sum + (m.questions?.filter(q => q.is_exam).length || 0),
                0
            );
        }

        return {
            moduleCount: modules.length,
            materialCount,
            questionCount,
            examQuestionCount
        };
    },

    formatDate(value) {
        if (!value) return '-';

        try {
            return new Date(value).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return '-';
        }
    },

    renderDashboardStats() {
        const wrap = document.getElementById('teacher-dashboard-stats');
        if (!wrap) return;

        const totals = this.courses.reduce(
            (acc, course) => {
                const agg = this.getCourseAggregates(course);
                acc.modules += agg.moduleCount;
                acc.materials += agg.materialCount;
                acc.questions += agg.questionCount;
                acc.examQuestions += agg.examQuestionCount;
                return acc;
            },
            { modules: 0, materials: 0, questions: 0, examQuestions: 0 }
        );

        const publishedCourses = this.courses.filter(c => (c.status || '').toLowerCase() === 'published').length;
        const draftCourses = this.courses.length - publishedCourses;
        const coursesWithExam = this.courses.filter(c => this.getCourseAggregates(c).examQuestionCount > 0).length;

        const statMap = {
            modul: [
                { label: 'Total Kursus', value: this.courses.length, icon: 'fa-book-open', accent: 'bg-blue-50 text-blue-600' },
                { label: 'Modul Aktif', value: totals.modules, icon: 'fa-folder-open', accent: 'bg-amber-50 text-amber-600' },
                { label: 'Draft Course', value: draftCourses, icon: 'fa-file-pen', accent: 'bg-slate-100 text-slate-600' }
            ],
            materi: [
                { label: 'Total Kursus', value: this.courses.length, icon: 'fa-book-open', accent: 'bg-blue-50 text-blue-600' },
                { label: 'Total Materi PDF', value: totals.materials, icon: 'fa-file-pdf', accent: 'bg-red-50 text-red-600' },
                { label: 'Total Modul', value: totals.modules, icon: 'fa-folder-open', accent: 'bg-amber-50 text-amber-600' }
            ],
            soal: [
                { label: 'Total Soal', value: totals.questions, icon: 'fa-circle-question', accent: 'bg-purple-50 text-purple-600' },
                { label: 'Pilihan Ganda', value: totals.questions, icon: 'fa-list-check', accent: 'bg-fuchsia-50 text-fuchsia-600' },
                { label: 'Soal Ujian', value: totals.examQuestions, icon: 'fa-file-circle-check', accent: 'bg-cyan-50 text-cyan-600' }
            ],
            ujian: [
                { label: 'Ujian Tersedia', value: coursesWithExam, icon: 'fa-file-circle-check', accent: 'bg-cyan-50 text-cyan-600' },
                { label: 'Total Soal Ujian', value: totals.examQuestions, icon: 'fa-circle-question', accent: 'bg-blue-50 text-blue-600' },
                { label: 'Total Kursus', value: this.courses.length, icon: 'fa-book-open', accent: 'bg-slate-100 text-slate-600' }
            ]
        };

        const stats = statMap[this.teacherFeatureMode] || statMap.materi;

        wrap.innerHTML = stats.map(item => `
            <div class="stat-card bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl ${item.accent} flex items-center justify-center text-lg shrink-0">
                    <i class="fas ${item.icon}"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-xs font-black text-slate-400 uppercase tracking-wide truncate">${item.label}</p>
                    <h3 class="text-2xl font-black text-slate-900 mt-0.5">${item.value}</h3>
                </div>
            </div>
        `).join('');
    },

    renderDashboardToolbar() {
        const wrap = document.getElementById('teacher-dashboard-toolbar');
        if (!wrap) return;

        if (this.teacherFeatureMode !== 'materi') {
            wrap.innerHTML = '';
            wrap.classList.add('hidden');
            return;
        }

        wrap.classList.remove('hidden');
        wrap.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
                <div class="relative flex-1 min-w-0">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    <input
                        id="course-search-input"
                        value="${this.courseSearchKeyword}"
                        class="w-full pl-10 pr-3 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-blue-100"
                        placeholder="Cari kursus atau materi..."
                    >
                </div>

                <select id="course-filter-select" class="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-black text-slate-600 focus:outline-none sm:w-64">
                    <option value="all">Semua Kursus</option>
                    ${this.courses.map(course => `
                        <option value="${course.id}" ${this.courseFilterId === course.id ? 'selected' : ''}>
                            ${course.title}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;

        document.getElementById('course-search-input')?.addEventListener('input', e => {
            clearTimeout(this.courseSearchDebounce);

            this.courseSearchDebounce = setTimeout(() => {
                this.courseSearchKeyword = e.target.value;
                this.renderCourses();
            }, 250);
        });

        document.getElementById('course-filter-select')?.addEventListener('change', e => {
            this.courseFilterId = e.target.value;
            this.renderCourses();
        });
    },

    getVisibleCourses() {
        let list = [...this.courses];

        if (this.teacherFeatureMode === 'materi') {
            if (this.courseFilterId !== 'all') {
                list = list.filter(course => course.id === this.courseFilterId);
            }

            const keyword = this.courseSearchKeyword.trim().toLowerCase();

            if (keyword) {
                list = list.filter(course =>
                    course.title?.toLowerCase().includes(keyword) ||
                    course.description?.toLowerCase().includes(keyword)
                );
            }
        }

        return list;
    },

    getFeatureModeFromUrl() {
        const root = document.getElementById('teacher-materials-page');
        const rootMode = root?.dataset?.featureMode;
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode') || rootMode || 'modul';

        return ['modul', 'materi', 'soal', 'ujian'].includes(mode) ? mode : 'modul';
    },

    getFeatureCopy() {
        const copy = {
            modul: {
                label: 'Kelola modul',
                title: 'Kelola Modul',
                subtitle: 'Tambah, edit, hapus, dan atur urutan modul pada course ini.',
                badgeClass: 'bg-amber-50 text-amber-700',
                icon: 'fa-folder-open'
            },
            materi: {
                label: 'Kelola materi',
                title: 'Kelola Materi',
                subtitle: 'Upload, edit, hapus, cari, dan atur urutan materi PDF berdasarkan modul.',
                badgeClass: 'bg-blue-50 text-blue-700',
                icon: 'fa-file-pdf'
            },
            soal: {
                label: 'Kelola soal',
                title: 'Kelola Soal',
                subtitle: 'Tambah, edit, hapus, upload CSV, dan preview soal latihan modul.',
                badgeClass: 'bg-purple-50 text-purple-700',
                icon: 'fa-circle-question'
            },
            ujian: {
                label: 'Kelola ujian',
                title: 'Kelola Ujian',
                subtitle: 'Kelola soal ujian course, preview soal, hapus soal, dan setting timer.',
                badgeClass: 'bg-cyan-50 text-cyan-700',
                icon: 'fa-file-circle-check'
            }
        };

        return copy[this.teacherFeatureMode] || copy.materi;
    },

    async apiFetch(endpoint, options = {}) {
        const token = localStorage.getItem(CONFIG.STORAGE_KEY);

        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers
            },
            ...options
        });

        const json = await res.json();

        if (!res.ok || json.status === 'error') {
            throw new Error(json.message || 'Terjadi kesalahan server.');
        }

        return json;
    },

    async loadTeacherDashboard() {
        try {
            const json = await this.apiFetch(`/teacher/${this.teacherId}/courses`);

            this.courses = json.data.courses || [];
            this.permissions = json.data.permissions || {
                can_create_material: false,
                can_update_material: false,
                can_delete_material: false
            };
        } catch (error) {
            AppToast.error(error.message);
        }
    },

    renderCourses() {
        const grid = document.getElementById('teacher-courses-grid');
        if (!grid) return;

        const visibleCourses = this.getVisibleCourses();

        if (!visibleCourses.length) {
            const isFiltered = this.teacherFeatureMode === 'materi' && (this.courseSearchKeyword || this.courseFilterId !== 'all');

            grid.innerHTML = `
                <div class="col-span-full bg-white border border-slate-200 rounded-3xl p-10 text-center">
                    <div class="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mb-4">
                        <i class="fas ${isFiltered ? 'fa-magnifying-glass' : 'fa-book'}"></i>
                    </div>
                    <h3 class="font-black text-lg">${isFiltered ? 'Kursus tidak ditemukan' : 'Belum ada kursus'}</h3>
                    <p class="text-sm text-slate-400 mt-2">
                        ${isFiltered ? 'Coba ubah kata kunci atau filter kursus.' : 'Admin belum meng-enroll kursus ke akun guru ini.'}
                    </p>
                </div>
            `;
            return;
        }

        const cardRenderer = {
            modul: course => this.renderCourseCardModul(course),
            materi: course => this.renderCourseCardMateri(course),
            soal: course => this.renderCourseCardSoal(course),
            ujian: course => this.renderCourseCardUjian(course)
        };

        const renderCard = cardRenderer[this.teacherFeatureMode] || cardRenderer.materi;

        grid.innerHTML = visibleCourses.map(course => renderCard(course)).join('');

        document.querySelectorAll('.teacher-course-card').forEach(card => {
            card.addEventListener('click', () => {
                const course = this.courses.find(item => item.id === card.dataset.courseId);
                this.openCourseDetail(course);
            });
        });
    },

    renderCourseStatusBadge(course) {
        const isPublished = (course.status || '').toLowerCase() === 'published';

        return `
            <span class="px-3 py-1 rounded-full text-xs font-black shrink-0 ${
                isPublished ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
            }">
                ${isPublished ? 'Published' : 'Draft'}
            </span>
        `;
    },

    renderCourseThumbnail(course, fallbackIcon = 'fa-book-open', accent = 'text-blue-600') {
        return `
            <div class="h-36 rounded-2xl bg-slate-100 overflow-hidden mb-5">
                ${
                    course.thumbnail_url
                        ? `<img src="${course.thumbnail_url}" class="w-full h-full object-cover" loading="lazy">`
                        : `<div class="w-full h-full flex items-center justify-center ${accent} text-4xl"><i class="fas ${fallbackIcon}"></i></div>`
                }
            </div>
        `;
    },

    // A. Kelola Modul — course management card dengan statistik modul & materi
    renderCourseCardModul(course) {
        const agg = this.getCourseAggregates(course);

        return `
            <button data-course-id="${course.id}" class="teacher-course-card course-card-hover text-left bg-white border border-slate-200 rounded-3xl p-5 hover:border-amber-300">
                ${this.renderCourseThumbnail(course, 'fa-folder-open', 'text-amber-500')}

                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <h3 class="font-black text-lg text-slate-900 line-clamp-1">${course.title}</h3>
                        <p class="text-sm text-slate-400 mt-1 line-clamp-2">${course.description || 'Tidak ada deskripsi.'}</p>
                    </div>
                    ${this.renderCourseStatusBadge(course)}
                </div>

                <div class="mt-4 grid grid-cols-2 gap-2">
                    <div class="rounded-2xl bg-amber-50 p-3 text-center">
                        <p class="text-lg font-black text-amber-700">${agg.moduleCount}</p>
                        <p class="text-[10px] uppercase font-black text-amber-600/70">Modul</p>
                    </div>
                    <div class="rounded-2xl bg-slate-50 p-3 text-center">
                        <p class="text-lg font-black text-slate-700">${agg.materialCount}</p>
                        <p class="text-[10px] uppercase font-black text-slate-400">Materi</p>
                    </div>
                </div>

                <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-amber-600">
                    <span>Kelola Modul</span>
                    <i class="fas fa-arrow-right card-arrow"></i>
                </div>
            </button>
        `;
    },

    // B. Kelola Materi — library card dengan jumlah PDF & last updated
    renderCourseCardMateri(course) {
        const agg = this.getCourseAggregates(course);
        const lastUpdated = this.formatDate(course.updated_at || course.created_at);

        return `
            <button data-course-id="${course.id}" class="teacher-course-card course-card-hover text-left bg-white border border-slate-200 rounded-3xl p-5 hover:border-blue-300">
                ${this.renderCourseThumbnail(course, 'fa-book-open', 'text-blue-600')}

                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <h3 class="font-black text-lg text-slate-900 line-clamp-1">${course.title}</h3>
                        <p class="text-sm text-slate-400 mt-1 line-clamp-2">${course.description || 'Tidak ada deskripsi.'}</p>
                    </div>
                    ${this.renderCourseStatusBadge(course)}
                </div>

                <div class="mt-4 flex flex-wrap items-center gap-2">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-black">
                        <i class="fas fa-folder-open text-[11px]"></i> ${agg.moduleCount} modul
                    </span>
                    <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-black">
                        <i class="fas fa-file-pdf text-[11px]"></i> ${agg.materialCount} PDF
                    </span>
                </div>

                <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                    <span><i class="fas fa-clock-rotate-left mr-1.5"></i>Update: ${lastUpdated}</span>
                    <span class="text-blue-600 text-sm flex items-center gap-2">Kelola Materi <i class="fas fa-arrow-right card-arrow"></i></span>
                </div>
            </button>
        `;
    },

    // C. Kelola Soal — question bank card
    renderCourseCardSoal(course) {
        const agg = this.getCourseAggregates(course);

        return `
            <button data-course-id="${course.id}" class="teacher-course-card course-card-hover text-left bg-white border border-slate-200 rounded-3xl p-5 hover:border-purple-300">
                <div class="flex items-start justify-between gap-3 mb-4">
                    <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl shrink-0">
                        <i class="fas fa-circle-question"></i>
                    </div>
                    ${this.renderCourseStatusBadge(course)}
                </div>

                <h3 class="font-black text-lg text-slate-900 line-clamp-1">${course.title}</h3>
                <p class="text-sm text-slate-400 mt-1 line-clamp-2">${course.description || 'Tidak ada deskripsi.'}</p>

                <div class="mt-4 rounded-2xl bg-purple-50/60 border border-purple-100 p-4 flex items-center justify-between">
                    <div>
                        <p class="text-2xl font-black text-purple-700">${agg.questionCount}</p>
                        <p class="text-[11px] font-black text-purple-500 uppercase">Soal tersedia</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-black text-slate-600">${agg.moduleCount}</p>
                        <p class="text-[11px] font-bold text-slate-400">Modul</p>
                    </div>
                </div>

                <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-purple-600">
                    <span>Kelola Soal</span>
                    <i class="fas fa-arrow-right card-arrow"></i>
                </div>
            </button>
        `;
    },

    // D. Kelola Ujian — exam management card
    renderCourseCardUjian(course) {
        const agg = this.getCourseAggregates(course);
        const hasExam = agg.examQuestionCount > 0;
        
        const rawSetting = course.course_exam_settings;
        const duration = Array.isArray(rawSetting)
            ? rawSetting[0]?.duration_minutes
            : rawSetting?.duration_minutes;
            
        const durationLabel = duration ? `${duration} Menit` : 'Belum diatur';

        return `
            <button data-course-id="${course.id}" class="teacher-course-card course-card-hover text-left bg-white border border-slate-200 rounded-3xl p-5 hover:border-cyan-300">
                <div class="flex items-start justify-between gap-3 mb-4">
                    <div class="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-xl shrink-0">
                        <i class="fas fa-file-circle-check"></i>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-black shrink-0 ${
                        hasExam ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }">
                        ${hasExam ? 'Soal Tersedia' : 'Belum Ada Soal'}
                    </span>
                </div>

                <h3 class="font-black text-lg text-slate-900 line-clamp-1">${course.title}</h3>
                <p class="text-sm text-slate-400 mt-1 line-clamp-2">${course.description || 'Tidak ada deskripsi.'}</p>

                <div class="mt-4 grid grid-cols-2 gap-2">
                    <div class="rounded-2xl bg-cyan-50/60 border border-cyan-100 p-3">
                        <p class="text-[10px] uppercase font-black text-cyan-500">Jumlah Soal</p>
                        <p class="text-lg font-black text-cyan-700 mt-0.5">${agg.examQuestionCount}</p>
                    </div>
                    <div class="rounded-2xl bg-slate-50 p-3">
                        <p class="text-[10px] uppercase font-black text-slate-400">Durasi</p>
                        <p class="text-lg font-black text-slate-700 mt-0.5"><i class="fas fa-clock text-sm mr-1 text-slate-400"></i>${durationLabel}</p>
                    </div>
                </div>

                <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-cyan-600">
                    <span>Kelola Ujian</span>
                    <i class="fas fa-arrow-right card-arrow"></i>
                </div>
            </button>
        `;
    },
     async loadCourseExam(courseId) {
        try {
            const data = await TeacherExamApi.getCourseExam({
            teacherId: this.teacherId,
            courseId
        });

        this.examQuestions = data.questions || [];
        this.examSetting = data.setting || { duration_minutes: 10 };
     } catch (error) {
        AppToast.error(error.message);
        this.examQuestions = [];
        this.examSetting = { duration_minutes: 10 };
     }
    },
    async openCourseDetail(course) {
        this.selectedCourse = course;
        this.teacherFeatureMode = this.getFeatureModeFromUrl();
        this.activeWorkspaceMode = this.teacherFeatureMode === 'soal' ? 'soal' : 'materi';

        await this.loadCourseDetail(course.id);
        await this.loadCourseExam(course.id);

        ReusableModal.open({
            title: course.title,
            isWide: true,
            content: this.getCourseDetailHTML()
        });

        this.bindModalEvents();
    },

    async loadCourseDetail(courseId) {
        try {
            const json = await this.apiFetch(`/teacher/${this.teacherId}/courses/${courseId}/modules`);

            this.modules = json.data || [];

            this.materials = this.modules.flatMap(module =>
                (module.materials || []).map(material => ({
                    ...material,
                    module_id: module.id
                }))
            );

            this.questions = this.modules.flatMap(module =>
                (module.questions || [])
                    .map(question => ({
                        ...question,
                        module_id: module.id
                    }))
                    .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
            );
        } catch (error) {
            AppToast.error(error.message);
        }
    },

    getCourseDetailHTML() {
        if (!this.activeModuleId && this.modules.length) {
            this.activeModuleId = this.modules[0].id;
        }

        const contentMap = {
            modul: this.renderModuleManagementSectionHTML(),
            materi: `
                ${this.renderModuleNavigationSectionHTML()}
                ${this.renderWorkspaceSectionHTML()}
            `,
            soal: `
                ${this.renderModuleNavigationSectionHTML()}
                ${this.renderWorkspaceSectionHTML()}
            `,
            ujian: this.renderExamOnlySectionHTML()
        };

        return `
            <div class="space-y-5">
                ${this.renderFeatureStatsHTML()}
                ${contentMap[this.teacherFeatureMode] || contentMap.materi}
            </div>
        `;
    },

    renderFeatureStatsHTML() {
        const totalQuestions = this.questions.filter(item => !item.is_exam).length;
        const totalExamQuestions = this.examQuestions.length;

        const statMap = {
            modul: [
                { label: 'Total Modul', value: this.modules.length, icon: 'fa-folder-open', className: 'bg-emerald-600 shadow-emerald-100' },
                { label: 'Course Aktif', value: this.selectedCourse?.status || 'draft', icon: 'fa-book-open', className: 'bg-indigo-600 shadow-indigo-100', isText: true }
            ],
            materi: [
                { label: 'Total Modul', value: this.modules.length, icon: 'fa-folder-open', className: 'bg-emerald-600 shadow-emerald-100' },
                { label: 'Total Materi', value: this.materials.length, icon: 'fa-file-pdf', className: 'bg-indigo-600 shadow-indigo-100' }
            ],
            soal: [
                { label: 'Total Modul', value: this.modules.length, icon: 'fa-folder-open', className: 'bg-purple-600 shadow-purple-100' },
                { label: 'Total Soal', value: totalQuestions, icon: 'fa-circle-question', className: 'bg-fuchsia-600 shadow-fuchsia-100' }
            ],
            ujian: [
                { label: 'Soal Ujian', value: totalExamQuestions, icon: 'fa-file-circle-check', className: 'bg-blue-600 shadow-blue-100' },
                { label: 'Timer', value: `${this.examSetting?.duration_minutes || 10} menit`, icon: 'fa-clock', className: 'bg-cyan-600 shadow-cyan-100', isText: true }
            ]
        };

        const stats = statMap[this.teacherFeatureMode] || statMap.materi;

        return `
            <div class="grid grid-cols-2 gap-3 md:gap-4">
                ${stats.map(item => `
                    <div class="${item.className} rounded-3xl p-5 shadow-lg">
                        <div class="flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <p class="text-xs font-black text-white/75 uppercase">${item.label}</p>
                                <h3 class="${item.isText ? 'text-lg md:text-xl truncate' : 'text-3xl'} font-black text-white mt-1">${item.value}</h3>
                            </div>
                            <div class="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0">
                                <i class="fas ${item.icon}"></i>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderModuleNavigationSectionHTML() {
        const canCreate = this.permissions?.can_create_material;
        const sortedModules = this.getSortedModules();
        const visibleModules = this.moduleViewMode === 'card' && !this.moduleShowAll
            ? sortedModules.slice(0, 5)
            : sortedModules;

        const featureCopy = this.getFeatureCopy();
        const showAddModule = this.teacherFeatureMode === 'modul' && canCreate;

        return `
            <section id="teacher-module-section" class="bg-white border border-slate-200 rounded-[1.7rem] md:rounded-3xl p-4 md:p-6 shadow-sm">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="w-1.5 h-9 rounded-full bg-blue-600 shrink-0"></span>
                            <h3 class="text-2xl md:text-3xl font-black text-slate-950 truncate">${featureCopy.title}</h3>
                        </div>

                        <p class="text-sm md:text-base text-slate-500 font-semibold leading-relaxed">
                            ${featureCopy.subtitle}
                        </p>
                    </div>

                    ${showAddModule ? `
                        <button id="add-module-btn" class="w-12 h-12 md:w-auto md:px-5 md:py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-black text-sm shrink-0">
                            <i class="fas fa-folder-plus md:mr-2"></i>
                            <span class="hidden md:inline">Tambah Modul</span>
                        </button>
                    ` : ''}
                </div>

                <div class="mt-6 pt-5 border-t border-slate-100">
                    <div class="flex items-start justify-between gap-3 mb-4">
                        <div>
                            <h4 class="text-base font-black text-slate-800">Daftar Modul</h4>
                            <p class="text-xs text-slate-400 font-bold mt-1">
                                ${this.teacherFeatureMode === 'modul' ? 'Drag modul untuk mengganti urutan. Gunakan tombol edit/hapus untuk mengelola modul.' : 'Pilih modul yang ingin dikelola.'}
                            </p>
                        </div>

                        <div class="flex items-center gap-2 shrink-0">
                            <select id="module-sort-select" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-600 focus:outline-none">
                                <option value="order" ${this.moduleSortMode === 'order' ? 'selected' : ''}>Urutan dibuat</option>
                                <option value="alpha" ${this.moduleSortMode === 'alpha' ? 'selected' : ''}>Abjad A-Z</option>
                            </select>

                            <div class="flex gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                                <button data-module-view="card" class="w-9 h-9 rounded-lg text-xs font-black ${this.moduleViewMode === 'card' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-400'}">
                                    <i class="fas fa-grip"></i>
                                </button>

                                <button data-module-view="list" class="w-9 h-9 rounded-lg text-xs font-black ${this.moduleViewMode === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-400'}">
                                    <i class="fas fa-list"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    ${this.teacherFeatureMode === 'modul'
                        ? this.renderModuleManagementHTML(visibleModules)
                        : this.renderModuleSelectorHTML(visibleModules)
                    }

                    ${
                        this.moduleViewMode === 'card' && sortedModules.length > 5
                            ? `
                                <div class="mt-4 flex justify-center">
                                    <button id="toggle-module-show-btn" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black">
                                        ${this.moduleShowAll ? 'Tampilkan lebih sedikit' : `Munculkan lainnya (${sortedModules.length - 5})`}
                                    </button>
                                </div>
                            `
                            : ''
                    }
                </div>
            </section>
        `;
    },

    renderModuleManagementSectionHTML() {
        return this.renderModuleNavigationSectionHTML();
    },

    renderWorkspaceSectionHTML() {
        return `
            <section id="teacher-workspace-section" class="bg-white border border-slate-200 rounded-[1.7rem] md:rounded-3xl p-4 md:p-6 min-h-[420px] shadow-sm">
                ${this.renderWorkspaceContentHTML()}
            </section>
        `;
    },

    renderExamOnlySectionHTML() {
        return `
            <div id="teacher-exam-section">
                ${this.renderCourseExamSectionHTML()}
            </div>
        `;
    },

    renderModuleManagementHTML(modules) {
        if (!modules.length) {
            return `
                <div class="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center">
                    <div class="w-14 h-14 mx-auto rounded-2xl bg-white text-slate-400 flex items-center justify-center text-xl mb-4">
                        <i class="fas fa-folder"></i>
                    </div>
                    <h4 class="font-black text-slate-800">Belum ada modul</h4>
                    <p class="text-sm text-slate-400 font-semibold mt-1">Klik tombol tambah modul untuk membuat modul pertama.</p>
                </div>
            `;
        }

        const gridClass = this.moduleViewMode === 'list'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'
            : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3';

        return `
            <div class="${gridClass}" id="module-sortable-area">
                ${modules.map(module => this.renderModuleManagementItem(module)).join('')}
            </div>
        `;
    },

    renderModuleManagementItem(module) {
        const moduleMaterials = this.materials.filter(item => item.module_id === module.id).length;
        const moduleQuestions = this.questions.filter(item => item.module_id === module.id && !item.is_exam).length;

        return `
            <div 
                draggable="true"
                data-module-drag-id="${module.id}"
                class="module-draggable bg-white border border-amber-100 hover:bg-amber-50 rounded-3xl p-4 transition"
            >
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-base mb-4">
                            ${this.getModuleInitial(module.title)}
                        </div>
                        <h5 class="font-black text-sm text-slate-900 line-clamp-1">${module.title || 'Tanpa Judul'}</h5>
                        <p class="text-[11px] font-bold text-slate-400 mt-1">Urutan ${module.order_index || 0}</p>
                    </div>

                    <div class="flex items-center gap-1 shrink-0">
                        ${this.permissions?.can_update_material ? `
                            <button data-edit-module="${module.id}" class="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200" title="Edit modul">
                                <i class="fas fa-pen text-sm"></i>
                            </button>
                        ` : ''}

                        ${this.permissions?.can_delete_material ? `
                            <button data-delete-module="${module.id}" class="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200" title="Hapus modul">
                                <i class="fas fa-trash text-sm"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
                    <div class="rounded-2xl bg-slate-50 p-3">
                        <p class="text-[10px] uppercase font-black text-slate-400">Materi</p>
                        <p class="text-lg font-black text-slate-900">${moduleMaterials}</p>
                    </div>
                    <div class="rounded-2xl bg-slate-50 p-3">
                        <p class="text-[10px] uppercase font-black text-slate-400">Soal</p>
                        <p class="text-lg font-black text-slate-900">${moduleQuestions}</p>
                    </div>
                </div>
            </div>
        `;
    },

    renderCourseExamSectionHTML() {
        return TeacherExamWorkspace.render({
            examQuestions: this.examQuestions,
            setting: this.examSetting,
            permissions: this.permissions
        });
    },

    renderModuleSelectorHTML(modules) {
        if (!modules.length) {
            return `
                <div class="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center">
                    <div class="w-14 h-14 mx-auto rounded-2xl bg-white text-slate-400 flex items-center justify-center text-xl mb-4">
                        <i class="fas fa-folder"></i>
                    </div>
                    <h4 class="font-black text-slate-800">Belum ada modul</h4>
                    <p class="text-sm text-slate-400 font-semibold mt-1">Tambahkan modul pertama untuk course ini.</p>
                </div>
            `;
        }

        if (this.moduleViewMode === 'list') {
            return `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3" id="module-sortable-area">
                    ${modules.map(module => this.renderModuleSelectorItem(module, 'list')).join('')}
                </div>
            `;
        }

        return `
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" id="module-sortable-area">
                ${modules.map(module => this.renderModuleSelectorItem(module, 'card')).join('')}
            </div>
        `;
    },

    renderModuleSelectorItem(module, mode = 'card') {
        const isActive = this.activeModuleId === module.id;

        if (mode === 'list') {
            return `
                <button 
                    draggable="true"
                    data-module-drag-id="${module.id}"
                    data-workspace-module="${module.id}" 
                    class="module-draggable text-left rounded-2xl border p-3 transition ${
                        isActive
                            ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                            : 'bg-white border-amber-100 hover:bg-amber-50'
                    }"
                >
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                            isActive ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'
                        }">
                            ${this.getModuleInitial(module.title)}
                        </div>

                        <div class="min-w-0">
                            <h5 class="font-black text-sm text-slate-900 truncate">${module.title}</h5>
                            <p class="text-[11px] font-bold text-slate-400 truncate">
                                Urutan ${module.order_index || 0}
                            </p>
                        </div>
                    </div>
                </button>
            `;
        }

        return `
            <button 
                draggable="true"
                data-module-drag-id="${module.id}"
                data-workspace-module="${module.id}" 
                class="module-draggable text-left rounded-3xl border p-4 min-h-[135px] transition ${
                    isActive
                        ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                        : 'bg-white border-amber-100 hover:bg-amber-50'
                }"
            >
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base mb-4 ${
                    isActive ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'
                }">
                    ${this.getModuleInitial(module.title)}
                </div>

                <h5 class="font-black text-sm text-slate-900 line-clamp-1">${this.getModuleInitial(module.title)}</h5>
                <p class="text-[11px] font-bold text-slate-400 line-clamp-2 mt-1">
                    ${this.getModuleSubtitle(module.title)}
                </p>
            </button>
        `;
    },

    renderPermissionBadge(label, isAllowed, color = 'blue') {
        const colorMap = {
            blue: isAllowed ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100',
            amber: isAllowed ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100',
            rose: isAllowed ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-100'
        };

        return `
            <span class="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-black ${colorMap[color]}">
                <i class="fas ${isAllowed ? 'fa-check-circle' : 'fa-circle-xmark'}"></i>
                ${label}
            </span>
        `;
    },

    getModuleInitial(title = '') {
        const words = title.trim().split(' ').filter(Boolean);

        if (!words.length) return 'M';

        if (words.length === 1) {
            return words[0].slice(0, 2).toUpperCase();
        }

        return words
            .slice(0, 2)
            .map(word => word[0])
            .join('')
            .toUpperCase();
    },

    getSortedModules() {
        const modules = [...this.modules];

        if (this.moduleSortMode === 'alpha') {
            return modules.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
        }

        return modules.sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));
    },

    getModuleSubtitle(title = '') {
        if (!title) return 'Tanpa judul';

        return title.length > 20 ? `${title.slice(0, 20)}...` : title;
    },

    moveItemById(items, draggedId, targetId) {
        const cloned = [...items];

        const fromIndex = cloned.findIndex(item => item.id === draggedId);
        const toIndex = cloned.findIndex(item => item.id === targetId);

        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
            return cloned;
        }

        const [movedItem] = cloned.splice(fromIndex, 1);
        cloned.splice(toIndex, 0, movedItem);

        return cloned.map((item, index) => ({
            ...item,
            order_index: index + 1
        }));
    },

    renderWorkspaceContentHTML() {
        if (this.activeWorkspaceMode === 'soal') {
            const selectedModule = this.modules.find(item => item.id === this.activeModuleId);
            const moduleQuestions = this.questions
                .filter(item => item.module_id === this.activeModuleId && !item.is_exam)
                .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));

            return TeacherQuestionWorkspace.render({
                module: selectedModule,
                questions: moduleQuestions,
                permissions: this.permissions
            });
        }

        const selectedModule = this.modules.find(item => item.id === this.activeModuleId);
        const moduleMaterials = this.materials
        .filter(item => item.module_id === this.activeModuleId)
        .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));

        const keyword = this.materialSearchKeyword.toLowerCase();
        const filteredMaterials = moduleMaterials.filter(item =>
            item.title?.toLowerCase().includes(keyword) ||
            item.pdf_content_url?.toLowerCase().includes(keyword)
        );

        const totalPage = Math.max(1, Math.ceil(filteredMaterials.length / this.materialLimit));

        if (this.materialCurrentPage > totalPage) {
            this.materialCurrentPage = totalPage;
        }

        const start = (this.materialCurrentPage - 1) * this.materialLimit;
        const paginatedMaterials = filteredMaterials.slice(start, start + this.materialLimit);

        return `
            <div class="space-y-4">
                <div class="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="w-1.5 h-8 rounded-full bg-emerald-500 shrink-0"></span>
                            <h3 class="text-xl md:text-2xl font-black text-slate-950 truncate">
                                <span class="text-slate-400">Modul:</span>
                                <span class="text-emerald-600">${selectedModule?.title || 'Pilih Modul'}</span>
                            </h3>
                        </div>

                        <p class="text-xs md:text-sm text-slate-400 font-semibold leading-relaxed">
                            Detail materi PDF berdasarkan modul yang sedang dipilih.
                        </p>
                    </div>

                    ${this.permissions?.can_create_material && selectedModule ? `
                        <button data-add-material="${selectedModule.id}" class="w-11 h-11 md:w-auto md:px-4 md:py-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 font-black text-sm shrink-0">
                            <i class="fas fa-plus"></i>
                            <span class="hidden md:inline ml-2">Materi</span>
                        </button>
                    ` : ''}
                </div>

                <div class="flex items-center gap-2">
                    <div class="relative flex-1 min-w-0">
                        <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                        <input 
                            id="material-search-input"
                            value="${this.materialSearchKeyword}"
                            class="w-full pl-10 pr-3 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-blue-100"
                            placeholder="Cari materi..."
                        >
                    </div>

                    <div class="flex gap-1 bg-slate-50 border border-slate-200 rounded-2xl p-1 shrink-0">
                        <button data-material-view="card" class="w-10 h-10 rounded-xl font-black text-sm transition ${
                            this.materialViewMode === 'card'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-slate-400'
                        }">
                            <i class="fas fa-grip"></i>
                        </button>

                        <button data-material-view="list" class="w-10 h-10 rounded-xl font-black text-sm transition ${
                            this.materialViewMode === 'list'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-slate-400'
                        }">
                            <i class="fas fa-list"></i>
                        </button>
                    </div>
                </div>

                ${this.renderMaterialsByView(paginatedMaterials)}

                <div class="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <p class="text-xs md:text-sm text-slate-400 font-semibold">
                        ${filteredMaterials.length} materi
                    </p>

                    <div class="flex items-center gap-2">
                        <button data-material-page="${this.materialCurrentPage - 1}" ${this.materialCurrentPage <= 1 ? 'disabled' : ''} class="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">
                            Prev
                        </button>

                        <span class="px-3 py-2 rounded-xl bg-slate-50 text-slate-600 font-bold text-xs">
                            ${this.materialCurrentPage}/${totalPage}
                        </span>

                        <button data-material-page="${this.materialCurrentPage + 1}" ${this.materialCurrentPage >= totalPage ? 'disabled' : ''} class="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">
                            Next
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderMaterialsByView(materials) {
        if (!materials.length) {
            return `
                <div class="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center">
                    <div class="w-14 h-14 mx-auto rounded-2xl bg-white text-slate-400 flex items-center justify-center text-xl mb-4">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <h4 class="font-black text-slate-800">Materi tidak ditemukan</h4>
                    <p class="text-sm text-slate-400 font-semibold mt-1">Coba ubah keyword atau tambah materi baru.</p>
                </div>
            `;
        }

        if (this.materialViewMode === 'list') {
            return `
                <div class="space-y-2" id="material-sortable-area">
                    ${materials.map(material => `
                        <div 
                            draggable="true"
                            data-material-drag-id="${material.id}"
                            class="material-draggable flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3 md:p-4"
                        >
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                                    <i class="fas fa-file-pdf"></i>
                                </div>

                                <div class="min-w-0">
                                    <h4 class="font-black text-sm md:text-base text-slate-950 truncate">${material.title}</h4>
                                    <a href="${material.pdf_content_url || '#'}" target="_blank" class="text-xs text-blue-600 font-bold truncate block">
                                        ${material.pdf_content_url ? 'Buka PDF' : 'Belum ada file'}
                                    </a>
                                </div>
                            </div>

                            ${this.renderMaterialActions(material)}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return `
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4" id="material-sortable-area">
                ${materials.map(material => `
                    <div 
                        draggable="true"
                        data-material-drag-id="${material.id}"
                        class="material-draggable bg-slate-50 border border-slate-200 rounded-3xl p-4 md:p-5 hover:shadow-lg transition"
                    >
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <div class="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-lg mb-4">
                                    <i class="fas fa-file-pdf"></i>
                                </div>

                                <h4 class="font-black text-slate-950 line-clamp-1">${material.title}</h4>
                                <a href="${material.pdf_content_url || '#'}" target="_blank" class="text-xs text-blue-600 font-bold mt-1 block line-clamp-1">
                                    ${material.pdf_content_url ? 'Buka PDF materi' : 'Belum ada file'}
                                </a>
                            </div>

                            <div class="md:hidden">
                                ${this.renderMaterialActions(material)}
                            </div>
                        </div>

                        <div class="hidden md:flex mt-5 pt-4 border-t border-slate-200 justify-end">
                            ${this.renderMaterialActions(material)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderMaterialActions(material) {
        return `
            <div class="flex items-center gap-1 shrink-0">
                ${this.permissions?.can_update_material ? `
                    <button data-edit-material="${material.id}" class="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200">
                        <i class="fas fa-pen text-sm"></i>
                    </button>
                ` : ''}

                ${this.permissions?.can_delete_material ? `
                    <button data-delete-material="${material.id}" class="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                ` : ''}
            </div>
        `;
    },

    renderModulesHTML() {
        if (!this.modules.length) {
            return `
                <div class="bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-8 text-center">
                    <h3 class="font-black">Belum ada modul</h3>
                    <p class="text-sm text-slate-400 mt-1">Tambahkan modul pertama untuk kursus ini.</p>
                </div>
            `;
        }

        return this.modules.map(module => {
            const moduleMaterials = this.materials.filter(item => item.module_id === module.id);
            const moduleTasks = this.questions.filter(q => q.module_id === module.id && !q.is_exam).length;
            const moduleExams = this.questions.filter(q => q.module_id === module.id && q.is_exam).length;

            return `
                <div class="bg-white border border-slate-200 rounded-3xl p-5">
                    <div class="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <h4 class="text-lg font-black">${module.title || 'Tanpa Judul'}</h4>
                            <p class="text-sm text-slate-400">Urutan modul: ${module.order_index || 0}</p>
                        </div>

                        <div class="flex gap-2">
                            ${this.permissions?.can_update_material ? `
                                <button data-edit-module="${module.id}" class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700">
                                    <i class="fas fa-pen"></i>
                                </button>
                            ` : ''}

                            ${this.permissions?.can_delete_material ? `
                                <button data-delete-module="${module.id}" class="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-600">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-3 mb-5">
                        <div class="bg-slate-50 rounded-2xl p-4 text-center">
                            <p class="text-xs font-black text-slate-400">Materi</p>
                            <h5 class="text-xl font-black">${moduleMaterials.length}</h5>
                        </div>

                        <div class="bg-slate-50 rounded-2xl p-4 text-center">
                            <p class="text-xs font-black text-slate-400">Soal/Tugas</p>
                            <h5 class="text-xl font-black">${moduleTasks}</h5>
                        </div>

                        <div class="bg-slate-50 rounded-2xl p-4 text-center">
                            <p class="text-xs font-black text-slate-400">Ujian</p>
                            <h5 class="text-xl font-black">${moduleExams}</h5>
                        </div>
                    </div>

                    <div class="space-y-2">
                        ${moduleMaterials.map(material => `
                            <div class="flex items-center justify-between gap-3 bg-slate-50 rounded-2xl px-4 py-3">
                                <div>
                                    <h5 class="font-black text-sm">${material.title}</h5>
                                    ${
                                        material.pdf_content_url
                                            ? `<a href="${material.pdf_content_url}" target="_blank" class="text-xs text-blue-600 font-bold">Lihat materi</a>`
                                            : `<p class="text-xs text-slate-400 font-bold">Belum ada file/link</p>`
                                    }
                                </div>

                                <div class="flex gap-2">
                                    ${this.permissions?.can_update_material ? `
                                        <button data-edit-material="${material.id}" class="text-slate-500 hover:text-blue-600">
                                            <i class="fas fa-pen"></i>
                                        </button>
                                    ` : ''}

                                    ${this.permissions?.can_delete_material ? `
                                        <button data-delete-material="${material.id}" class="text-slate-500 hover:text-red-600">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}

                        ${this.permissions?.can_create_material ? `
                            <button data-add-material="${module.id}" class="w-full rounded-2xl border border-dashed border-blue-300 text-blue-600 py-3 font-black text-sm hover:bg-blue-50">
                                <i class="fas fa-plus mr-2"></i>Tambah Materi
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    refreshWorkspace() {
        const modalContent = document.querySelector('#modal-root .flex-1 .p-4, #modal-root .flex-1 .md\\:p-7');
        if (!modalContent) return;

        modalContent.innerHTML = this.getCourseDetailHTML();
        this.bindModalEvents();
    },

    bindModalEvents() {
        document.getElementById('add-module-btn')?.addEventListener('click', () => {
            this.showModuleForm();
        });

        this.bindWorkspaceEvents();
    },

    bindWorkspaceEvents() {
        document.querySelectorAll('[data-workspace-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeWorkspaceMode = btn.dataset.workspaceMode;

                if (!this.activeModuleId && this.modules.length) {
                    this.activeModuleId = this.modules[0].id;
                }

                this.refreshWorkspace();
            });
        });

        document.getElementById('teacher-workspace-mode')?.addEventListener('change', e => {
            this.activeWorkspaceMode = e.target.value;

            if (this.activeWorkspaceMode !== 'ujian' && !this.activeModuleId && this.modules.length) {
                this.activeModuleId = this.modules[0].id;
            }

            this.refreshWorkspace();
        });

        document.querySelectorAll('[data-workspace-module]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeModuleId = btn.dataset.workspaceModule;
                this.materialCurrentPage = 1;
                this.materialSearchKeyword = '';
                this.refreshWorkspace();
            });
        });

        document.querySelectorAll('[data-edit-module]').forEach(btn => {
            btn.addEventListener('click', event => {
                event.stopPropagation();
                const module = this.modules.find(item => item.id === btn.dataset.editModule);
                if (module) this.showModuleForm(module);
            });
        });

        document.querySelectorAll('[data-delete-module]').forEach(btn => {
            btn.addEventListener('click', event => {
                event.stopPropagation();
                const module = this.modules.find(item => item.id === btn.dataset.deleteModule);

                AppConfirmModal.open({
                    title: 'Hapus modul?',
                    message: `Modul "${module?.title || 'ini'}" akan dihapus. Pastikan materi dan soal di dalamnya sudah dikosongkan.`,
                    type: 'danger',
                    confirmText: 'Hapus',
                    onConfirm: async () => {
                        await this.deleteModule(btn.dataset.deleteModule);
                    }
                });
            });
        });

        document.querySelectorAll('[data-add-material]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showMaterialForm(btn.dataset.addMaterial);
            });
        });

        document.querySelectorAll('[data-edit-material]').forEach(btn => {
            btn.addEventListener('click', () => {
                const material = this.materials.find(item => item.id === btn.dataset.editMaterial);
                this.showMaterialForm(material.module_id, material);
            });
        });

        document.querySelectorAll('[data-delete-material]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deleteMaterial(btn.dataset.deleteMaterial);
            });
        });

        document.querySelectorAll('[data-material-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.materialViewMode = btn.dataset.materialView;
                this.materialCurrentPage = 1;
                this.refreshWorkspace();
            });
        });

        document.getElementById('material-search-input')?.addEventListener('input', e => {
            clearTimeout(this.searchDebounce);

            this.searchDebounce = setTimeout(() => {
                this.materialSearchKeyword = e.target.value;
                this.materialCurrentPage = 1;
                this.refreshWorkspace();
            }, 250);
        });

        document.querySelectorAll('[data-material-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPage = Number(btn.dataset.materialPage);
                if (targetPage < 1) return;

                this.materialCurrentPage = targetPage;
                this.refreshWorkspace();
            });
        });

        document.getElementById('module-sort-select')?.addEventListener('change', e => {
            this.moduleSortMode = e.target.value;
            this.moduleShowAll = false;
            this.refreshWorkspace();
        });

        document.querySelectorAll('[data-module-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.moduleViewMode = btn.dataset.moduleView;
                this.moduleShowAll = false;
                this.refreshWorkspace();
            });
        });

        document.getElementById('toggle-module-show-btn')?.addEventListener('click', () => {
            this.moduleShowAll = !this.moduleShowAll;
            this.refreshWorkspace();
        });

        TeacherQuestionWorkspace.bindEvents({
            onAddQuestion: () => {
                const moduleQuestions = this.questions
                    .filter(item => item.module_id === this.activeModuleId && !item.is_exam)
                    .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));

                TeacherQuestionModal.open({
                    teacherId: this.teacherId,
                    moduleId: this.activeModuleId,
                    questions: moduleQuestions,
                    onSuccess: async () => {
                        await this.loadCourseDetail(this.selectedCourse.id);
                        this.refreshWorkspace();
                    }
                });
            },

            onEditQuestions: () => {
                const moduleQuestions = this.questions
                    .filter(item => item.module_id === this.activeModuleId && !item.is_exam)
                    .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));

                TeacherQuestionModal.openBulkOverlay({
                    teacherId: this.teacherId,
                    moduleId: this.activeModuleId,
                    existingQuestions: moduleQuestions,
                    mode: 'sync',
                    onSuccess: async () => {
                        await this.loadCourseDetail(this.selectedCourse.id);
                        this.refreshWorkspace();
                    }
                });
            },

            onDeleteQuestions: () => {
                const moduleQuestions = this.questions
                    .filter(item => item.module_id === this.activeModuleId && !item.is_exam)
                    .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));

                if (!moduleQuestions.length) {
                    return AppToast.warning('Belum ada soal yang bisa dihapus.');
                }

                if (moduleQuestions.length === 1) {
                    AppConfirmModal.open({
                        title: 'Hapus soal?',
                        message: 'Soal ini akan dihapus permanen.',
                        type: 'danger',
                        confirmText: 'Hapus',
                        onConfirm: async () => {
                            try {
                                await TeacherQuestionApi.deleteQuestions({
                                    teacherId: this.teacherId,
                                    moduleId: this.activeModuleId,
                                    questionIds: [moduleQuestions[0].id]
                                });

                                AppToast.success('Soal berhasil dihapus.');

                                await this.loadCourseDetail(this.selectedCourse.id);
                                this.refreshWorkspace();
                            } catch (error) {
                                AppToast.error(error.message);
                            }
                        }
                    });

                    return;
                }

                TeacherQuestionModal.openDeleteSelector({
                    questions: moduleQuestions,
                    onDelete: async selectedIds => {
                        try {
                            await TeacherQuestionApi.deleteQuestions({
                                teacherId: this.teacherId,
                                moduleId: this.activeModuleId,
                                questionIds: selectedIds
                            });

                            AppToast.success('Soal terpilih berhasil dihapus.');

                            await this.loadCourseDetail(this.selectedCourse.id);
                            this.refreshWorkspace();
                        } catch (error) {
                            AppToast.error(error.message);
                        }
                    }
                });
            }
        });
        TeacherExamWorkspace.bindEvents({
            onAdd: () => {
                TeacherQuestionModal.open({
                    teacherId: this.teacherId,
                    courseId: this.selectedCourse.id,
                    questions: this.examQuestions,
                    variant: 'exam',
                    onSuccess: async () => {
                        await this.loadCourseExam(this.selectedCourse.id);
                        this.refreshWorkspace();
                    }
                });
            },

            onView: () => {
                TeacherQuestionModal.openPreviewModal({
                    title: 'Preview Soal Ujian',
                    subtitle: 'Soal ujian yang akan dikerjakan siswa.',
                    questions: this.examQuestions,
                    theme: 'blue'
                });
            },

            onSimulate: () => {
                ExamSimulator.open({
                    title: this.selectedCourse?.title
                        ? `Ujian ${this.selectedCourse.title}`
                        : 'Ujian Course',
                    questions: this.examQuestions,
                    durationMinutes: this.examSetting?.duration_minutes || 10
                });
            },

            onEdit: () => {
                TeacherQuestionModal.openBulkOverlay({
                    teacherId: this.teacherId,
                    courseId: this.selectedCourse.id,
                    existingQuestions: this.examQuestions,
                    mode: 'sync',
                    variant: 'exam',
                    onSuccess: async () => {
                        await this.loadCourseExam(this.selectedCourse.id);
                        this.refreshWorkspace();
                    }
                });
            },

            onDelete: () => {
                if (!this.examQuestions.length) {
                    return AppToast.warning('Belum ada soal ujian.');
                }

                if (this.examQuestions.length === 1) {
                    AppConfirmModal.open({
                        title: 'Hapus soal ujian?',
                        message: 'Soal ujian ini akan dihapus permanen.',
                        type: 'danger',
                        confirmText: 'Hapus',
                        onConfirm: async () => {
                            try {
                                await TeacherExamApi.deleteExamQuestions({
                                    teacherId: this.teacherId,
                                    courseId: this.selectedCourse.id,
                                    questionIds: [this.examQuestions[0].id]
                                });

                                AppToast.success('Soal ujian berhasil dihapus.');
                                await this.loadCourseExam(this.selectedCourse.id);
                                this.refreshWorkspace();
                            } catch (error) {
                                AppToast.error(error.message);
                            }
                        }
                    });

                    return;
                }

                TeacherQuestionModal.openDeleteSelector({
                        title: 'Pilih Soal Ujian yang Dihapus',
                        subtitle: 'Pilih satu atau beberapa soal ujian.',
                        questions: this.examQuestions,
                        onDelete: async selectedIds => {
                            try {
                                await TeacherExamApi.deleteExamQuestions({
                                    teacherId: this.teacherId,
                                    courseId: this.selectedCourse.id,
                                    questionIds: selectedIds
                                });

                                AppToast.success('Soal ujian terpilih berhasil dihapus.');
                                await this.loadCourseExam(this.selectedCourse.id);
                                this.refreshWorkspace();
                            } catch (error) {
                                AppToast.error(error.message);
                            }
                        }
                    });
                },

                onSettingTimer: () => {
                    TeacherQuestionModal.openExamTimerModal({
                        teacherId: this.teacherId,
                        courseId: this.selectedCourse.id,
                        currentDuration: this.examSetting?.duration_minutes || 10,
                        onSuccess: async () => {
                            await this.loadCourseExam(this.selectedCourse.id);
                            this.refreshWorkspace();
                        }
                    });
                }
            });
                this.bindModuleDragEvents();
                this.bindMaterialDragEvents();
            },

    

    bindModuleDragEvents() {
        const items = document.querySelectorAll('.module-draggable');
        let draggedId = null;

        items.forEach(item => {
            item.addEventListener('dragstart', e => {
                if (this.isSavingModuleOrder) {
                    e.preventDefault();
                    AppToast.warning('Tunggu urutan modul sebelumnya selesai disimpan.');
                    return;
                }

                draggedId = item.dataset.moduleDragId;
                item.classList.add('dragging-card');

                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', draggedId);
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging-card');
                document.querySelectorAll('.drag-over-card').forEach(el => {
                    el.classList.remove('drag-over-card');
                });

                draggedId = null;
            });

            item.addEventListener('dragenter', e => {
                e.preventDefault();

                const targetId = item.dataset.moduleDragId;

                if (!draggedId || draggedId === targetId) return;

                item.classList.add('drag-over-card');
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over-card');
            });

            item.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            item.addEventListener('drop', e => {
                e.preventDefault();

                item.classList.remove('drag-over-card');

                const targetId = item.dataset.moduleDragId;

                if (!draggedId || !targetId || draggedId === targetId) return;

                this.modules = this.moveItemById(this.getSortedModules(), draggedId, targetId);

                this.queueModuleReorderSave();
                this.refreshWorkspace();
            });
        });
    },

    bindMaterialDragEvents() {
        const items = document.querySelectorAll('.material-draggable');
        let draggedId = null;

        items.forEach(item => {
            item.addEventListener('dragstart', e => {
                if (this.isSavingMaterialOrder) {
                    e.preventDefault();
                    AppToast.warning('Tunggu urutan materi sebelumnya selesai disimpan.');
                    return;
                }

                draggedId = item.dataset.materialDragId;
                item.classList.add('dragging-card');

                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', draggedId);
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging-card');
                document.querySelectorAll('.drag-over-card').forEach(el => {
                    el.classList.remove('drag-over-card');
                });

                draggedId = null;
            });

            item.addEventListener('dragenter', e => {
                e.preventDefault();

                const targetId = item.dataset.materialDragId;

                if (!draggedId || draggedId === targetId) return;

                item.classList.add('drag-over-card');
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over-card');
            });

            item.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            item.addEventListener('drop', e => {
                e.preventDefault();

                item.classList.remove('drag-over-card');

                const targetId = item.dataset.materialDragId;

                if (!draggedId || !targetId || draggedId === targetId) return;

                const currentModuleMaterials = this.materials
                    .filter(material => material.module_id === this.activeModuleId)
                    .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));

                const reordered = this.moveItemById(currentModuleMaterials, draggedId, targetId);

                this.materials = this.materials.map(material => {
                    const updatedMaterial = reordered.find(item => item.id === material.id);
                    return updatedMaterial || material;
                });

                this.materials = this.materials.sort((a, b) => {
                    if (a.module_id !== b.module_id) return 0;
                    return Number(a.order_index || 0) - Number(b.order_index || 0);
                });

                this.queueMaterialReorderSave();
                this.refreshWorkspace();
            });
        });
    },

    queueMaterialReorderSave() {
        clearTimeout(this.materialReorderDebounce);

        this.materialReorderDebounce = setTimeout(async () => {
            if (this.isSavingMaterialOrder) return;

            await this.saveMaterialOrder();
        }, 700);
    },

    queueModuleReorderSave() {
        clearTimeout(this.moduleReorderDebounce);

        this.moduleReorderDebounce = setTimeout(async () => {
            if (this.isSavingModuleOrder) return;

            await this.saveModuleOrder();
        }, 700);
    },

    async saveModuleOrder() {
        if (this.isSavingModuleOrder) return;

        try {
            const orderedModules = this.modules
                .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
                .map((module, index) => ({
                    ...module,
                    order_index: index + 1
                }));

            const signature = orderedModules
                .map(module => `${module.id}:${module.order_index}`)
                .join('|');

            if (signature === this.lastModuleOrderSignature) {
                return;
            }

            this.isSavingModuleOrder = true;
            this.lastModuleOrderSignature = signature;

            const payload = {
                course_id: this.selectedCourse.id,
                modules: orderedModules.map(module => ({
                    id: module.id,
                    order_index: module.order_index
                }))
            };

            await this.apiFetch(`/teacher/${this.teacherId}/modules/reorder`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });

            AppToast.success('Urutan modul berhasil diperbarui.');
        } catch (error) {
            AppToast.error(error.message);

            await this.loadCourseDetail(this.selectedCourse.id);
            this.refreshWorkspace();
        } finally {
            this.isSavingModuleOrder = false;
        }
    },

    async saveMaterialOrder() {
        if (this.isSavingMaterialOrder) return;

        try {
            const moduleMaterials = this.materials
                .filter(material => material.module_id === this.activeModuleId)
                .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
                .map((material, index) => ({
                    ...material,
                    order_index: index + 1
                }));

            const signature = moduleMaterials
                .map(material => `${material.id}:${material.order_index}`)
                .join('|');

            if (signature === this.lastMaterialOrderSignature) {
                return;
            }

            this.isSavingMaterialOrder = true;
            this.lastMaterialOrderSignature = signature;

            const payload = {
                module_id: this.activeModuleId,
                materials: moduleMaterials.map(material => ({
                    id: material.id,
                    order_index: material.order_index
                }))
            };

            await this.apiFetch(`/teacher/${this.teacherId}/materials/reorder`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });

            AppToast.success('Urutan materi berhasil diperbarui.');
        } catch (error) {
            AppToast.error(error.message);

            await this.loadCourseDetail(this.selectedCourse.id);
            this.refreshWorkspace();
        } finally {
            this.isSavingMaterialOrder = false;
        }
    },

    showModuleForm(module = null) {
        if (module && !this.permissions?.can_update_material) {
            return AppToast.warning('Anda tidak punya akses update.');
        }

        if (!module && !this.permissions?.can_create_material) {
            return AppToast.warning('Anda tidak punya akses create.');
        }

        TeacherChildModal.open({
            title: module ? 'Edit Modul' : 'Tambah Modul',
            content: `
                <form id="module-form" class="space-y-4">
                    <input 
                        name="title" 
                        value="${module?.title || ''}" 
                        class="w-full px-4 py-3 rounded-2xl border border-slate-200" 
                        placeholder="Judul modul" 
                        required
                    >

                    <input 
                        name="order_index" 
                        type="number" 
                        value="${module?.order_index || 1}" 
                        class="w-full px-4 py-3 rounded-2xl border border-slate-200" 
                        placeholder="Urutan modul"
                    >

                    <button id="btn-save-module" class="w-full bg-blue-600 text-white rounded-2xl py-3 font-black flex items-center justify-center gap-2">
                        <span class="btn-label">Simpan Modul</span>
                        <span class="btn-loading hidden">
                            <i class="fas fa-spinner fa-spin"></i> Menyimpan...
                        </span>
                    </button>
                </form>
            `
        });

        document.getElementById('module-form')?.addEventListener('submit', async e => {
            e.preventDefault();

            if (this.isSubmittingModule) return;
            this.isSubmittingModule = true;

            const submitBtn = document.getElementById('btn-save-module');
            const label = submitBtn?.querySelector('.btn-label');
            const loading = submitBtn?.querySelector('.btn-loading');

            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
            label?.classList.add('hidden');
            loading?.classList.remove('hidden');

            const form = new FormData(e.target);

            const payload = {
                title: String(form.get('title') || '').trim(),
                order_index: Number(form.get('order_index') || 0),
                course_id: this.selectedCourse.id
            };

            try {
                if (!payload.title) {
                    throw new Error('Judul modul wajib diisi.');
                }

                if (module) {
                    await this.apiFetch(`/teacher/${this.teacherId}/modules/${module.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                } else {
                    await this.apiFetch(`/teacher/${this.teacherId}/modules`, {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                }

                AppToast.success('Modul berhasil disimpan.');
                TeacherChildModal.close();
                await this.openCourseDetail(this.selectedCourse);

                if (!module && this.modules.length) {
                    this.activeModuleId = this.modules[this.modules.length - 1].id;
                }

                this.refreshWorkspace();
            } catch (error) {
                AppToast.error(error.message);
            } finally {
                this.isSubmittingModule = false;

                submitBtn.disabled = false;
                submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
                label?.classList.remove('hidden');
                loading?.classList.add('hidden');
            }
        });
    },

    showMaterialForm(moduleId, material = null) {
        if (material && !this.permissions?.can_update_material) {
            return AppToast.warning('Anda tidak punya akses update.');
        }

        if (!material && !this.permissions?.can_create_material) {
            return AppToast.warning('Anda tidak punya akses create.');
        }

        TeacherChildModal.open({
            title: material ? 'Edit Materi' : 'Tambah Materi',
            content: `
                <form id="material-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-black mb-2">Nama Materi</label>
                        <input 
                            name="title"
                            value="${material?.title || ''}"
                            class="w-full px-4 py-3 rounded-2xl border border-slate-200"
                            placeholder="Contoh: Pengenalan Komputer"
                            required
                        >
                    </div>

                    <div>
                        <label class="block text-sm font-black mb-2">Urutan Materi</label>
                        <input 
                            name="order_index"
                            type="number"
                            value="${material?.order_index || 1}"
                            class="w-full px-4 py-3 rounded-2xl border border-slate-200"
                            placeholder="Urutan materi"
                        >
                    </div>

                    <div>
                        <label class="block text-sm font-black mb-2">Upload PDF</label>
                        <input 
                            name="pdf"
                            type="file"
                            accept="application/pdf"
                            class="w-full px-4 py-3 rounded-2xl border border-slate-200"
                            ${material ? '' : 'required'}
                        >
                        <p class="text-xs text-slate-400 mt-2">
                            File wajib PDF. Klik materi nanti akan membuka PDF di tab baru.
                        </p>
                    </div>

                    ${material?.pdf_content_url ? `
                        <a href="${material.pdf_content_url}" target="_blank" class="block text-sm text-blue-600 font-bold">
                            Lihat PDF saat ini
                        </a>
                    ` : ''}

                    <button id="btn-save-material" class="w-full bg-blue-600 text-white rounded-2xl py-3 font-black flex items-center justify-center gap-2">
                        <span class="btn-label">Simpan Materi</span>
                        <span class="btn-loading hidden">
                            <i class="fas fa-spinner fa-spin"></i> Menyimpan...
                        </span>
                    </button>
                </form>
            `
        });

        document.getElementById('material-form')?.addEventListener('submit', async e => {
            e.preventDefault();

            if (this.isSubmitting) return;
            this.isSubmitting = true;

            const form = e.target;
            const submitBtn = document.getElementById('btn-save-material');
            const label = submitBtn?.querySelector('.btn-label');
            const loading = submitBtn?.querySelector('.btn-loading');

            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
            label?.classList.add('hidden');
            loading?.classList.remove('hidden');

            try {
                const formData = new FormData(form);
                const title = String(formData.get('title') || '').trim();

                const duplicated = this.materials.some(item =>
                    item.module_id === moduleId &&
                    item.title?.trim().toLowerCase() === title.toLowerCase() &&
                    item.id !== material?.id
                );

                if (duplicated) {
                    throw new Error('Materi dengan nama ini sudah ada di modul tersebut.');
                }

                formData.set('title', title);
                formData.append('module_id', moduleId);

                const endpoint = material
                    ? `/teacher/${this.teacherId}/materials/${material.id}`
                    : `/teacher/${this.teacherId}/materials`;

                const method = material ? 'PUT' : 'POST';

                const uploadToken = localStorage.getItem(CONFIG.STORAGE_KEY);

                const res = await fetch(`${API_URL}${endpoint}`, {
                    method,
                    headers: uploadToken ? { Authorization: `Bearer ${uploadToken}` } : {},
                    body: formData
                });

                const json = await res.json();

                if (!res.ok || json.status === 'error') {
                    throw new Error(json.message || 'Gagal menyimpan materi.');
                }

                TeacherChildModal.close();
                AppToast.success('Materi berhasil disimpan.');

                await this.loadCourseDetail(this.selectedCourse.id);
                this.refreshWorkspace();
            } catch (error) {
                AppToast.error(error.message);
            } finally {
                this.isSubmitting = false;

                submitBtn.disabled = false;
                submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
                label?.classList.remove('hidden');
                loading?.classList.add('hidden');
            }
        });
    },

    async deleteModule(moduleId) {
        if (!this.permissions?.can_delete_material) {
            return AppToast.warning('Anda tidak punya akses delete.');
        }

        const hasMaterials = this.materials.some(item => item.module_id === moduleId);

        if (hasMaterials) {
            return AppToast.warning('Hapus materi di dalam modul terlebih dahulu.');
        }

        try {
            await this.apiFetch(`/teacher/${this.teacherId}/modules/${moduleId}`, {
                method: 'DELETE'
            });

            AppToast.success('Modul berhasil dihapus.');
            await this.openCourseDetail(this.selectedCourse);
        } catch (error) {
            AppToast.error(error.message);
        }
    },

    async deleteMaterial(materialId) {
        if (!this.permissions?.can_delete_material) {
            return AppToast.warning('Anda tidak punya akses delete.');
        }

        try {
            await this.apiFetch(`/teacher/${this.teacherId}/materials/${materialId}`, {
                method: 'DELETE'
            });

            AppToast.success('Materi berhasil dihapus.');
            await this.openCourseDetail(this.selectedCourse);
        } catch (error) {
            AppToast.error(error.message);
        }
    }
};
