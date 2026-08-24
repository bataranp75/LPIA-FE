// src/scripts/dom/learnPage.js
import { HTTP } from '../fetch/http.js';
import Swal from 'sweetalert2';
import { CONFIG } from '../config/index.js';

export const LearnDOM = {
    courseId: null,
    data: null,
    sortedModules: [],
    expandedModules: {},
    currentViewId: null,
    quizStartTime: null,
    examAnswers: {},
    examIndex: 0,
    examTimerId: null,
    examRemaining: 0,
    examQuestions: [],

    async init() {
        const page = document.getElementById('learn-page');
        if (!page) return;
        this.courseId = window.location.pathname.split('/')[2];
        await this.fetchData();
        if (this.sortedModules.length > 0) {
            const firstMod = this.sortedModules[0];
            const firstMat = (firstMod.materials || []).sort((a, b) => a.order_index - b.order_index)[0];
            if (firstMat) this.openMaterial(firstMod.id, firstMat.id);
        }
    },

    async fetchData() {
        try {
            const res = await HTTP.get(`/courses/${this.courseId}/learn`);
            this.data = res.data;
            this.sortedModules = this.data.course.modules.sort((a, b) => a.order_index - b.order_index);
            document.title = `Belajar: ${this.data.course.title} | LPIA`;
            document.getElementById('top-course-title').innerText = this.data.course.title;
            if (this.sortedModules.length > 0) {
                this.expandedModules[this.sortedModules[0].id] = true;
            }
            this.renderSidebar();
        } catch (error) {
            // Bedakan pesan error sesuai kondisi (bukan pesan generic).
            let title = 'Terjadi Kesalahan';
            let message = error.message || 'Gagal memuat ruang belajar. Coba lagi nanti.';

            if (error.status === 404) {
                title = 'Course Tidak Ditemukan';
                message = 'Course ini sudah dihapus atau tidak tersedia lagi.';
            } else if (error.status === 403) {
                title = 'Akses Ditolak';
                message = 'Anda belum memiliki akses ke course ini. Silakan beli course terlebih dahulu.';
            } else if (error.status === 401) {
                title = 'Sesi Berakhir';
                message = 'Silakan login kembali untuk melanjutkan belajar.';
            }

            Swal.fire(title, message, error.status === 404 ? 'info' : 'error')
                .then(() => window.location.href = '/profile');
        }
    },

    isMaterialCompleted(materialId) {
        return this.data.progress.some(p => p.material_id === materialId && p.is_completed);
    },
    isQuizCompleted(moduleId) {
        return this.data.progress.some(p => p.module_id === moduleId && p.score !== null);
    },

    getModuleProgress(module) {
        const materials = module.materials || [];
        const totalItems = materials.length + 1;
        let completedItems = 0;
        materials.forEach(mat => { if (this.isMaterialCompleted(mat.id)) completedItems++; });
        if (this.isQuizCompleted(module.id)) completedItems++;
        return {
            percent: Math.round((completedItems / totalItems) * 100),
            isCompleted: completedItems === totalItems
        };
    },

    getCourseProgress() {
        if (!this.sortedModules.length) return 0;
        
        let totalItems = 0;
        let completedItems = 0;
        
        this.sortedModules.forEach(m => {
            const materials = m.materials || [];
            totalItems += materials.length + 1; // +1 for module quiz
            materials.forEach(mat => {
                if (this.isMaterialCompleted(mat.id)) completedItems++;
            });
            if (this.isQuizCompleted(m.id)) completedItems++;
        });
        
        // Add final exam as one item
        const examQuestions = this.data.questions?.filter(q => q.is_exam === true) || [];
        if (examQuestions.length > 0) {
            totalItems += 1; // final exam counts as one item
            if (this.data.examPassed) completedItems += 1;
        }
        
        return Math.round((completedItems / totalItems) * 100);
    },

    areAllModulesCompleted() {
        return this.sortedModules.every(m => this.getModuleProgress(m).isCompleted);
    },

    isModuleUnlocked(index) {
        if (index === 0) return true;
        return this.getModuleProgress(this.sortedModules[index - 1]).isCompleted;
    },

    renderSidebar() {
        const container = document.getElementById('sidebar-modules');
        let totalCoursePercent = 0;

        // Empty state: course belum punya modul sama sekali.
        if (this.sortedModules.length === 0) {
            container.innerHTML = `
                <div class="text-center py-10 px-4">
                    <div class="w-16 h-16 mx-auto bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-2xl mb-4">
                        <i class="fas fa-folder-open"></i>
                    </div>
                    <h4 class="font-bold text-slate-700 text-sm mb-1">Belum Ada Modul</h4>
                    <p class="text-xs text-slate-400">Instruktur belum menambahkan modul untuk kelas ini. Silakan cek kembali nanti.</p>
                </div>`;
            document.getElementById('progress-text').innerText = '0%';
            this.hideAllViews();
            const fb = document.getElementById('view-fallback');
            fb.classList.remove('hidden'); fb.classList.add('flex');
            return;
        }

        container.innerHTML = this.sortedModules.map((m, index) => {
            const prog = this.getModuleProgress(m);
            const isUnlocked = this.isModuleUnlocked(index);
            const isExpanded = this.expandedModules[m.id];
            totalCoursePercent += prog.percent;

            let html = `
                <div class="border border-slate-200 rounded-xl mb-3 overflow-hidden transition-all ${isUnlocked ? 'bg-white shadow-sm' : 'bg-slate-50 opacity-70'}">
                    <div class="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onclick="window.toggleAccordion('${m.id}', ${isUnlocked})">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${prog.isCompleted ? 'bg-green-100 text-green-600' : isUnlocked ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}">
                                ${prog.isCompleted ? '<i class="fas fa-check"></i>' : index + 1}
                            </div>
                            <div>
                                <h4 class="font-bold text-sm text-slate-800 line-clamp-1">${m.title}</h4>
                                <span class="text-[10px] font-bold ${prog.isCompleted ? 'text-green-600' : 'text-blue-500'}">${prog.percent}% Selesai</span>
                            </div>
                        </div>
                        <i class="fas ${isUnlocked ? (isExpanded ? 'fa-chevron-up' : 'fa-chevron-down') : 'fa-lock'} text-slate-400 text-sm"></i>
                    </div>`;

            if (isUnlocked && isExpanded) {
                const materials = (m.materials || []).sort((a, b) => a.order_index - b.order_index);
                html += `<div class="bg-slate-50 border-t border-slate-100 py-2">`;
                if (materials.length === 0) {
                    html += `<div class="px-4 py-3 text-xs text-slate-400 italic">Belum ada materi.</div>`;
                } else {
                    materials.forEach((mat, mIdx) => {
                        const matDone = this.isMaterialCompleted(mat.id);
                        const isActive = this.currentViewId === mat.id;
                        html += `
                            <div class="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors ${isActive ? 'bg-blue-50/50 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}" onclick="window.openMaterial('${m.id}', '${mat.id}')">
                                <i class="${matDone ? 'fas fa-check-circle text-green-500' : 'far fa-circle text-slate-300'} text-sm"></i>
                                <span class="text-sm font-medium ${isActive ? 'text-blue-700' : 'text-slate-700'}">${mIdx + 1}. ${mat.title}</span>
                            </div>`;
                    });
                }
                const quizDone = this.isQuizCompleted(m.id);
                const isQuizActive = this.currentViewId === `quiz-${m.id}`;
                html += `
                    <div class="px-4 py-3 mt-1 flex items-center gap-3 cursor-pointer border-t border-slate-200/50 hover:bg-slate-100 transition-colors ${isQuizActive ? 'bg-blue-50/50 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}" onclick="window.openQuiz('${m.id}')">
                        <i class="${quizDone ? 'fas fa-check-circle text-green-500' : 'fas fa-tasks text-blue-400'} text-sm"></i>
                        <span class="text-sm font-bold ${isQuizActive ? 'text-blue-700' : quizDone ? 'text-slate-600' : 'text-blue-700'}">Soal Latihan</span>
                    </div>
                </div>`;
            }
            html += `</div>`;
            return html;
        }).join('');

        const courseProgress = this.getCourseProgress();
        document.getElementById('progress-text').innerText = `${courseProgress}%`;

        const btnExam = document.getElementById('btn-final-exam');
        if (this.areAllModulesCompleted()) {
            btnExam.className = "w-full flex items-center justify-between px-4 py-3 bg-blue-600 text-white shadow-[0_3px_0_0_#1e40af] hover:-translate-y-0.5 active:translate-y-[3px] rounded-xl font-bold transition-all cursor-pointer";
            btnExam.innerHTML = `<span><i class="fas fa-star text-yellow-300 mr-2"></i> Ujian Akhir Terbuka!</span> <i class="fas fa-arrow-right"></i>`;
            btnExam.onclick = () => this.openExamPrep();
        }

        window.toggleAccordion = (id, unlocked) => {
            if (!unlocked) return Swal.fire('Terkunci', 'Selesaikan modul sebelumnya terlebih dahulu.', 'warning');
            this.expandedModules[id] = !this.expandedModules[id];
            this.renderSidebar();
        };
        window.openMaterial = (modId, matId) => this.openMaterial(modId, matId);
        window.openQuiz = (modId) => this.openQuiz(modId);
    },

    hideAllViews() {
        ['view-pdf', 'view-quiz', 'view-quiz-result', 'view-exam-prep', 'view-exam', 'view-exam-result', 'view-success', 'view-fallback'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.add('hidden');
            // 'flex' hanya dicabut dari view yang memang diberi flex secara dinamis.
            // view-pdf & view-exam punya 'flex flex-col' statis untuk layout iframe —
            // mencabutnya membuat area konten collapse (viewer PDF jadi kosong).
            if (id === 'view-fallback' || id === 'view-success') {
                el.classList.remove('flex');
            }
        });
    },


    // ─── TASK 1: BUKA MATERI (PDF) + NAVIGASI ────────────────
    openMaterial(moduleId, materialId) {
        this.currentViewId = materialId;
        this.renderSidebar();
        this.hideAllViews();

        const mod = this.sortedModules.find(m => m.id === moduleId);
        const mat = mod.materials.find(m => m.id === materialId);

        if (!mat || !mat.pdf_content_url) {
            const fb = document.getElementById('view-fallback');
            fb.classList.remove('hidden'); fb.classList.add('flex');
            return;
        }

        document.getElementById('view-pdf').classList.remove('hidden');
        document.getElementById('pdf-title').innerText = mat.title;
        document.getElementById('pdf-iframe').src = mat.pdf_content_url;

        const modMaterials = (mod.materials || []).sort((a, b) => a.order_index - b.order_index);
        const modIdx = modMaterials.findIndex(m => m.id === materialId);
        const isLastInModule = modIdx === modMaterials.length - 1;
        const isDone = this.isMaterialCompleted(materialId);

        const prevItem = modIdx > 0 ? modMaterials[modIdx - 1] : null;
        const nextItem = (!isLastInModule && modIdx < modMaterials.length - 1) ? modMaterials[modIdx + 1] : null;

        const allMaterials = this._getAllOrderedMaterials();
        const globalIdx = allMaterials.findIndex(m => m.matId === materialId);
        const globalTotal = allMaterials.length;

        const btnContainer = document.getElementById('pdf-action-container');
        btnContainer.innerHTML = `
            <div class="w-full flex flex-col gap-3">
                <div class="flex items-center justify-between gap-3">
                    ${prevItem
                        ? `<button onclick="window.openMaterial('${moduleId}','${prevItem.id}')" class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all">
                               <i class="fas fa-arrow-left text-xs"></i> Materi Sebelumnya
                           </button>`
                        : `<div></div>`}

                    <span class="text-xs font-bold text-slate-400">Materi ${globalIdx + 1} dari ${globalTotal}</span>

                    ${isDone
                        ? (isLastInModule
                            ? `<button onclick="window.openQuiz('${moduleId}')" class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-[0_3px_0_0_#1e40af] hover:-translate-y-0.5 active:translate-y-[3px] transition-all">
                                   Kerjakan Latihan <i class="fas fa-arrow-right text-xs"></i>
                               </button>`
                            : `<button onclick="window.openMaterial('${moduleId}','${nextItem.id}')" class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-[0_3px_0_0_#1e40af] hover:-translate-y-0.5 active:translate-y-[3px] transition-all">
                                   Materi Berikutnya <i class="fas fa-arrow-right text-xs"></i>
                               </button>`)
                        : `<button onclick="window.completeMaterial('${moduleId}','${materialId}')" class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-[0_3px_0_0_#1e40af] hover:-translate-y-0.5 active:translate-y-[3px] transition-all">
                               <i class="fas fa-check-circle text-xs"></i> Tandai Selesai
                           </button>`}
                </div>
                ${isDone ? `<div class="flex items-center justify-center gap-2 text-green-600 text-xs font-bold bg-green-50 rounded-lg py-2"><i class="fas fa-check-circle"></i> Materi selesai dibaca</div>` : ''}
            </div>
        `;
    },

    // Flatten semua materi dari semua modul dalam urutan global
    _getAllOrderedMaterials() {
        const result = [];
        this.sortedModules.forEach(mod => {
            const mats = (mod.materials || []).sort((a, b) => a.order_index - b.order_index);
            mats.forEach(mat => result.push({ modId: mod.id, matId: mat.id, title: mat.title }));
        });
        return result;
    },


    // ─── TASK 2: LATIHAN ─────────────────────────────────────
    openQuiz(moduleId) {
        this.currentViewId = `quiz-${moduleId}`;
        this.quizStartTime = Date.now();
        this.renderSidebar();
        this.hideAllViews();

        const quizView = document.getElementById('view-quiz');
        const quizForm = document.getElementById('quiz-form');
        const questionsContainer = document.getElementById('quiz-questions-container');
        const introContainer = document.getElementById('quiz-intro-container');
        const module = this.sortedModules.find(m => m.id === moduleId);

        quizView.classList.remove('hidden');
        quizForm.classList.add('hidden');
        questionsContainer.innerHTML = '';
        document.getElementById('quiz-title').innerText = 'Soal Latihan Modul';
        document.getElementById('quiz-desc').innerText = 'Lihat detail latihan sebelum mulai mengerjakan.';
        document.getElementById('quiz-icon').className = 'fas fa-clipboard-question';

        const questions = this.data.questions.filter(q => q.module_id === moduleId && !q.is_exam);

        if (questions.length === 0) {
            introContainer.innerHTML = `
                <div class="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200">
                    <h3 class="text-lg font-bold text-slate-700">Tidak ada soal untuk modul ini.</h3>
                    <p class="text-sm text-slate-500 mt-2">Anda dapat langsung menandai latihan ini selesai.</p>
                    <button type="button" id="btn-complete-empty-practice" class="mt-6 bg-blue-600 text-white font-bold px-6 py-3 rounded-xl shadow-[0_4px_0_0_#1e40af] hover:-translate-y-0.5 active:translate-y-[4px] active:shadow-none transition-all">
                        Tandai Selesai
                    </button>
                </div>`;
            document.getElementById('btn-complete-empty-practice')?.addEventListener('click', () => {
                this.submitProgress('module_quiz', moduleId, 100);
            });
        } else {
            this.renderPracticeIntro({
                module, questions,
                onStart: () => {
                    introContainer.innerHTML = '';
                    quizForm.classList.remove('hidden');
                    document.getElementById('quiz-desc').innerText = 'Pilih jawaban yang paling tepat.';
                    this.buildQuestionForm(questions, (score, correct, total) =>
                        this.showQuizResult({ moduleId, score, correct, total })
                    );
                }
            });
        }
    },

    renderPracticeIntro({ module, questions, onStart }) {
        const introContainer = document.getElementById('quiz-intro-container');
        const moduleTitle = module?.title || 'Modul ini';
        const materialCount = module?.materials?.length || 0;
        introContainer.innerHTML = `
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div class="bg-white border border-slate-200 rounded-xl p-5">
                        <div class="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Jumlah Soal</div>
                        <div class="text-3xl font-black text-blue-600">${questions.length}</div>
                        <p class="text-sm text-slate-500 mt-1">Pilihan ganda</p>
                    </div>
                    <div class="bg-white border border-slate-200 rounded-xl p-5 md:col-span-2">
                        <div class="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Topik Latihan</div>
                        <h3 class="text-xl font-black text-slate-900">${moduleTitle}</h3>
                        <p class="text-sm text-slate-500 mt-2">Latihan ini menguji pemahaman dari ${materialCount} materi dalam modul ini.</p>
                    </div>
                </div>
                <div class="bg-white border border-slate-200 rounded-xl p-5 mb-8">
                    <h4 class="font-black text-slate-900 mb-3">Sebelum mulai</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm font-semibold text-slate-600">
                        <div class="flex items-center gap-3"><i class="fas fa-circle-check text-green-500"></i> Kerjakan semua soal sampai selesai.</div>
                        <div class="flex items-center gap-3"><i class="fas fa-list-check text-blue-500"></i> Nilai tersimpan setelah jawaban dikumpulkan.</div>
                    </div>
                </div>
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <p class="text-sm text-slate-500 font-medium">Klik mulai jika sudah siap mengerjakan soal latihan.</p>
                    <button type="button" id="btn-start-practice" class="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-bold px-7 py-3.5 rounded-xl shadow-[0_4px_0_0_#1e40af] hover:-translate-y-0.5 active:translate-y-[4px] active:shadow-none transition-all">
                        Mulai Mengerjakan <i class="fas fa-arrow-right text-sm"></i>
                    </button>
                </div>
            </div>`;
        document.getElementById('btn-start-practice')?.addEventListener('click', onStart);
    },

    async showQuizResult({ moduleId, score, correct, total }) {
        const elapsed = this.quizStartTime ? Math.floor((Date.now() - this.quizStartTime) / 1000) : 0;
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const ss = String(elapsed % 60).padStart(2, '0');
        const wrong = total - correct;
        const mastered = score >= 70;

        this.hideAllViews();
        const el = document.getElementById('view-quiz-result');
        el.classList.remove('hidden');
        el.innerHTML = `
            <div class="max-w-lg mx-auto">
                <div class="text-center mb-8">
                    <div class="inline-flex w-20 h-20 rounded-full items-center justify-center text-4xl mb-4 ${mastered ? 'bg-green-50 text-green-500 ring-4 ring-green-100' : 'bg-amber-50 text-amber-500 ring-4 ring-amber-100'}">
                        <i class="fas ${mastered ? 'fa-trophy' : 'fa-rotate-right'}"></i>
                    </div>
                    <h2 class="text-3xl font-black text-slate-900">Hasil Latihan</h2>
                    <p class="text-slate-500 mt-1 font-medium">🎉 Selesai!</p>
                </div>

                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6 text-center">
                    <p class="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Nilai Anda</p>
                    <p class="text-6xl font-black ${mastered ? 'text-green-600' : 'text-amber-500'}">${score}</p>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
                        <p class="text-xs font-bold text-slate-400 mb-1">Total Soal</p>
                        <p class="text-2xl font-black text-slate-800">${total}</p>
                    </div>
                    <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
                        <p class="text-xs font-bold text-slate-400 mb-1">Benar</p>
                        <p class="text-2xl font-black text-green-600">${correct}</p>
                    </div>
                    <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
                        <p class="text-xs font-bold text-slate-400 mb-1">Salah</p>
                        <p class="text-2xl font-black text-red-500">${wrong}</p>
                    </div>
                    <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
                        <p class="text-xs font-bold text-slate-400 mb-1">Durasi</p>
                        <p class="text-2xl font-black text-slate-800">${mm}:${ss}</p>
                    </div>
                </div>

                <div class="flex items-center gap-3 p-4 rounded-xl mb-6 ${mastered ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}">
                    <i class="fas ${mastered ? 'fa-circle-check text-green-600' : 'fa-triangle-exclamation text-amber-600'} text-lg"></i>
                    <p class="font-bold text-sm ${mastered ? 'text-green-800' : 'text-amber-800'}">
                        ${mastered ? 'Materi sudah dikuasai dengan baik.' : 'Perlu mengulang materi tertentu sebelum lanjut.'}
                    </p>
                </div>

                <div class="flex flex-col sm:flex-row gap-3">
                    <button id="btn-retry-quiz" class="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all">
                        <i class="fas fa-rotate-right"></i> Ulangi Latihan
                    </button>
                    <button id="btn-next-content" class="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-[0_3px_0_0_#1e40af] hover:-translate-y-0.5 active:translate-y-[3px] transition-all">
                        <i class="fas fa-spinner fa-spin"></i> Menyimpan...
                    </button>
                </div>
            </div>`;

        document.getElementById('btn-retry-quiz')?.addEventListener('click', () => this.openQuiz(moduleId));

        // Simpan progress, lalu baru aktifkan tombol navigasi
        await this.submitProgress('module_quiz', moduleId, score);

        const modIdx = this.sortedModules.findIndex(m => m.id === moduleId);
        const nextMod = this.sortedModules[modIdx + 1];
        const nextBtn = document.getElementById('btn-next-content');
        if (nextMod) {
            nextBtn.innerHTML = `Lanjut Modul Berikutnya <i class="fas fa-arrow-right"></i>`;
            nextBtn.onclick = () => {
                this.expandedModules[nextMod.id] = true;
                const firstMat = (nextMod.materials || []).sort((a, b) => a.order_index - b.order_index)[0];
                if (firstMat) this.openMaterial(nextMod.id, firstMat.id);
            };
        } else {
            nextBtn.innerHTML = `Lihat Ujian Akhir <i class="fas fa-star"></i>`;
            nextBtn.onclick = () => this.openExamPrep();
        }
    },


    // ─── TASK 3: HALAMAN PERSIAPAN UJIAN ─────────────────────
    openExamPrep() {
        this.currentViewId = 'exam-prep';
        this.renderSidebar();
        this.hideAllViews();

        const questions = this.data.questions.filter(q => q.is_exam);
        if (questions.length === 0) {
            return Swal.fire('Oops', 'Soal ujian akhir belum dibuat oleh instruktur.', 'info');
        }

        const settings = this.data.examSettings || {};
        const duration = settings.duration_minutes ?? null;
        const courseTitle = this.data.course.title;
        const lastAttempt = this.data.lastAttempt;
        const minScore = 70;

        // Cek cooldown
        const now = new Date();
        let cooldownUntil = null;
        let canStart = true;
        if (lastAttempt && !lastAttempt.is_passed && lastAttempt.next_attempt_at) {
            cooldownUntil = new Date(lastAttempt.next_attempt_at);
            if (cooldownUntil > now) {
                canStart = false;
            }
        }

        const el = document.getElementById('view-exam-prep');
        el.classList.remove('hidden');

        let cooldownHtml = '';
        if (!canStart && cooldownUntil) {
            const cdDate = cooldownUntil.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const cdTime = cooldownUntil.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            cooldownHtml = `
                <div class="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
                    <h4 class="font-black text-red-900 mb-3 flex items-center gap-2"><i class="fas fa-clock"></i> Masa Tenggang Ujian</h4>
                    <p class="text-sm font-semibold text-red-800 mb-2">Anda dapat mengulang ujian pada:</p>
                    <p class="text-lg font-black text-red-900">${cdDate}</p>
                    <p class="text-lg font-black text-red-900">${cdTime}</p>
                </div>`;
        }

        el.innerHTML = `
            <div class="max-w-lg mx-auto">
                <div class="text-center mb-8">
                    <div class="inline-flex w-20 h-20 rounded-full bg-blue-50 text-blue-600 items-center justify-center text-4xl mb-4 ring-4 ring-blue-100">
                        <i class="fas fa-star"></i>
                    </div>
                    <h2 class="text-3xl font-black text-slate-900">Persiapan Ujian Akhir</h2>
                    <p class="text-slate-500 mt-1 font-medium">${courseTitle}</p>
                </div>

                <div class="grid grid-cols-2 gap-3 mb-6">
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-5">
                        <p class="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Jumlah Soal</p>
                        <p class="text-3xl font-black text-slate-900">${questions.length}</p>
                        <p class="text-sm text-slate-500 mt-1">soal pilihan ganda</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-5">
                        <p class="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Durasi</p>
                        <p class="text-3xl font-black text-slate-900">${duration !== null ? duration : '—'}</p>
                        <p class="text-sm text-slate-500 mt-1">${duration !== null ? 'menit' : 'tanpa batas waktu'}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-5">
                        <p class="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Nilai Minimum</p>
                        <p class="text-3xl font-black text-slate-900">${minScore}</p>
                        <p class="text-sm text-slate-500 mt-1">syarat lulus</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-5">
                        <p class="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Percobaan Ke-</p>
                        <p class="text-3xl font-black text-slate-900">${lastAttempt ? lastAttempt.attempt_number + 1 : 1}</p>
                        <p class="text-sm text-slate-500 mt-1">kali pengerjaan</p>
                    </div>
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
                    <h4 class="font-black text-amber-900 mb-3 flex items-center gap-2"><i class="fas fa-circle-info"></i> Peraturan Ujian</h4>
                    <ul class="space-y-2 text-sm font-semibold text-amber-800">
                        <li class="flex items-start gap-2"><i class="fas fa-check text-amber-600 mt-0.5"></i> Pastikan koneksi internet stabil sebelum memulai.</li>
                        <li class="flex items-start gap-2"><i class="fas fa-check text-amber-600 mt-0.5"></i> Jangan refresh halaman selama ujian berlangsung.</li>
                        <li class="flex items-start gap-2"><i class="fas fa-check text-amber-600 mt-0.5"></i> Jawaban akan tersimpan saat kamu mengklik Kumpulkan.</li>
                        ${duration !== null ? `<li class="flex items-start gap-2"><i class="fas fa-check text-amber-600 mt-0.5"></i> Ujian otomatis dikumpulkan saat waktu habis.</li>` : ''}
                        <li class="flex items-start gap-2"><i class="fas fa-check text-amber-600 mt-0.5"></i> Nilai minimal ${minScore} untuk lulus.</li>
                    </ul>
                </div>

                ${cooldownHtml}

                <div class="flex gap-3">
                    <button id="btn-exam-back" class="flex-1 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all">
                        <i class="fas fa-arrow-left mr-2"></i>Kembali
                    </button>
                    ${canStart
                        ? `<button id="btn-exam-start" class="flex-2 flex-1 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-[0_3px_0_0_#1e40af] hover:-translate-y-0.5 active:translate-y-[3px] transition-all">
                               Mulai Ujian <i class="fas fa-arrow-right ml-2"></i>
                           </button>`
                        : `<button disabled class="flex-2 flex-1 px-5 py-3 rounded-xl bg-slate-300 text-slate-500 font-bold cursor-not-allowed">
                               <i class="fas fa-lock mr-2"></i>Ujian Terkunci
                           </button>`}
                </div>
            </div>`;

        document.getElementById('btn-exam-back')?.addEventListener('click', () => {
            this.hideAllViews();
        });
        if (canStart) {
            document.getElementById('btn-exam-start')?.addEventListener('click', () => {
                this.startExam(questions, duration);
            });
        }
    },

    // ─── TASK 4: UJIAN SATU-PER-SATU + TIMER ─────────────────
    startExam(questions, durationMinutes) {
        this.examQuestions = questions;
        this.examAnswers = {};
        this.examIndex = 0;

        // Timer: simpan waktu mulai di sessionStorage agar tahan refresh
        const storageKey = `exam_start_${this.courseId}`;
        let startTs = parseInt(sessionStorage.getItem(storageKey) || '0', 10);
        if (!startTs) {
            startTs = Date.now();
            sessionStorage.setItem(storageKey, String(startTs));
        }

        if (durationMinutes !== null) {
            const totalSec = durationMinutes * 60;
            const elapsed = Math.floor((Date.now() - startTs) / 1000);
            this.examRemaining = Math.max(0, totalSec - elapsed);
        } else {
            this.examRemaining = null; // tanpa timer
        }

        this.hideAllViews();
        const el = document.getElementById('view-exam');
        el.classList.remove('hidden');
        this._renderExamShell(durationMinutes);
        this._renderExamQuestion();
        if (this.examRemaining !== null) this._startExamTimer(storageKey);
    },

    _renderExamShell(durationMinutes) {
        const el = document.getElementById('view-exam');
        el.innerHTML = `
            <div class="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
                <div class="min-w-0">
                    <h2 class="font-black text-slate-900 text-lg truncate">${this.data.course.title}</h2>
                    <p id="exam-progress-text" class="text-xs font-bold text-slate-400">Soal 1 dari ${this.examQuestions.length}</p>
                </div>
                ${durationMinutes !== null
                    ? `<div id="exam-timer" class="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-sm shrink-0">
                           <i class="fas fa-clock"></i>
                           <span id="exam-timer-text">${this._fmtTime(this.examRemaining)}</span>
                       </div>`
                    : ''}
            </div>
            <div id="exam-question-area" class="flex-1 overflow-y-auto p-6 md:p-8"></div>`;
    },

    _renderExamQuestion() {
        const area = document.getElementById('exam-question-area');
        if (!area) return;
        const total = this.examQuestions.length;
        const q = this.examQuestions[this.examIndex];
        const selected = this.examAnswers[q.id];
        const answered = Object.keys(this.examAnswers).length;

        // Update progress text
        const pt = document.getElementById('exam-progress-text');
        if (pt) pt.textContent = `Soal ${this.examIndex + 1} dari ${total} • ${answered} terjawab`;

        const opts = ['A','B','C','D'].map(k => ({ k, text: q[`option_${k.toLowerCase()}`] })).filter(o => o.text);

        area.innerHTML = `
            <div class="max-w-2xl mx-auto space-y-6">
                <div class="flex items-center justify-between">
                    <span class="px-3 py-1.5 rounded-xl bg-blue-100 text-blue-700 text-xs font-black">Soal ${this.examIndex + 1} / ${total}</span>
                    <span class="text-xs font-bold text-slate-400">${answered}/${total} terjawab</span>
                </div>

                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    ${q.image_url ? `<div class="mb-5 rounded-xl overflow-hidden border border-slate-200"><img src="${q.image_url}" class="w-full max-h-64 object-contain bg-white"></div>` : ''}
                    <p class="text-lg font-black text-slate-900 leading-relaxed mb-5">${q.question_text}</p>
                    <div class="space-y-3">
                        ${opts.map(o => `
                            <label class="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${selected === o.k ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 bg-white hover:border-blue-300'}">
                                <input type="radio" name="exam-q" value="${o.k}" ${selected === o.k ? 'checked' : ''} class="w-4 h-4 text-blue-600">
                                <span class="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black shrink-0">${o.k}</span>
                                <span class="font-semibold text-slate-700 text-sm">${o.text}</span>
                            </label>`).join('')}
                    </div>
                </div>

                <div class="flex items-center justify-between gap-3">
                    <button id="exam-prev" ${this.examIndex === 0 ? 'disabled' : ''} class="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-all">
                        <i class="fas fa-arrow-left"></i> Sebelumnya
                    </button>
                    ${this.examIndex === total - 1
                        ? `<button id="exam-submit" class="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-[0_3px_0_0_#065f46] hover:-translate-y-0.5 active:translate-y-[3px] transition-all">
                               <i class="fas fa-flag-checkered"></i> Kumpulkan Jawaban
                           </button>`
                        : `<button id="exam-next" class="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-[0_3px_0_0_#1e40af] hover:-translate-y-0.5 active:translate-y-[3px] transition-all">
                               Selanjutnya <i class="fas fa-arrow-right"></i>
                           </button>`}
                </div>
            </div>`;

        // Bind events
        area.querySelectorAll('input[name="exam-q"]').forEach(inp => {
            inp.addEventListener('change', e => {
                this.examAnswers[q.id] = e.target.value;
                const pt2 = document.getElementById('exam-progress-text');
                if (pt2) pt2.textContent = `Soal ${this.examIndex + 1} dari ${total} • ${Object.keys(this.examAnswers).length} terjawab`;
            });
        });
        document.getElementById('exam-prev')?.addEventListener('click', () => {
            this.examIndex--; this._renderExamQuestion();
        });
        document.getElementById('exam-next')?.addEventListener('click', () => {
            this.examIndex++; this._renderExamQuestion();
        });
        document.getElementById('exam-submit')?.addEventListener('click', () => {
            this._showSubmitConfirm();
        });
    },

    _startExamTimer(storageKey) {
        this._stopExamTimer();
        this.examTimerId = setInterval(() => {
            this.examRemaining = Math.max(0, this.examRemaining - 1);
            const el = document.getElementById('exam-timer-text');
            if (el) {
                el.textContent = this._fmtTime(this.examRemaining);
                const timerBox = document.getElementById('exam-timer');
                if (timerBox) {
                    timerBox.className = `flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm shrink-0 ${this.examRemaining <= 60 ? 'bg-red-600 text-white animate-pulse' : 'bg-blue-600 text-white'}`;
                }
            }
            if (this.examRemaining <= 0) {
                this._stopExamTimer();
                sessionStorage.removeItem(storageKey);
                this._doSubmitExam();
            }
        }, 1000);
    },

    _stopExamTimer() {
        if (this.examTimerId) { clearInterval(this.examTimerId); this.examTimerId = null; }
    },

    _fmtTime(sec) {
        const s = Math.max(0, sec);
        return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
    },


    // ─── TASK 5: KONFIRMASI SUBMIT UJIAN ─────────────────────
    _showSubmitConfirm() {
        const total = this.examQuestions.length;
        const answered = Object.keys(this.examAnswers).length;
        const unanswered = total - answered;
        const timerText = this.examRemaining !== null ? this._fmtTime(this.examRemaining) : null;

        // Buat overlay konfirmasi
        let overlay = document.getElementById('exam-confirm-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'exam-confirm-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = `
            <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-200">
                    <div class="text-center mb-6">
                        <div class="inline-flex w-16 h-16 rounded-full bg-amber-50 text-amber-500 items-center justify-center text-3xl mb-4 ring-4 ring-amber-100">
                            <i class="fas fa-circle-question"></i>
                        </div>
                        <h3 class="text-2xl font-black text-slate-900">Kumpulkan Ujian?</h3>
                        <p class="text-slate-500 font-medium mt-1">Pastikan semua jawaban sudah benar sebelum mengumpulkan.</p>
                    </div>

                    <div class="grid grid-cols-2 gap-3 mb-6">
                        <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                            <p class="text-xs font-black uppercase tracking-widest text-green-600 mb-1">Sudah Dijawab</p>
                            <p class="text-3xl font-black text-green-700">${answered}<span class="text-base text-green-500">/${total}</span></p>
                        </div>
                        <div class="bg-${unanswered > 0 ? 'amber' : 'slate'}-50 border border-${unanswered > 0 ? 'amber' : 'slate'}-200 rounded-xl p-4 text-center">
                            <p class="text-xs font-black uppercase tracking-widest text-${unanswered > 0 ? 'amber' : 'slate'}-600 mb-1">Belum Dijawab</p>
                            <p class="text-3xl font-black text-${unanswered > 0 ? 'amber' : 'slate'}-700">${unanswered}</p>
                        </div>
                    </div>

                    ${timerText ? `
                    <div class="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
                        <i class="fas fa-clock text-blue-500"></i>
                        <span class="text-sm font-bold text-blue-700">Sisa waktu: <span class="font-black">${timerText}</span></span>
                    </div>` : ''}

                    <div class="flex gap-3">
                        <button id="confirm-back-btn" class="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all">
                            <i class="fas fa-arrow-left mr-2"></i>Periksa Lagi
                        </button>
                        <button id="confirm-submit-btn" class="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold shadow-[0_3px_0_0_#065f46] hover:-translate-y-0.5 active:translate-y-[3px] transition-all">
                            Kumpulkan <i class="fas fa-flag-checkered ml-2"></i>
                        </button>
                    </div>
                </div>
            </div>`;

        document.getElementById('confirm-back-btn')?.addEventListener('click', () => {
            overlay.innerHTML = '';
        });
        document.getElementById('confirm-submit-btn')?.addEventListener('click', () => {
            overlay.innerHTML = '';
            this._doSubmitExam();
        });
    },

    _doSubmitExam() {
        this._stopExamTimer();
        const storageKey = `exam_start_${this.courseId}`;
        sessionStorage.removeItem(storageKey);

        const questions = this.examQuestions;
        let correct = 0;
        questions.forEach(q => {
            if (this.examAnswers[q.id] === q.correct_answer) correct++;
        });
        const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
        const unanswered = questions.length - Object.keys(this.examAnswers).length;

        // Hitung durasi pengerjaan dalam detik
        const settings = this.data.examSettings || {};
        const durationMinutes = settings.duration_minutes ?? null;
        let durationSeconds = 0;
        if (durationMinutes !== null) {
            durationSeconds = (durationMinutes * 60) - this.examRemaining;
        }

        this.submitFinalExam(score, correct, questions.length, unanswered, durationSeconds);
    },

    // ─── TASK 6: HASIL UJIAN ──────────────────────────────────
    showExamResult({ score, correct, total, unanswered, durationSeconds, passed, certUrl, certPending, examSettings, attempt }) {
        const wrong = total - correct - unanswered;
        const showReview = examSettings?.show_review_after_submit !== false;
        const hasCert = !!certUrl;
        const minScore = 70;
        const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        // Format durasi
        const durMin = Math.floor(durationSeconds / 60);
        const durSec = durationSeconds % 60;
        const durStr = durMin > 0 ? `${durMin} menit ${durSec} detik` : `${durSec} detik`;

        this.hideAllViews();
        const el = document.getElementById('view-exam-result');
        el.classList.remove('hidden');

        if (passed) {
            // ── LULUS ──
            el.innerHTML = `
                <div class="max-w-2xl mx-auto">
                    <div class="text-center mb-8">
                        <div class="inline-flex w-20 h-20 rounded-full bg-green-50 text-green-600 items-center justify-center text-4xl mb-4 ring-4 ring-green-100">
                            <i class="fas fa-trophy"></i>
                        </div>
                        <h2 class="text-3xl font-black text-slate-900">Lulus Ujian</h2>
                        <p class="text-slate-500 mt-1 font-medium">${today}</p>
                    </div>

                    <div class="bg-green-50 border border-green-200 rounded-2xl p-8 text-center mb-6">
                        <p class="text-xs font-black uppercase tracking-widest text-green-600 mb-2">Nilai Anda</p>
                        <p class="text-7xl font-black text-green-700">${score}<span class="text-3xl text-green-400">/100</span></p>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
                            <p class="text-xs font-bold text-slate-400 mb-1">Total Soal</p>
                            <p class="text-2xl font-black text-slate-800">${total}</p>
                        </div>
                        <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
                            <p class="text-xs font-bold text-slate-400 mb-1">Benar</p>
                            <p class="text-2xl font-black text-green-600">${correct}</p>
                        </div>
                        <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
                            <p class="text-xs font-bold text-slate-400 mb-1">Salah</p>
                            <p class="text-2xl font-black text-red-500">${wrong}</p>
                        </div>
                        <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
                            <p class="text-xs font-bold text-slate-400 mb-1">Waktu</p>
                            <p class="text-2xl font-black text-slate-800">${durStr}</p>
                        </div>
                    </div>

                    ${certPending ? `
                    <div class="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
                        <i class="fas fa-hourglass-half text-amber-500 mt-0.5"></i>
                        <p class="text-sm font-bold text-amber-800">Selamat, Anda lulus! Sertifikat sedang diproses oleh admin dan akan muncul di halaman Profil setelah diterbitkan.</p>
                    </div>` : ''}

                    <div class="flex flex-col sm:flex-row gap-3 mb-8">
                        ${hasCert
                            ? `<a id="btn-cert" href="${certUrl}" target="_blank" class="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-bold shadow-[0_3px_0_0_#0f172a] hover:-translate-y-0.5 active:translate-y-[3px] transition-all">
                                   <i class="fas fa-download"></i> Ambil Sertifikat
                               </a>`
                            : ''}
                        <a href="/profile" class="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all">
                            <i class="fas fa-home"></i> Kembali ke Profil
                        </a>
                    </div>

                    ${showReview ? `
                    <div class="border-t border-slate-200 pt-6">
                        <h3 class="font-black text-slate-900 text-lg mb-4 flex items-center gap-2">
                            <i class="fas fa-list-check text-blue-500"></i> Review Jawaban
                        </h3>
                        <div id="exam-review-list" class="space-y-4"></div>
                    </div>` : ''}
                </div>`;
        } else {
            // ── TIDAK LULUS ──
            let nextAttemptHtml = '';
            if (attempt && attempt.nextAttemptAt) {
                const nextDate = new Date(attempt.nextAttemptAt);
                const nextDateStr = nextDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                const nextTimeStr = nextDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                nextAttemptHtml = `
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
                        <p class="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Kesempatan Ujian Ulang</p>
                        <p class="text-lg font-black text-slate-900">${nextDateStr}</p>
                        <p class="text-lg font-black text-slate-900">${nextTimeStr}</p>
                    </div>`;
            }

            el.innerHTML = `
                <div class="max-w-2xl mx-auto">
                    <div class="text-center mb-8">
                        <div class="inline-flex w-20 h-20 rounded-full bg-red-50 text-red-500 items-center justify-center text-4xl mb-4 ring-4 ring-red-100">
                            <i class="fas fa-xmark"></i>
                        </div>
                        <h2 class="text-3xl font-black text-slate-900">Belum Lulus Ujian</h2>
                        <p class="text-slate-500 mt-1 font-medium">${today}</p>
                    </div>

                    <div class="bg-red-50 border border-red-200 rounded-2xl p-8 text-center mb-6">
                        <p class="text-xs font-black uppercase tracking-widest text-red-500 mb-2">Nilai Anda</p>
                        <p class="text-7xl font-black text-red-600">${score}<span class="text-3xl text-red-400">/100</span></p>
                    </div>

                    <div class="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex items-center justify-between">
                        <span class="text-sm font-bold text-slate-600">Nilai Minimum</span>
                        <span class="text-2xl font-black text-slate-900">${minScore}</span>
                    </div>

                    <div class="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
                        <p class="text-sm font-semibold text-blue-800">Pelajari kembali materi kursus agar lebih siap pada percobaan berikutnya.</p>
                    </div>

                    ${nextAttemptHtml}

                    <div class="grid grid-cols-2 gap-3 mb-6">
                        <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
                            <p class="text-xs font-bold text-slate-400 mb-1">Total Soal</p>
                            <p class="text-2xl font-black text-slate-800">${total}</p>
                        </div>
                        <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
                            <p class="text-xs font-bold text-slate-400 mb-1">Benar</p>
                            <p class="text-2xl font-black text-green-600">${correct}</p>
                        </div>
                        <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
                            <p class="text-xs font-bold text-slate-400 mb-1">Salah</p>
                            <p class="text-2xl font-black text-red-500">${wrong}</p>
                        </div>
                        <div class="bg-white border border-slate-200 rounded-xl p-4 text-center">
                            <p class="text-xs font-bold text-slate-400 mb-1">Waktu</p>
                            <p class="text-2xl font-black text-slate-800">${durStr}</p>
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-3 mb-8">
                        <button id="btn-review-material" class="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-[0_3px_0_0_#1e40af] hover:-translate-y-0.5 active:translate-y-[3px] transition-all">
                            <i class="fas fa-book-open"></i> Pelajari Materi Kembali
                        </button>
                        <a href="/profile" class="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all">
                            <i class="fas fa-home"></i> Kembali ke Profil
                        </a>
                    </div>

                    ${showReview ? `
                    <div class="border-t border-slate-200 pt-6">
                        <h3 class="font-black text-slate-900 text-lg mb-4 flex items-center gap-2">
                            <i class="fas fa-list-check text-blue-500"></i> Review Jawaban
                        </h3>
                        <div id="exam-review-list" class="space-y-4"></div>
                    </div>` : ''}
                </div>`;

            document.getElementById('btn-review-material')?.addEventListener('click', () => {
                const firstMod = this.sortedModules[0];
                if (firstMod) {
                    this.expandedModules[firstMod.id] = true;
                    const firstMat = (firstMod.materials || []).sort((a, b) => a.order_index - b.order_index)[0];
                    if (firstMat) this.openMaterial(firstMod.id, firstMat.id);
                }
            });
        }

        if (showReview) this._renderExamReview();
    },

    _renderExamReview() {
        const container = document.getElementById('exam-review-list');
        if (!container) return;
        container.innerHTML = this.examQuestions.map((q, i) => {
            const userAns = this.examAnswers[q.id];
            const isCorrect = userAns === q.correct_answer;
            const opts = ['A','B','C','D'].map(k => ({ k, text: q[`option_${k.toLowerCase()}`] })).filter(o => o.text);
            return `
                <div class="bg-white border ${isCorrect ? 'border-green-200' : 'border-red-200'} rounded-2xl p-5">
                    <div class="flex items-start gap-3 mb-4">
                        <span class="w-7 h-7 rounded-lg ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'} flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                            <i class="fas ${isCorrect ? 'fa-check' : 'fa-xmark'}"></i>
                        </span>
                        <p class="font-bold text-slate-800 text-sm leading-relaxed"><span class="text-slate-400 mr-1">${i+1}.</span>${q.question_text}</p>
                    </div>
                    <div class="space-y-2 pl-10">
                        ${opts.map(o => {
                            let cls = 'border-slate-100 bg-slate-50 text-slate-600';
                            if (o.k === q.correct_answer) cls = 'border-green-300 bg-green-50 text-green-800 font-bold';
                            else if (o.k === userAns && !isCorrect) cls = 'border-red-300 bg-red-50 text-red-700 line-through';
                            return `<div class="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${cls}">
                                <span class="w-5 h-5 rounded bg-white/70 flex items-center justify-center text-xs font-black shrink-0">${o.k}</span>
                                ${o.text}
                                ${o.k === q.correct_answer ? '<i class="fas fa-check ml-auto text-green-500"></i>' : ''}
                                ${o.k === userAns && !isCorrect ? '<i class="fas fa-xmark ml-auto text-red-400"></i>' : ''}
                            </div>`;
                        }).join('')}
                    </div>
                    ${q.explanation ? `
                    <div class="mt-4 pl-10 flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <i class="fas fa-lightbulb text-amber-500 mt-0.5 shrink-0"></i>
                        <span class="font-semibold">${q.explanation}</span>
                    </div>` : ''}
                </div>`;
        }).join('');
    },


    // ─── FORM SOAL (dipakai latihan saja, ujian pakai _renderExamQuestion) ───
    buildQuestionForm(questions, onSubmitCallback) {
        const container = document.getElementById('quiz-questions-container');
        container.innerHTML = questions.map((q, i) => `
            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <p class="font-bold text-slate-800 mb-4"><span class="text-blue-600 mr-2">${i + 1}.</span> ${q.question_text}</p>
                <div class="space-y-3 pl-6">
                    ${['A', 'B', 'C', 'D'].map(opt => {
                        const optText = q[`option_${opt.toLowerCase()}`];
                        if (!optText) return '';
                        return `
                        <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-blue-400 transition-colors has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:ring-1 has-[:checked]:ring-blue-600">
                            <input type="radio" name="q_${q.id}" value="${opt}" required class="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500">
                            <span class="font-medium text-slate-700">${optText}</span>
                        </label>`;
                    }).join('')}
                </div>
            </div>
        `).join('');

        const form = document.getElementById('quiz-form');
        form.onsubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            let correct = 0;
            questions.forEach(q => {
                if (formData.get(`q_${q.id}`) === q.correct_answer) correct++;
            });
            const score = Math.round((correct / questions.length) * 100);
            onSubmitCallback(score, correct, questions.length);
        };
    },

    // ─── SUBMIT ───────────────────────────────────────────────
    async submitProgress(type, itemId, score = null) {
        try {
            await HTTP.post(`/courses/${this.courseId}/learn/progress`, { type, item_id: itemId, score });
            await this.fetchData();
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    },

    async completeMaterial(moduleId, materialId) {
        await this.submitProgress('material', materialId);
        const mod = this.sortedModules.find(m => m.id === moduleId);
        if (!mod) return;
        const modMaterials = (mod.materials || []).sort((a, b) => a.order_index - b.order_index);
        const modIdx = modMaterials.findIndex(m => m.id === materialId);
        const isLastInModule = modIdx === modMaterials.length - 1;
        if (isLastInModule) {
            this.openQuiz(moduleId);
        } else {
            const nextMat = modMaterials[modIdx + 1];
            if (nextMat) this.openMaterial(moduleId, nextMat.id);
        }
    },

    async submitFinalExam(score, correct, total, unanswered, durationSeconds) {
        try {
            Swal.fire({ title: 'Memeriksa Jawaban...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await HTTP.post(`/courses/${this.courseId}/learn/exam`, { score, duration_seconds: durationSeconds });
            Swal.close();

            const certificate = res.passed ? res.certificate : null;
            this.showExamResult({
                score,
                correct,
                total,
                unanswered,
                durationSeconds,
                passed: res.passed,
                certUrl: certificate?.certificate_url || null,
                certPending: !!certificate && !certificate.certificate_url,
                examSettings: this.data.examSettings,
                attempt: res.attempt || null
            });
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    }
};

window.submitProgress = (type, id) => LearnDOM.submitProgress(type, id);
window.completeMaterial = (modId, matId) => LearnDOM.completeMaterial(modId, matId);
window.openMaterial = (modId, matId) => LearnDOM.openMaterial(modId, matId);
window.openQuiz = (modId) => LearnDOM.openQuiz(modId);
