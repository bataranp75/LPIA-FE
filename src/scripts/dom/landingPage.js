// src/scripts/dom/landingPage.js
import { HTTP } from "../fetch/http.js";
import Swal from "sweetalert2";
import { Fallback } from "../utils/fallback.js";

export const LandingDOM = {
  init() {
    this.handleAuthDisplay();

    const isHome = window.location.pathname === "/";

    if (isHome) {
      this.fetchAndRenderHero();
      this.fetchAndRenderTrust();
      this.fetchAndRenderPromos();
      this.fetchAndRenderFeatures();
      this.fetchAndRenderRecommendation();
      this.fetchAndRenderAlumni();
      this.fetchAndRenderBranch();
      this.fetchAndRenderFaqs();
      this.fetchAndRenderCta();
      this.fetchAndRenderCourses();
      this.fetchAndRenderStats();
      window.retryFetchCourses = () => this.fetchAndRenderCourses();
    }
  },

  async fetchAndRenderRecommendation() {
    const container = document.getElementById("recommendation-content");
    if (!container) return;

    const token = localStorage.getItem("lpia_user_token");
    const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const reasonLabels = {
      matches_preferred_tags: "Sesuai dengan minat belajar",
      same_category: "Sesuai bidang yang dipilih",
      matches_level: "Sesuai level kemampuan",
      matches_learning_type: "Sesuai jenis kelas"
    };

    const renderLogin = () => {
      container.innerHTML = `<div class="rounded-3xl border border-blue-100 bg-white p-6 text-center md:p-10"><h3 class="text-xl font-semibold text-[#1A1D20]">Temukan Kursus yang Tepat</h3><p class="mt-3 text-[#4A4E57] text-sm">Login untuk mendapatkan rekomendasi kursus personal.</p><a href="/login" class="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#0F3B66] px-6 text-sm font-semibold text-white hover:bg-[#0A2540]">Login Sekarang</a></div>`;
    };

    const renderForm = () => {
      const categories = ['Bahasa Inggris', 'Bahasa Asing', 'Komputer', 'Programming', 'Desain', 'Marketing', 'Akuntansi', 'Bimbingan Belajar'];
      const levels = ['pre-schooler', 'pre-foundation', 'foundation', 'Basic', 'Elementary', 'Intermediate', 'Advanced', 'Conversation', 'Dasar', 'Menengah', 'Lanjutan', 'SD', 'SMP', 'SMA', 'Persiapan UTBK'];
      container.innerHTML = `<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"><form id="recommendation-form" class="rounded-3xl border border-blue-100 bg-white p-6"><h3 class="text-lg font-semibold text-[#1A1D20]">Temukan pilihan terbaikmu</h3><fieldset class="mt-5"><legend class="text-sm font-semibold text-[#1A1D20]">Bidang Minat</legend><div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">${categories.map((category) => `<label class="flex items-center gap-2 text-sm text-[#4A4E57]"><input name="preferred_categories" type="checkbox" value="${esc(category)}" class="rounded border-slate-300 text-[#0F3B66] focus:ring-[#0F3B66]">${esc(category)}</label>`).join('')}</div></fieldset><label class="mt-5 block text-sm font-semibold text-[#1A1D20]">Level<select name="preferred_level" required class="mt-2 h-12 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm text-[#1A1D20] outline-none focus:border-2 focus:border-[#0F3B66]">${levels.map((level) => `<option value="${esc(level)}">${esc(level)}</option>`).join('')}</select></label><label class="mt-5 block text-sm font-semibold text-[#1A1D20]">Learning Type<select name="preferred_learning_type" required class="mt-2 h-12 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm text-[#1A1D20] outline-none focus:border-2 focus:border-[#0F3B66]"><option value="Regular">Regular</option><option value="Private">Private</option></select></label><button type="submit" class="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#0F3B66] px-6 text-sm font-semibold text-white hover:bg-[#0A2540]">Cari Rekomendasi</button></form><div class="flex min-h-64 items-center rounded-3xl border border-blue-100 bg-[#EFF6FF] p-8"><div><i class="fas fa-wand-magic-sparkles text-3xl text-[#0F3B66]"></i><h3 class="mt-4 text-xl font-semibold text-[#1A1D20]">Rekomendasi personal</h3><p class="mt-2 text-sm leading-relaxed text-[#4A4E57]">Pilih bidang minat, level kemampuan, dan jenis kelas untuk melihat kursus paling sesuai.</p></div></div></div>`;
      container.querySelector("#recommendation-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const payload = {
          preferred_categories: form.getAll("preferred_categories"),
          preferred_level: form.get("preferred_level"),
          preferred_learning_type: form.get("preferred_learning_type")
        };
        const button = event.currentTarget.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = "Mencari rekomendasi...";
        try {
          await HTTP.post("/recommendations/profile/preferences", payload);
          await this.fetchAndRenderRecommendation();
        } catch (error) {
          button.disabled = false;
          button.textContent = "Cari Rekomendasi";
          Swal.fire({ icon: "error", title: "Gagal menyimpan preferensi", text: error.message || "Silakan coba lagi." });
        }
      });
    };

    const renderCourses = (courses) => {
      container.innerHTML = `<div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">${courses.slice(0, 3).map((course) => {
        const reasons = (course.reasons || []).filter((reason) => reasonLabels[reason]);
        const score = Math.round(Number(course.recommendation_score || 0) * 100);
        return `
          <article class="group flex flex-col overflow-hidden rounded-2xl border border-blue-100/80 border-t-4 border-t-[#0F3B66] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
            <img src="${esc(course.thumbnail_url || Fallback.defaultImage)}" onerror="${Fallback.imageOnError()}" alt="${esc(course.title)}" class="aspect-[16/10] w-full object-cover" loading="lazy">
            <div class="flex flex-grow flex-col p-6">
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs font-semibold uppercase tracking-wider text-[#0F3B66]">${esc(course.category || 'Kursus')}</p>
                <span class="shrink-0 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Rekomendasi</span>
              </div>
              <h3 class="mt-3 text-lg font-semibold leading-snug text-[#0A2540]">${esc(course.title)}</h3>
              <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#4A4E57]">
                <span class="rounded-full bg-blue-50 px-2.5 py-1">${esc(course.level || 'General')}</span>
                <span class="rounded-full bg-blue-50 px-2.5 py-1">${esc(course.learning_type || 'Regular')}</span>
                <span class="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[#0F3B66]">${score}% cocok</span>
              </div>
              ${reasons.length ? `<ul class="mt-4 space-y-1.5 text-xs text-[#4A4E57]">${reasons.map((reason) => `<li><i class="fas fa-check mr-2 text-[#0F3B66]"></i>${reasonLabels[reason]}</li>`).join('')}</ul>` : ''}
              <a href="/courses/${encodeURIComponent(course.id)}" class="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-slate-200 text-sm font-semibold text-[#0A2540] transition-colors hover:border-[#0F3B66] hover:text-[#0F3B66]">Lihat Detail</a>
            </div>
          </article>`;
      }).join('')}</div>`;
    };

    if (!token) {
      renderLogin();
      return;
    }

    try {
      const response = await HTTP.get("/recommendations/courses");
      const courses = response.data || [];
      if (!courses.some((course) => Number(course.recommendation_score) > 0)) {
        renderForm();
        return;
      }
      renderCourses(courses);
    } catch (error) {
      renderForm();
    }
  },

  // ─────────────────────────────────────────────────────────
  //  FEATURES — "Kenapa Belajar di LPIA?" (via /landing/features)
  // ─────────────────────────────────────────────────────────
  async fetchAndRenderFeatures() {
    const list = document.getElementById("features-list");
    if (!list) return;

    const esc = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");

    try {
      const res = await HTTP.get("/landing/features");
      const items = res.data?.items || [];
      if (items.length === 0) return; // biarkan default SSR

      list.innerHTML = items
        .map(
          (it) => `
            <div class="rounded-2xl border border-slate-200/60 bg-white/70 p-6 ring-1 ring-blue-100 backdrop-blur-sm transition-all hover:bg-white hover:shadow-md">
                <div class="mb-6 inline-flex rounded-xl bg-blue-100/80 p-3 text-[#0F3B66]"><i class="fas ${esc(it.icon) || "fa-star"} text-xl"></i></div>
                <h3 class="font-semibold text-[#0A2540] text-lg">${esc(it.title)}</h3>
                <p class="mt-3 text-sm text-[#4A4E57] leading-relaxed">${esc(it.description)}</p>
            </div>`,
        )
        .join("");
    } catch (error) {
      console.warn("Features belum tersedia, memakai default.");
    }
  },

  // ─────────────────────────────────────────────────────────
  //  CTA SECTION (dikelola admin via /landing/cta)
  // ─────────────────────────────────────────────────────────
  async fetchAndRenderCta() {
    const section = document.getElementById("cta-section");
    if (!section) return;

    try {
      const res = await HTTP.get("/landing/cta");
      const c = res.data || {};

      const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el && value) el.textContent = value;
      };

      setText("cta-title", c.title);
      setText("cta-subtitle", c.subtitle);
      setText("cta-primary-text", c.primary_text);
      setText("cta-secondary-text", c.secondary_text);

      const primary = document.getElementById("cta-primary");
      if (primary && c.primary_link) primary.href = c.primary_link;

      const secondary = document.getElementById("cta-secondary");
      if (secondary && c.secondary_link) secondary.href = c.secondary_link;
    } catch (error) {
      console.warn("CTA settings belum tersedia, memakai default.");
    }
  },

  // ─────────────────────────────────────────────────────────
  //  BRANCH — Info Cabang (dikelola admin via /landing/branch)
  // ─────────────────────────────────────────────────────────
  async fetchAndRenderBranch() {
    const section = document.getElementById("branch-section");
    if (!section) return;

    try {
      const res = await HTTP.get("/landing/branch");
      const b = res.data || {};

      // Tanpa nama cabang, section tidak ditampilkan.
      if (!b.name) return;

      const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "";
      };

      setText("branch-name", b.name);
      setText("branch-address", b.address);
      setText("branch-hours", b.hours);
      setText("branch-phone", b.phone);
      setText("branch-tagline", b.tagline);
      setText("branch-description", b.description);

      if (b.whatsapp) {
        setText("branch-whatsapp", b.whatsapp);
        document.getElementById("branch-wa-wrap")?.classList.remove("hidden");
      }

      const maps = document.getElementById("branch-maps");
      if (maps && b.maps_link) {
        maps.href = b.maps_link;
        maps.classList.remove("hidden");
      }

      const photo = document.getElementById("branch-photo");
      if (photo && b.photo_url) {
        photo.src = b.photo_url;
        photo.classList.remove("hidden");
        document
          .getElementById("branch-photo-placeholder")
          ?.classList.add("hidden");
      }

      section.classList.remove("hidden");
    } catch (error) {
      console.warn("Info cabang belum tersedia, section disembunyikan.");
    }
  },

  // ─────────────────────────────────────────────────────────
  //  FAQ (dikelola admin via /landing/faqs)
  // ─────────────────────────────────────────────────────────
  async fetchAndRenderFaqs() {
    const container = document.getElementById("faq-accordion");
    if (!container) return;

    const esc = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");

    try {
      const res = await HTTP.get("/landing/faqs");
      const faqs = res.data || [];
      if (!faqs.length) return; // biarkan default SSR

      container.innerHTML = faqs
        .map(
          (f) => `
            <details class="group bg-white border border-slate-200 shadow-sm rounded-2xl p-5 cursor-pointer open:ring-2 open:ring-blue-100 transition-all">
                <summary class="flex justify-between items-center font-semibold text-slate-800 list-none gap-4">
                    ${esc(f.question)}
                    <span class="w-8 h-8 shrink-0 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-open:rotate-180 transition-transform"><i class="fas fa-chevron-down text-xs"></i></span>
                </summary>
                <p class="mt-4 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">${esc(f.answer)}</p>
            </details>`,
        )
        .join("");
    } catch (error) {
      console.warn("FAQ belum tersedia, memakai default.");
    }
  },

  // ─────────────────────────────────────────────────────────
  //  ALUMNI TESTIMONIALS (dikelola admin via /landing/alumni)
  // ─────────────────────────────────────────────────────────
  async fetchAndRenderAlumni() {
    const section = document.getElementById("alumni-section");
    const track = document.getElementById("alumni-track");
    if (!section || !track) return;

    const esc = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");

    const stars = (rating) =>
      [1, 2, 3, 4, 5]
        .map(
          (i) =>
            `<i class="fas fa-star text-sm ${i <= rating ? "text-yellow-400" : "text-slate-200"}"></i>`,
        )
        .join("");

    try {
      const res = await HTTP.get("/landing/alumni");
      const alumni = res.data || [];
      if (!alumni.length) return; // section tetap tersembunyi

      track.innerHTML = alumni
        .map((a) => {
          const avatar = a.photo_url
            ? `<img src="${esc(a.photo_url)}" alt="${esc(a.name)}" class="w-14 h-14 rounded-full object-cover border-2 border-blue-100" loading="lazy" />`
            : `<div class="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xl">${esc((a.name || "?").charAt(0).toUpperCase())}</div>`;

          return `
            <div class="snap-start shrink-0 w-[85%] sm:w-[46%] lg:w-[31.5%] bg-white border border-blue-100 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md flex flex-col">
              <i class="fas fa-quote-left text-2xl text-blue-300 mb-4"></i>
              <p class="text-slate-600 text-sm leading-relaxed flex-grow">"${esc(a.testimonial)}"</p>
              <div class="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100">
                ${avatar}
                <div class="min-w-0">
                  <p class="font-black text-slate-900 truncate">${esc(a.name)}</p>
                  <p class="text-xs font-semibold text-blue-600 truncate">${esc(a.course_name)}${a.year ? ` · ${a.year}` : ""}</p>
                  <div class="mt-1">${stars(a.rating)}</div>
                </div>
              </div>
            </div>`;
        })
        .join("");

      // Navigasi panah: geser selebar satu kartu.
      const scrollByCard = (dir) => {
        const card = track.firstElementChild;
        if (!card) return;
        track.scrollBy({ left: dir * (card.offsetWidth + 24), behavior: "smooth" });
      };

      document
        .getElementById("alumni-prev")
        ?.addEventListener("click", () => scrollByCard(-1));
      document
        .getElementById("alumni-next")
        ?.addEventListener("click", () => scrollByCard(1));

      section.classList.remove("hidden");
    } catch (error) {
      console.warn("Alumni belum tersedia, section disembunyikan.");
    }
  },

  // ─────────────────────────────────────────────────────────
  //  PROMO (dikelola admin via /landing/promos)
  // ─────────────────────────────────────────────────────────
  async fetchAndRenderPromos() {
    const section = document.getElementById("promo-section");
    const list = document.getElementById("promo-list");
    if (!section || !list) return;

    const esc = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");

    const formatPeriod = (p) => {
      const fmt = (d) =>
        d
          ? new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : null;
      const start = fmt(p.start_date);
      const end = fmt(p.end_date);
      if (end) return `Berlaku s.d. ${end}`;
      if (start) return `Mulai ${start}`;
      return "";
    };

    try {
      const res = await HTTP.get("/landing/promos");
      const promos = res.data || [];

      if (!promos.length) return; // section tetap tersembunyi

      list.innerHTML = promos
        .map((p) => {
          const period = formatPeriod(p);
          return `
            <div class="flex flex-col overflow-hidden rounded-2xl border border-blue-100/80 border-t-4 border-t-[#E25822] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl sm:flex-row">
              <div class="sm:w-2/5 h-44 sm:h-auto bg-slate-100 relative shrink-0">
                ${
                  p.image_url
                    ? `<img src="${esc(p.image_url)}" alt="${esc(p.title)}" class="w-full h-full object-cover" loading="lazy" />`
                    : `<div class="w-full h-full min-h-44 flex items-center justify-center bg-gradient-to-br from-[#0A2540] to-[#0F3B66] text-white"><i class="fas fa-gift text-4xl"></i></div>`
                }
              </div>
              <div class="p-6 md:p-7 flex flex-col flex-grow">
                <span class="self-start inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  <i class="fas fa-bolt"></i> Promo Terbatas
                </span>
                <h3 class="text-lg md:text-xl font-black text-slate-900 mb-2">${esc(p.title)}</h3>
                <p class="text-sm text-slate-500 leading-relaxed mb-4 flex-grow">${esc(p.description)}</p>
                ${period ? `<p class="text-xs font-bold text-[#E25822] mb-4"><i class="fas fa-calendar-days mr-1"></i> ${period}</p>` : ""}
                <a href="${esc(p.cta_link || "#kursus")}"
                  class="self-start inline-flex items-center gap-2 bg-[#E25822] text-white font-bold px-6 py-2.5 rounded-xl shadow-[0_3px_0_0_#a83a14] hover:bg-[#C9481B] hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none border border-[#a83a14] transition-all duration-200 text-sm">
                  ${esc(p.cta_text || "Lihat Promo")} <i class="fas fa-arrow-right text-xs"></i>
                </a>
              </div>
            </div>`;
        })
        .join("");

      // Jika hanya 1 promo, tampilkan full-width agar lebih menonjol.
      list.classList.toggle("lg:grid-cols-2", promos.length > 1);
      section.classList.remove("hidden");
    } catch (error) {
      console.warn("Promo belum tersedia, section disembunyikan.");
    }
  },

  // ─────────────────────────────────────────────────────────
  //  TRUST / STATISTIK (dikelola admin via /landing/trust)
  // ─────────────────────────────────────────────────────────
  async fetchAndRenderTrust() {
    const list = document.getElementById("trust-list");
    if (!list) return;

    try {
      const res = await HTTP.get("/landing/trust");
      const items = res.data?.items || [];
      if (items.length === 0) return; // biarkan default SSR

      list.innerHTML = items
        .map(
          (it) => `
            <div class="text-center">
                <div class="bg-gradient-to-r from-[#0F3B66] to-[#E25822] bg-clip-text font-extrabold text-2xl text-transparent md:text-3xl">${it.value || ""}</div>
                <div class="mt-1 text-xs text-[#4A4E57] md:text-sm">${it.label || ""}</div>
            </div>`,
        )
        .join("");
    } catch (error) {
      console.warn("Trust settings belum tersedia, memakai default.");
    }
  },

  // ─────────────────────────────────────────────────────────
  //  HERO (konten dikelola admin via /landing/hero)
  // ─────────────────────────────────────────────────────────
  async fetchAndRenderHero() {
    const root = document.getElementById("hero-section");
    if (!root) return;

    try {
      const res = await HTTP.get("/landing/hero");
      const h = res.data || {};

      const setText = (selector, value) => {
        const el = root.querySelector(selector);
        if (el && value) el.textContent = value;
      };

      setText('[data-hero="badge"]', h.badge);
      setText("#hero-title", h.title);
      setText("#hero-subtitle", h.subtitle);
      setText('[data-hero="primary_text"]', h.primary_text);
      setText('[data-hero="secondary_text"]', h.secondary_text);

      const primary = root.querySelector("#hero-primary");
      if (primary && h.primary_link) primary.setAttribute("href", h.primary_link);

      const secondary = root.querySelector("#hero-secondary");
      if (secondary && h.secondary_link)
        secondary.setAttribute("href", h.secondary_link);

      const banner = root.querySelector("#hero-banner");
      if (banner && h.banner_url) banner.src = h.banner_url;
    } catch (error) {
      // Diamkan — default SSR sudah tampil kalau endpoint belum siap.
      console.warn("Hero settings belum tersedia, memakai default.");
    }
  },

  // ─────────────────────────────────────────────────────────
  //  BUTTON COMPONENT HELPER (Sinkronisasi dengan Button.astro)
  // ─────────────────────────────────────────────────────────
  getButtonHTML({
    text,
    variant = "primary",
    size = "md",
    extraClass = "",
    dataId = "",
    icon = "",
  }) {
    const base =
      "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

    const sizeMap = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-2.5 text-base",
      lg: "px-8 py-3 text-lg",
      icon: "w-10 h-10 flex items-center justify-center text-base", // Tambahan size khusus icon bulat
    };

    const variantMap = {
      primary:
        "bg-blue-600 text-white shadow-[0_3px_0_0_#1e40af] hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none border border-blue-700",
      outline:
        "bg-white border border-slate-200 text-slate-700 shadow-[0_3px_0_0_#e5e7eb] hover:border-blue-600 hover:text-blue-600 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none",
      ghost:
        "bg-transparent text-blue-600 shadow-none hover:bg-blue-50 active:bg-blue-100 border border-transparent",
      // Tambahan varian danger (merah) untuk tombol logout
      danger:
        "bg-red-50 text-red-600 shadow-[0_3px_0_0_#fecaca] hover:bg-red-100 hover:text-red-700 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none border border-red-200",
    };

    const iconHtml = icon ? `<i class="${icon}"></i>` : "";
    const idAttr = dataId ? `data-id="${dataId}"` : "";

    // Handle spasi jika text kosong (hanya icon)
    const contentHtml = text ? `${text} ${iconHtml}` : iconHtml;

    return `<button class="${base} ${sizeMap[size]} ${variantMap[variant]} ${extraClass}" ${idAttr}>
            ${contentHtml}
        </button>`;
  },
  // ─────────────────────────────────────────────────────────
  //  STATS BAR
  // ─────────────────────────────────────────────────────────
  async fetchAndRenderStats() {
    const statsBar = document.getElementById("stats-bar");
    if (!statsBar) return;

    try {
      const response = await HTTP.get("/stats/landing");
      const { total_students, total_courses, avg_rating } = response.data;

      statsBar.innerHTML = `
                <div class="rounded-3xl border border-blue-100 bg-white px-4 py-3 text-center">
                    <div class="font-mono text-2xl font-medium text-[#1A1D20]">${total_students.toLocaleString("id-ID")}+</div>
                    <div class="mt-1 text-xs font-medium text-[#4A4E57]">Siswa Aktif</div>
                </div>
                <div class="rounded-3xl border border-blue-100 bg-white px-4 py-3 text-center">
                    <div class="font-mono text-2xl font-medium text-[#1A1D20]">${total_courses}</div>
                    <div class="mt-1 text-xs font-medium text-[#4A4E57]">Kursus Tersedia</div>
                </div>
                <div class="rounded-3xl border border-blue-100 bg-white px-4 py-3 text-center">
                    <div class="font-mono text-2xl font-medium text-[#1A1D20]">${parseFloat(avg_rating).toFixed(1)}</div>
                    <div class="mt-1 text-xs font-medium text-[#4A4E57]">Rating Siswa</div>
                </div>
            `;
    } catch (error) {
      console.warn("Stats endpoint belum tersedia, menggunakan fallback.");
      statsBar.innerHTML = `
                <div class="rounded-3xl border border-blue-100 bg-white px-4 py-3 text-center"><div class="font-mono text-2xl font-medium text-[#1A1D20]">—</div><div class="mt-1 text-xs font-medium text-[#4A4E57]">Siswa Aktif</div></div>
                <div class="rounded-3xl border border-blue-100 bg-white px-4 py-3 text-center"><div class="font-mono text-2xl font-medium text-[#1A1D20]">—</div><div class="mt-1 text-xs font-medium text-[#4A4E57]">Kursus Tersedia</div></div>
                <div class="rounded-3xl border border-blue-100 bg-white px-4 py-3 text-center"><div class="font-mono text-2xl font-medium text-[#1A1D20]">—</div><div class="mt-1 text-xs font-medium text-[#4A4E57]">Rating Siswa</div></div>
            `;
    }
  },

  // ─────────────────────────────────────────────────────────
  //  COURSES LIST
  // ─────────────────────────────────────────────────────────
  async fetchAndRenderCourses() {
    const courseContainer = document.getElementById("course-list");
    if (!courseContainer) return;

    courseContainer.innerHTML = Array(4)
      .fill(
        '<div class="h-[25rem] w-72 shrink-0 snap-start rounded-3xl border border-blue-100 bg-white animate-pulse sm:w-80"></div>',
      )
      .join("");

    try {
      const response = await HTTP.get("/courses");
      const courses = response.data;

      if (!courses || courses.length === 0) {
        courseContainer.innerHTML = Fallback.emptyState(
          "Belum ada kelas kursus yang dipublikasikan.",
          "fa-box-open",
        );
        return;
      }

      courseContainer.innerHTML = courses
        .map(
          (course) => {
            const rawCategory = String(course.category || "").trim();
            const category =
              rawCategory && rawCategory.toLowerCase() !== "offline"
                ? rawCategory
                : "General";
            const tags = Array.isArray(course.tags)
              ? course.tags.filter((tag) => String(tag || "").trim())
              : [];
            const visibleTags = tags.slice(0, 2);
            const extraTags = tags.length - visibleTags.length;
            const price =
              course.price == 0
                ? "GRATIS"
                : `Rp ${parseInt(course.price || 0).toLocaleString("id-ID")}`;

            const isPrivate = (s) => String(s || "").toLowerCase().includes("privat") || String(s || "").toLowerCase().includes("private");
            const isOffline = (s) => String(s || "").toLowerCase().includes("offline");
            const blueBadge = "rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-700 backdrop-blur";
            const purpleBadge = "rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-purple-700 backdrop-blur";

            return `
              <article class="course-card-hover group flex w-72 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 sm:w-80 lg:w-[calc((100%-3.75rem)/4)]">
                <div class="relative aspect-[16/10] overflow-hidden bg-[#EFF6FF]">
                  <img src="${course.thumbnail_url || Fallback.defaultImage}" onerror="${Fallback.imageOnError()}" alt="${course.title}" class="h-full w-full object-cover" loading="lazy" />
                  <div class="absolute left-3 top-3 flex flex-wrap gap-2">
                    <span class="${isOffline(course.delivery_type) ? purpleBadge : blueBadge}">${course.delivery_type || "Online"}</span>
                    <span class="${isPrivate(course.learning_type) ? purpleBadge : blueBadge}">${course.learning_type || "Regular"}</span>
                  </div>
                </div>
                <div class="flex flex-1 flex-col p-6">
                  <span class="text-[10px] font-semibold uppercase tracking-wider text-[#0F3B66]">${category}</span>
                  <h3 class="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-[#0A2540]">${course.title}</h3>
                  <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-[#4A4E57]">${course.description || "Tidak ada deskripsi."}</p>
                  <div class="mt-4 flex min-h-6 flex-wrap items-center gap-2">
                    <span class="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-[#0F3B66]">${course.level || "General"}</span>
                    ${visibleTags.map((tag) => `<span class="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-[#0F3B66]">${tag}</span>`).join("")}
                    ${extraTags > 0 ? `<span class="text-xs font-semibold text-[#7A7F8A]">+${extraTags}</span>` : ""}
                  </div>
                  <div class="mt-5 flex items-center justify-between border-t border-blue-100 pt-4">
                    <span class="text-base font-semibold text-[#0A2540]">${price}</span>
                    <button type="button" data-id="${course.id}" class="btn-detail inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-4 text-xs font-semibold text-[#0A2540] transition-colors hover:border-[#0F3B66] hover:text-[#0F3B66]">Lihat Detail</button>
                  </div>
                </div>
              </article>
            `;
          },
        )
        .join("");

      courseContainer.querySelectorAll(".btn-detail").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          window.location.href = `/courses/${e.currentTarget.dataset.id}`;
        });
      });

      this.initCourseCarousel();
    } catch (error) {
      console.error("Gagal memuat kursus:", error);
      courseContainer.innerHTML = Fallback.errorState(
        "Gagal mengambil data kursus.",
        "window.retryFetchCourses()",
      );
    }
  },

  initCourseCarousel() {
    const track = document.getElementById("course-list");
    const prevBtn = document.getElementById("course-carousel-prev");
    const nextBtn = document.getElementById("course-carousel-next");
    if (!track || !prevBtn || !nextBtn) return;

    const updateButtons = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      prevBtn.disabled = track.scrollLeft <= 1;
      nextBtn.disabled = track.scrollLeft >= maxScroll - 1;
    };
    const scrollCourses = (direction) => {
      track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: "smooth" });
    };

    prevBtn.onclick = () => scrollCourses(-1);
    nextBtn.onclick = () => scrollCourses(1);
    track.onscroll = updateButtons;
    window.requestAnimationFrame(updateButtons);
  },

  // ─────────────────────────────────────────────────────────
  //  CAROUSEL LOGIC
  // ─────────────────────────────────────────────────────────
  renderCarousel(courses) {
    const track = document.getElementById("carousel-track");
    const dotsContainer = document.getElementById("carousel-dots");
    if (!track || !dotsContainer) return;

    if (!courses || courses.length === 0) {
      track.innerHTML = `<div class="w-full h-full bg-slate-200 flex items-center justify-center"><i class="fas fa-image text-6xl text-slate-400"></i></div>`;
      dotsContainer.innerHTML = "";
      return;
    }

    const activeCourses = courses.filter((c) => !c.is_placement_test);
    const shuffled = activeCourses.sort(() => 0.5 - Math.random());
    const selectedCourses = shuffled.slice(0, 5);

    track.innerHTML = selectedCourses
      .map(
        (course, index) => `
            <div class="carousel-slide min-w-full h-full relative">
                <img src="${course.thumbnail_url || Fallback.defaultImage}" onerror="${Fallback.imageOnError()}" alt="${course.title}" class="w-full h-full object-cover" loading="${index === 0 ? "eager" : "lazy"}" />
                <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
                <div class="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-20 pointer-events-none">
                    <div class="max-w-2xl pointer-events-auto">
                        <span class="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">${course.category || "Promo"}</span>
                        <h3 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 tracking-tight drop-shadow-md">${course.title}</h3>
                        <p class="text-gray-200 text-sm md:text-base font-normal max-w-2xl line-clamp-2 mb-6">${course.description || "Gabung sekarang dan tingkatkan keahlianmu!"}</p>
                        
                        ${this.getButtonHTML({
                          text: "Lihat Program",
                          variant: "primary",
                          size: "md",
                          extraClass: "btn-carousel-detail",
                          dataId: course.id,
                          icon: "fas fa-arrow-right ml-1 text-sm",
                        })}
                    </div>
                </div>
            </div>
        `,
      )
      .join("");

    dotsContainer.innerHTML = selectedCourses
      .map(
        (_, index) => `
            <button class="carousel-dot h-2.5 rounded-full border border-white/50 transition-all duration-300 focus:outline-none ${index === 0 ? "bg-white w-8" : "bg-white/40 w-2.5"}" data-index="${index}" aria-label="Slide ${index + 1}"></button>
        `,
      )
      .join("");

    track.querySelectorAll(".btn-carousel-detail").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        window.location.href = `/courses/${e.currentTarget.dataset.id}`;
      });
    });

    this.initCarouselLogic(selectedCourses.length);
  },

  initCarouselLogic(totalSlides) {
    if (totalSlides <= 1) return;

    const track = document.getElementById("carousel-track");
    const dotsEl = document.querySelectorAll(".carousel-dot");
    const prevBtn = document.getElementById("carousel-prev");
    const nextBtn = document.getElementById("carousel-next");
    let current = 0;
    let timer;

    function goTo(n) {
      current = ((n % totalSlides) + totalSlides) % totalSlides;
      track.style.transform = `translateX(-${current * 100}%)`;

      dotsEl.forEach((dot, i) => {
        const active = i === current;
        dot.classList.toggle("bg-white", active);
        dot.classList.toggle("w-8", active);
        dot.classList.toggle("bg-white/40", !active);
        dot.classList.toggle("w-2.5", !active);
      });
    }

    function resetTimer() {
      clearInterval(timer);
      timer = setInterval(() => goTo(current + 1), 5000);
    }

    if (prevBtn)
      prevBtn.onclick = () => {
        goTo(current - 1);
        resetTimer();
      };
    if (nextBtn)
      nextBtn.onclick = () => {
        goTo(current + 1);
        resetTimer();
      };

    dotsEl.forEach((dot, i) => {
      dot.onclick = () => {
        goTo(i);
        resetTimer();
      };
    });

    let startX = 0;
    track.ontouchstart = (e) => {
      startX = e.touches[0].clientX;
    };
    track.ontouchend = (e) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        goTo(current + (diff > 0 ? 1 : -1));
        resetTimer();
      }
    };

    resetTimer();
  },

  // ─────────────────────────────────────────────────────────
  //  AUTH DISPLAY
  // ─────────────────────────────────────────────────────────
  handleAuthDisplay() {
    const authContainer = document.getElementById("auth-container");
    if (!authContainer) return;

    const token = localStorage.getItem("lpia_user_token");
    const userDataStr = localStorage.getItem("lpia_user_data");

    if (token && userDataStr) {
      const userData = JSON.parse(userDataStr);

      // 1. KONDISI JIKA USER ADALAH ADMIN
      if (userData.role === "admin") {
        authContainer.innerHTML = `
                    <div class="flex items-center gap-3">
                        <a href="/admin/courses" class="inline-flex items-center justify-center gap-2 font-bold rounded-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm transition-all duration-200 shadow-sm">
                            <i class="fas fa-user-shield"></i> Dashboard Admin
                        </a>
                        
                        <button id="logout-btn" class="text-sm font-medium text-[#4A4E57] transition-colors hover:text-[#0F3B66]">
                            Keluar
                        </button>
                    </div>
                `;
      }

      // 2. KONDISI JIKA USER ADALAH GURU
      else if (userData.role === "guru") {
        authContainer.innerHTML = `
                    <div class="flex items-center gap-3">
                        <a href="/guru/dashboard?mode=modul" class="inline-flex items-center justify-center gap-2 font-bold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm transition-all duration-200 shadow-sm">
                            <i class="fas fa-chalkboard-teacher"></i> Dashboard Guru
                        </a>

                        <button id="logout-btn" class="text-sm font-medium text-[#4A4E57] transition-colors hover:text-[#0F3B66]">
                            Keluar
                        </button>
                    </div>
                `;
      }

      // 3. KONDISI JIKA USER BIASA (SISWA)
      else {
        authContainer.innerHTML = `
                    <div class="flex items-center gap-3">
                        <a href="/profile" class="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#0F3B66] text-xs font-semibold text-white" aria-label="Buka profil">
                            ${
                              userData.avatar_url
                                ? `<img src="${userData.avatar_url}" alt="Avatar" class="h-full w-full object-cover">`
                                : `${userData.full_name ? userData.full_name.charAt(0).toUpperCase() : "U"}`
                            }
                        </a>
                        
                        <button id="logout-btn" class="text-sm font-medium text-[#4A4E57] transition-colors hover:text-[#0F3B66]">
                            Keluar
                        </button>
                    </div>
                `;
      }

      // Event Listener Logout
      document.getElementById("logout-btn")?.addEventListener("click", () => {
        Swal.fire({
          title: "Apakah Anda yakin?",
          text: "Anda akan keluar dari sesi ini.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Ya, Keluar",
          cancelButtonText: "Batal",
          reverseButtons: true,
        }).then((result) => {
          if (result.isConfirmed) {
            localStorage.removeItem("lpia_user_token");
            localStorage.removeItem("lpia_user_data");

            Swal.fire({
              title: "Berhasil Keluar",
              text: "Sampai jumpa lagi!",
              icon: "success",
              timer: 1500,
              showConfirmButton: false,
            }).then(() => {
              window.location.reload();
            });
          }
        });
      });
    } else {
      // STATE LOGOUT
      authContainer.innerHTML = this.getButtonHTML({
        text: "Login / Daftar",
        variant: "primary",
        size: "sm",
        extraClass: "",
        dataId: "login-btn",
      });

      document
        .querySelector('[data-id="login-btn"]')
        ?.addEventListener("click", () => {
          window.location.href = "/login";
        });
    }
  },
};
