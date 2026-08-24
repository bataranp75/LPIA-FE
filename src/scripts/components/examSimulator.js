// Simulasi ujian untuk GURU — mencoba soal dari sudut pandang murid.
// PENTING: seluruh state hanya di memori/frontend. Tidak ada request ke
// server, tidak ada INSERT ke database (attempt/submission/score/progress).
// Tampilan dibuat mirip halaman ujian murid (learnPage buildQuestionForm).

import { ReusableModal } from './reusableModal';
import { AppToast } from './toast';

export const ExamSimulator = {
    questions: [],
    answers: {},
    index: 0,
    durationSeconds: 0,
    remaining: 0,
    timerId: null,
    rootId: 'teacher-exam-simulator-root',

    open({ title = 'Ujian', questions = [], durationMinutes = 10 }) {
        if (!questions.length) {
            return AppToast.warning('Belum ada soal ujian untuk disimulasikan.');
        }

        // Salin data soal supaya tidak mengubah state asli.
        this.questions = questions.map(q => ({ ...q }));
        this.answers = {};
        this.index = 0;
        this.durationSeconds = Math.max(1, Number(durationMinutes) || 10) * 60;
        this.remaining = this.durationSeconds;
        this.examTitle = title;

        ReusableModal.open({
            rootId: this.rootId,
            zIndex: 12500,
            title: 'Preview Ujian',
            subtitle: 'Mode uji coba — jawaban tidak disimpan ke database.',
            isWide: true,
            content: this.renderShell()
        });

        this.renderQuestion();
        this.startTimer();
        this.bindShellEvents();
    },

    close() {
        this.stopTimer();
        ReusableModal.close(this.rootId);
    },

    // ── Timer simulasi ───────────────────────────────────────
    startTimer() {
        this.stopTimer();
        this.timerId = setInterval(() => {
            this.remaining -= 1;

            const timerEl = document.getElementById('sim-timer');
            if (timerEl) timerEl.textContent = this.formatTime(this.remaining);

            if (this.remaining <= 0) {
                this.stopTimer();
                AppToast.warning('Waktu simulasi habis. Menampilkan hasil.');
                this.finish();
            }
        }, 1000);
    },

    stopTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    },

    formatTime(totalSeconds) {
        const safe = Math.max(0, totalSeconds);
        const m = String(Math.floor(safe / 60)).padStart(2, '0');
        const s = String(safe % 60).padStart(2, '0');
        return `${m}:${s}`;
    },

    // ── Render kerangka (header + timer + area soal) ─────────
    renderShell() {
        return `
            <div class="space-y-5">
                <div class="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                    <span class="inline-flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-widest">
                        <i class="fas fa-flask"></i>
                        Mode: Preview Guru
                    </span>
                    <span class="text-[11px] font-bold text-amber-600">Jawaban tidak masuk database</span>
                </div>

                <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                        <h3 class="text-lg md:text-xl font-black text-slate-950 truncate">${this.examTitle}</h3>
                        <p class="text-xs font-semibold text-slate-400">${this.questions.length} soal</p>
                    </div>

                    <div class="flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 text-white font-black shrink-0">
                        <i class="fas fa-clock"></i>
                        <span id="sim-timer">${this.formatTime(this.remaining)}</span>
                    </div>
                </div>

                <div id="sim-question-area"></div>
            </div>
        `;
    },

    // ── Render satu soal ─────────────────────────────────────
    renderQuestion() {
        const area = document.getElementById('sim-question-area');
        if (!area) return;

        const total = this.questions.length;
        const question = this.questions[this.index];
        const selected = this.answers[question.id ?? this.index];

        const options = ['A', 'B', 'C', 'D']
            .map(key => ({ key, text: question[`option_${key.toLowerCase()}`] }))
            .filter(opt => opt.text);

        const answeredCount = Object.keys(this.answers).length;

        area.innerHTML = `
            <div class="space-y-5">
                <div class="flex items-center justify-between gap-3">
                    <span class="px-3 py-2 rounded-xl bg-blue-100 text-blue-700 text-xs font-black">
                        Soal ${this.index + 1} dari ${total}
                    </span>
                    <span class="text-xs font-bold text-slate-400">${answeredCount}/${total} terjawab</span>
                </div>

                <div class="bg-slate-50 border border-slate-200 rounded-3xl p-4 md:p-6">
                    ${
                        question.image_url
                            ? `<div class="mb-5 rounded-2xl overflow-hidden bg-white border border-slate-200">
                                   <img src="${question.image_url}" class="w-full max-h-[260px] object-contain bg-white">
                               </div>`
                            : ''
                    }

                    <h4 class="text-lg md:text-xl font-black text-slate-950 leading-relaxed mb-5">
                        ${question.question_text}
                    </h4>

                    <div class="space-y-3">
                        ${options.map(opt => `
                            <label class="flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
                                selected === opt.key
                                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                                    : 'border-slate-200 bg-white hover:border-blue-400'
                            }">
                                <input type="radio" name="sim-answer" value="${opt.key}" ${selected === opt.key ? 'checked' : ''} class="w-4 h-4 text-blue-600">
                                <span class="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black shrink-0">${opt.key}</span>
                                <span class="font-bold text-slate-700 text-sm">${opt.text}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="flex items-center justify-between gap-3">
                    <button id="sim-prev-btn" ${this.index <= 0 ? 'disabled' : ''} class="px-4 py-3 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                        <i class="fas fa-arrow-left mr-2"></i>Sebelumnya
                    </button>

                    ${
                        this.index >= total - 1
                            ? `<button id="sim-submit-btn" class="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm">
                                   <i class="fas fa-flag-checkered mr-2"></i>Selesai & Lihat Nilai
                               </button>`
                            : `<button id="sim-next-btn" class="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm">
                                   Selanjutnya<i class="fas fa-arrow-right ml-2"></i>
                               </button>`
                    }
                </div>
            </div>
        `;

        this.bindQuestionEvents();
    },

    bindQuestionEvents() {
        const question = this.questions[this.index];
        const key = question.id ?? this.index;

        document.querySelectorAll('input[name="sim-answer"]').forEach(input => {
            input.addEventListener('change', e => {
                this.answers[key] = e.target.value;
            });
        });

        document.getElementById('sim-prev-btn')?.addEventListener('click', () => {
            if (this.index > 0) {
                this.index -= 1;
                this.renderQuestion();
            }
        });

        document.getElementById('sim-next-btn')?.addEventListener('click', () => {
            if (this.index < this.questions.length - 1) {
                this.index += 1;
                this.renderQuestion();
            }
        });

        document.getElementById('sim-submit-btn')?.addEventListener('click', () => {
            this.finish();
        });
    },

    bindShellEvents() {
        // Hentikan timer bila modal ditutup lewat tombol close bawaan modal.
        const root = document.getElementById(this.rootId);
        root?.querySelector('[data-modal-close]')?.addEventListener('click', () => this.stopTimer());
    },

    // ── Hitung skor lokal & tampilkan hasil (tanpa simpan) ───
    finish() {
        this.stopTimer();

        const total = this.questions.length;
        let correct = 0;

        this.questions.forEach((q, i) => {
            const key = q.id ?? i;
            if (this.answers[key] && this.answers[key] === q.correct_answer) {
                correct += 1;
            }
        });

        const score = total ? Math.round((correct / total) * 100) : 0;
        const answered = Object.keys(this.answers).length;

        const area = document.getElementById('sim-question-area');
        if (!area) return;

        area.innerHTML = `
            <div class="text-center space-y-5 py-4">
                <div class="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl">
                    <i class="fas fa-clipboard-check"></i>
                </div>

                <div>
                    <p class="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Preview Selesai</p>
                    <p class="text-5xl font-black text-slate-950">${score}<span class="text-2xl text-slate-400">/100</span></p>
                    <p class="text-sm font-bold text-slate-500 mt-2">${correct} benar dari ${total} soal • ${answered} terjawab</p>
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs font-bold text-amber-700">
                    <i class="fas fa-circle-info mr-1"></i>
                    Ini nilai simulasi. Tidak ada data yang tersimpan ke database.
                </div>

                <div class="flex items-center justify-center gap-2">
                    <button id="sim-retry-btn" class="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm">
                        <i class="fas fa-rotate-right mr-2"></i>Ulangi Simulasi
                    </button>
                    <button id="sim-close-btn" class="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm">
                        Tutup
                    </button>
                </div>
            </div>
        `;

        const timerEl = document.getElementById('sim-timer');
        if (timerEl) timerEl.textContent = 'Selesai';

        document.getElementById('sim-retry-btn')?.addEventListener('click', () => {
            this.answers = {};
            this.index = 0;
            this.remaining = this.durationSeconds;
            const t = document.getElementById('sim-timer');
            if (t) t.textContent = this.formatTime(this.remaining);
            this.renderQuestion();
            this.startTimer();
        });

        document.getElementById('sim-close-btn')?.addEventListener('click', () => this.close());
    }
};
