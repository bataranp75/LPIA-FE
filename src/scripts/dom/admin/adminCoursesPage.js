import { HTTP } from '../../fetch/http.js';
import { AppToast } from '../../components/toast.js';
import { ReusableModal } from '../../components/reusableModal.js';
import { SidePanel } from '../../components/sidePanel.js';

export const AdminCoursesPage = {
    initialized: false,
    courses: [],
    teachers: [],

    init() {
        if (this.initialized) return;
        this.initialized = true;

        this.grid = document.getElementById('courses-grid');
        this.btnCreate = document.getElementById('btn-create-course');

        if (!this.grid) return;

        this.bindEvents();
        this.loadData();
    },

    bindEvents() {
        this.btnCreate?.addEventListener('click', () => this.openCreateCourseModal());

        document.addEventListener('submit', (e) => this.handleSubmit(e));
        document.addEventListener('click', (e) => this.handleClick(e));
    },

    async loadData() {
        try {
            const [coursesRes, accountsRes] = await Promise.all([
                HTTP.get('/admin/courses'),
                HTTP.get('/admin/accounts')
            ]);

            this.courses = coursesRes.data || [];
            this.teachers = (accountsRes.data || []).filter(user => user.role === 'guru');

            this.renderCourses();
        } catch (error) {
            AppToast.error(error.message || 'Gagal memuat kursus.');
        }
    },

    renderCourses() {
        this.grid.innerHTML = this.courses.map(course => {
            const studentCount = (course.transactions || [])
                .filter(t => t.status_pembayaran === 'success' || t.is_confirmed_by_admin)
                .length;

            const moduleCount = course.modules?.length || 0;

            return `
                <article class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col h-full">
                    <div class="flex items-start justify-between gap-4 mb-5">
                        <div class="flex-1">
                            <h2 class="text-xl font-black line-clamp-2">${course.title}</h2>
                            <p class="text-sm text-slate-500 mt-1">${course.category || 'Tanpa kategori'}</p>
                        </div>

                        <div class="flex flex-col items-end gap-2 shrink-0">
                            <span class="px-3 py-1 rounded-full text-xs font-bold ${course.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} capitalize">
                                ${course.status}
                            </span>
                            <span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 whitespace-nowrap">
                                Rp ${Number(course.price || 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-3 mb-5 mt-auto">
                        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p class="text-xs text-slate-400 font-bold">Guru</p>
                            <p class="font-black text-sm mt-1 truncate" title="${course.teacher?.full_name || '-'}">${course.teacher?.full_name || '-'}</p>
                        </div>

                        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p class="text-xs text-slate-400 font-bold">Murid</p>
                            <p class="font-black text-2xl mt-1 text-blue-600">${studentCount}</p>
                        </div>

                        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p class="text-xs text-slate-400 font-bold">Total Modul</p>
                            <p class="font-black text-2xl mt-1 text-emerald-600">${moduleCount}</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <button class="btn-detail-course flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition"
                            data-id="${course.id}">
                            Detail Kursus
                        </button>

                        <button class="btn-edit-course w-12 h-12 flex items-center justify-center shrink-0 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                            data-id="${course.id}">
                            <i class="fas fa-pen"></i>
                        </button>

                        <button class="btn-toggle-course-status w-12 h-12 flex items-center justify-center shrink-0 rounded-xl transition ${course.status === 'published' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}"
                            data-id="${course.id}"
                            data-status="${course.status === 'published' ? 'draft' : 'published'}">
                            <i class="fas ${course.status === 'published' ? 'fa-box-archive' : 'fa-upload'}"></i>
                        </button>
                    </div>
                </article>
            `;
        }).join('');
    },


    openCreateCourseModal() {
        ReusableModal.open({
            title: 'Buat Kursus Baru',
            content: `
                <form id="form-create-course" class="space-y-4">
                    <input name="title" required placeholder="Judul kursus" class="w-full px-4 py-3 rounded-xl border border-slate-200">
                    <textarea name="description" placeholder="Deskripsi kursus" class="w-full px-4 py-3 rounded-xl border border-slate-200"></textarea>
                    <input name="category" placeholder="Kategori" class="w-full px-4 py-3 rounded-xl border border-slate-200">
                    <input name="price" type="number" required placeholder="Harga" class="w-full px-4 py-3 rounded-xl border border-slate-200">

                    <select name="teacher_id" class="w-full px-4 py-3 rounded-xl border border-slate-200">
                        <option value="">Pilih guru pengampu</option>
                        ${this.teachers.map(teacher => `
                            <option value="${teacher.id}">${teacher.full_name}</option>
                        `).join('')}
                    </select>

                    <input name="certificate_template_url" placeholder="URL template sertifikat" class="w-full px-4 py-3 rounded-xl border border-slate-200">

                    <button class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">
                        Simpan Kursus
                    </button>
                </form>
            `
        });
    },

    async handleSubmit(e) {
        const createForm = e.target.closest('#form-create-course');
        const editForm = e.target.closest('#form-edit-course');

        if (createForm) {
            e.preventDefault();
            await this.createCourse(createForm);
            return;
        }

        if (editForm) {
            e.preventDefault();
            await this.updateCourse(editForm);
            return;
        }
    },

    async createCourse(form) {
        try {
            const payload = Object.fromEntries(new FormData(form).entries());
            payload.price = Number(payload.price || 0);
            if (!payload.teacher_id) payload.teacher_id = null;

            const response = await HTTP.post('/admin/courses', payload);

            if (response.status === 'success') {
                ReusableModal.close();
                AppToast.success('Kursus berhasil dibuat.');
                await this.loadData();
            }
        } catch (error) {
            AppToast.error(error.message || 'Gagal membuat kursus.');
        }
    },

    async updateCourse(form) {
        try {
            const courseId = form.dataset.id;
            const payload = Object.fromEntries(new FormData(form).entries());
            payload.price = Number(payload.price || 0);
            if (!payload.teacher_id) payload.teacher_id = null;

            const response = await HTTP.patch(`/admin/courses/${courseId}`, payload);

            if (response.status === 'success') {
                ReusableModal.close();
                AppToast.success('Kursus berhasil diperbarui.');
                await this.loadData();
            }
        } catch (error) {
            AppToast.error(error.message || 'Gagal memperbarui kursus.');
        }
    },

    handleClick(e) {
        const detailBtn = e.target.closest('.btn-detail-course');
        if (detailBtn) {
            const course = this.courses.find(item => item.id === detailBtn.dataset.id);
            if (course) this.openCourseDetail(course);
        }
        const editBtn = e.target.closest('.btn-edit-course');
        if (editBtn) {
            const course = this.courses.find(item => item.id === editBtn.dataset.id);
            if (course) this.openEditCourseModal(course);
        }

        const statusBtn = e.target.closest('.btn-toggle-course-status');
        if (statusBtn) {
            this.updateCourseStatus(statusBtn.dataset.id, statusBtn.dataset.status);
        }

        const peopleBtn = e.target.closest('.btn-open-course-people');
        if (peopleBtn) {
            const course = this.courses.find(item => item.id === peopleBtn.dataset.id);
            if (course) this.openPeoplePanel(course, peopleBtn.dataset.tab);
        }

        const tabBtn = e.target.closest('.btn-people-tab');
        if (tabBtn) {
            if (this.peoplePanelState) {
                this.peoplePanelState.tab = tabBtn.dataset.tab;
                this.renderPeoplePanel(); // Render ulang panel dengan data tab baru
            }
        }
    },

    openPeoplePanel(course, defaultTab = 'guru') {
        this.peoplePanelState = {
            course,
            tab: defaultTab,
            search: '',
            page: 1
        };

        this.renderPeoplePanel();
    },

    renderPeoplePanel() {
        const { course, tab } = this.peoplePanelState;

        const teachers = course.teacher ? [course.teacher] : [];
        const students = (course.transactions || [])
            .filter(t => t.is_confirmed_by_admin || t.status_pembayaran === 'success')
            .map(t => t.profiles)
            .filter(Boolean);

        const source = tab === 'guru' ? teachers : students;

        SidePanel.open({
            title: `Peserta Kursus: ${course.title}`,
            content: `
                        <div class="space-y-4">
                            ${modules.map((module, index) => {
                                const moduleMaterials = module.materials || [];
                                const moduleQuestions = (module.questions || []).filter(q => !q.is_exam);
                                const moduleExams = (module.questions || []).filter(q => q.is_exam);
                                const displayOrder = module.order_index || (index + 1);

                                return `
                                    <div class="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition">
                                        <div class="bg-gradient-to-r from-blue-50 to-white px-5 py-4 border-b border-slate-100 flex items-center gap-4">
                                            <div class="w-10 h-10 shrink-0 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-lg">
                                                ${displayOrder}
                                            </div>
                                            <div class="flex-1">
                                                <p class="font-black text-slate-800 text-lg">${module.title}</p>
                                                <p class="text-xs text-slate-500 font-medium mt-0.5">Modul ke-${displayOrder}</p>
                                            </div>
                                        </div>

                                        <div class="p-5">
                                            <div class="grid grid-cols-3 gap-3 text-center">
                                                <div class="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                                                    <p class="text-xs font-bold mb-1 opacity-80"><i class="fas fa-book-open mr-1"></i> Materi</p>
                                                    <p class="font-black text-2xl">${moduleMaterials.length}</p>
                                                </div>

                                                <div class="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                                                    <p class="text-xs font-bold mb-1 opacity-80"><i class="fas fa-tasks mr-1"></i> Tugas/Soal</p>
                                                    <p class="font-black text-2xl">${moduleQuestions.length}</p>
                                                </div>

                                                <div class="p-4 rounded-xl border border-purple-200 bg-purple-50 text-purple-700">
                                                    <p class="text-xs font-bold mb-1 opacity-80"><i class="fas fa-file-contract mr-1"></i> Ujian</p>
                                                    <p class="font-black text-2xl">${moduleExams.length}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('') || `
                                <div class="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                    <i class="fas fa-folder-open text-3xl text-slate-300 mb-2"></i>
                                    <p class="text-sm font-medium text-slate-500">Belum ada modul yang ditambahkan oleh guru.</p>
                                </div>
                            `}
                        </div>
            `
        });
    },

    openEditCourseModal(course) {
        ReusableModal.open({
            title: 'Edit Kursus',
            content: `
                <form id="form-edit-course" data-id="${course.id}" class="space-y-4">
                    <input name="title" value="${course.title || ''}" required class="w-full px-4 py-3 rounded-xl border border-slate-200">
                    <textarea name="description" class="w-full px-4 py-3 rounded-xl border border-slate-200">${course.description || ''}</textarea>
                    <input name="category" value="${course.category || ''}" class="w-full px-4 py-3 rounded-xl border border-slate-200">
                    <input name="price" type="number" value="${course.price || 0}" required class="w-full px-4 py-3 rounded-xl border border-slate-200">

                    <select name="teacher_id" class="w-full px-4 py-3 rounded-xl border border-slate-200">
                        <option value="">Pilih guru pengampu</option>
                        ${this.teachers.map(teacher => `
                            <option value="${teacher.id}" ${course.teacher?.id === teacher.id ? 'selected' : ''}>
                                ${teacher.full_name}
                            </option>
                        `).join('')}
                    </select>

                    <input name="certificate_template_url" value="${course.certificate_template_url || ''}" placeholder="URL template sertifikat" class="w-full px-4 py-3 rounded-xl border border-slate-200">

                    <button class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">
                        Simpan Perubahan
                    </button>
                </form>
            `
        });
    },

    async updateCourseStatus(courseId, status) {
        try {
            await HTTP.patch(`/admin/courses/${courseId}/status`, { status });
            AppToast.success(status === 'published' ? 'Kursus berhasil dipublish.' : 'Kursus dikembalikan ke draft.');
            await this.loadData();
        } catch (error) {
            AppToast.error(error.message || 'Gagal mengubah status kursus.');
        }
    },

    openCourseDetail(course) {
        const modules = course.modules || [];

        const studentCount = (course.transactions || [])
            .filter(t => t.status_pembayaran === 'success' || t.is_confirmed_by_admin)
            .length;

        const materialCount = modules.reduce((sum, module) => {
            return sum + (module.materials?.length || 0);
        }, 0);

        const questionCount = modules.reduce((sum, module) => {
            return sum + (module.questions || []).filter(q => !q.is_exam).length;
        }, 0);

        const examCount = modules.reduce((sum, module) => {
            return sum + (module.questions || []).filter(q => q.is_exam).length;
        }, 0);

        ReusableModal.open({
            title: `Detail Kursus: ${course.title}`,
            isWide: true,
            content: `
                <div class="space-y-5">
                    <div class="grid grid-cols-2 gap-3">
                        <button class="btn-open-course-people w-full text-left p-4 rounded-2xl bg-slate-50 border border-slate-100"
                            data-id="${course.id}"
                            data-tab="guru">
                            <p class="text-xs text-slate-400 font-bold">Guru</p>
                            <p class="font-black text-sm mt-1">${course.teacher?.full_name || '-'}</p>
                        </button>

                        <button class="btn-open-course-people w-full text-left p-4 rounded-2xl bg-slate-50 border border-slate-100"
                            data-id="${course.id}"
                            data-tab="murid">
                            <p class="text-xs text-slate-400 font-bold">Murid</p>
                            <p class="font-black text-2xl mt-1">${studentCount}</p>
                        </button>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div class="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                            <p class="text-xs font-bold text-blue-500">Modul</p>
                            <p class="text-2xl font-black">${modules.length}</p>
                        </div>

                        <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                            <p class="text-xs font-bold text-emerald-500">Materi</p>
                            <p class="text-2xl font-black">${materialCount}</p>
                        </div>

                        <div class="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                            <p class="text-xs font-bold text-amber-500">Soal/Tugas</p>
                            <p class="text-2xl font-black">${questionCount}</p>
                        </div>

                        <div class="p-4 rounded-2xl bg-purple-50 border border-purple-100">
                            <p class="text-xs font-bold text-purple-500">Ujian</p>
                            <p class="text-2xl font-black">${examCount}</p>
                        </div>
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="font-black">Monitoring Modul</h3>

                        </div>

                        <div class="space-y-3">
                            ${modules.map(module => {
                                const moduleMaterials = module.materials || [];
                                const moduleQuestions = (module.questions || []).filter(q => !q.is_exam);
                                const moduleExams = (module.questions || []).filter(q => q.is_exam);

                                return `
                                    <div class="p-4 rounded-2xl border border-slate-200">
                                        <div class="flex items-start justify-between gap-3 mb-3">
                                            <div>
                                                <p class="font-black">${module.title}</p>
                                                <p class="text-xs text-slate-400">Urutan modul: ${module.order_index || 0}</p>
                                            </div>

                                            <span class="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                                ${module.status || 'draft'}
                                            </span>
                                        </div>

                                        <div class="grid grid-cols-3 gap-2 text-center">
                                            <div class="p-3 rounded-xl bg-slate-50">
                                                <p class="text-xs text-slate-400 font-bold">Materi</p>
                                                <p class="font-black">${moduleMaterials.length}</p>
                                            </div>

                                            <div class="p-3 rounded-xl bg-slate-50">
                                                <p class="text-xs text-slate-400 font-bold">Soal/Tugas</p>
                                                <p class="font-black">${moduleQuestions.length}</p>
                                            </div>

                                            <div class="p-3 rounded-xl bg-slate-50">
                                                <p class="text-xs text-slate-400 font-bold">Ujian</p>
                                                <p class="font-black">${moduleExams.length}</p>
                                            </div>
                                        </div>

                                    </div>
                                `;
                            }).join('') || '<p class="text-sm text-slate-400">Belum ada modul yang diupload guru.</p>'}
                        </div>
                    </div>
                </div>
            `
        });
    }
};