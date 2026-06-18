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

    init() {
        const page = document.getElementById('learn-page');
        if (!page) return;
        this.courseId = window.location.pathname.split('/')[2];
        this.fetchData();
    },

    async fetchData() {
        try {
            const res = await HTTP.get(`/courses/${this.courseId}/learn`);
            this.data = res.data;
            this.sortedModules = this.data.course.modules.sort((a, b) => a.order_index - b.order_index);
            
            document.title = `Belajar: ${this.data.course.title} | LPIA`;
            document.getElementById('top-course-title').innerText = this.data.course.title;

            // Buka otomatis accordion modul pertama
            if (this.sortedModules.length > 0) {
                this.expandedModules[this.sortedModules[0].id] = true;
            }

            this.renderSidebar();
        } catch (error) {
            Swal.fire('Akses Ditolak', 'Gagal memuat ruang belajar atau kamu belum membeli kelas ini.', 'error')
                .then(() => window.location.href = '/profile');
        }
    },

    // ─────────────────────────────────────────────────────────
    //  LOGIKA PROGRESS & PENGUNCIAN
    // ─────────────────────────────────────────────────────────
    isMaterialCompleted(materialId) {
        return this.data.progress.some(p => p.material_id === materialId && p.is_completed);
    },

    isQuizCompleted(moduleId) {
        return this.data.progress.some(p => p.module_id === moduleId && p.score !== null);
    },

    getModuleProgress(module) {
        const materials = module.materials || [];
        const totalItems = materials.length + 1; // Ditambah 1 karena ada kuis di setiap akhir modul
        let completedItems = 0;
        
        materials.forEach(mat => { if (this.isMaterialCompleted(mat.id)) completedItems++; });
        if (this.isQuizCompleted(module.id)) completedItems++;
        
        return {
            percent: Math.round((completedItems / totalItems) * 100),
            isCompleted: completedItems === totalItems
        };
    },

    isModuleUnlocked(index) {
        if (index === 0) return true; // Modul 1 selalu terbuka
        const prevModule = this.sortedModules[index - 1];
        return this.getModuleProgress(prevModule).isCompleted; // Kunci modul 2 jika modul 1 belum 100%
    },

    // ─────────────────────────────────────────────────────────
    //  RENDER SIDEBAR (ACCORDION & DAFTAR MATERI)
    // ─────────────────────────────────────────────────────────
    renderSidebar() {
        const container = document.getElementById('sidebar-modules');
        let totalCoursePercent = 0;

        container.innerHTML = this.sortedModules.map((m, index) => {
            const prog = this.getModuleProgress(m);
            const isUnlocked = this.isModuleUnlocked(index);
            const isExpanded = this.expandedModules[m.id];
            
            totalCoursePercent += prog.percent;

            // 1. Header Accordion (Judul Modul)
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
                    </div>
            `;

            // 2. Body Accordion (Isi Materi & Kuis Praktikum)
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
                            <div class="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors ${matDone ? 'opacity-50 hover:opacity-100' : ''} ${isActive ? 'bg-blue-50/50 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}" onclick="window.openMaterial('${m.id}', '${mat.id}')">
                                <i class="${matDone ? 'fas fa-check-circle text-green-500' : 'far fa-circle text-slate-300'} text-sm"></i>
                                <span class="text-sm font-medium ${isActive ? 'text-blue-700' : 'text-slate-700'}">${mIdx + 1}. ${mat.title}</span>
                            </div>
                        `;
                    });
                }

                const quizDone = this.isQuizCompleted(m.id);
                html += `
                    <div class="px-4 py-3 mt-1 flex items-center gap-3 cursor-pointer border-t border-slate-200/50 hover:bg-slate-100 transition-colors ${quizDone ? 'opacity-50 hover:opacity-100' : ''}" onclick="window.openQuiz('${m.id}')">
                        <i class="${quizDone ? 'fas fa-check-circle text-green-500' : 'fas fa-tasks text-blue-400'} text-sm"></i>
                        <span class="text-sm font-bold ${quizDone ? 'text-slate-600' : 'text-blue-700'}">Kuis Praktikum</span>
                    </div>
                </div>`;
            }
            html += `</div>`;
            return html;
        }).join('');

        // 3. Update Status Tombol Ujian Akhir
        const courseProgress = Math.round(totalCoursePercent / (this.sortedModules.length || 1));
        document.getElementById('progress-text').innerText = `${courseProgress}%`;

        const btnExam = document.getElementById('btn-final-exam');
        if (courseProgress === 100) {
            btnExam.className = "w-full flex items-center justify-between px-4 py-3 bg-blue-600 text-white shadow-[0_3px_0_0_#1e40af] hover:-translate-y-0.5 active:translate-y-[3px] rounded-xl font-bold transition-all cursor-pointer";
            btnExam.innerHTML = `<span><i class="fas fa-star text-yellow-300 mr-2"></i> Ujian Akhir Terbuka!</span> <i class="fas fa-arrow-right"></i>`;
            btnExam.onclick = () => this.openFinalExam();
        }

        // Expose global functions untuk trigger dari HTML onClick
        window.toggleAccordion = (id, unlocked) => {
            if (!unlocked) return Swal.fire('Terkunci', 'Selesaikan modul sebelumnya terlebih dahulu.', 'warning');
            this.expandedModules[id] = !this.expandedModules[id];
            this.renderSidebar();
        };
        window.openMaterial = (modId, matId) => this.openMaterial(modId, matId);
        window.openQuiz = (modId) => this.openQuiz(modId);
    },

    hideAllViews() {
        ['view-pdf', 'view-quiz', 'view-success', 'view-fallback'].forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
    },

    // ─────────────────────────────────────────────────────────
    //  BUKA MATERI (PDF)
    // ─────────────────────────────────────────────────────────
    openMaterial(moduleId, materialId) {
        this.currentViewId = materialId;
        this.renderSidebar();
        this.hideAllViews();

        const mod = this.sortedModules.find(m => m.id === moduleId);
        const mat = mod.materials.find(m => m.id === materialId);

        // Fallback jika instruktur belum nge-link PDF url
        if (!mat || !mat.pdf_content_url) {
            document.getElementById('view-fallback').classList.remove('hidden');
            document.getElementById('view-fallback').classList.add('flex');
            return;
        }

        document.getElementById('view-pdf').classList.remove('hidden');
        document.getElementById('pdf-title').innerText = mat.title;
        document.getElementById('pdf-iframe').src = mat.pdf_content_url;

        const isDone = this.isMaterialCompleted(materialId);
        const btnContainer = document.getElementById('pdf-action-container');
        
        if (isDone) {
            btnContainer.innerHTML = `<span class="px-4 py-2 text-green-600 font-bold bg-green-50 rounded-lg"><i class="fas fa-check mr-2"></i> Selesai Dibaca</span>`;
        } else {
            btnContainer.innerHTML = `<button onclick="window.submitProgress('material', '${materialId}')" class="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl hover:-translate-y-0.5 active:translate-y-[2px] transition-all shadow-[0_3px_0_0_#1e40af]"><i class="fas fa-check-circle mr-2"></i> Tandai Selesai</button>`;
        }
    },

    // ─────────────────────────────────────────────────────────
    //  BUKA KUIS & UJIAN
    // ─────────────────────────────────────────────────────────
    openQuiz(moduleId) {
        this.hideAllViews();
        document.getElementById('view-quiz').classList.remove('hidden');
        document.getElementById('quiz-title').innerText = 'Kuis Praktikum Modul';
        document.getElementById('quiz-icon').className = 'fas fa-tasks';
        
        const questions = this.data.questions.filter(q => q.module_id === moduleId && !q.is_exam);
        
        if (questions.length === 0) {
            document.getElementById('quiz-questions-container').innerHTML = `
                <div class="text-center py-10 bg-slate-50 rounded-xl border border-slate-200">
                    <h3 class="text-lg font-bold text-slate-700">Tidak ada soal untuk modul ini.</h3>
                    <p class="text-sm text-slate-500 mt-2">Anda dapat langsung menandai kuis ini selesai.</p>
                </div>`;
            document.getElementById('quiz-form').onsubmit = (e) => {
                e.preventDefault();
                this.submitProgress('module_quiz', moduleId, 100);
            };
        } else {
            this.buildQuestionForm(questions, (score) => this.submitProgress('module_quiz', moduleId, score));
        }
    },

    openFinalExam() {
        this.currentViewId = 'exam';
        this.renderSidebar();
        this.hideAllViews();
        
        document.getElementById('view-quiz').classList.remove('hidden');
        document.getElementById('quiz-title').innerText = 'Ujian Akhir Kursus';
        document.getElementById('quiz-icon').className = 'fas fa-star text-yellow-500';

        const questions = this.data.questions.filter(q => q.is_exam);
        
        if(questions.length === 0) {
            Swal.fire('Oops', 'Soal ujian akhir belum dibuat oleh instruktur.', 'info');
            return;
        }

        this.buildQuestionForm(questions, (score) => this.submitFinalExam(score));
    },

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
            onSubmitCallback(score);
        };
    },

    // ─────────────────────────────────────────────────────────
    //  KIRIM DATA (SUBMIT)
    // ─────────────────────────────────────────────────────────
    async submitProgress(type, itemId, score = null) {
        try {
            Swal.fire({title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
            await HTTP.post(`/courses/${this.courseId}/learn/progress`, { type, item_id: itemId, score });
            
            Swal.fire('Berhasil!', score !== null ? `Nilai Kuis: ${score}` : 'Materi selesai dibaca.', 'success')
                .then(() => { this.fetchData(); }); 
        } catch (e) { 
            Swal.fire('Error', e.message, 'error'); 
        }
    },

    async submitFinalExam(score) {
        try {
            Swal.fire({title: 'Memeriksa Jawaban...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
            const res = await HTTP.post(`/courses/${this.courseId}/learn/exam`, { score: score });
            
            if (res.passed) {
                this.hideAllViews();
                document.getElementById('view-success').classList.remove('hidden');
                document.getElementById('btn-download-cert').href = res.certificate.certificate_url;
                Swal.close();
            } else {
                Swal.fire('Belum Lulus', `Nilai kamu: ${score}. Syarat lulus adalah 70. Silakan coba lagi setelah mengulang materi!`, 'warning');
            }
        } catch (e) { 
            Swal.fire('Error', e.message, 'error'); 
        }
    }
};

// Ekspose global submitProgress agar tombol HTML "Tandai Selesai" bisa memanggilnya
window.submitProgress = (type, id) => LearnDOM.submitProgress(type, id);