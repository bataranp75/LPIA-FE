import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

function getToastContainer() {
    let container = document.getElementById('app-toast-container');

    if (!container) {
        container = document.createElement('div');
        container.id = 'app-toast-container';
        document.body.appendChild(container);
    }

    return container;
}

function showToast(type, message) {
    const icon = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        warning: 'fa-triangle-exclamation'
    }[type];

    Toastify({
        text: `
            <div class="app-toast-content">
                <span class="app-toast-icon">
                    <i class="fas ${icon}"></i>
                </span>

                <span class="app-toast-message">${message}</span>

                <button type="button" class="app-toast-close">
                    <i class="fas fa-xmark"></i>
                </button>
            </div>
        `,
        duration: 2600,
        close: false,
        gravity: 'top',
        position: 'right',
        stopOnFocus: true,
        escapeMarkup: false,
        className: `app-toast app-toast-${type}`,
        destination: undefined,
        newWindow: false,
        selector: getToastContainer()
    }).showToast();

    setTimeout(() => {
        document.querySelectorAll('.app-toast-close').forEach(btn => {
            btn.onclick = () => btn.closest('.toastify')?.remove();
        });
    }, 0);
}

export const AppToast = {
    success(message) {
        showToast('success', message);
    },

    error(message) {
        showToast('error', message);
    },

    warning(message) {
        showToast('warning', message);
    }
};