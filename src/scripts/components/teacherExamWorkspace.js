export const TeacherExamWorkspace = {
    render({ examQuestions = [], setting = null, permissions }) {
        const duration = setting?.duration_minutes || 10;

        if (!examQuestions.length) {
            return `
                <section class="bg-white border border-slate-200 rounded-[1.7rem] md:rounded-3xl p-4 md:p-6 shadow-sm">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="flex items-center gap-2 mb-2">
                                <span class="w-1.5 h-8 rounded-full bg-blue-600 shrink-0"></span>
                                <h3 class="text-xl md:text-2xl font-black text-slate-950">Ujian Course</h3>
                            </div>

                            <p class="text-xs md:text-sm text-slate-400 font-semibold">
                                Belum ada soal ujian. Ujian berlaku untuk satu course dan mencakup semua modul.
                            </p>
                        </div>

                        ${
                            permissions?.can_create_material
                                ? `
                                    <button id="add-exam-question-btn" class="w-11 h-11 md:w-auto md:px-4 md:py-3 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 font-black text-sm shrink-0">
                                        <i class="fas fa-plus"></i>
                                        <span class="hidden md:inline ml-2">Ujian</span>
                                    </button>
                                `
                                : ''
                        }
                    </div>

                    <div class="mt-5 bg-blue-50 border border-blue-100 rounded-3xl p-5">
                        <h4 class="font-black text-slate-900">Belum dikonfigurasi</h4>
                        <p class="text-sm text-slate-500 font-semibold mt-1">
                            Tambahkan soal ujian dan atur timer pengerjaan.
                        </p>
                    </div>
                </section>
            `;
        }

        return `
            <section class="bg-white border border-slate-200 rounded-[1.7rem] md:rounded-3xl p-4 md:p-6 shadow-sm">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="w-1.5 h-8 rounded-full bg-blue-600 shrink-0"></span>
                            <h3 class="text-xl md:text-2xl font-black text-slate-950">Ujian Course</h3>
                        </div>

                        <p class="text-xs md:text-sm text-slate-400 font-semibold">
                            ${examQuestions.length} soal ujian • Timer ${duration} menit.
                        </p>
                    </div>
                </div>

                <div class="mt-5 bg-blue-50 border border-blue-100 rounded-3xl p-5">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h4 class="font-black text-slate-900">Bank Soal Ujian</h4>
                            <p class="text-sm text-slate-500 font-semibold mt-1">
                                Klik lihat untuk preview soal ujian.
                            </p>
                        </div>

                        <div class="flex flex-wrap gap-2">
                            <button id="view-exam-question-btn" class="px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm">
                                <i class="fas fa-eye mr-2"></i>Lihat
                            </button>

                            ${
                                permissions?.can_update_material
                                    ? `
                                        <button id="edit-exam-question-btn" class="px-4 py-3 rounded-2xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-black text-sm">
                                            <i class="fas fa-pen mr-2"></i>Edit
                                        </button>

                                        <button id="setting-exam-timer-btn" class="px-4 py-3 rounded-2xl bg-white text-blue-700 border border-blue-100 hover:bg-blue-50 font-black text-sm">
                                            <i class="fas fa-clock mr-2"></i>Timer
                                        </button>
                                    `
                                    : ''
                            }

                            ${
                                permissions?.can_delete_material
                                    ? `
                                        <button id="delete-exam-question-btn" class="px-4 py-3 rounded-2xl bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 font-black text-sm">
                                            <i class="fas fa-trash mr-2"></i>Delete
                                        </button>
                                    `
                                    : ''
                            }
                        </div>
                    </div>
                </div>
            </section>
        `;
    },

    bindEvents({
        onAdd,
        onView,
        onEdit,
        onDelete,
        onSettingTimer
    }) {
        document.getElementById('add-exam-question-btn')?.addEventListener('click', onAdd);
        document.getElementById('view-exam-question-btn')?.addEventListener('click', onView);
        document.getElementById('edit-exam-question-btn')?.addEventListener('click', onEdit);
        document.getElementById('delete-exam-question-btn')?.addEventListener('click', onDelete);
        document.getElementById('setting-exam-timer-btn')?.addEventListener('click', onSettingTimer);
    }
};