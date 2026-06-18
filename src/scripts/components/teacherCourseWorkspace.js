export const TeacherCourseWorkspace = {
    render({
        mode = 'modul',
        selectedModuleId = null,
        modules = [],
        materials = [],
        questions = [],
        permissions = {}
    }) {
        const selectedModule = modules.find(item => item.id === selectedModuleId) || modules[0] || null;

        return `
            <div class="grid lg:grid-cols-[240px_1fr] gap-5">
                <aside class="hidden lg:block bg-slate-50 border border-slate-200 rounded-3xl p-3 h-fit">
                    ${this.renderSidebar(mode, selectedModule?.id, modules)}
                </aside>

                <div class="lg:hidden space-y-4">
                    <select id="teacher-workspace-mode" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-black">
                        <option value="modul" ${mode === 'modul' ? 'selected' : ''}>Modul</option>
                        <option value="soal" ${mode === 'soal' ? 'selected' : ''}>Soal</option>
                        <option value="ujian" ${mode === 'ujian' ? 'selected' : ''}>Ujian</option>
                    </select>

                    ${mode !== 'ujian' ? this.renderMobileFolders(modules, selectedModule?.id) : ''}
                </div>

                <section class="bg-white border border-slate-200 rounded-3xl p-4 md:p-5 min-h-[360px]">
                    ${this.renderContent({
                        mode,
                        selectedModule,
                        modules,
                        materials,
                        questions,
                        permissions
                    })}
                </section>
            </div>
        `;
    },

    renderSidebar(mode, selectedModuleId, modules) {
        const parents = [
            { key: 'modul', label: 'Modul', icon: 'fa-folder' },
            { key: 'soal', label: 'Soal', icon: 'fa-clipboard-question' },
            { key: 'ujian', label: 'Ujian', icon: 'fa-file-circle-check' }
        ];

        return `
            <div class="space-y-2">
                ${parents.map(parent => `
                    <button 
                        data-workspace-mode="${parent.key}"
                        class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition ${
                            mode === parent.key 
                                ? 'bg-blue-600 text-white' 
                                : 'text-slate-600 hover:bg-white'
                        }"
                    >
                        <i class="fas ${parent.icon} w-5"></i>
                        ${parent.label}
                    </button>

                    ${mode === parent.key && parent.key !== 'ujian' ? `
                        <div class="pl-4 py-2 space-y-1">
                            ${modules.map(module => `
                                <button
                                    data-workspace-module="${module.id}"
                                    class="w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition ${
                                        selectedModuleId === module.id
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-slate-500 hover:bg-white'
                                    }"
                                >
                                    <i class="fas fa-folder mr-2"></i>
                                    ${module.title || 'Tanpa Judul'}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                `).join('')}
            </div>
        `;
    },

    renderMobileFolders(modules, selectedModuleId) {
        if (!modules.length) {
            return '';
        }

        return `
            <div class="grid grid-cols-2 gap-3">
                ${modules.map(module => `
                    <button
                        data-workspace-module="${module.id}"
                        class="text-left rounded-2xl p-4 border transition ${
                            selectedModuleId === module.id
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-white border-slate-200 text-slate-700'
                        }"
                    >
                        <i class="fas fa-folder text-2xl mb-3"></i>
                        <div class="font-black text-sm truncate">${module.title || 'Tanpa Judul'}</div>
                        <div class="text-xs text-slate-400">Folder Modul</div>
                    </button>
                `).join('')}
            </div>
        `;
    },

    renderContent({ mode, selectedModule, modules, materials, questions, permissions }) {
        if (mode === 'ujian') {
            const exams = questions.filter(item => item.is_exam);

            return `
                <div class="flex items-center justify-between gap-3 mb-5">
                    <div>
                        <h3 class="text-xl font-black">Ujian Course</h3>
                        <p class="text-sm text-slate-400">Satu course hanya memiliki satu paket ujian.</p>
                    </div>
                </div>

                ${exams.length ? `
                    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${exams.map((exam, index) => `
                            <div class="rounded-3xl bg-slate-50 border border-slate-200 p-4">
                                <div class="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                                    <i class="fas fa-file-circle-check"></i>
                                </div>
                                <h4 class="font-black">Soal Ujian ${index + 1}</h4>
                                <p class="text-sm text-slate-400 line-clamp-2">${exam.question_text || '-'}</p>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="rounded-3xl border border-dashed border-slate-300 p-10 text-center">
                        <i class="fas fa-file-circle-check text-4xl text-slate-300 mb-4"></i>
                        <h4 class="font-black">Belum ada ujian</h4>
                        <p class="text-sm text-slate-400 mt-1">Fitur ujian bisa dibuat setelah modul dan materi selesai.</p>
                    </div>
                `}
            `;
        }

        if (!selectedModule) {
            return `
                <div class="rounded-3xl border border-dashed border-slate-300 p-10 text-center">
                    <i class="fas fa-folder-open text-4xl text-slate-300 mb-4"></i>
                    <h4 class="font-black">Belum ada modul</h4>
                    <p class="text-sm text-slate-400 mt-1">Tambahkan modul terlebih dahulu.</p>
                </div>
            `;
        }

        if (mode === 'soal') {
            const moduleQuestions = questions.filter(item => item.module_id === selectedModule.id && !item.is_exam);

            return `
                <div class="flex items-center justify-between gap-3 mb-5">
                    <div>
                        <h3 class="text-xl font-black">${selectedModule.title}</h3>
                        <p class="text-sm text-slate-400">Daftar soal/tugas untuk modul ini.</p>
                    </div>
                </div>

                ${moduleQuestions.length ? `
                    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${moduleQuestions.map((question, index) => `
                            <div class="rounded-3xl bg-slate-50 border border-slate-200 p-4">
                                <div class="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                                    <i class="fas fa-clipboard-question"></i>
                                </div>
                                <h4 class="font-black">Soal ${index + 1}</h4>
                                <p class="text-sm text-slate-400 line-clamp-2">${question.question_text || '-'}</p>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="rounded-3xl border border-dashed border-slate-300 p-10 text-center">
                        <i class="fas fa-clipboard-question text-4xl text-slate-300 mb-4"></i>
                        <h4 class="font-black">Belum ada soal</h4>
                        <p class="text-sm text-slate-400 mt-1">Fitur soal/tugas menyusul setelah materi.</p>
                    </div>
                `}
            `;
        }

        const moduleMaterials = materials.filter(item => item.module_id === selectedModule.id);

        return `
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                <div>
                    <h3 class="text-xl font-black">${selectedModule.title}</h3>
                    <p class="text-sm text-slate-400">Materi PDF di dalam modul ini.</p>
                </div>

                ${permissions.can_create_material ? `
                    <button 
                        data-add-material="${selectedModule.id}"
                        class="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm"
                    >
                        <i class="fas fa-plus mr-2"></i>Tambah Materi
                    </button>
                ` : ''}
            </div>

            ${moduleMaterials.length ? `
                <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${moduleMaterials.map(material => `
                        <div class="rounded-3xl bg-slate-50 border border-slate-200 p-4 hover:shadow-md transition">
                            <a href="${material.pdf_content_url || '#'}" target="_blank" class="block">
                                <div class="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl mb-4">
                                    <i class="fas fa-file-pdf"></i>
                                </div>

                                <h4 class="font-black text-slate-900 truncate">${material.title}</h4>
                                <p class="text-xs text-slate-400 mt-1">${material.file_name || 'PDF Materi'}</p>
                            </a>

                            <div class="flex items-center justify-end gap-3 mt-4">
                                ${permissions.can_update_material ? `
                                    <button data-edit-material="${material.id}" class="text-slate-500 hover:text-blue-600">
                                        <i class="fas fa-pen"></i>
                                    </button>
                                ` : ''}

                                ${permissions.can_delete_material ? `
                                    <button data-delete-material="${material.id}" class="text-slate-500 hover:text-red-600">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="rounded-3xl border border-dashed border-slate-300 p-10 text-center">
                    <i class="fas fa-file-pdf text-4xl text-slate-300 mb-4"></i>
                    <h4 class="font-black">Belum ada materi</h4>
                    <p class="text-sm text-slate-400 mt-1">Upload PDF pertama untuk modul ini.</p>
                </div>
            `}
        `;
    }
};