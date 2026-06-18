export const TeacherQuestionWorkspace = {
    activeQuestionIndex: 0,
    autoSlideTimer: null,

    render({ module, questions = [], permissions }) {
        if (!module) {
            return `
                <div class="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center">
                    <h3 class="font-black text-slate-800">Pilih modul dulu</h3>
                    <p class="text-sm text-slate-400 font-semibold mt-1">
                        Soal akan muncul berdasarkan modul yang dipilih.
                    </p>
                </div>
            `;
        }

        if (!questions.length) {
            return this.renderEmptyState({ module, permissions });
        }

        return this.renderPreview({ module, questions, permissions });
    },

    renderEmptyState({ module, permissions }) {
        return `
            <div class="space-y-5">
                <div class="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="w-1.5 h-8 rounded-full bg-purple-500 shrink-0"></span>
                            <h3 class="text-xl md:text-2xl font-black text-slate-950 truncate">
                                <span class="text-slate-400">Soal Modul:</span>
                                <span class="text-purple-600">${module.title}</span>
                            </h3>
                        </div>

                        <p class="text-xs md:text-sm text-slate-400 font-semibold leading-relaxed">
                            Belum ada soal untuk modul ini. Tambahkan soal manual atau upload dari template CSV.
                        </p>
                    </div>

                    ${
                        permissions?.can_create_material
                            ? `
                                <button id="add-question-btn" class="w-11 h-11 md:w-auto md:px-4 md:py-3 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 font-black text-sm shrink-0">
                                    <i class="fas fa-plus"></i>
                                    <span class="hidden md:inline ml-2">Soal</span>
                                </button>
                            `
                            : ''
                    }
                </div>

                <div class="bg-purple-50 border border-purple-100 rounded-3xl p-8 text-center">
                    <div class="w-16 h-16 mx-auto rounded-2xl bg-white text-purple-600 flex items-center justify-center text-2xl mb-4">
                        <i class="fas fa-circle-question"></i>
                    </div>

                    <h4 class="font-black text-slate-900 text-lg">Belum ada soal</h4>
                    <p class="text-sm text-slate-500 font-semibold mt-2 max-w-md mx-auto">
                        Buat soal pilihan ganda untuk mengukur pemahaman siswa pada modul ini.
                    </p>

                    ${
                        permissions?.can_create_material
                            ? `
                                <button id="add-question-empty-btn" class="mt-5 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm">
                                    <i class="fas fa-plus mr-2"></i>Tambah Soal
                                </button>
                            `
                            : ''
                    }
                </div>
            </div>
        `;
    },

    renderPreview({ module, questions, permissions }) {
        const safeIndex = Math.min(this.activeQuestionIndex, questions.length - 1);
        this.activeQuestionIndex = safeIndex;

        return `
            <div class="space-y-5">
                <div class="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="w-1.5 h-8 rounded-full bg-purple-500 shrink-0"></span>
                            <h3 class="text-xl md:text-2xl font-black text-slate-950 truncate">
                                <span class="text-slate-400">Soal Modul:</span>
                                <span class="text-purple-600">${module.title}</span>
                            </h3>
                        </div>

                        <p class="text-xs md:text-sm text-slate-400 font-semibold leading-relaxed">
                            Preview soal yang akan dikerjakan siswa.
                        </p>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                        ${
                            permissions?.can_update_material
                                ? `
                                    <button id="edit-questions-btn" class="w-11 h-11 md:w-auto md:px-4 md:py-3 rounded-2xl bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 font-black text-sm">
                                        <i class="fas fa-pen"></i>
                                        <span class="hidden md:inline ml-2">Edit</span>
                                    </button>
                                `
                                : ''
                        }

                        ${
                            permissions?.can_delete_material
                                ? `
                                    <button id="bulk-delete-questions-btn" class="w-11 h-11 md:w-auto md:px-4 md:py-3 rounded-2xl bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 font-black text-sm">
                                        <i class="fas fa-trash"></i>
                                        <span class="hidden md:inline ml-2">Hapus</span>
                                    </button>
                                `
                                : ''
                        }

                        ${
                            permissions?.can_create_material
                                ? `
                                    <button id="add-question-btn" class="w-11 h-11 md:w-auto md:px-4 md:py-3 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 font-black text-sm">
                                        <i class="fas fa-plus"></i>
                                        <span class="hidden md:inline ml-2">Soal</span>
                                    </button>
                                `
                                : ''
                        }
                    </div>
                </div>

                <div id="question-preview-root" data-active-index="${safeIndex}" data-total="${questions.length}">
                    ${this.renderQuestionSlide(questions[safeIndex], safeIndex, questions.length)}
                </div>

                <div class="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <p class="text-xs md:text-sm text-slate-400 font-semibold">
                        ${questions.length} soal
                    </p>

                    <div class="flex items-center gap-2">
                        <button id="question-prev-btn" class="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100">
                            Prev
                        </button>

                        <span id="question-counter" class="px-3 py-2 rounded-xl bg-slate-50 text-slate-600 font-bold text-xs">
                            ${safeIndex + 1}/${questions.length}
                        </span>

                        <button id="question-next-btn" class="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100">
                            Next
                        </button>
                    </div>
                </div>

                <script type="application/json" id="question-preview-data">
                    ${JSON.stringify(questions).replace(/</g, '\\u003c')}
                </script>
            </div>
        `;
    },

    renderQuestionSlide(question, index, total) {
        const options = [
            { key: 'A', text: question.option_a },
            { key: 'B', text: question.option_b },
            { key: 'C', text: question.option_c },
            { key: 'D', text: question.option_d }
        ];

        return `
            <div class="bg-slate-50 border border-slate-200 rounded-3xl p-4 md:p-6">
                <div class="flex items-center justify-between gap-3 mb-5">
                    <span class="px-3 py-2 rounded-xl bg-purple-100 text-purple-700 text-xs font-black">
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

                ${
                    question.explanation
                        ? `
                            <div class="mt-5 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                                <p class="text-xs font-black text-blue-700 uppercase mb-1">Pembahasan</p>
                                <p class="text-sm font-semibold text-slate-600 leading-relaxed">${question.explanation}</p>
                            </div>
                        `
                        : ''
                }
            </div>
        `;
    },

    bindEvents({ onAddQuestion, onEditQuestions, onDeleteQuestions }) {
        document.getElementById('add-question-btn')?.addEventListener('click', onAddQuestion);
        document.getElementById('add-question-empty-btn')?.addEventListener('click', onAddQuestion);
        document.getElementById('edit-questions-btn')?.addEventListener('click', onEditQuestions);
        document.getElementById('bulk-delete-questions-btn')?.addEventListener('click', onDeleteQuestions);

        this.bindPreviewEvents();
    },

    bindPreviewEvents() {
        const dataEl = document.getElementById('question-preview-data');
        const root = document.getElementById('question-preview-root');

        if (!dataEl || !root) return;

        let questions = [];

        try {
            questions = JSON.parse(dataEl.textContent || '[]');
        } catch {
            questions = [];
        }

        if (!questions.length) return;

        const renderAt = index => {
            this.activeQuestionIndex = index;

            root.dataset.activeIndex = String(index);
            root.innerHTML = this.renderQuestionSlide(questions[index], index, questions.length);

            const counter = document.getElementById('question-counter');
            if (counter) counter.textContent = `${index + 1}/${questions.length}`;
        };

        const next = () => {
            const nextIndex = (this.activeQuestionIndex + 1) % questions.length;
            renderAt(nextIndex);
            this.restartAutoSlide(next);
        };

        const prev = () => {
            const prevIndex = this.activeQuestionIndex - 1 < 0
                ? questions.length - 1
                : this.activeQuestionIndex - 1;

            renderAt(prevIndex);
            this.restartAutoSlide(next);
        };

        document.getElementById('question-next-btn')?.addEventListener('click', next);
        document.getElementById('question-prev-btn')?.addEventListener('click', prev);

        this.restartAutoSlide(next);
    },

    restartAutoSlide(callback) {
        clearInterval(this.autoSlideTimer);

        this.autoSlideTimer = setInterval(() => {
            callback();
        }, 5000);
    }
};