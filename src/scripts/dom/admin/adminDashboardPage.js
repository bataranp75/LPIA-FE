import { HTTP } from "../../fetch/http.js";
import { AppToast } from "../../components/toast.js";

export const AdminDashboardPage = {
  initialized: false,
  salesChart: null,

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.startClock();
    this.loadStats();
    this.loadCourseSummary();
    this.loadSalesChart();
    document
      .getElementById("sales-chart-filter")
      ?.addEventListener("change", () => {
        this.loadSalesChart();
      });
  },

  startClock() {
    const dateEl = document.getElementById("admin-current-date");
    const timeEl = document.getElementById("admin-current-time");

    const update = () => {
      const now = new Date();

      const dateText = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(now);

      const timeText = new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now);

      if (dateEl) dateEl.textContent = dateText;
      if (timeEl) timeEl.textContent = timeText;
    };

    update();
    setInterval(update, 1000);
  },

  async loadStats() {
    try {
      const response = await HTTP.get("/admin/dashboard/stats");
      const stats = response.data;

      const totalSiswa = stats.total_siswa || 0;
      const totalGuru = stats.total_guru || 0;
      const totalMateri = stats.total_materi || 0;
      const totalPeople = totalSiswa + totalGuru || 1;

      document.getElementById("stat-total-siswa").textContent = totalSiswa;
      document.getElementById("stat-total-guru").textContent = totalGuru;
      document.getElementById("stat-total-materi").textContent = totalMateri;

      const siswaRatio = Math.round((totalSiswa / totalPeople) * 100);
      const guruRatio = Math.round((totalGuru / totalPeople) * 100);

      document.getElementById("ratio-siswa-label").textContent =
        `${siswaRatio}%`;
      document.getElementById("ratio-guru-label").textContent = `${guruRatio}%`;

      document.getElementById("ratio-siswa-bar").style.width = `${siswaRatio}%`;
      document.getElementById("ratio-guru-bar").style.width = `${guruRatio}%`;
    } catch (error) {
      AppToast.error(error.message || "Gagal memuat statistik dashboard.");
    }
  },

  async loadCourseSummary() {
    try {
      const [coursesResponse, salesResponse] = await Promise.all([
        HTTP.get("/courses"),
        HTTP.get("/admin/dashboard/sales?days=365"),
      ]);

      const courses = coursesResponse.data || [];
      const salesRows = salesResponse.data || [];
      const activeCourses = courses.filter((course) => course && course.is_placement_test !== true);
      const totalCourse = activeCourses.length;
      const categoryCount = new Map();
      const levelCount = new Map();

      activeCourses.forEach((course) => {
        const category = (course.category || "General").trim();
        const level = (course.level || "Lainnya").trim();
        categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
        levelCount.set(level, (levelCount.get(level) || 0) + 1);
      });

      const topCategory = [...categoryCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
      const topCourse = activeCourses[0]?.title || "-";
      const levelTarget = ["Dasar", "Menengah", "Lanjutan"];
      const levelContainer = document.getElementById("course-summary-levels");

      document.getElementById("course-summary-total").textContent = totalCourse;
      document.getElementById("course-summary-top-category").textContent = topCategory;
      document.getElementById("course-summary-top-course").textContent = topCourse;

      if (levelContainer) {
        const totalLevels = levelTarget.reduce((sum, level) => sum + (levelCount.get(level) || 0), 0) || 1;
        levelContainer.innerHTML = levelTarget
          .map((level) => {
            const count = levelCount.get(level) || 0;
            const percent = Math.round((count / totalLevels) * 100);
            return `
              <div>
                <div class="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>${level}</span>
                  <span>${count} kursus</span>
                </div>
                <div class="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div class="h-full rounded-full bg-blue-500" style="width:${percent}%"></div>
                </div>
              </div>`;
          })
          .join("");
      }

      if (!salesRows.length && !totalCourse) {
        document.getElementById("course-summary-top-category").textContent = "-";
      }
    } catch (error) {
      AppToast.error(error.message || "Gagal memuat ringkasan kursus.");
    }
  },

  async loadSalesChart() {
    const loading = document.getElementById("sales-chart-loading");
    const empty = document.getElementById("sales-chart-empty");
    const canvas = document.getElementById("sales-chart");
    const filter = document.getElementById("sales-chart-filter");

    if (!loading || !empty || !canvas) return;

    loading.classList.remove("hidden");
    empty.classList.add("hidden");
    canvas.classList.add("hidden");

    try {
      const days = filter?.value || "30";
      const response = await HTTP.get(`/admin/dashboard/sales?days=${days}`);
      const rows = response.data || [];

      loading.classList.add("hidden");

      if (!rows.length) {
        empty.classList.remove("hidden");
        return;
      }

      canvas.classList.remove("hidden");

      const ChartLib = window.Chart;
      if (!ChartLib) {
        throw new Error("Chart.js belum dimuat.");
      }

      if (this.salesChart) {
        this.salesChart.destroy();
      }

      this.salesChart = new ChartLib(canvas, {
        type: "bar",
        data: {
          labels: rows.map((item) => item.label),
          datasets: [
            {
              label: "Penjualan",
              data: rows.map((item) => Number(item.total || 0)),
              borderRadius: 10,
              backgroundColor: "#2563eb",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 150,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label(context) {
                  return `Rp ${Number(context.raw || 0).toLocaleString("id-ID")}`;
                },
              },
            },
          },
          scales: {
            y: {
              ticks: {
                callback(value) {
                  return `Rp ${Number(value).toLocaleString("id-ID")}`;
                },
              },
            },
          },
        },
      });
    } catch (error) {
      loading.classList.add("hidden");
      empty.classList.remove("hidden");
      AppToast.error(error.message || "Gagal memuat grafik penjualan.");
    }
  },
};
