import { HTTP } from '../../fetch/http.js';
import { AppToast } from '../../components/toast.js';

export const AdminDashboardPage = {
    initialized: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        this.startClock();
        this.loadStats();
    },

    startClock() {
        const dateEl = document.getElementById('admin-current-date');
        const timeEl = document.getElementById('admin-current-time');

        const update = () => {
            const now = new Date();

            const dateText = new Intl.DateTimeFormat('id-ID', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            }).format(now);

            const timeText = new Intl.DateTimeFormat('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).format(now);

            if (dateEl) dateEl.textContent = dateText;
            if (timeEl) timeEl.textContent = timeText;
        };

        update();
        setInterval(update, 1000);
    },

    async loadStats() {
        try {
            const response = await HTTP.get('/admin/dashboard/stats');
            const stats = response.data;

            const totalSiswa = stats.total_siswa || 0;
            const totalGuru = stats.total_guru || 0;
            const totalMateri = stats.total_materi || 0;
            const totalPeople = totalSiswa + totalGuru || 1;

            document.getElementById('stat-total-siswa').textContent = totalSiswa;
            document.getElementById('stat-total-guru').textContent = totalGuru;
            document.getElementById('stat-total-materi').textContent = totalMateri;

            const siswaRatio = Math.round((totalSiswa / totalPeople) * 100);
            const guruRatio = Math.round((totalGuru / totalPeople) * 100);

            document.getElementById('ratio-siswa-label').textContent = `${siswaRatio}%`;
            document.getElementById('ratio-guru-label').textContent = `${guruRatio}%`;

            document.getElementById('ratio-siswa-bar').style.width = `${siswaRatio}%`;
            document.getElementById('ratio-guru-bar').style.width = `${guruRatio}%`;
        } catch (error) {
            AppToast.error(error.message || 'Gagal memuat statistik dashboard.');
        }
    }
};