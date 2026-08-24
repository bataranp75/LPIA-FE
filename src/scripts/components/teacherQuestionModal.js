import { ReusableModal } from './reusableModal';
import { AppToast } from './toast';
import { TeacherQuestionApi } from './teacherQuestionApi';
import { AppConfirmModal } from './appConfirmModal';
import { TeacherExamApi } from '../fetch/teacherExamApi';
import { parseImportFile, IMPORT_TEMPLATES } from '../utils/questionImportParser.js';

export const TeacherQuestionModal = {
    activeTab: 'manual',
    isSubmitting: false,
    bulkItems: [],
    createQuestions: [],

    // Validasi ID wajib sebelum request dikirim — mencegah error database
    // "invalid input syntax for type uuid" karena ID kosong.
    isValidId(value) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || '').trim());
    },

    validateContextIds({ moduleId = null, courseId = null, variant = 'question' }) {
        if (variant === 'exam') {
            if (!this.isValidId(courseId)) {
                AppToast.error('Course belum terpilih dengan benar. Tutup modal lalu pilih course lagi.');
                return false;
            }
            return true;
        }

        if (!this.isValidId(moduleId)) {
            AppToast.error('Modul belum terpilih dengan benar. Tutup modal lalu pilih modul lagi.');
            return false;
        }
        return true;
    },

    open({ teacherId, moduleId = null, courseId = null, questions = [], variant = 'question', onSuccess }) {
        this.activeTab = 'manual';
        this.currentQuestions = questions || [];

        const isExam = variant === 'exam';

        ReusableModal.open({
            rootId: isExam ? 'teacher-exam-modal-root' : 'teacher-question-modal-root',
            zIndex: 11000,
            title: isExam ? 'Tambah Soal Ujian' : 'Tambah Soal Modul',
            subtitle: isExam
                ? 'Tambah manual atau import soal ujian dari file AIKEN/CSV.'
                : 'Tambah manual atau import soal dari file AIKEN/CSV.',
            isWide: true,
            content: this.render({ teacherId, moduleId, courseId, variant })
        });

        this.bindEvents({
            teacherId,
            moduleId,
            courseId,
            questions,
            variant,
            onSuccess
        });
    },

    render({ teacherId, moduleId = null, courseId = null, variant = 'question' }) {
        const isExam = variant === 'exam';

        return `
            <div class="space-y-5">
                <div class="bg-slate-100 border border-slate-200 rounded-2xl p-1 grid grid-cols-2 gap-1">
                    <button data-question-tab="manual" class="question-tab-btn px-4 py-3 rounded-xl font-black text-sm ${
                        this.activeTab === 'manual'
                            ? `bg-white ${isExam ? 'text-blue-700' : 'text-purple-700'} shadow-sm`
                            : 'text-slate-500'
                    }">
                        <i class="fas fa-pen mr-2"></i>Manual
                    </button>

                    <button data-question-tab="csv" class="question-tab-btn px-4 py-3 rounded-xl font-black text-sm ${
                        this.activeTab === 'csv'
                            ? `bg-white ${isExam ? 'text-blue-700' : 'text-purple-700'} shadow-sm`
                            : 'text-slate-500'
                    }">
                        <i class="fas fa-file-import mr-2"></i>Import File
                    </button>
                </div>

                <div id="question-modal-body">
                    ${
                        this.activeTab === 'manual'
                            ? this.renderManualForm({ variant })
                            : this.renderCsvForm({ teacherId, variant })
                    }
                </div>
            </div>
        `;
    },

    renderManualForm({ variant = 'question' } = {}) {
        const isExam = variant === 'exam';
        const colorClass = isExam ? 'blue' : 'purple';
        return `
            <form id="question-manual-form" class="space-y-5">
                <div class="bg-white border border-slate-200 rounded-3xl p-4 md:p-5">
                    <label class="block text-sm font-black text-slate-800 mb-2">Pertanyaan</label>
                    <textarea name="question_text" rows="4" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-purple-100" placeholder="Tulis pertanyaan soal..." required></textarea>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${['a', 'b', 'c', 'd'].map(key => `
                        <div class="bg-white border border-slate-200 rounded-3xl p-4">
                            <label class="block text-sm font-black text-slate-800 mb-2">Opsi ${key.toUpperCase()}</label>
                            <input name="option_${key}" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-purple-100" placeholder="Jawaban ${key.toUpperCase()}" required>
                        </div>
                    `).join('')}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-white border border-slate-200 rounded-3xl p-4">
                        <label class="block text-sm font-black text-slate-800 mb-2">Jawaban Benar</label>
                        <select name="correct_answer" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-black text-sm focus:outline-none focus:ring-4 focus:ring-purple-100" required>
                            <option value="">Pilih jawaban</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                        </select>
                    </div>

                    <div class="bg-white border border-slate-200 rounded-3xl p-4">
                        <label class="block text-sm font-black text-slate-800 mb-2">Gambar Soal</label>
                        <input name="image" type="file" accept="image/png,image/jpeg,image/webp" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-sm">
                    </div>
                </div>

                <div class="bg-white border border-slate-200 rounded-3xl p-4">
                    <label class="block text-sm font-black text-slate-800 mb-2">Atau URL Gambar</label>
                    <input name="image_url" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-purple-100" placeholder="https://...">
                    <p class="text-xs text-slate-400 font-semibold mt-2">
                        Jika upload file dan URL diisi bersamaan, sistem akan memakai file upload.
                    </p>
                </div>

                ${!isExam ? `
                    <div class="bg-white border border-slate-200 rounded-3xl p-4">
                        <label class="block text-sm font-black text-slate-800 mb-2">Pembahasan</label>
                        <textarea name="explanation" rows="3" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-purple-100" placeholder="Opsional, isi pembahasan jawaban..."></textarea>
                    </div>
                ` : ''}

                <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-4 border-t border-slate-100">
                    <button type="button" id="open-bulk-question-btn" class="text-sm font-black ${
                        isExam ? 'text-blue-700 hover:text-blue-800' : 'text-purple-700 hover:text-purple-800'
                    }">
                        Lebih dari 1 soal? Buka mode banyak soal
                    </button>

                    <button id="save-question-btn" class="px-5 py-3 rounded-2xl ${
                        isExam ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
                    } text-white font-black text-sm flex items-center justify-center gap-2">
                        <span class="btn-label"><i class="fas fa-save mr-2"></i>Simpan Soal</span>
                        <span class="btn-loading hidden"><i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...</span>
                    </button>
                </div>
            </form>
        `;
    },

    renderCsvForm({ teacherId, variant = 'question' }) {
        const isExam = variant === 'exam';
        const color = isExam ? 'blue' : 'purple';

        return `
            <div id="question-import-wrap" class="space-y-5">
                <div class="${isExam ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100'} border rounded-3xl p-5">
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-white ${isExam ? 'text-blue-600' : 'text-purple-600'} flex items-center justify-center text-xl shrink-0">
                            <i class="fas fa-file-import"></i>
                        </div>

                        <div class="min-w-0">
                            <h3 class="font-black text-slate-900">
                                Import soal dari file
                            </h3>
                            <p class="text-sm text-slate-500 font-semibold mt-1">
                                Mendukung 2 format: <b>AIKEN</b> (file .txt) dan <b>CSV standar</b>.
                                Soal akan di-preview dulu sebelum disimpan.
                            </p>

                            <div class="flex flex-wrap gap-2 mt-4">
                                <button type="button" data-download-template="csv" class="inline-flex items-center px-4 py-3 rounded-2xl bg-${color}-600 hover:bg-${color}-700 text-white font-black text-sm">
                                    <i class="fas fa-download mr-2"></i>Template CSV
                                </button>

                                <button type="button" data-download-template="aiken" class="inline-flex items-center px-4 py-3 rounded-2xl bg-white border border-${color}-200 text-${color}-700 hover:bg-${color}-50 font-black text-sm">
                                    <i class="fas fa-download mr-2"></i>Template AIKEN (.txt)
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div class="bg-white/70 rounded-2xl p-4 text-xs font-semibold text-slate-600 leading-relaxed">
                            <p class="font-black text-slate-800 mb-1">Format AIKEN (.txt)</p>
                            <pre class="whitespace-pre-wrap font-mono text-[11px] text-slate-500">Teks pertanyaan
A. opsi
B. opsi
C. opsi
D. opsi
ANSWER: A</pre>
                        </div>

                        <div class="bg-white/70 rounded-2xl p-4 text-xs font-semibold text-slate-600 leading-relaxed">
                            <p class="font-black text-slate-800 mb-1">Format CSV standar</p>
                            <pre class="whitespace-pre-wrap font-mono text-[11px] text-slate-500">question,option_a,option_b,
option_c,option_d,answer,
explanation</pre>
                        </div>
                    </div>
                </div>

                <label id="csv-dropzone" class="block cursor-pointer bg-white border-2 border-dashed border-slate-300 hover:${isExam ? 'border-blue-300' : 'border-purple-300'} rounded-3xl p-8 text-center transition">
                    <input id="question-csv-input" name="csv" type="file" accept=".csv,.txt,text/csv,text/plain" class="hidden">

                    <div class="w-16 h-16 mx-auto rounded-2xl ${isExam ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'} flex items-center justify-center text-2xl mb-4">
                        <i class="fas fa-file-arrow-up"></i>
                    </div>

                    <h4 class="font-black text-slate-900">
                        Upload atau drag file soal
                    </h4>
                    <p id="csv-file-label" class="text-sm text-slate-400 font-semibold mt-2">
                        File .txt (AIKEN) atau .csv (template standar).
                    </p>
                </label>

                <div id="import-preview-area" class="hidden"></div>

                <div class="flex justify-end pt-4 border-t border-slate-100">
                    <button type="button" id="upload-question-csv-btn" disabled class="px-5 py-3 rounded-2xl ${
                        isExam ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
                    } text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <span class="btn-label"><i class="fas fa-file-circle-check mr-2"></i>Import Soal</span>
                        <span class="btn-loading hidden"><i class="fas fa-spinner fa-spin mr-2"></i>Mengimport...</span>
                    </button>
                </div>
            </div>
        `;
    },

    renderImportPreview({ result, variant = 'question' }) {
        const isExam = variant === 'exam';
        const color = isExam ? 'blue' : 'purple';
        const formatLabel = result.format === 'csv' ? 'CSV standar' : 'AIKEN';

        const errorSection = result.errors.length
            ? `
                <div class="bg-red-50 border border-red-100 rounded-2xl p-4">
                    <p class="text-sm font-black text-red-700 mb-2">
                        <i class="fas fa-triangle-exclamation mr-1"></i>
                        ${result.errors.length} baris bermasalah (dilewati saat import):
                    </p>
                    <ul class="space-y-1 max-h-40 overflow-y-auto">
                        ${result.errors.map(err => `
                            <li class="text-xs font-semibold text-red-600">
                                Baris ${err.line}: ${err.message}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `
            : '';

        const questionList = result.questions.length
            ? `
                <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
                    ${result.questions.map((question, index) => `
                        <div class="bg-white border border-slate-200 rounded-2xl p-4">
                            <div class="flex items-start justify-between gap-3">
                                <p class="text-xs font-black text-${color}-600 mb-1">Soal ${index + 1}</p>
                                <span class="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-black shrink-0">
                                    Jawaban: ${question.correct_answer}
                                </span>
                            </div>

                            <p class="text-sm font-black text-slate-900 leading-relaxed">${question.question_text}</p>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-1 mt-2 text-xs font-bold text-slate-500">
                                <p>A. ${question.option_a}</p>
                                <p>B. ${question.option_b}</p>
                                <p>C. ${question.option_c}</p>
                                <p>D. ${question.option_d}</p>
                            </div>

                            ${question.explanation ? `
                                <p class="text-xs font-semibold text-slate-400 mt-2">
                                    <i class="fas fa-lightbulb mr-1"></i>${question.explanation}
                                </p>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `
            : `
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                    <p class="text-sm font-black text-slate-500">Tidak ada soal valid yang bisa diimport.</p>
                </div>
            `;

        return `
            <div class="space-y-4">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="px-3 py-2 rounded-xl bg-${color}-100 text-${color}-700 text-xs font-black">
                        Format terdeteksi: ${formatLabel}
                    </span>

                    <span class="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-black">
                        ${result.questions.length} soal berhasil dibaca
                    </span>

                    ${result.errors.length ? `
                        <span class="px-3 py-2 rounded-xl bg-red-100 text-red-700 text-xs font-black">
                            ${result.errors.length} baris error
                        </span>
                    ` : ''}
                </div>

                ${errorSection}
                ${questionList}
            </div>
        `;
    },

    renderBulkOverlay({ variant = 'question' } = {}) {
        if (!this.bulkItems.length) {
            this.bulkItems = [this.createEmptyBulkItem()];
        }

        return `
            <div class="space-y-5">
                <div class="${variant === 'exam' ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100'} border rounded-3xl p-5">
                    <h3 class="font-black text-slate-900">
                        ${variant === 'exam' ? 'Mode Soal Ujian' : 'Mode Banyak Soal'}
                    </h3>
                    <p class="text-sm text-slate-500 font-semibold mt-1">
                        ${variant === 'exam'
                            ? 'Tambahkan atau edit soal ujian course. Pembahasan tidak digunakan pada ujian.'
                            : 'Tambahkan beberapa soal sekaligus.'}
                    </p>
                </div>

                <form id="question-bulk-form" class="space-y-4">
                    <div id="bulk-question-list" class="space-y-4">
                        ${this.bulkItems.map((item, index) => this.renderBulkItem(item, index, variant)).join('')}
                    </div>

                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-4 border-t border-slate-100">
                        <button type="button" id="add-bulk-question-item-btn" class="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm">
                            <i class="fas fa-plus mr-2"></i>Tambah Baris Soal
                        </button>

                        <button id="save-bulk-question-btn" class="px-5 py-3 rounded-2xl ${variant === 'exam' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'} text-white font-black text-sm flex items-center justify-center gap-2">
                            <span class="btn-label"><i class="fas fa-save mr-2"></i>Simpan Semua</span>
                            <span class="btn-loading hidden"><i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...</span>
                        </button>
                    </div>
                </form>
            </div>
        `;
    },

    renderBulkItem(item, index, variant = 'question') {
        return `
            <div class="bulk-question-card bg-white border border-slate-200 rounded-3xl p-4 md:p-5" data-bulk-client-id="${item.client_id}">
                <div class="flex items-center justify-between gap-3 mb-4">
                    <h4 class="font-black text-slate-900">Soal ${index + 1}</h4>

                    <button type="button" data-remove-bulk-item="${item.client_id}" class="w-9 h-9 rounded-xl bg-red-50 text-red-600 hover:bg-red-100">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>

                <div class="space-y-4">
                    <textarea data-field="question_text" rows="3" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-sm" placeholder="Pertanyaan..." required>${item.question_text}</textarea>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${['a', 'b', 'c', 'd'].map(key => `
                            <input data-field="option_${key}" value="${item[`option_${key}`] || ''}" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-sm" placeholder="Opsi ${key.toUpperCase()}" required>
                        `).join('')}
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <select data-field="correct_answer" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-black text-sm" required>
                            <option value="">Jawaban benar</option>
                            ${['A', 'B', 'C', 'D'].map(answer => `
                                <option value="${answer}" ${item.correct_answer === answer ? 'selected' : ''}>${answer}</option>
                            `).join('')}
                        </select>

                        <input data-field="image_file" type="file" accept="image/png,image/jpeg,image/webp" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-sm">
                    </div>

                    <input data-field="image_url" value="${item.image_url || ''}" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-sm" placeholder="URL gambar opsional">

                    ${
                        item.image_url
                            ? `
                                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <p class="text-xs font-black text-slate-400 mb-2">Gambar saat ini</p>
                                    <img src="${item.image_url}" class="max-h-40 rounded-xl object-contain bg-white">
                                </div>
                            `
                            : ''
                    }

                    ${variant !== 'exam' ? `
                        <textarea data-field="explanation" rows="2" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-sm" placeholder="Pembahasan opsional">${item.explanation || ''}</textarea>
                    ` : ''}
                </div>
            </div>
        `;
    },

    createEmptyBulkItem(question = {}) {
        return {
            client_id: question.client_id || crypto.randomUUID?.() || String(Date.now() + Math.random()),
            id: question.id || null,
            question_text: question.question_text || '',
            option_a: question.option_a || '',
            option_b: question.option_b || '',
            option_c: question.option_c || '',
            option_d: question.option_d || '',
            correct_answer: question.correct_answer || '',
            image_url: question.image_url || '',
            image_storage_path: question.image_storage_path || '',
            explanation: question.explanation || ''
        };
    },

    bindEvents({ teacherId, moduleId, courseId = null, variant = 'question', onSuccess }) {
        document.querySelectorAll('[data-question-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeTab = btn.dataset.questionTab;

                const rootId = variant === 'exam'
                    ? 'teacher-exam-modal-root'
                    : 'teacher-question-modal-root';

                const modalBody = document.querySelector(
                    `#${rootId} .flex-1 .p-4, #${rootId} .flex-1 .md\\:p-7`
                );

                if (!modalBody) return;

                modalBody.innerHTML = this.render({
                    teacherId,
                    moduleId,
                    courseId,
                    variant
                });

                this.bindEvents({
                    teacherId,
                    moduleId,
                    courseId,
                    questions: this.currentQuestions,
                    variant,
                    onSuccess
                });
            });
        });

        // Meneruskan parameter ke fungsi bind form masing-masing
        this.bindManualForm({ teacherId, moduleId, courseId, variant, onSuccess });
        this.bindCsvForm({ teacherId, moduleId, courseId, variant, onSuccess });

        document.getElementById('open-bulk-question-btn')?.addEventListener('click', () => {
            this.openBulkOverlay({
                teacherId,
                moduleId,
                courseId,
                onSuccess,
                mode: 'append',
                variant
            });
        });
    },

    bindManualForm({ teacherId, moduleId, courseId, variant = 'question', onSuccess }) {
        document.getElementById('question-manual-form')?.addEventListener('submit', async e => {
            e.preventDefault();

            if (this.isSubmitting) return;
            if (!this.validateContextIds({ moduleId, courseId, variant })) return;

            const form = e.target;
            const formData = new FormData(form);
            const submitBtn = document.getElementById('save-question-btn');

            this.setLoading(submitBtn, true);

            try {
                this.isSubmitting = true;

                await TeacherQuestionApi.createManualQuestion({
                    teacherId,
                    imageFile: formData.get('image'),
                    payload: {
                        module_id: moduleId,
                        question_text: formData.get('question_text'),
                        option_a: formData.get('option_a'),
                        option_b: formData.get('option_b'),
                        option_c: formData.get('option_c'),
                        option_d: formData.get('option_d'),
                        correct_answer: formData.get('correct_answer'),
                        image_url: formData.get('image_url'),
                        explanation: formData.get('explanation')
                    }
                });

                AppToast.success('Soal berhasil dibuat.');
                ReusableModal.close('teacher-question-modal-root');

                await onSuccess?.();
            } catch (error) {
                AppToast.error(error.message);
            } finally {
                this.isSubmitting = false;
                this.setLoading(submitBtn, false);
            }
        });
    },

    bindCsvForm({ teacherId, moduleId, courseId, variant = 'question', onSuccess }) {
        const csvInput = document.getElementById('question-csv-input');
        const csvLabel = document.getElementById('csv-file-label');
        const dropzone = document.getElementById('csv-dropzone');
        const previewArea = document.getElementById('import-preview-area');
        const importBtn = document.getElementById('upload-question-csv-btn');

        // Hasil parsing terakhir; tombol import hanya aktif jika ada soal valid.
        this.parsedImport = null;

        // Download template dibuat client-side (Blob) supaya tetap jalan
        // walau backend belum ter-deploy versi terbaru.
        document.querySelectorAll('[data-download-template]').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.downloadTemplate;
                const content = IMPORT_TEMPLATES[type];
                const fileName = type === 'csv' ? 'template-soal.csv' : 'template-soal-aiken.txt';
                const mime = type === 'csv' ? 'text/csv' : 'text/plain';

                const blob = new Blob([content], { type: `${mime};charset=utf-8` });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.click();
                URL.revokeObjectURL(url);
            });
        });

        const handleFile = async file => {
            if (!file) return;

            if (csvLabel) csvLabel.textContent = file.name;

            let text = '';

            try {
                text = await file.text();
            } catch {
                AppToast.error('Gagal membaca file. Coba pilih ulang.');
                return;
            }

            const result = parseImportFile(file.name, text);
            this.parsedImport = result;

            if (previewArea) {
                previewArea.innerHTML = this.renderImportPreview({ result, variant });
                previewArea.classList.remove('hidden');
            }

            if (importBtn) {
                importBtn.disabled = !result.questions.length;

                const label = importBtn.querySelector('.btn-label');
                if (label) {
                    label.innerHTML = result.questions.length
                        ? `<i class="fas fa-file-circle-check mr-2"></i>Import ${result.questions.length} Soal`
                        : `<i class="fas fa-file-circle-check mr-2"></i>Import Soal`;
                }
            }

            if (!result.questions.length) {
                AppToast.error('Tidak ada soal valid di file ini. Periksa daftar error di preview.');
            } else if (result.errors.length) {
                AppToast.warning(`${result.questions.length} soal terbaca, ${result.errors.length} baris error dilewati.`);
            } else {
                AppToast.success(`${result.questions.length} soal berhasil dibaca. Cek preview lalu klik Import.`);
            }
        };

        csvInput?.addEventListener('change', () => handleFile(csvInput.files?.[0]));

        dropzone?.addEventListener('dragover', e => {
            e.preventDefault();
            dropzone.classList.add('border-purple-400', 'bg-purple-50');
        });

        dropzone?.addEventListener('dragleave', () => {
            dropzone.classList.remove('border-purple-400', 'bg-purple-50');
        });

        dropzone?.addEventListener('drop', e => {
            e.preventDefault();
            dropzone.classList.remove('border-purple-400', 'bg-purple-50');

            const file = e.dataTransfer.files?.[0];
            if (!file || !csvInput) return;

            const dt = new DataTransfer();
            dt.items.add(file);
            csvInput.files = dt.files;

            handleFile(file);
        });

        importBtn?.addEventListener('click', async () => {
            if (this.isSubmitting) return;
            if (!this.validateContextIds({ moduleId, courseId, variant })) return;

            const parsed = this.parsedImport;

            if (!parsed?.questions?.length) {
                AppToast.warning('Upload file soal dulu sebelum import.');
                return;
            }

            const runImport = async (mode = 'append') => {
                this.setLoading(importBtn, true);

                try {
                    this.isSubmitting = true;

                    if (variant === 'exam') {
                        await TeacherExamApi.syncExamQuestions({
                            teacherId,
                            courseId,
                            mode,
                            questions: parsed.questions
                        });
                    } else {
                        await TeacherQuestionApi.syncQuestions({
                            teacherId,
                            moduleId,
                            mode,
                            questions: parsed.questions
                        });
                    }

                    AppToast.success(`${parsed.questions.length} soal berhasil diimport.`);
                    ReusableModal.close(variant === 'exam' ? 'teacher-exam-modal-root' : 'teacher-question-modal-root');

                    await onSuccess?.();
                } catch (error) {
                    AppToast.error(error.message);
                } finally {
                    this.isSubmitting = false;
                    this.setLoading(importBtn, false);
                }
            };

            if (this.currentQuestions.length) {
                AppConfirmModal.open({
                    title: 'Soal lama sudah ada',
                    message: `Sudah ada ${this.currentQuestions.length} soal. Mau digabung dengan soal lama atau ganti semua soal lama?`,
                    type: 'warning',
                    confirmText: 'Gabungkan',
                    cancelText: 'Ganti Semua',
                    onConfirm: async () => {
                        await runImport('append');
                    }
                });

                document.getElementById('confirm-cancel-btn')?.addEventListener('click', async () => {
                    ReusableModal.close('teacher-question-confirm-root');

                    AppConfirmModal.open({
                        title: 'Ganti semua soal?',
                        message: 'Semua soal lama akan dihapus dan diganti dengan isi file ini.',
                        type: 'danger',
                        confirmText: 'Ya, Ganti',
                        danger: true,
                        onConfirm: async () => {
                            await runImport('replace');
                        }
                    });
                });

                return;
            }

            await runImport('append');
        });
    },

    openBulkOverlay({
        teacherId,
        moduleId = null,
        courseId = null,
        onSuccess,
        existingQuestions = [],
        mode = 'append',
        variant = 'question'
    }) {
        this.bulkItems = existingQuestions.length
            ? existingQuestions.map(question => this.createEmptyBulkItem(question))
            : [this.createEmptyBulkItem()];

        const isExam = variant === 'exam';

        ReusableModal.open({
            rootId: isExam ? 'teacher-exam-bulk-modal-root' : 'teacher-question-bulk-modal-root',
            zIndex: 12000,
            title: isExam
                ? mode === 'sync' ? 'Edit Soal Ujian' : 'Tambah Soal Ujian'
                : mode === 'sync' ? 'Edit Soal Modul' : 'Tambah Banyak Soal',
            subtitle: isExam
                ? 'Soal ujian course tidak memiliki pembahasan.'
                : 'Mode luas untuk input beberapa soal manual.',
            isWide: true,
            content: this.renderBulkOverlay({ variant })
        });

        this.bindBulkEvents({
            teacherId,
            moduleId,
            courseId,
            onSuccess,
            mode,
            variant
        });
    },

    bindBulkEvents({ teacherId, moduleId, courseId, onSuccess, mode = 'append', variant = 'question' }) {
        document.getElementById('add-bulk-question-item-btn')?.addEventListener('click', () => {
            const newItem = this.createEmptyBulkItem();
            this.bulkItems.push(newItem);

            const list = document.getElementById('bulk-question-list');
            if (!list) return;

            list.insertAdjacentHTML(
            'beforeend',
            this.renderBulkItem(newItem, this.bulkItems.length - 1, variant)
            );

            this.bindBulkRemoveEvents();
        });

        this.bindBulkRemoveEvents();

        document.getElementById('question-bulk-form')?.addEventListener('submit', async e => {
            e.preventDefault();

            if (this.isSubmitting) return;

            const submitBtn = document.getElementById('save-bulk-question-btn');

            AppConfirmModal.open({
                title: 'Simpan kumpulan soal?',
                message: mode === 'replace'
                    ? 'Semua soal lama pada modul ini akan diganti dengan data yang ada di form ini.'
                    : 'Soal baru akan digabung dengan soal lama pada modul ini.',
                type: 'warning',
                confirmText: 'Simpan',
                // Cari blok ini di dalam bindBulkEvents:
                onConfirm: async () => {
                    this.setLoading(submitBtn, true);

                    try {
                        this.isSubmitting = true;

                        if (!this.validateContextIds({ moduleId, courseId, variant })) return;

                        // Data array dari semua input soal sudah terkumpul di sini:
                        const questions = this.collectBulkQuestions();

                        // Simpan lewat endpoint sync (mode append = gabung, sync/replace = timpa)
                        if (variant === 'exam') {
                            await TeacherExamApi.syncExamQuestions({
                                teacherId,
                                courseId,
                                mode,
                                questions
                            });
                        } else {
                            await TeacherQuestionApi.syncQuestions({
                                teacherId,
                                moduleId,
                                mode,
                                questions
                            });
                        }

                        AppToast.success(`${questions.length} soal berhasil disimpan.`);
                        ReusableModal.close(variant === 'exam' ? 'teacher-exam-bulk-modal-root' : 'teacher-question-bulk-modal-root');

                        await onSuccess?.();
                    } catch (error) {
                        AppToast.error(error.message);
                    } finally {
                        this.isSubmitting = false;
                        this.setLoading(submitBtn, false);
                    }
                }
            });
        });
    },

    bindBulkRemoveEvents() {
        document.querySelectorAll('[data-remove-bulk-item]').forEach(btn => {
            if (btn.dataset.bound === 'true') return;
            btn.dataset.bound = 'true';

            btn.addEventListener('click', () => {
                const clientId = btn.dataset.removeBulkItem;

                if (document.querySelectorAll('.bulk-question-card').length <= 1) {
                    AppToast.warning('Minimal harus ada 1 soal.');
                    return;
                }

                this.confirm({
                    title: 'Hapus container soal?',
                    message: 'Container ini akan dihapus dari form. Jika ini soal dari database, perubahan baru tersimpan setelah klik Simpan Semua.',
                    type: 'danger',
                    confirmText: 'Hapus',
                    danger: true,
                    onConfirm: () => {
                        document.querySelector(`[data-bulk-client-id="${clientId}"]`)?.remove();
                        this.bulkItems = this.bulkItems.filter(item => item.client_id !== clientId);
                        this.refreshBulkNumbers();
                    }
                });
            });
        });
    },

    openDeleteSelector({
        questions = [],
        title = 'Pilih Soal yang Dihapus',
        subtitle = 'Pilih satu atau beberapa soal, lalu konfirmasi hapus.',
        onDelete
    }) {
        ReusableModal.open({
            rootId: 'teacher-question-delete-selector-root',
            zIndex: 12000,
            title,
            subtitle,
            isWide: true,
            content: `
                <div class="space-y-5">
                    <div class="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-3xl p-4">
                        <div>
                            <h3 class="font-black text-slate-900">Daftar Soal</h3>
                            <p class="text-sm text-slate-400 font-semibold mt-1">
                                Centang soal yang ingin dihapus.
                            </p>
                        </div>

                        <label class="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                            <input id="select-all-delete-questions" type="checkbox" class="w-4 h-4">
                            <span class="text-sm font-black text-slate-600">Select All</span>
                        </label>
                    </div>

                    <div class="space-y-3">
                        ${questions.map((question, index) => `
                            <label class="flex items-start gap-4 bg-white border border-slate-200 rounded-3xl p-4 cursor-pointer hover:bg-red-50/40 transition">
                                <input type="checkbox" class="delete-question-checkbox mt-1 w-4 h-4" value="${question.id}">

                                <div class="min-w-0">
                                    <p class="text-xs font-black text-red-600 mb-1">Soal ${index + 1}</p>
                                    <h4 class="font-black text-slate-900 leading-relaxed">${question.question_text}</h4>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-xs font-bold text-slate-500">
                                        <p>A. ${question.option_a}</p>
                                        <p>B. ${question.option_b}</p>
                                        <p>C. ${question.option_c}</p>
                                        <p>D. ${question.option_d}</p>
                                    </div>
                                </div>
                            </label>
                        `).join('')}
                    </div>

                    <div class="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button id="cancel-delete-selector-btn" class="px-4 py-3 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm">
                            Batal
                        </button>

                        <button id="confirm-delete-selector-btn" class="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm">
                            Hapus Terpilih
                        </button>
                    </div>
                </div>
            `
        });

        document.getElementById('cancel-delete-selector-btn')?.addEventListener('click', () => {
            ReusableModal.close('teacher-question-delete-selector-root');
        });

        document.getElementById('select-all-delete-questions')?.addEventListener('change', e => {
            document.querySelectorAll('.delete-question-checkbox').forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
        });

        document.getElementById('confirm-delete-selector-btn')?.addEventListener('click', () => {
            const selectedIds = [...document.querySelectorAll('.delete-question-checkbox:checked')]
                .map(item => item.value);

            if (!selectedIds.length) {
                AppToast.warning('Pilih minimal 1 soal.');
                return;
            }

            AppConfirmModal.open({
                title: 'Hapus soal terpilih?',
                message: `${selectedIds.length} soal akan dihapus permanen dari modul ini.`,
                type: 'danger',
                confirmText: 'Hapus',
                onConfirm: async () => {
                    ReusableModal.close('teacher-question-delete-selector-root');
                    await onDelete?.(selectedIds);
                }
            });
        });
    },

    refreshBulkNumbers() {
        document.querySelectorAll('.bulk-question-card').forEach((card, index) => {
            const title = card.querySelector('h4');
            if (title) title.textContent = `Soal ${index + 1}`;
        });
    },

    collectBulkQuestions() {
        const cards = document.querySelectorAll('.bulk-question-card');

        return [...cards].map((card, index) => {
            const clientId = card.dataset.bulkClientId;
            const existingItem = this.bulkItems.find(item => item.client_id === clientId) || {};

            const getValue = field => {
                const el = card.querySelector(`[data-field="${field}"]`);
                return el?.value || '';
            };

            const imageInput = card.querySelector('[data-field="image_file"]');

            return {
                client_id: clientId,
                id: existingItem.id || null,
                image_storage_path: existingItem.image_storage_path || '',
                question_text: getValue('question_text'),
                option_a: getValue('option_a'),
                option_b: getValue('option_b'),
                option_c: getValue('option_c'),
                option_d: getValue('option_d'),
                correct_answer: getValue('correct_answer'),
                image_url: getValue('image_url'),
                image_file: imageInput?.files?.[0] || null,
                explanation: getValue('explanation'),
                order_index: index + 1
            };
        });
    },

    confirm({
        title = 'Konfirmasi',
        message = 'Apakah Anda yakin?',
        confirmText = 'Ya',
        cancelText = 'Batal',
        danger = false,
        onConfirm
    }) {
        ReusableModal.open({
            rootId: 'teacher-question-confirm-root',
            zIndex: 13000,
            title,
            subtitle: '',
            isWide: false,
            content: `
                <div class="space-y-5">
                    <div class="w-14 h-14 rounded-2xl ${danger ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'} flex items-center justify-center text-xl">
                        <i class="fas ${danger ? 'fa-triangle-exclamation' : 'fa-circle-question'}"></i>
                    </div>

                    <p class="text-sm text-slate-500 font-semibold leading-relaxed">
                        ${message}
                    </p>

                    <div class="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button id="confirm-cancel-btn" class="px-4 py-3 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm">
                            ${cancelText}
                        </button>

                        <button id="confirm-action-btn" class="px-4 py-3 rounded-2xl ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'} text-white font-black text-sm">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `
        });

        document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => {
            ReusableModal.close('teacher-question-confirm-root');
        });

        document.getElementById('confirm-action-btn')?.addEventListener('click', async () => {
            ReusableModal.close('teacher-question-confirm-root');
            await onConfirm?.();
        });
    },

    setLoading(button, isLoading) {
        if (!button) return;

        const label = button.querySelector('.btn-label');
        const loading = button.querySelector('.btn-loading');

        button.disabled = isLoading;
        button.classList.toggle('opacity-70', isLoading);
        button.classList.toggle('cursor-not-allowed', isLoading);

        label?.classList.toggle('hidden', isLoading);
        loading?.classList.toggle('hidden', !isLoading);
    },
    openPreviewModal({
        title = 'Preview Soal',
        subtitle = 'Preview soal yang akan dikerjakan siswa.',
        questions = [],
        theme = 'blue'
    }) {
        const firstQuestion = questions[0];

        if (!firstQuestion) {
            return AppToast.warning('Belum ada soal untuk ditampilkan.');
        }

        // Selalu mulai preview dari soal pertama setiap kali dibuka.
        this.previewIndex = 0;

        ReusableModal.open({
            rootId: 'teacher-question-preview-root',
            zIndex: 12000,
            title,
            subtitle,
            isWide: true,
            content: `
                <div id="exam-preview-content">
                    ${this.renderPreviewSlide(firstQuestion, 0, questions.length, theme)}
                </div>
    
                <script type="application/json" id="exam-preview-data">
                    ${JSON.stringify(questions).replace(/</g, '\\u003c')}
                </script>
            `
        });
    
        this.bindPreviewModalEvents({ theme });
    },
    
    renderPreviewSlide(question, index, total, theme = 'blue') {
        const color = theme === 'blue' ? 'blue' : 'purple';
    
        const options = [
            { key: 'A', text: question.option_a },
            { key: 'B', text: question.option_b },
            { key: 'C', text: question.option_c },
            { key: 'D', text: question.option_d }
        ];
    
        return `
            <div class="space-y-5">
                <div class="bg-slate-50 border border-slate-200 rounded-3xl p-4 md:p-6">
                    <div class="flex items-center justify-between gap-3 mb-5">
                        <span class="px-3 py-2 rounded-xl bg-${color}-100 text-${color}-700 text-xs font-black">
                            Soal ${index + 1} dari ${total}
                        </span>
    
                        <span class="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-black">
                            Jawaban: ${question.correct_answer}
                        </span>
                    </div>
    
                    ${
                        question.image_url
                            ? `
                                <div class="mb-5 rounded-2xl overflow-hidden bg-white border border-slate-200">
                                    <img src="${question.image_url}" class="w-full max-h-[260px] object-contain bg-white">
                                </div>
                            `
                            : ''
                    }
    
                    <h4 class="text-lg md:text-xl font-black text-slate-950 leading-relaxed mb-5">
                        ${question.question_text}
                    </h4>
    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${options.map(option => `
                            <div class="rounded-2xl border p-4 ${
                                question.correct_answer === option.key
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : 'bg-white border-slate-200'
                            }">
                                <div class="flex items-start gap-3">
                                    <span class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                        question.correct_answer === option.key
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-100 text-slate-500'
                                    }">
                                        ${option.key}
                                    </span>
    
                                    <p class="text-sm font-bold text-slate-700 leading-relaxed">${option.text}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
    
                <div class="flex items-center justify-between gap-3">
                    <p class="text-xs md:text-sm text-slate-400 font-semibold">${total} soal</p>

                    <div class="flex items-center gap-2">
                        <button id="preview-prev-btn" ${index <= 0 ? 'disabled' : ''} class="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                            Prev
                        </button>

                        <span id="preview-counter" class="px-3 py-2 rounded-xl bg-slate-50 text-slate-600 font-bold text-xs">
                            ${index + 1}/${total}
                        </span>

                        <button id="preview-next-btn" ${index >= total - 1 ? 'disabled' : ''} class="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                            Next
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    
    bindPreviewModalEvents({ theme = 'blue' }) {
        const dataEl = document.getElementById('exam-preview-data');
        const root = document.getElementById('exam-preview-content');

        if (!dataEl || !root) return;

        let questions = [];

        try {
            questions = JSON.parse(dataEl.textContent || '[]');
        } catch {
            questions = [];
        }

        if (!questions.length) return;

        // State indeks disimpan di properti instance, BUKAN variabel closure.
        // Sebelumnya activeIndex di-reset ke 0 tiap re-bind sehingga navigasi
        // melompat (mis. 2/12 -> 12/12). Sekarang navigasi maju/mundur 1 langkah.
        if (typeof this.previewIndex !== 'number') {
            this.previewIndex = 0;
        }

        // Jaga indeks tetap dalam rentang valid (clamp, tanpa wrap-around).
        this.previewIndex = Math.max(0, Math.min(this.previewIndex, questions.length - 1));

        const renderAt = index => {
            this.previewIndex = Math.max(0, Math.min(index, questions.length - 1));
            root.innerHTML = this.renderPreviewSlide(
                questions[this.previewIndex],
                this.previewIndex,
                questions.length,
                theme
            );
            this.bindPreviewModalEvents({ theme });
        };

        document.getElementById('preview-next-btn')?.addEventListener('click', () => {
            if (this.previewIndex < questions.length - 1) {
                renderAt(this.previewIndex + 1);
            }
        });

        document.getElementById('preview-prev-btn')?.addEventListener('click', () => {
            if (this.previewIndex > 0) {
                renderAt(this.previewIndex - 1);
            }
        });
    },
    openExamTimerModal({ teacherId, courseId, currentDuration = 10, onSuccess }) {
    ReusableModal.open({
        rootId: 'teacher-exam-timer-modal-root',
        zIndex: 12000,
        title: 'Setting Waktu Ujian',
        subtitle: 'Atur durasi pengerjaan ujian course.',
        isWide: false,
        content: `
            <form id="exam-timer-form" class="space-y-5">
                <div class="bg-blue-50 border border-blue-100 rounded-3xl p-5">
                    <label class="block text-sm font-black text-slate-800 mb-2">Durasi Ujian</label>
                    <div class="flex items-center gap-2">
                        <input 
                            name="duration_minutes"
                            type="number"
                            min="1"
                            max="300"
                            value="${currentDuration}"
                            class="w-full px-4 py-3 rounded-2xl bg-white border border-blue-100 font-black text-slate-800"
                            required
                        >
                        <span class="text-sm font-black text-blue-700">menit</span>
                    </div>
                    <p class="text-xs text-slate-500 font-semibold mt-2">
                        Durasi minimal 1 menit dan maksimal 300 menit.
                    </p>
                </div>

                <div class="flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <button type="button" id="cancel-exam-timer-btn" class="px-4 py-3 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm">
                        Batal
                    </button>

                    <button id="save-exam-timer-btn" class="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm">
                        Simpan Timer
                    </button>
                </div>
            </form>
        `
    });

    document.getElementById('cancel-exam-timer-btn')?.addEventListener('click', () => {
        ReusableModal.close('teacher-exam-timer-modal-root');
    });

    document.getElementById('exam-timer-form')?.addEventListener('submit', async e => {
        e.preventDefault();

        if (this.isSubmitting) return;

        const formData = new FormData(e.target);
        const durationMinutes = Number(formData.get('duration_minutes'));

        try {
            this.isSubmitting = true;

            await TeacherExamApi.updateExamTimer({
                teacherId,
                courseId,
                durationMinutes
            });

            AppToast.success('Timer ujian berhasil disimpan.');
            ReusableModal.close('teacher-exam-timer-modal-root');

            await onSuccess?.();
        } catch (error) {
            AppToast.error(error.message);
        } finally {
            this.isSubmitting = false;
        }
    });
},
};


