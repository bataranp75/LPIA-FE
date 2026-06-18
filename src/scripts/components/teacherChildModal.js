export const TeacherChildModal = {
    open({ title, content }) {
        let root = document.getElementById('teacher-child-modal-root');

        if (!root) {
            root = document.createElement('div');
            root.id = 'teacher-child-modal-root';
            document.body.appendChild(root);
        }

        root.innerHTML = `
            <div class="fixed inset-0 z-[11000] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/40 child-modal-overlay"></div>

                <div class="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl">
                    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h2 class="text-xl font-black">${title}</h2>
                        <button class="child-modal-close w-10 h-10 rounded-xl bg-slate-100">
                            <i class="fas fa-xmark"></i>
                        </button>
                    </div>

                    <div class="p-6">
                        ${content}
                    </div>
                </div>
            </div>
        `;

        root.querySelector('.child-modal-close')?.addEventListener('click', this.close);
        root.querySelector('.child-modal-overlay')?.addEventListener('click', this.close);
    },

    close() {
        const root = document.getElementById('teacher-child-modal-root');
        if (root) root.innerHTML = '';
    }
};