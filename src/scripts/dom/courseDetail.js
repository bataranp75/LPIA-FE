// src/scripts/dom/courseDetail.js
import { HTTP } from "../fetch/http.js";
import { Fallback } from "../utils/fallback.js";
import Swal from "sweetalert2";
import { CONFIG } from "../config/index.js";

export const CourseDetailDOM = {
  courseId: null,
  courseData: null,

  init() {
    const page = document.getElementById("course-detail-page");
    if (!page) return;

    // Ambil ID dari URL (contoh: /courses/1234-abcd)
    const pathParts = window.location.pathname.split("/");
    this.courseId = pathParts[pathParts.length - 1];

    if (!this.courseId) {
      window.location.href = "/courses";
      return;
    }

    this.fetchDetail();
  },

  getButtonHTML({
    text,
    variant = "primary",
    size = "md",
    extraClass = "",
    dataId = "",
    icon = "",
  }) {
    const base =
      "inline-flex w-full items-center justify-center gap-2 font-bold rounded-xl transition-all duration-200 select-none";
    const sizeMap = { md: "px-6 py-3.5 text-base", lg: "px-8 py-4 text-lg" };
    const variantMap = {
      primary:
        "bg-blue-600 text-white shadow-[0_4px_0_0_#1e40af] hover:bg-blue-700 active:translate-y-[4px] active:shadow-none border border-blue-700",
      outline:
        "bg-white text-slate-700 shadow-[0_4px_0_0_#e5e7eb] hover:text-blue-600 hover:border-blue-600 active:translate-y-[4px] active:shadow-none border border-slate-200",
    };
    return `<button class="${base} ${sizeMap[size]} ${variantMap[variant]} ${extraClass}" ${dataId ? `id="${dataId}"` : ""}>${text} ${icon ? `<i class="${icon}"></i>` : ""}</button>`;
  },

  async fetchDetail() {
    try {
      const response = await HTTP.get(`/courses/${this.courseId}`);
      this.courseData = response.data;

      if (!this.courseData) throw new Error("Kursus tidak ditemukan");
      this.renderPage();
    } catch (error) {
      Swal.fire(
        "Oops!",
        "Gagal memuat detail kursus. Mungkin kursus sudah dihapus.",
        "error",
      ).then(() => (window.location.href = "/courses"));
    }
  },

  renderPage() {
    const c = this.courseData;
    const priceFmt =
      c.price == 0
        ? "GRATIS"
        : `Rp ${parseInt(c.price).toLocaleString("id-ID")}`;

    // 1. Render Hero & Text
    document.title = `${c.title} | LPIA`;
    document.getElementById("bc-course-title").innerText = c.title;
    document.getElementById("hero-category").innerText =
      c.category || "General";

    const heroDelivery = document.getElementById("hero-delivery-type");
    if(heroDelivery){
        heroDelivery.innerText = c.delivery_type || "Online";
    }


    const heroLearning = document.getElementById("hero-learning-type");
    if(heroLearning){
        heroLearning.innerText = c.learning_type || "Regular";
    }


    const heroLevel = document.getElementById("hero-level");
    if(heroLevel){
        heroLevel.innerText = c.level || "Beginner";
    }
    document.getElementById("hero-title").innerText = c.title;
    document.getElementById("hero-desc").innerText =
      c.description || "Tidak ada deskripsi singkat.";
    document.getElementById("content-desc").innerText =
      c.description ||
      "Instruktur belum menambahkan detail lengkap untuk kursus ini.";

    // Stats
    document.getElementById("hero-students").innerText =
      Math.floor(Math.random() * 500) + 50;
    document.getElementById("hero-modules-count").innerText =
      c.modules?.length || 0;
    document.getElementById("module-badge").innerText =
      `${c.modules?.length || 0} Modul`;

    // 2. Render Thumbnail Card
    const imgEl = document.getElementById("card-thumbnail");
    imgEl.src = c.thumbnail_url || Fallback.defaultImage;
    imgEl.onerror = () => {
      imgEl.src = Fallback.defaultImage;
    };
    imgEl.onload = () => {
      imgEl.classList.remove("opacity-0");
      document.getElementById("card-thumbnail-skeleton").style.display = "none";
    };
    document.getElementById("card-price").innerText = priceFmt;

    const sideCategory = document.getElementById("side-category");
    if (sideCategory) sideCategory.innerText = c.category || "-";

    const sideLevel = document.getElementById("side-level");
    if (sideLevel) sideLevel.innerText = c.level || "-";

    const sideDelivery = document.getElementById("side-delivery");
    if (sideDelivery) sideDelivery.innerText = c.delivery_type || "-";

    const sideLearning = document.getElementById("side-learning");
    if (sideLearning) sideLearning.innerText = c.learning_type || "-";

    const sideTeacher = document.getElementById("side-teacher");
    if (sideTeacher) sideTeacher.innerText = c.teacher?.full_name || "-";

    const tagContainer = document.getElementById("detail-tag-list");

if(tagContainer){

    const tags = Array.isArray(c.tags)
        ? c.tags
        : [];

    tagContainer.innerHTML = tags.length
    ? tags.map(tag => `
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            ${tag}
        </span>
    `).join("")
    :
    `
    <span class="text-xs text-slate-400">
        Tidak ada tag
    </span>
    `;

}

    // 3. Render Benefits berdasarkan kategori kursus
    this.renderCourseBenefits(c);

    // 4. Render Modul (Default: Terkunci / false)
    this.renderModules(false);

    // 5. Render CTA (Sistem akan mengecek kepemilikan di sini)
    this.renderCTA();
  },

  renderCourseBenefits(course) {
    const benefitsRoot = document.getElementById("course-benefits");
    if (!benefitsRoot) return;

    const deliveryType =
    String(course?.delivery_type || "").toLowerCase();
    const benefits =
      deliveryType === "offline"
        ? [
            {
              icon: "fa-location-dot",
              text: "Belajar langsung di lokasi kelas",
            },
            {
              icon: "fa-chalkboard-user",
              text: "Interaksi langsung dengan pengajar",
            },
            {
              icon: "fa-book",
              text: "Modul pembelajaran",
            },
            {
              icon: "fa-certificate",
              text: "Sertifikat",
            },
          ]
        : [
            {
              icon: "fa-infinity",
              text: "Akses materi selamanya",
            },
            {
              icon: "fa-house-laptop",
              text: "Belajar kapan saja",
            },
            {
              icon: "fa-certificate",
              text: "Sertifikat",
            },
          ];

    benefitsRoot.innerHTML = benefits
      .map(
        (item) => `
            <div class="flex items-center gap-3 text-sm text-slate-600">
                <i class="fas ${item.icon} text-blue-600 w-5"></i>
                <span>${item.text}</span>
            </div>
        `,
      )
      .join("");
  },

  renderModules(isOwned) {
    const c = this.courseData;
    const moduleContainer = document.getElementById("module-list");

    if (!c.modules || c.modules.length === 0) {
      moduleContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 text-center">
          <div class="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-xl mb-3">
            <i class="fas fa-book-open"></i>
          </div>
          <p class="text-sm font-semibold text-slate-500">Belum ada modul tersedia</p>
        </div>
      `;
      return;
    }

    const sortedModules = c.modules.sort(
      (a, b) => a.order_index - b.order_index,
    );

    moduleContainer.innerHTML = sortedModules
      .map(
        (m, i) => `
            <div class="flex items-center p-4 rounded-xl border border-slate-200 transition-colors group ${isOwned ? "bg-white hover:border-blue-400 cursor-pointer shadow-sm" : "bg-slate-50 hover:bg-white hover:border-blue-300"}" 
                 ${isOwned ? `onclick="window.location.href='/courses/${c.id}/learn'"` : ""}>
                 
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4 shadow-sm transition-colors ${isOwned ? "bg-blue-50 border border-blue-200 text-blue-600" : "bg-white border border-slate-200 text-slate-400 group-hover:text-blue-500 group-hover:border-blue-300"}">
                    ${i + 1}
                </div>
                
                <div class="flex-grow">
                    <h4 class="font-bold transition-colors ${isOwned ? "text-slate-900 group-hover:text-blue-700" : "text-slate-800 group-hover:text-blue-600"}">${m.title}</h4>
                    <p class="text-xs font-semibold text-slate-400 mt-0.5"><i class="far fa-file-pdf mr-1"></i> Materi PDF</p>
                </div>
                
                <div class="transition-colors ${isOwned ? "text-blue-500" : "text-slate-300 group-hover:text-blue-400"}">
                    <i class="${isOwned ? "fas fa-play-circle text-2xl drop-shadow-sm" : "fas fa-lock"}"></i>
                </div>
            </div>
        `,
      )
      .join("");
  },

  async renderCTA() {
    const ctaContainer = document.getElementById("cta-container");
    const token = localStorage.getItem(CONFIG.STORAGE_KEY);
    const isFree = this.courseData.price == 0;

    if (!token) {
      ctaContainer.innerHTML = this.getButtonHTML({
        text: isFree ? "Login untuk Klaim" : "Login untuk Membeli",
        variant: "outline",
        size: "lg",
        dataId: "btn-auth-redirect",
      });
      document
        .getElementById("btn-auth-redirect")
        .addEventListener("click", () => {
          window.location.href = "/login";
        });
      return;
    }

    try {
      const res = await HTTP.get("/users/my-courses");
      const myCourses = res.data || [];
      const isOwned = myCourses.some((trx) => trx.course_id === this.courseId);

      if (isOwned) {
        // JIKA SUDAH PUNYA: Ubah modul jadi terbuka (Play) dan ubah tombol!
        this.renderModules(true);

        ctaContainer.innerHTML = this.getButtonHTML({
          text: "Lanjutkan Belajar",
          variant: "primary",
          size: "lg",
          icon: "fas fa-arrow-right",
          dataId: "btn-learn",
        });
        document.getElementById("btn-learn").addEventListener("click", () => {
          window.location.href = `/courses/${this.courseId}/learn`;
        });
      } else {
        // JIKA BELUM PUNYA: Biarkan tergembok, tampilkan tombol beli
        ctaContainer.innerHTML = this.getButtonHTML({
          text: isFree ? "Klaim Kelas Sekarang" : "Beli Kelas Sekarang",
          variant: "primary",
          size: "lg",
          icon: isFree ? "fas fa-check-circle" : "fas fa-shopping-cart",
          dataId: "btn-checkout",
        });
        document
          .getElementById("btn-checkout")
          .addEventListener("click", () => this.handleCheckout());
      }
    } catch (error) {
      // handleAuthError...
    }
  },

  async handleCheckout() {
    const btn = document.getElementById("btn-checkout");
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Memproses...`;
    btn.disabled = true;

    try {
      const response = await HTTP.post("/transactions/checkout", {
        course_id: this.courseData.id,
      });

      // A. JIKA KURSUS GRATIS
      if (response.is_free) {
        Swal.fire({
          title: "Berhasil diklaim!",
          text: "Kamu sekarang punya akses ke kursus ini.",
          icon: "success",
          confirmButtonColor: "#2563eb",
        }).then(() => window.location.reload());
        return;
      }

      // A2. JIKA AKUN DUMMY (simulasi pembayaran tanpa Midtrans)
      if (response.is_dummy) {
        Swal.fire({
          title: "Pembayaran Simulasi Berhasil",
          text: "Akun dummy: kursus langsung aktif tanpa pembayaran asli.",
          icon: "success",
          confirmButtonColor: "#2563eb",
        }).then(() => window.location.reload());
        return;
      }

      // B. JIKA KURSUS BERBAYAR (Panggil Midtrans Snap)
      if (response.snap_token) {
        window.snap.pay(response.snap_token, {
          onSuccess: (result) => {
            Swal.fire("Berhasil!", "Pembayaran diterima.", "success").then(
              async () => {
                await HTTP.get(`/transactions/${result.order_id}/verify`);
                window.location.href = "/profile";
              },
            );
          },
          onPending: (result) => {
            Swal.fire(
              "Menunggu!",
              "Segera selesaikan pembayaranmu.",
              "info",
            ).then(() => (window.location.href = "/profile"));
          },
          onError: (result) => {
            Swal.fire("Gagal!", "Terjadi kesalahan pembayaran.", "error");
            btn.innerHTML = originalText;
            btn.disabled = false;
          },
          onClose: () => {
            btn.innerHTML = originalText;
            btn.disabled = false;
          },
        });
      }
    } catch (error) {
      Swal.fire("Gagal", error.message || "Gagal memulai transaksi.", "error");
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  },
};
