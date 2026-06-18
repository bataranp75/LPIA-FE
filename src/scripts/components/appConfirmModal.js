export const AppConfirmModal = {
    open({
        title = 'Konfirmasi',
        message = 'Apakah Anda yakin?',
        type = 'info',
        confirmText = 'Ya',
        cancelText = 'Batal',
        onConfirm
    }) {
        let root = document.getElementById('app-confirm-root');

        if (!root) {
            root = document.createElement('div');
            root.id = 'app-confirm-root';
            document.body.appendChild(root);
        }

        const typeMap = {
            info: {
                icon: 'fa-circle-info',
                iconClass: 'bg-blue-50 text-blue-600',
                buttonClass: 'bg-blue-600 hover:bg-blue-700'
            },
            warning: {
                icon: 'fa-triangle-exclamation',
                iconClass: 'bg-amber-50 text-amber-600',
                buttonClass: 'bg-amber-500 hover:bg-amber-600'
            },
            danger: {
                icon: 'fa-triangle-exclamation',
                iconClass: 'bg-red-50 text-red-600',
                buttonClass: 'bg-red-600 hover:bg-red-700'
            }
        };

        const config = typeMap[type] || typeMap.info;

        root.innerHTML = `
            <div class="fixed inset-0 z-[13000] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/45 backdrop-blur-sm app-confirm-overlay"></div>

                <div class="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-white/70 overflow-hidden">
                    <div class="p-6 md:p-7">
                        <div class="flex items-start gap-4">
                            <div class="w-14 h-14 rounded-2xl ${config.iconClass} flex items-center justify-center text-xl shrink-0">
                                <i class="fas ${config.icon}"></i>
                            </div>

                            <div class="min-w-0">
                                <h3 class="text-xl md:text-2xl font-black text-slate-950">${title}</h3>
                                <p class="text-sm text-slate-500 font-semibold leading-relaxed mt-2">
                                    ${message}
                                </p>
                            </div>
                        </div>

                        <div class="flex justify-end gap-2 mt-7 pt-5 border-t border-slate-100">
                            <button id="app-confirm-cancel" class="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-sm">
                                ${cancelText}
                            </button>

                            <button id="app-confirm-action" class="px-4 py-3 rounded-2xl ${config.buttonClass} text-white font-black text-sm">
                                ${confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const close = () => {
            root.innerHTML = '';
        };

        root.querySelector('.app-confirm-overlay')?.addEventListener('click', close);
        root.querySelector('#app-confirm-cancel')?.addEventListener('click', close);

        root.querySelector('#app-confirm-action')?.addEventListener('click', async () => {
            close();
            await onConfirm?.();
        });
    }
};