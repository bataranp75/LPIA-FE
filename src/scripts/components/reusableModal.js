export const ReusableModal = {
    open({
        title,
        subtitle = '',
        content,
        isWide = false,
        rootId = 'modal-root',
        zIndex = 10000
    }) {
        let root = document.getElementById(rootId);

        if (!root) {
            root = document.createElement('div');
            root.id = rootId;
            document.body.appendChild(root);
        }

        const widthClass = isWide ? 'md:max-w-[1280px]' : 'md:max-w-md';

        root.innerHTML = `
            <div class="fixed inset-0 flex items-center justify-center p-0 md:p-6" style="z-index: ${zIndex};">
                <div class="absolute inset-0 bg-slate-900/45 modal-overlay backdrop-blur-sm"></div>
                
                <div class="relative bg-white w-full ${widthClass} h-screen md:h-[94vh] rounded-none md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-white/60">
                    
                    <div class="flex items-center justify-between px-6 md:px-8 py-5 border-b border-slate-100 shrink-0 bg-white">
                        <div class="min-w-0">
                            <h2 class="text-xl md:text-2xl font-black text-slate-950 truncate">${title}</h2>
                            ${
                                subtitle
                                    ? `<p class="text-xs md:text-sm text-slate-400 font-semibold mt-1">${subtitle}</p>`
                                    : ''
                            }
                        </div>

                        <button class="modal-close w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition shrink-0">
                            <i class="fas fa-xmark text-lg"></i>
                        </button>
                    </div>
                    
                    <div class="flex-1 overflow-y-auto bg-slate-100/80 thin-scrollbar">
                        <div class="p-4 md:p-7">
                            ${content}
                        </div>
                    </div>
                </div>
            </div>
        `;

        root.querySelector('.modal-close')?.addEventListener('click', () => {
            this.close(rootId);
        });

        root.querySelector('.modal-overlay')?.addEventListener('click', () => {
            this.close(rootId);
        });
    },

    close(rootId = 'modal-root') {
        const root = document.getElementById(rootId);
        if (root) root.innerHTML = '';
    }
};