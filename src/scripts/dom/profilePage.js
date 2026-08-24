// src/scripts/dom/profilePage.js
import { HTTP } from "../fetch/http.js";
import { Fallback } from "../utils/fallback.js";
import Swal from "sweetalert2";
import { CONFIG } from "../config/index.js";

export const ProfileDOM = {
  allData: {
    courses: [],
    transactions: [],
    certificates: [],
    offlineRegistrations: [],
  },
  isSavingProfile: false,

  async init() {
    const page = document.getElementById("profile-page");
    if (!page) return;

    const token = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!token) {
      window.location.href = "/login";
      return;
    }

    this.initTabs();
    this.initProfileUpdate();
    this.initSearchFilters();
    this.initDangerZone();
    this.initLogout();
    this.initMobileMenu();

    this.loadProfileData();
    this.loadMyCourses();
    this.loadMyCertificates();

    await this.loadTransactions();
    await this.loadOfflineRegistrations();
    this.renderTransactions();
  },

  // ─────────────────────────────────────────────────────────
  //  UI & TABS LOGIC
  // ─────────────────────────────────────────────────────────
  initMobileMenu() {
    const toggleBtn = document.getElementById("mobile-menu-toggle");
    const nav = document.getElementById("profile-nav");
    const icon = document.getElementById("mobile-menu-icon");

    if (toggleBtn && nav) {
      toggleBtn.addEventListener("click", () => {
        nav.classList.toggle("hidden");
        nav.classList.toggle("flex");
        icon.classList.toggle("rotate-180");
      });
    }
  },

  initTabs() {
    const tabs = document.querySelectorAll(
      ".profile-tab:not(#btn-logout-profile)",
    );

    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();

        const targetId = e.currentTarget.dataset.target;
        const text = e.currentTarget.dataset.text;
        const iconClass = e.currentTarget.dataset.icon;

        this.setActiveTab(targetId, text, iconClass);
      });
    });

    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    this.setActiveTab(
      requestedTab === "riwayat" ? "section-riwayat" : "section-umum",
      requestedTab === "riwayat" ? "Riwayat Transaksi" : "Pengaturan Profil",
      requestedTab === "riwayat" ? "fa-history" : "fa-user-cog",
    );
  },

  setActiveTab(targetId, text, iconClass) {
    const tabs = document.querySelectorAll(
      ".profile-tab:not(#btn-logout-profile)",
    );
    const sections = document.querySelectorAll(".profile-section");
    const nav = document.getElementById("profile-nav");
    const mobileText = document.getElementById("mobile-menu-text");
    const mobileIcon = document.getElementById("mobile-menu-icon");

    if (!targetId) return;

    if (mobileText && text && iconClass) {
      mobileText.innerHTML = `<i class="fas ${iconClass} w-5 text-center"></i> ${text}`;
    }

    tabs.forEach((tab) => {
      const isActive = tab.dataset.target === targetId;

      if (tab.dataset.target === "section-danger") {
        tab.className = isActive
          ? "profile-tab mt-2 flex items-center gap-3 px-4 py-3.5 text-left rounded-xl transition-all font-bold text-sm w-full text-red-700 bg-red-100 border border-red-200 shadow-sm"
          : "profile-tab mt-2 flex items-center gap-3 px-4 py-3.5 text-left rounded-xl transition-all font-bold text-sm w-full text-red-700 bg-red-50 hover:bg-red-100 border border-red-100";
        return;
      }

      tab.className = isActive
        ? "profile-tab flex items-center gap-3 px-4 py-3.5 text-left rounded-xl transition-all font-bold text-sm w-full text-blue-700 bg-blue-50 border border-blue-100 shadow-sm"
        : "profile-tab flex items-center gap-3 px-4 py-3.5 text-left rounded-xl transition-all font-bold text-sm w-full text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent";
    });

    sections.forEach((section) => {
      section.classList.add("hidden");
      section.classList.remove("block");
    });

    const activeSection = document.getElementById(targetId);
    if (activeSection) {
      activeSection.classList.remove("hidden");
      activeSection.classList.add("block");
    }

    if (targetId === "section-kursus") {
      this.renderCourses(this.allData.courses);
    } else if (targetId === "section-sertifikat") {
      this.renderCertificates(this.allData.certificates);
    } else if (targetId === "section-riwayat") {
      this.renderTransactions();
    }

    if (window.innerWidth < 1024 && nav) {
      nav.classList.add("hidden");
      nav.classList.remove("flex");
      mobileIcon?.classList.remove("rotate-180");
    }
  },

  updateBannerStyle(level) {
    const banner = document.getElementById("profile-banner");
    const bgIcon = document.getElementById("banner-bg-icon");
    const levelBadge = document.getElementById("user-display-level-badge");

    const config = {
      beginner: {
        color: "bg-blue-600",
        icon: "fa-user-graduate",
        badge: "bg-white/20",
      },
      amateur: {
        color: "bg-indigo-600",
        icon: "fa-user-tie",
        badge: "bg-yellow-400/30",
      },
      pro: { color: "bg-slate-900", icon: "fa-crown", badge: "bg-blue-500/40" },
    };

    const style = config[level?.toLowerCase()] || config.beginner;
    banner.className = `${style.color} rounded-3xl p-10 mb-8 text-white shadow-lg relative overflow-hidden flex items-center gap-6 transition-all duration-500`;
    bgIcon.innerHTML = `<i class="fas ${style.icon}"></i>`;
    levelBadge.className = `inline-flex items-center gap-2 ${style.badge} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm`;
  },

  // ─────────────────────────────────────────────────────────
  //  DATA FETCHING & RENDER
  // ─────────────────────────────────────────────────────────
  handleAuthError(error) {
    if (error?.message?.includes("401") || error?.message?.includes("Token")) {
      Swal.fire(
        "Sesi Habis",
        "Sesi login kamu sudah berakhir atau tidak valid. Silakan login kembali.",
        "warning",
      ).then(() => {
        localStorage.clear();
        window.location.href = "/login";
      });
    } else {
      console.error(error);
    }
  },

  async loadProfileData() {
    try {
      const response = await HTTP.get("/users/profile");
      const user = response.data;

      this.updateLocalUserInfo({
        full_name: user.full_name,
        current_level: user.current_level,
        avatar_url: user.avatar_url,
      });

      document.getElementById("user-display-name").innerText = user.full_name;
      document.getElementById("user-level-text").innerText = user.current_level;
      document.getElementById("input-full-name").value = user.full_name;

      if (user.avatar_url) {
        this.updateAvatarUI(user.avatar_url);
      }
      document.getElementById("input-email").value = JSON.parse(
        localStorage.getItem(CONFIG.USER_INFO) || "{}",
      ).email;

      this.updateBannerStyle(user.current_level);
    } catch (error) {
      this.handleAuthError(error);
    }
  },

  async loadMyCourses() {
    const container = document.getElementById("my-courses-list");
    if (!container) return;
    container.innerHTML = Fallback.skeletonCards(2);

    try {
      const response = await HTTP.get("/users/my-courses");
      this.allData.courses = response.data;
      this.renderCourses(this.allData.courses);
    } catch (error) {
      this.handleAuthError(error);
      container.innerHTML = Fallback.errorState("Gagal memuat kursus Anda.");
    }
  },

  renderCourses(data) {
    const container = document.getElementById("my-courses-list");
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = Fallback.emptyState(
        "Tidak ada kursus yang ditemukan.",
        "fa-box-open",
      );
      container.classList.remove("md:grid-cols-2");
      return;
    }
    container.classList.add("md:grid-cols-2");
    container.innerHTML = data
      .map((trx) => {
        const course = trx.courses || {};
        const courseTitle = course.title || "Kursus";
        return `
                <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div class="h-36 bg-slate-100 relative overflow-hidden">
                        <img src="${course.thumbnail_url || Fallback.defaultImage}" onerror="${Fallback.imageOnError()}" alt="${courseTitle}" class="w-full h-full object-cover">
                        <div class="absolute top-3 left-3 bg-white/90 backdrop-blur text-blue-700 text-xs font-bold px-2 py-1 rounded shadow-sm uppercase">${course.category || "Kelas"}</div>
                    </div>
                    <div class="p-5 flex flex-col flex-grow">
                        <h3 class="font-bold text-slate-900 text-lg mb-2 line-clamp-2">${courseTitle}</h3>
                        <p class="text-sm text-slate-500 mb-6 line-clamp-2 flex-grow">${course.description || "Lanjutkan progres belajarmu di sini."}</p>
                        <a href="/courses/${course.id || trx.course_id}/learn" class="w-full inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 px-4 py-2.5 text-sm bg-blue-600 text-white shadow-[0_3px_0_0_#1e40af] hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none border border-blue-700">
                            Mulai Belajar <i class="fas fa-play text-xs ml-1"></i>
                        </a>
                    </div>
                </div>
            `;
      })
      .join("");
  },

  async loadMyCertificates() {
    const container = document.getElementById("my-certificates-list");
    if (!container) return;
    container.innerHTML = `<div class="animate-pulse h-24 bg-slate-100 rounded-xl"></div>`;

    try {
      const response = await HTTP.get("/users/my-certificates");
      this.allData.certificates = response.data;
      this.renderCertificates(this.allData.certificates);
    } catch (error) {
      this.handleAuthError(error);
      container.innerHTML = Fallback.errorState(
        "Gagal memuat sertifikat Anda.",
      );
    }
  },

  async loadOfflineRegistrations() {
    try {
      const response = await HTTP.get("/offline-registrations/my");
      const offlineNorm = (response.data || []).map((reg) => ({
        type: "offline",
        id: reg.id,
        course: reg.course,
        amount: reg.final_price,
        payment_status: reg.payment_status,
        payment_type: reg.payment_type,
        admin_notes: reg.admin_notes,
        transaction: reg.transaction,
      }));
      this.allData.offlineRegistrations = offlineNorm;
    } catch (error) {
      this.handleAuthError(error);
      this.allData.offlineRegistrations = [];
    }
  },

  renderCertificates(data) {
    const container = document.getElementById("my-certificates-list");
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = Fallback.emptyState(
        "Belum ada sertifikat.",
        "fa-award",
      );
      return;
    }

    container.innerHTML = data
      .map(
        (cert) => `
            <div class="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between hover:border-blue-300 transition-colors">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 ${cert.certificate_url ? "bg-yellow-50 text-yellow-600 border-yellow-200" : "bg-amber-50 text-amber-500 border-amber-200"} rounded-full flex items-center justify-center text-2xl border shadow-sm"><i class="fas ${cert.certificate_url ? "fa-medal" : "fa-clock"}"></i></div>
                    <div>
                        <h4 class="font-bold text-slate-900">${cert.courses?.title || "Sertifikat Kelulusan"}</h4>
                        ${cert.certificate_number ? `<p class="text-xs text-slate-400 font-mono">${cert.certificate_number}</p>` : ""}
                        <p class="text-sm text-slate-500">${cert.issued_at ? `Diterbitkan: ${new Date(cert.issued_at).toLocaleDateString("id-ID")}` : "Menunggu diterbitkan admin"}</p>
                    </div>
                </div>
                ${
                  cert.certificate_url
                    ? `<a href="${cert.certificate_url}" target="_blank" class="px-4 py-2 text-sm bg-white border border-slate-200 text-slate-700 font-bold rounded-lg shadow-[0_3px_0_0_#e5e7eb] hover:text-blue-600 hover:-translate-y-0.5 transition-all">Unduh PDF</a>`
                    : `<span class="px-4 py-2 text-sm bg-amber-50 border border-amber-200 text-amber-700 font-bold rounded-lg"><i class="fas fa-clock mr-1"></i> Sedang Diproses</span>`
                }
            </div>
        `,
      )
      .join("");
  },

  getOfflinePaymentTypeLabel(paymentType) {
    if (paymentType === "full_payment") return "Pembayaran Penuh";
    if (paymentType === "installment") return "Cicilan";
    return "-";
  },

  getOfflinePaymentStatusLabel(paymentStatus) {
    if (paymentStatus === "waiting_payment") return "Menunggu Pembayaran";
    if (paymentStatus === "paid") return "Sudah Dibayar";
    return paymentStatus || "-";
  },

  buildOfflineWhatsAppLink(txn) {
    const courseTitle = txn.course?.title || "kursus";
    const orderId = txn.transaction?.order_id || txn.id;
    const message = encodeURIComponent(
      `Halo Admin LPIA Wisma Asri.\nSaya ingin menanyakan status pendaftaran untuk kursus ${courseTitle} (Order ID: ${orderId}).`,
    );
    return `https://wa.me/6281234567890?text=${message}`;
  },

  async loadTransactions() {
    const container = document.getElementById("transaction-cards");
    if (container) {
      container.innerHTML = `<div class="animate-pulse h-12 bg-slate-100 rounded-xl mb-2"></div>`;
    }

    try {
      const res = await HTTP.get("/users/transactions");

      const normalized = (res.data || []).map((t) => {
        const course = t.courses || {};
        const offlineRegistration = Array.isArray(t.offline_registrations)
          ? t.offline_registrations[0] || null
          : t.offline_registrations || null;
        const isOffline = !!offlineRegistration;

        if (!isOffline) {
          return {
            type: "online",
            id: t.id,
            course,
            amount: t.amount,
            status_pembayaran: t.status_pembayaran,
            payment_method: "Midtrans",
            transaction: t,
          };
        }

        return {
          type: "offline",
          id: t.id,
          course,
          amount: t.amount,
          payment_type: offlineRegistration?.payment_type || null,
          payment_status: offlineRegistration?.payment_status || null,
          admin_notes: offlineRegistration?.admin_notes || null,
          status: offlineRegistration?.status || null,
          registrationId: offlineRegistration?.id || null,
          transaction: t,
        };
      });

      this.allData.transactions = normalized;
    } catch (error) {
      this.handleAuthError(error);
      if (container) {
        container.innerHTML = `<div class="text-center text-red-600">Gagal memuat riwayat transaksi.</div>`;
      }
      this.allData.transactions = [];
    }
  },

  renderTransactions() {
    const container = document.getElementById("transaction-cards");
    if (!container) return;

    const list = this.allData.transactions || [];

    if (list.length === 0) {
      container.innerHTML = `<div class="text-center py-6 text-slate-500">Tidak ada transaksi ditemukan.</div>`;
      return;
    }

    container.innerHTML = list
      .map((t) => {
        const isOnline = t.type === "online";
        const badgeColor = isOnline
          ? "bg-blue-100 text-blue-700"
          : "bg-green-100 text-green-700";
        const kategori = isOnline ? "Online" : "Offline";
        const harga = Number(t.amount || 0).toLocaleString("id-ID");
        const metode = isOnline
          ? "Midtrans"
          : this.getOfflinePaymentTypeLabel(t.payment_type);
        const statusText = isOnline
          ? t.status_pembayaran
          : this.getOfflinePaymentStatusLabel(t.payment_status);
        const deadline = t.transaction?.expired_at
          ? new Date(t.transaction.expired_at).toLocaleString("id-ID")
          : null;
        return `
          <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-4">
            <h3 class="font-bold text-lg text-slate-800">${t.course?.title || "Produk"}</h3>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <span class="px-2 py-1 rounded-md text-xs font-bold uppercase ${badgeColor}">${kategori}</span>
              <span class="font-medium">Rp ${harga}</span>
              <span class="text-sm text-slate-600">${metode}</span>
            </div>
            <div class="mt-2 text-sm text-slate-600">Status: ${statusText || "-"}</div>
            ${deadline ? `<div class="text-sm text-slate-600">Batas Pembayaran: ${deadline}</div>` : ``}
            <button data-transaction-detail="${t.id}" data-transaction-type="${t.type}" class="mt-3 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100">Detail</button>
          </div>
        `;
      })
      .join("");

    document
      .querySelectorAll("[data-transaction-detail]")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          this.openTransactionDetail(btn.dataset.transactionDetail),
        ),
      );
  },

  openTransactionDetail(transactionId) {
    try {
      const txn = (this.allData.transactions || []).find(
        (t) => t.id === transactionId,
      );
      if (!txn) throw new Error("Transaksi tidak ditemukan");

      if (txn.type === "online") {
        this.renderOnlineDetail(txn);
      } else if (txn.type === "offline") {
        this.renderOfflineDetail(txn);
      } else {
        throw new Error("Tipe transaksi tidak dikenali");
      }
    } catch (error) {
      Swal.fire(
        "Gagal",
        error.message || "Gagal membuka detail transaksi.",
        "error",
      );
    }
  },

  renderOnlineDetail(txn) {
    const trx = txn.transaction || {};
    const status = trx.status_pembayaran || "";
    const isPending = status === "pending";
    const isFailed = status === "failed";
    const isSuccess =
      status === "settlement" || status === "paid" || status === "success";
    const whatsappUrl = this.buildOfflineWhatsAppLink(txn);
    const showMainAction = !isFailed && (isPending || isSuccess);

    Swal.fire({
      title: "Detail Transaksi",
      html: `
        <div class="text-left space-y-3">
          <p><b>Kursus:</b> ${txn.course?.title || "-"}</p>
          <p><b>Order ID:</b> ${trx.order_id || "-"}</p>
          <p><b>Total:</b> Rp ${Number(trx.amount || 0).toLocaleString("id-ID")}</p>
          <p><b>Status:</b> ${status || "-"}</p>
          <p><b>Tanggal:</b> ${trx.created_at ? new Date(trx.created_at).toLocaleString("id-ID") : "-"}</p>
          ${trx.expired_at ? `<p><b>Batas pembayaran:</b> ${new Date(trx.expired_at).toLocaleString("id-ID")}</p>` : ""}
        </div>
      `,
      showCancelButton: false,
      showConfirmButton: showMainAction,
      showDenyButton: true,
      confirmButtonText: isPending ? "Lanjutkan Pembayaran" : "Lihat Kursus",
      denyButtonText: "Hubungi Admin",
      allowOutsideClick: () => !Swal.isLoading(),
    }).then((result) => {
      if (result.isDenied) {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        return;
      }

      if (!result.isConfirmed) return;

      if (isPending) {
        if (trx.snap_token && window.snap) {
          window.snap.pay(trx.snap_token);
          return;
        }
        if (trx.redirect_url) {
          window.location.href = trx.redirect_url;
          return;
        }
        Swal.fire("Gagal", "Link pembayaran tidak tersedia.", "error");
      } else if (isSuccess) {
        const courseId = txn.course?.id || trx.course_id;
        if (courseId) {
          window.location.href = `/courses/${courseId}/learn`;
        } else {
          Swal.fire("Info", "Kursus tidak ditemukan.", "info");
        }
      }
    });
  },

  async renderOfflineDetail(txn) {
    const paymentStatus = txn.payment_status || "";
    const isPending = paymentStatus === "waiting_payment";
    const isPaid = paymentStatus === "paid";
    const trx = txn.transaction || {};
    const paymentTypeLabel = this.getOfflinePaymentTypeLabel(txn.payment_type);
    const paymentStatusLabel = this.getOfflinePaymentStatusLabel(paymentStatus);
    const whatsappUrl = this.buildOfflineWhatsAppLink(txn);
    const registrationId = txn.registrationId || null;

    let schedules = [];
    let primaryActionLabel = "Hubungi Admin";

    if (isPaid) {
      try {
        const endpoint = registrationId
          ? `/student/offline-schedules?registration_id=${encodeURIComponent(registrationId)}`
          : "/student/offline-schedules";
        const response = await HTTP.get(endpoint);
        schedules = Array.isArray(response.data) ? response.data : [];
        primaryActionLabel =
          schedules.length > 0 ? "Lihat Jadwal" : "Hubungi Admin";
      } catch (error) {
        schedules = [];
        primaryActionLabel = "Hubungi Admin";
      }
    }

    const showContactButton = isPending || (isPaid && schedules.length > 0);
    const modal = await Swal.fire({
      title: "Detail Pendaftaran Offline",
      html: `
        <div class="text-left space-y-3">
          <p><b>Kursus:</b> ${txn.course?.title || "-"}</p>
          <p><b>Kategori:</b> Offline</p>
          <p><b>Order ID:</b> ${trx.order_id || "-"}</p>
          <p><b>Harga Final:</b> Rp ${Number(txn.amount || 0).toLocaleString("id-ID")}</p>
          <p><b>Metode Pembayaran:</b> ${paymentTypeLabel}</p>
          <p><b>Status Pembayaran:</b> ${paymentStatusLabel}</p>
          ${trx.expired_at ? `<p><b>Batas Pembayaran:</b> ${new Date(trx.expired_at).toLocaleString("id-ID")}</p>` : ""}
          <p><b>Catatan Admin:</b> ${txn.admin_notes || "-"}</p>
        </div>
      `,
      showCancelButton: false,
      showConfirmButton: true,
      showDenyButton: showContactButton,
      showCloseButton: true,
      confirmButtonText: isPending
        ? "Lanjutkan Pembayaran"
        : isPaid && schedules.length > 0
          ? "Lihat Jadwal"
          : "Hubungi Admin",
      denyButtonText: "Hubungi Admin",
      allowEscapeKey: true,
    });

    if (modal.isDenied) {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (modal.isDismissed || !modal.isConfirmed) return;

    if (isPending) {
      if (trx.snap_token && window.snap) {
        const result = await window.snap.pay(trx.snap_token, {
          onSuccess: () => {
            Swal.fire({
              title: "Berhasil!",
              text: "Pembayaran diterima.",
              icon: "success",
            }).then(() => {
              window.location.href = "/profile?tab=riwayat";
            });
          },
          onPending: () => {
            Swal.fire({
              title: "Menunggu Pembayaran",
              text: "Pembayaran sedang diproses.",
              icon: "info",
            });
          },
          onError: () => {
            Swal.fire("Gagal", "Pembayaran gagal atau dibatalkan.", "error");
          },
        });
        if (result && result?.status_code === "201") {
          Swal.fire({
            title: "Berhasil!",
            text: "Pembayaran diterima.",
            icon: "success",
          }).then(() => {
            window.location.href = "/profile?tab=riwayat";
          });
        }
        return;
      }
      if (trx.redirect_url) {
        window.location.href = trx.redirect_url;
        return;
      }
      Swal.fire("Gagal", "Link pembayaran tidak tersedia.", "error");
      return;
    }

    if (schedules.length > 0) {
      Swal.fire({
        title: "Jadwal Kelas Offline",
        html: `
          <div class="text-left space-y-3">
            ${schedules
              .map(
                (schedule) => `
                  <div class="rounded-xl border border-slate-200 p-3">
                    <p><b>Kursus:</b> ${schedule.course_name || "-"}</p>
                    <p><b>Hari:</b> ${schedule.day || "-"}</p>
                    <p><b>Jam:</b> ${schedule.start_time && schedule.end_time ? `${schedule.start_time} - ${schedule.end_time}` : "-"}</p>
                    <p><b>Lokasi:</b> ${schedule.location || "-"}</p>
                    <p><b>Status:</b> ${schedule.status || "-"}</p>
                    <p><b>Catatan Admin:</b> ${schedule.notes || "-"}</p>
                  </div>
                `,
              )
              .join("")}
          </div>
        `,
        icon: "info",
        confirmButtonText: "Tutup",
      });
      return;
    }

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  },

  // ─────────────────────────────────────────────────────────
  //  INTERACTIONS
  // ─────────────────────────────────────────────────────────
  initSearchFilters() {
    const sections = ["kursus", "sertifikat", "riwayat"];
    sections.forEach((s) => {
      const container = document.getElementById(`search-container-${s}`);
      const temp = document.getElementById("search-filter-template");
      if (container && temp) {
        container.appendChild(temp.content.cloneNode(true));
        const input = container.querySelector(".search-input");
        input.addEventListener("input", (e) =>
          this.handleSearch(s, e.target.value),
        );
      }
    });
  },

  handleSearch(type, query) {
    const q = query.toLowerCase();
    if (type === "kursus") {
      const filtered = this.allData.courses.filter((c) =>
        c.courses?.title?.toLowerCase().includes(q),
      );
      this.renderCourses(filtered);
    } else if (type === "sertifikat") {
      const filtered = this.allData.certificates.filter((c) =>
        c.courses?.title?.toLowerCase().includes(q),
      );
      this.renderCertificates(filtered);
    } else if (type === "riwayat") {
      const matched = (this.allData.transactions || []).filter((t) =>
        t.course?.title?.toLowerCase().includes(q),
      );
      this.renderFilteredTransactions(matched);
    }
  },

  renderFilteredTransactions(list) {
    const container = document.getElementById("transaction-cards");
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `<div class="text-center py-6 text-slate-500">Tidak ada transaksi ditemukan.</div>`;
      return;
    }

    container.innerHTML = list
      .map((t) => {
        const isOnline = t.type === "online";
        const badgeColor = isOnline
          ? "bg-blue-100 text-blue-700"
          : "bg-green-100 text-green-700";
        const kategori = isOnline ? "Online" : "Offline";
        const harga = Number(t.amount || 0).toLocaleString("id-ID");
        const metode = isOnline
          ? "Midtrans"
          : this.getOfflinePaymentTypeLabel(t.payment_type);
        const statusText = isOnline
          ? t.status_pembayaran
          : this.getOfflinePaymentStatusLabel(t.payment_status);
        return `
          <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-4">
            <h3 class="font-bold text-lg text-slate-800">${t.course?.title || "Produk"}</h3>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <span class="px-2 py-1 rounded-md text-xs font-bold uppercase ${badgeColor}">${kategori}</span>
              <span class="font-medium">Rp ${harga}</span>
              <span class="text-sm text-slate-600">${metode}</span>
            </div>
            <div class="mt-2 text-sm text-slate-600">Status: ${statusText}</div>
            <button data-transaction-detail="${t.id}" data-transaction-type="${t.type}" class="mt-3 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100">Detail</button>
          </div>
        `;
      })
      .join("");

    document
      .querySelectorAll("[data-transaction-detail]")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          this.openTransactionDetail(btn.dataset.transactionDetail),
        ),
      );
  },

  setButtonLoading(button, isLoading, loadingText = "Menyimpan...") {
    if (!button) return;

    if (!button.dataset.originalText) {
      button.dataset.originalText = button.innerHTML;
    }

    button.disabled = isLoading;
    button.classList.toggle("opacity-70", isLoading);
    button.classList.toggle("cursor-not-allowed", isLoading);

    button.innerHTML = isLoading
      ? `<i class="fas fa-spinner fa-spin mr-2"></i>${loadingText}`
      : button.dataset.originalText;
  },

  updateAvatarUI(avatarUrl) {
    if (!avatarUrl) return;
    const avatarPreview = document.getElementById("avatarPreview");
    const bannerAvatar = document.getElementById("user-display-avatar");

    if (avatarPreview) {
      avatarPreview.src = avatarUrl;
    }

    if (bannerAvatar) {
      bannerAvatar.innerHTML = `
        <img src="${avatarUrl}" alt="Foto Profil" class="w-full h-full object-cover">
      `;
    }

    document.querySelectorAll("[data-user-avatar-img]").forEach((img) => {
      img.src = avatarUrl;
    });
  },

  updateLocalUserInfo(payload = {}) {
    const localData = JSON.parse(
      localStorage.getItem(CONFIG.USER_INFO) || "{}",
    );
    const nextData = {
      ...localData,
      ...payload,
    };

    localStorage.setItem(CONFIG.USER_INFO, JSON.stringify(nextData));
  },

  initProfileUpdate() {
    const avatarInput = document.getElementById("avatarInput");
    const avatarPreview = document.getElementById("avatarPreview");
    avatarInput?.addEventListener("change", () => {
      const file = avatarInput.files?.[0];
      const fileNameText = document.getElementById("avatarFileName");

      if (!file) {
        if (fileNameText) fileNameText.innerText = "Belum ada file dipilih";
        return;
      }

      if (!file.type.startsWith("image/")) {
        Swal.fire("Format tidak valid", "Pilih file gambar ya.", "warning");
        avatarInput.value = "";
        if (fileNameText) fileNameText.innerText = "Belum ada file dipilih";
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        Swal.fire("File terlalu besar", "Ukuran foto maksimal 5MB.", "warning");
        avatarInput.value = "";
        if (fileNameText) fileNameText.innerText = "Belum ada file dipilih";
        return;
      }

      if (fileNameText) fileNameText.innerText = file.name;

      const reader = new FileReader();
      reader.onload = () => {
        avatarPreview.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    document
      .getElementById("form-update-profile")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (this.isSavingProfile) return;

        const submitBtn = document.getElementById("btn-save-profile");
        const newName = document
          .getElementById("input-full-name")
          ?.value?.trim();
        const avatarInput = document.getElementById("avatarInput");
        const avatarFile = avatarInput?.files?.[0] || null;

        if (!newName) {
          Swal.fire(
            "Nama wajib diisi",
            "Masukkan nama lengkap kamu.",
            "warning",
          );
          return;
        }

        try {
          this.isSavingProfile = true;
          this.setButtonLoading(submitBtn, true, "Menyimpan...");

          const profileRes = await HTTP.put("/users/update", {
            full_name: newName,
          });

          let avatarUrl = profileRes.data?.avatar_url || null;

          if (avatarFile) {
            const formData = new FormData();
            formData.append("avatar", avatarFile);

            const avatarRes = await HTTP.form(
              "/users/update-avatar",
              formData,
              "POST",
            );

            avatarUrl = avatarRes.data?.avatar_url || avatarUrl;

            if (avatarUrl) {
              this.updateAvatarUI(avatarUrl);
            }
          }

          this.updateLocalUserInfo({
            full_name: newName,
            ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
          });

          const displayName = document.getElementById("user-display-name");
          if (displayName) displayName.innerText = newName;

          if (avatarInput) avatarInput.value = "";

          const fileNameText = document.getElementById("avatarFileName");
          if (fileNameText) fileNameText.innerText = "Belum ada file dipilih";

          await this.loadProfileData();

          Swal.fire("Berhasil", "Profilmu sudah diperbarui!", "success");
        } catch (error) {
          Swal.fire(
            "Gagal",
            error.message || "Gagal memperbarui profil.",
            "error",
          );
        } finally {
          this.isSavingProfile = false;
          this.setButtonLoading(submitBtn, false);
        }
      });

    document
      .getElementById("changePasswordBtn")
      ?.addEventListener("click", async () => {
        const newPassword = document.getElementById("newPassword")?.value || "";
        const confirmPassword =
          document.getElementById("confirmPassword")?.value || "";

        if (!newPassword || !confirmPassword) {
          Swal.fire(
            "Lengkapi data",
            "Isi Password Baru dan Konfirmasi Password.",
            "warning",
          );
          return;
        }

        if (newPassword !== confirmPassword) {
          Swal.fire(
            "Tidak cocok",
            "Konfirmasi password tidak sama.",
            "warning",
          );
          return;
        }

        if (newPassword.length < 8) {
          Swal.fire(
            "Password terlalu pendek",
            "Gunakan minimal 8 karakter.",
            "warning",
          );
          return;
        }

        try {
          const res = await HTTP.put("/users/change-password", {
            password: newPassword,
          });

          if (res.status === "success") {
            Swal.fire("Berhasil", "Password berhasil diubah.", "success").then(
              () => {
                localStorage.clear();
                window.location.href = "/login";
              },
            );
          } else {
            Swal.fire(
              "Gagal",
              res.message || "Gagal mengubah password.",
              "error",
            );
          }
        } catch (error) {
          Swal.fire("Gagal", error.message, "error");
        }
      });
  },

  initLogout() {
    document
      .getElementById("btn-logout-profile")
      ?.addEventListener("click", () => {
        Swal.fire({
          title: "Yakin mau keluar?",
          text: "Kamu harus login lagi nanti untuk mengakses profil.",
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#dc2626",
          cancelButtonColor: "#94a3b8",
          confirmButtonText: "Ya, Keluar",
          cancelButtonText: "Batal",
          reverseButtons: true,
        }).then((result) => {
          if (result.isConfirmed) {
            localStorage.clear();
            window.location.href = "/login";
          }
        });
      });
  },

  initDangerZone() {
    document
      .getElementById("btn-delete-account")
      ?.addEventListener("click", () => {
        Swal.fire({
          title: "Hapus Akun Selamanya?",
          text: 'Semua data belajar akan hangus. Masukkan kata "HAPUS" untuk konfirmasi.',
          input: "text",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#dc2626",
          confirmButtonText: "Ya, Hapus",
          preConfirm: (value) => {
            if (value !== "HAPUS")
              Swal.showValidationMessage("Teks konfirmasi salah!");
            return value === "HAPUS";
          },
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await HTTP.delete("/users/delete");
              localStorage.clear();
              window.location.href = "/";
            } catch (e) {
              Swal.fire("Error", e.message, "error");
            }
          }
        });
      });
  },
};
