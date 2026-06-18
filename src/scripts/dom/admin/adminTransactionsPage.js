import { HTTP } from '../../fetch/http.js';
import { AppToast } from '../../components/toast.js';

function debounce(fn, delay = 400) {
    let timer;

    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

export const AdminTransactionsPage = {
    initialized: false,
    transactions: [],
    search: '',
    status: '',

    init() {
        if (this.initialized) return;
        this.initialized = true;

        this.tableBody = document.getElementById('transactions-table-body');
        this.searchInput = document.getElementById('transaction-search');
        this.statusFilter = document.getElementById('transaction-status-filter');

        if (!this.tableBody) return;

        this.bindEvents();
        this.loadTransactions();
    },

    bindEvents() {
        this.searchInput?.addEventListener(
            'input',
            debounce((e) => {
                this.search = e.target.value.toLowerCase().trim();
                this.renderTransactions();
            }, 400)
        );

        this.statusFilter?.addEventListener('change', (e) => {
            this.status = e.target.value;
            this.renderTransactions();
        });
    },

    async loadTransactions() {
        try {
            const [trxRes, statsRes] = await Promise.all([
                HTTP.get('/admin/transactions'),
                HTTP.get('/admin/transactions/stats')
            ]);

            this.transactions = trxRes.data || [];

            this.renderStats(statsRes.data || {});
            this.renderTransactions();
        } catch (error) {
            AppToast.error(error.message || 'Gagal memuat transaksi.');
        }
    },

    getFilteredTransactions() {
        let data = [...this.transactions];

        if (this.search) {
            data = data.filter((item) => {
                const userName = item.profiles?.full_name?.toLowerCase() || '';
                const userRole = item.profiles?.role?.toLowerCase() || '';
                const courseTitle = item.courses?.title?.toLowerCase() || '';
                const orderId = item.order_id?.toLowerCase() || '';

                return (
                    userName.includes(this.search) ||
                    userRole.includes(this.search) ||
                    courseTitle.includes(this.search) ||
                    orderId.includes(this.search)
                );
            });
        }

        if (this.status) {
            data = data.filter((item) => item.status_pembayaran === this.status);
        }

        return data;
    },

    renderStats(stats) {
        const totalRevenueEl = document.getElementById('trx-total-revenue');
        const totalCountEl = document.getElementById('trx-total-count');
        const totalConfirmedEl = document.getElementById('trx-total-confirmed');
        const bestCourseEl = document.getElementById('trx-best-course');

        if (totalRevenueEl) {
            totalRevenueEl.textContent = `Rp ${Number(stats.total_revenue || 0).toLocaleString('id-ID')}`;
        }

        if (totalCountEl) {
            totalCountEl.textContent = stats.total_transactions || 0;
        }

        if (totalConfirmedEl) {
            totalConfirmedEl.textContent = stats.total_confirmed || 0;
        }

        if (bestCourseEl) {
            bestCourseEl.textContent = stats.best_course || '-';
        }
    },

    renderTransactions() {
        const transactions = this.getFilteredTransactions();

        if (!transactions.length) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="p-8 text-center text-slate-400 font-semibold">
                        Tidak ada transaksi yang sesuai.
                    </td>
                </tr>
            `;
            return;
        }

        this.tableBody.innerHTML = transactions.map((item) => `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-4">
                    <div class="font-bold text-slate-900">${item.profiles?.full_name || '-'}</div>
                    <div class="text-xs text-slate-400">${item.profiles?.role || '-'}</div>
                </td>

                <td class="p-4">
                    <div class="font-bold text-slate-900">${item.courses?.title || '-'}</div>
                    <div class="text-xs text-slate-400">${item.courses?.id || ''}</div>
                </td>

                <td class="p-4">
                    <span class="font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg">
                        ${item.order_id || '-'}
                    </span>
                </td>

                <td class="p-4 font-black text-slate-900">
                    Rp ${Number(item.amount || 0).toLocaleString('id-ID')}
                </td>

                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${this.getStatusClass(item.status_pembayaran)}">
                        ${item.status_pembayaran || 'pending'}
                    </span>
                </td>

                <td class="p-4 text-slate-600">
                    ${this.formatDate(item.created_at)}
                </td>
            </tr>
        `).join('');
    },

    getStatusClass(status) {
        if (status === 'success') return 'bg-emerald-100 text-emerald-700';
        if (status === 'failed') return 'bg-red-100 text-red-700';
        if (status === 'cancelled') return 'bg-slate-100 text-slate-600';

        return 'bg-amber-100 text-amber-700';
    },

    formatDate(date) {
        if (!date) return '-';

        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }
};