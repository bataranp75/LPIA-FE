// src/scripts/utils/fallback.js

export const Fallback = {
    /**
     * 1. Fallback Data Kosong
     * Digunakan ketika API berhasil dipanggil, tapi array data (seperti kursus/modul) kosong.
     */
    emptyState(message = 'Tidak ada data yang tersedia saat ini.', icon = 'fa-folder-open') {
        return `
            <div class="flex flex-col items-center justify-center py-16 px-4 text-center w-full col-span-full bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                <div class="w-16 h-16 bg-white text-slate-400 rounded-full shadow-sm flex items-center justify-center text-3xl mb-4 border border-slate-100">
                    <i class="fas ${icon}"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-800 mb-1">Data Kosong</h3>
                <p class="text-sm text-slate-500 max-w-sm mx-auto">${message}</p>
            </div>
        `;
    },

    /**
     * 2. Fallback Gambar Kosong / Gagal Load
     * Menyediakan URL gambar default. Bisa disisipkan di atribut 'src' jika dari DB null, 
     * atau di atribut 'onerror' jika URL ada tapi gambarnya rusak/404.
     */
    defaultImage: 'https://placehold.co/600x400',
    
    // Fungsi pembantu untuk atribut onerror di tag <img>
    imageOnError() {
        return `this.onerror=null; this.src='${this.defaultImage}';`;
    },

    /**
     * 3. Fallback Gagal Fetch (Error API / Koneksi)
     * Digunakan di dalam block catch(error) ketika request HTTP gagal.
     */
    errorState(message = 'Gagal memuat data dari server. Silakan periksa koneksi Anda.', retryFunctionString = null) {
        const retryBtn = retryFunctionString 
            ? `<button onclick="${retryFunctionString}" class="mt-5 text-sm bg-white border border-slate-200 text-slate-700 px-5 py-2 rounded-lg hover:bg-slate-50 font-semibold transition-colors shadow-sm focus:ring-2 focus:ring-slate-200">
                <i class="fas fa-sync-alt mr-2"></i>Coba Lagi
               </button>` 
            : '';

        return `
            <div class="flex flex-col items-center justify-center py-16 px-4 text-center w-full col-span-full bg-red-50/50 border border-dashed border-red-200 rounded-2xl">
                <div class="w-16 h-16 bg-white text-red-500 rounded-full shadow-sm flex items-center justify-center text-3xl mb-4 border border-red-100">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-800 mb-1">Terjadi Kesalahan</h3>
                <p class="text-sm text-slate-500 max-w-sm mx-auto">${message}</p>
                ${retryBtn}
            </div>
        `;
    },

    /**
     * 4. Fallback Loading State (Skeleton Generic)
     * Bisa digunakan untuk menggantikan skeleton hardcode di Astro, 
     * berguna jika kamu merender ulang elemen via JS.
     */
    skeletonCards(count = 3) {
        return Array(count).fill(
            `<div class="bg-white rounded-2xl h-80 animate-pulse border border-slate-200 shadow-sm w-full"></div>`
        ).join('');
    }
};