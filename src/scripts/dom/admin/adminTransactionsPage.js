import { HTTP } from "../../fetch/http.js";
import { AppToast } from "../../components/toast.js";

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
  search: "",
  status: "",

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.tableBody = document.getElementById("transactions-table-body");
    this.searchInput = document.getElementById("transaction-search");
    this.statusFilter = document.getElementById("transaction-status-filter");

    if (!this.tableBody) return;

    this.bindEvents();
    document
      .getElementById("btn-print-transactions")
      ?.addEventListener("click", () => {
        this.printReport();
      });
    document
      .getElementById("btn-export-word-transactions")
      ?.addEventListener("click", () => {
        this.exportWordReport();
      });
    this.loadTransactions();
  },

  bindEvents() {
    this.searchInput?.addEventListener(
      "input",
      debounce((e) => {
        this.search = e.target.value.toLowerCase().trim();
        this.renderTransactions();
      }, 400),
    );

    this.statusFilter?.addEventListener("change", (e) => {
      this.status = e.target.value;
      this.renderTransactions();
    });
  },

  async loadTransactions() {
    try {
      const [trxRes, statsRes] = await Promise.all([
        HTTP.get("/admin/transactions"),
        HTTP.get("/admin/transactions/stats"),
      ]);

      this.transactions = trxRes.data || [];

      this.renderStats(statsRes.data || {});
      this.renderTransactions();
    } catch (error) {
      AppToast.error(error.message || "Gagal memuat transaksi.");
    }
  },

  getFilteredTransactions() {
    const keyword =
      document.getElementById("transaction-search")?.value?.toLowerCase() ||
      this.search ||
      "";
    const status =
      document.getElementById("transaction-status-filter")?.value ||
      this.status ||
      "";

    return this.transactions.filter((item) => {
      const userName = item.profiles?.full_name || item.user?.full_name || "";
      const courseTitle = item.courses?.title || item.course?.title || "";
      const orderId = item.order_id || "";
      const itemStatus = item.status_pembayaran || "";

      const matchKeyword =
        userName.toLowerCase().includes(keyword) ||
        courseTitle.toLowerCase().includes(keyword) ||
        orderId.toLowerCase().includes(keyword);
      const matchStatus = !status || status === "all" || itemStatus === status;

      return matchKeyword && matchStatus;
    });
  },

  renderStats(stats) {
    const totalRevenueEl = document.getElementById("trx-total-revenue");
    const totalCountEl = document.getElementById("trx-total-count");
    const totalConfirmedEl = document.getElementById("trx-total-confirmed");
    const bestCourseEl = document.getElementById("trx-best-course");

    if (totalRevenueEl) {
      totalRevenueEl.textContent = `Rp ${Number(stats.total_revenue || 0).toLocaleString("id-ID")}`;
    }

    if (totalCountEl) {
      totalCountEl.textContent = stats.total_transactions || 0;
    }

    if (totalConfirmedEl) {
      totalConfirmedEl.textContent = stats.total_confirmed || 0;
    }

    if (bestCourseEl) {
      bestCourseEl.textContent = stats.best_course || "-";
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

    this.tableBody.innerHTML = transactions
      .map(
        (item) => `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-4">
                    <div class="font-bold text-slate-900">${item.profiles?.full_name || "-"}</div>
                    <div class="text-xs text-slate-400">${item.profiles?.role || "-"}</div>
                </td>

                <td class="p-4">
                    <div class="font-bold text-slate-900">${item.courses?.title || "-"}</div>
                    <div class="text-xs text-slate-400">${item.courses?.id || ""}</div>
                </td>

                <td class="p-4">
                    <span class="font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg">
                        ${item.order_id || "-"}
                    </span>
                </td>

                <td class="p-4 font-black text-slate-900">
                    Rp ${Number(item.amount || 0).toLocaleString("id-ID")}
                </td>

                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${this.getStatusClass(item.status_pembayaran)}">
                        ${item.status_pembayaran || "pending"}
                    </span>
                </td>

                <td class="p-4 text-slate-600">
                    ${this.formatDate(item.created_at)}
                </td>
            </tr>
        `,
      )
      .join("");
  },

  getStatusClass(status) {
    if (status === "success") return "bg-emerald-100 text-emerald-700";
    if (status === "failed") return "bg-red-100 text-red-700";
    if (status === "cancelled") return "bg-slate-100 text-slate-600";

    return "bg-amber-100 text-amber-700";
  },

  formatRupiah(value) {
    return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
  },

  formatDate(date) {
    if (!date) return "-";

    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  },

  buildReportHTML() {
    const rows = this.getFilteredTransactions();
    const totalAmount = rows.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );
    const successCount = rows.filter(
      (item) => item.status_pembayaran === "success",
    ).length;

    return `
            <html>
            <head>
                <title>Laporan Transaksi LMS</title>
                <style>
                    body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; }
                    h1 { text-align: center; margin-bottom: 4px; }
                    .subtitle { text-align: center; color: #64748b; margin-bottom: 24px; }
                    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
                    .summary-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
                    .summary-card small { color: #64748b; font-weight: bold; }
                    .summary-card h3 { margin: 6px 0 0; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { background: #f1f5f9; text-align: left; padding: 10px; border: 1px solid #e2e8f0; }
                    td { padding: 10px; border: 1px solid #e2e8f0; vertical-align: top; }
                    .footer { margin-top: 32px; font-size: 12px; color: #64748b; text-align: right; }
                    @media print { body { padding: 16px; } }
                </style>
            </head>
            <body>
                <h1>Laporan Transaksi LMS</h1>
                <p class="subtitle">Dicetak pada ${this.formatDate(new Date())}</p>
                <div class="summary">
                    <div class="summary-card">
                        <small>Total Pendapatan</small>
                        <h3>${this.formatRupiah(totalAmount)}</h3>
                    </div>
                    <div class="summary-card">
                        <small>Total Transaksi</small>
                        <h3>${rows.length}</h3>
                    </div>
                    <div class="summary-card">
                        <small>Transaksi Berhasil</small>
                        <h3>${successCount}</h3>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>User</th>
                            <th>Kursus</th>
                            <th>Order ID</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Confirmed</th>
                            <th>Tanggal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${
                          rows.length
                            ? rows
                                .map(
                                  (item, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${item.profiles?.full_name || item.user?.full_name || "-"}</td>
                                    <td>${item.courses?.title || item.course?.title || "-"}</td>
                                    <td>${item.order_id || "-"}</td>
                                    <td>${this.formatRupiah(item.amount)}</td>
                                    <td>${item.status_pembayaran || "-"}</td>
                                    <td>${item.is_confirmed_by_admin ? "Ya" : "Tidak"}</td>
                                    <td>${this.formatDate(item.created_at)}</td>
                                </tr>
                            `,
                                )
                                .join("")
                            : `
                                <tr>
                                    <td colspan="8" style="text-align:center;">Tidak ada data transaksi.</td>
                                </tr>
                            `
                        }
                    </tbody>
                </table>
                <div class="footer">Laporan ini dibuat otomatis oleh sistem LMS.</div>
            </body>
            </html>
        `;
  },

  printReport() {
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      alert("Popup diblokir browser. Izinkan popup untuk mencetak laporan.");
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write(this.buildReportHTML());
    reportWindow.document.close();
    reportWindow.onload = () => {
      reportWindow.focus();
      reportWindow.print();
    };
  },

  exportWordReport() {
    const html = this.buildReportHTML();
    const blob = new Blob(["\ufeff", html], {
      type: "application/msword",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laporan-transaksi-${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
