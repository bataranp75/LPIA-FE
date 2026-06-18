export const SidePanel = {
    open({ title, content }) {
        let root = document.getElementById('side-panel-root');

        if (!root) {
            root = document.createElement('div');
            root.id = 'side-panel-root';
            document.body.appendChild(root);
        }

        root.innerHTML = `
            <div class="fixed inset-0 z-[10050]">
                <div class="side-panel-overlay absolute inset-0 bg-slate-900/40"></div>

                <aside class="absolute bottom-0 left-0 right-0 md:left-auto md:top-0 md:h-full md:w-[460px] bg-white rounded-t-3xl md:rounded-none md:rounded-l-3xl shadow-2xl overflow-hidden">
                    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h2 class="text-lg font-black">${title}</h2>
                        <button class="side-panel-close w-10 h-10 rounded-xl bg-slate-100">
                            <i class="fas fa-xmark"></i>
                        </button>
                    </div>

                    <div class="p-6 max-h-[75vh] md:max-h-[calc(100vh-80px)] overflow-y-auto">
                        ${content}
                    </div>
                </aside>
            </div>
        `;

        root.querySelector('.side-panel-close')?.addEventListener('click', this.close);
        root.querySelector('.side-panel-overlay')?.addEventListener('click', this.close);
    },

    close() {
        const root = document.getElementById('side-panel-root');
        if (root) root.innerHTML = '';
    }
};