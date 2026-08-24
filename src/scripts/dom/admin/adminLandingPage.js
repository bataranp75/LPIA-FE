import Swal from "sweetalert2";
import { HTTP } from "../../fetch/http.js";
import { AppToast } from "../../components/toast.js";
import { ReusableModal } from "../../components/reusableModal.js";

export const AdminLandingPage = {
  init() {
    this.initTabs();
    this.initHero();
    this.initTrust();
    this.initFeatures();
    this.initPromo();
    this.initAlumni();
    this.initBranch();
    this.initFaq();
    this.initCta();
  },

  // ─────────────────────────────────────────────────────────
  //  TABS (generic — tumbuh seiring section landing ditambah)
  // ─────────────────────────────────────────────────────────
  initTabs() {
    const buttons = document.querySelectorAll(".landing-tab-btn");
    const panels = document.querySelectorAll(".landing-panel");

    const activate = (key) => {
      buttons.forEach((btn) => {
        const active = btn.dataset.tab === key;
        btn.dataset.active = active ? "true" : "false";
        btn.classList.toggle("text-blue-600", active);
        btn.classList.toggle("border-blue-600", active);
        btn.classList.toggle("text-slate-500", !active);
        btn.classList.toggle("border-transparent", !active);
        btn.classList.toggle("hover:text-slate-800", !active);
      });

      panels.forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.panel !== key);
      });
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => activate(btn.dataset.tab));
    });

    // Aktifkan tab pertama saat load.
    if (buttons.length) activate(buttons[0].dataset.tab);
  },

  // ─────────────────────────────────────────────────────────
  //  HERO
  // ─────────────────────────────────────────────────────────
  async initHero() {
    const form = document.getElementById("hero-form");
    if (!form) return;

    const preview = document.getElementById("hero-banner-preview");
    const empty = document.getElementById("hero-banner-empty");
    const fileInput = document.getElementById("hero-banner-input");
    const saveBtn = document.getElementById("hero-save-btn");

    const showPreview = (url) => {
      if (url) {
        preview.src = url;
        preview.classList.remove("hidden");
        empty.classList.add("hidden");
      } else {
        preview.src = "";
        preview.classList.add("hidden");
        empty.classList.remove("hidden");
      }
    };

    // 1. Load data hero saat ini.
    try {
      const res = await HTTP.get("/admin/landing/hero");
      const hero = res.data || {};

      form.badge.value = hero.badge || "";
      form.title.value = hero.title || "";
      form.subtitle.value = hero.subtitle || "";
      form.primary_text.value = hero.primary_text || "";
      form.primary_link.value = hero.primary_link || "";
      form.secondary_text.value = hero.secondary_text || "";
      form.secondary_link.value = hero.secondary_link || "";

      showPreview(hero.banner_url || "");
    } catch (error) {
      AppToast.error(error.message || "Gagal memuat data hero.");
    }

    // 2. Preview saat pilih file baru.
    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      if (file.size > 3 * 1024 * 1024) {
        AppToast.error("Ukuran gambar maksimal 3MB.");
        fileInput.value = "";
        return;
      }

      showPreview(URL.createObjectURL(file));
    });

    // 3. Simpan.
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      saveBtn.disabled = true;

      try {
        const formData = new FormData(form);
        // Buang field file kosong agar tidak menimpa banner lama dengan blob kosong.
        if (!fileInput.files?.length) formData.delete("banner");

        await HTTP.form("/admin/landing/hero", formData, "PATCH");
        AppToast.success("Hero section berhasil diperbarui.");
      } catch (error) {
        AppToast.error(error.message || "Gagal menyimpan hero.");
      } finally {
        saveBtn.disabled = false;
      }
    });
  },

  // ─────────────────────────────────────────────────────────
  //  TRUST / STATISTIK
  // ─────────────────────────────────────────────────────────
  async initTrust() {
    const rowsEl = document.getElementById("trust-rows");
    if (!rowsEl) return;

    const addBtn = document.getElementById("trust-add-btn");
    const saveBtn = document.getElementById("trust-save-btn");

    const createRow = (item = {}) => {
      const row = document.createElement("div");
      row.className =
        "trust-row grid grid-cols-[auto_1fr] sm:grid-cols-[7rem_7rem_1fr_auto] gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl p-3";
      row.innerHTML = `
        <input data-field="icon" type="text" value="${(item.icon || "").replace(/"/g, "&quot;")}"
          class="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="fa-medal" />
        <input data-field="value" type="text" value="${(item.value || "").replace(/"/g, "&quot;")}"
          class="px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="40+" />
        <input data-field="label" type="text" value="${(item.label || "").replace(/"/g, "&quot;")}"
          class="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Tahun Pengalaman" />
        <button type="button" class="trust-remove w-9 h-9 shrink-0 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Hapus">
          <i class="fas fa-trash-can text-sm"></i>
        </button>
      `;
      row.querySelector(".trust-remove").addEventListener("click", () => row.remove());
      return row;
    };

    // 1. Load data.
    try {
      const res = await HTTP.get("/admin/landing/trust");
      const items = res.data?.items || [];
      if (items.length === 0) {
        rowsEl.appendChild(createRow());
      } else {
        items.forEach((it) => rowsEl.appendChild(createRow(it)));
      }
    } catch (error) {
      AppToast.error(error.message || "Gagal memuat statistik trust.");
      rowsEl.appendChild(createRow());
    }

    // 2. Tambah baris.
    addBtn?.addEventListener("click", () => {
      rowsEl.appendChild(createRow());
    });

    // 3. Simpan.
    saveBtn?.addEventListener("click", async () => {
      const items = [...rowsEl.querySelectorAll(".trust-row")].map((row) => ({
        icon: row.querySelector('[data-field="icon"]').value.trim() || "fa-star",
        value: row.querySelector('[data-field="value"]').value.trim(),
        label: row.querySelector('[data-field="label"]').value.trim(),
      }));

      saveBtn.disabled = true;
      try {
        await HTTP.patch("/admin/landing/trust", { items });
        AppToast.success("Statistik trust berhasil diperbarui.");
      } catch (error) {
        AppToast.error(error.message || "Gagal menyimpan statistik.");
      } finally {
        saveBtn.disabled = false;
      }
    });
  },

  // ─────────────────────────────────────────────────────────
  //  FEATURES — "Kenapa Belajar di LPIA?"
  // ─────────────────────────────────────────────────────────
  async initFeatures() {
    const rowsEl = document.getElementById("features-rows");
    if (!rowsEl) return;

    const addBtn = document.getElementById("features-add-btn");
    const saveBtn = document.getElementById("features-save-btn");

    const createRow = (item = {}) => {
      const row = document.createElement("div");
      row.className =
        "feature-row grid grid-cols-1 sm:grid-cols-[8rem_1fr_auto] gap-2 items-start bg-slate-50 border border-slate-200 rounded-xl p-3";
      row.innerHTML = `
        <input data-field="icon" type="text" value="${(item.icon || "").replace(/"/g, "&quot;")}"
          class="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="fa-certificate" />
        <div class="space-y-2">
          <input data-field="title" type="text" value="${(item.title || "").replace(/"/g, "&quot;")}"
            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Judul keunggulan" />
          <textarea data-field="description" rows="2"
            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Deskripsi singkat...">${(item.description || "").replace(/</g, "&lt;")}</textarea>
        </div>
        <button type="button" class="feature-remove w-9 h-9 shrink-0 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Hapus">
          <i class="fas fa-trash-can text-sm"></i>
        </button>
      `;
      row.querySelector(".feature-remove").addEventListener("click", () => row.remove());
      return row;
    };

    try {
      const res = await HTTP.get("/admin/landing/features");
      const items = res.data?.items || [];
      if (items.length === 0) rowsEl.appendChild(createRow());
      else items.forEach((it) => rowsEl.appendChild(createRow(it)));
    } catch (error) {
      AppToast.error(error.message || "Gagal memuat data.");
      rowsEl.appendChild(createRow());
    }

    addBtn?.addEventListener("click", () => rowsEl.appendChild(createRow()));

    saveBtn?.addEventListener("click", async () => {
      const items = [...rowsEl.querySelectorAll(".feature-row")].map((row) => ({
        icon: row.querySelector('[data-field="icon"]').value.trim() || "fa-star",
        title: row.querySelector('[data-field="title"]').value.trim(),
        description: row.querySelector('[data-field="description"]').value.trim(),
      }));

      saveBtn.disabled = true;
      try {
        await HTTP.patch("/admin/landing/features", { items });
        AppToast.success("Section 'Kenapa LPIA' berhasil diperbarui.");
      } catch (error) {
        AppToast.error(error.message || "Gagal menyimpan.");
      } finally {
        saveBtn.disabled = false;
      }
    });
  },

  // ─────────────────────────────────────────────────────────
  //  PROMO (CRUD)
  // ─────────────────────────────────────────────────────────
  async initPromo() {
    const listEl = document.getElementById("promo-list");
    if (!listEl) return;

    const createBtn = document.getElementById("promo-create-btn");
    let promos = [];

    const esc = (s) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

    const formatPeriod = (p) => {
      const fmt = (d) =>
        d ? new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : null;
      const start = fmt(p.start_date);
      const end = fmt(p.end_date);
      if (start && end) return `${start} – ${end}`;
      if (end) return `s.d. ${end}`;
      if (start) return `mulai ${start}`;
      return "Tanpa batas waktu";
    };

    const renderList = () => {
      if (!promos.length) {
        listEl.innerHTML = `
          <div class="md:col-span-2 bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-slate-400">
            <i class="fas fa-tags text-4xl mb-3"></i>
            <p class="font-semibold">Belum ada promo. Klik "Tambah Promo" untuk membuat.</p>
          </div>`;
        return;
      }

      listEl.innerHTML = promos
        .map(
          (p) => `
          <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div class="h-36 bg-slate-100 relative">
              ${
                p.image_url
                  ? `<img src="${esc(p.image_url)}" alt="${esc(p.title)}" class="w-full h-full object-cover" />`
                  : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="fas fa-image text-3xl"></i></div>`
              }
              <span class="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${
                p.is_active
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-slate-200 text-slate-500 border border-slate-300"
              }">${p.is_active ? "Aktif" : "Nonaktif"}</span>
            </div>
            <div class="p-5 flex flex-col flex-grow">
              <h4 class="font-black text-slate-900 line-clamp-1">${esc(p.title)}</h4>
              <p class="text-sm text-slate-500 mt-1 line-clamp-2 flex-grow">${esc(p.description)}</p>
              <p class="text-xs font-bold text-red-600 mt-3"><i class="fas fa-calendar-days mr-1"></i> ${formatPeriod(p)}</p>
              <div class="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <button data-action="edit" data-id="${p.id}" class="flex-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100 transition"><i class="fas fa-pen mr-1"></i> Edit</button>
                <button data-action="toggle" data-id="${p.id}" class="flex-1 px-3 py-2 rounded-lg ${
                  p.is_active
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : "bg-green-50 text-green-700 hover:bg-green-100"
                } text-sm font-bold transition">${p.is_active ? '<i class="fas fa-eye-slash mr-1"></i> Nonaktifkan' : '<i class="fas fa-eye mr-1"></i> Aktifkan'}</button>
                <button data-action="delete" data-id="${p.id}" class="w-10 px-0 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Hapus"><i class="fas fa-trash-can text-sm"></i></button>
              </div>
            </div>
          </div>`,
        )
        .join("");
    };

    const loadPromos = async () => {
      try {
        const res = await HTTP.get("/admin/landing/promos");
        promos = res.data || [];
      } catch (error) {
        AppToast.error(error.message || "Gagal memuat promo.");
        promos = [];
      }
      renderList();
    };

    const openForm = (promo = null) => {
      const isEdit = !!promo;
      ReusableModal.open({
        title: isEdit ? "Edit Promo" : "Tambah Promo",
        subtitle: "Promo tampil di landing page selama aktif & dalam periode.",
        content: `
          <form id="promo-form" class="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 max-w-2xl mx-auto">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">Judul Promo <span class="text-red-500">*</span></label>
              <input name="title" type="text" required value="${esc(promo?.title)}"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Promo Spesial Siswa Baru" />
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">Deskripsi</label>
              <textarea name="description" rows="3"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Detail singkat promo...">${esc(promo?.description)}</textarea>
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">Banner Promo</label>
              <input name="image" id="promo-image-input" type="file" accept="image/png,image/jpeg,image/webp"
                class="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
              <div class="mt-3 ${promo?.image_url ? "" : "hidden"}" id="promo-image-preview-wrap">
                <img id="promo-image-preview" src="${esc(promo?.image_url)}" class="h-32 rounded-xl object-cover border border-slate-200" />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Teks Tombol CTA</label>
                <input name="cta_text" type="text" value="${esc(promo?.cta_text ?? "Lihat Promo")}"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Link Tombol CTA</label>
                <input name="cta_link" type="text" value="${esc(promo?.cta_link ?? "#kursus")}"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Mulai</label>
                <input name="start_date" type="date" value="${esc(promo?.start_date)}"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Berakhir</label>
                <input name="end_date" type="date" value="${esc(promo?.end_date)}"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Urutan</label>
                <input name="sort_order" type="number" value="${esc(promo?.sort_order ?? 0)}"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div class="flex items-end pb-1">
                <label class="inline-flex items-center gap-3 cursor-pointer select-none">
                  <input name="is_active" type="checkbox" class="w-5 h-5 rounded accent-blue-600" ${promo?.is_active === false ? "" : "checked"} />
                  <span class="text-sm font-bold text-slate-700">Promo aktif</span>
                </label>
              </div>
            </div>
            <div class="pt-2">
              <button type="submit" id="promo-submit-btn"
                class="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed">
                <i class="fas fa-floppy-disk mr-2"></i> ${isEdit ? "Simpan Perubahan" : "Buat Promo"}
              </button>
            </div>
          </form>`,
      });

      const form = document.getElementById("promo-form");
      const fileInput = document.getElementById("promo-image-input");
      const previewWrap = document.getElementById("promo-image-preview-wrap");
      const preview = document.getElementById("promo-image-preview");
      const submitBtn = document.getElementById("promo-submit-btn");

      fileInput?.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
          AppToast.error("Ukuran gambar maksimal 3MB.");
          fileInput.value = "";
          return;
        }
        preview.src = URL.createObjectURL(file);
        previewWrap.classList.remove("hidden");
      });

      form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;

        try {
          const formData = new FormData(form);
          // Checkbox tidak terkirim saat unchecked — normalisasi manual.
          formData.set("is_active", form.is_active.checked ? "true" : "false");
          if (!fileInput.files?.length) formData.delete("image");

          if (isEdit) {
            await HTTP.form(`/admin/landing/promos/${promo.id}`, formData, "PATCH");
            AppToast.success("Promo berhasil diperbarui.");
          } else {
            await HTTP.form("/admin/landing/promos", formData);
            AppToast.success("Promo berhasil dibuat.");
          }

          ReusableModal.close();
          await loadPromos();
        } catch (error) {
          AppToast.error(error.message || "Gagal menyimpan promo.");
        } finally {
          submitBtn.disabled = false;
        }
      });
    };

    // Aksi pada list (event delegation).
    listEl.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const id = btn.dataset.id;
      const promo = promos.find((p) => p.id === id);
      if (!promo) return;

      if (btn.dataset.action === "edit") {
        openForm(promo);
      }

      if (btn.dataset.action === "toggle") {
        try {
          await HTTP.patch(`/admin/landing/promos/${id}`, {
            is_active: !promo.is_active,
          });
          AppToast.success(promo.is_active ? "Promo dinonaktifkan." : "Promo diaktifkan.");
          await loadPromos();
        } catch (error) {
          AppToast.error(error.message || "Gagal mengubah status promo.");
        }
      }

      if (btn.dataset.action === "delete") {
        const result = await Swal.fire({
          title: "Hapus promo ini?",
          text: promo.title,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#dc2626",
          confirmButtonText: "Ya, Hapus",
          cancelButtonText: "Batal",
          reverseButtons: true,
        });

        if (result.isConfirmed) {
          try {
            await HTTP.delete(`/admin/landing/promos/${id}`);
            AppToast.success("Promo berhasil dihapus.");
            await loadPromos();
          } catch (error) {
            AppToast.error(error.message || "Gagal menghapus promo.");
          }
        }
      }
    });

    createBtn?.addEventListener("click", () => openForm());

    await loadPromos();
  },

  // ─────────────────────────────────────────────────────────
  //  ALUMNI TESTIMONIALS (CRUD)
  // ─────────────────────────────────────────────────────────
  async initAlumni() {
    const listEl = document.getElementById("alumni-list");
    if (!listEl) return;

    const createBtn = document.getElementById("alumni-create-btn");
    let alumni = [];

    const esc = (s) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

    const stars = (rating) =>
      [1, 2, 3, 4, 5]
        .map(
          (i) =>
            `<i class="fas fa-star ${i <= rating ? "text-yellow-400" : "text-slate-200"}"></i>`,
        )
        .join("");

    const avatar = (a, sizeClass = "w-14 h-14") =>
      a.photo_url
        ? `<img src="${esc(a.photo_url)}" alt="${esc(a.name)}" class="${sizeClass} rounded-full object-cover border-2 border-white shadow" />`
        : `<div class="${sizeClass} rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-lg border-2 border-white shadow">${esc((a.name || "?").charAt(0).toUpperCase())}</div>`;

    const renderList = () => {
      if (!alumni.length) {
        listEl.innerHTML = `
          <div class="md:col-span-2 xl:col-span-3 bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-slate-400">
            <i class="fas fa-user-graduate text-4xl mb-3"></i>
            <p class="font-semibold">Belum ada alumni. Klik "Tambah Alumni" untuk membuat.</p>
          </div>`;
        return;
      }

      listEl.innerHTML = alumni
        .map(
          (a) => `
          <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
            <div class="flex items-center gap-3 mb-3">
              ${avatar(a)}
              <div class="min-w-0">
                <h4 class="font-black text-slate-900 truncate">${esc(a.name)}</h4>
                <p class="text-xs font-semibold text-blue-600 truncate">${esc(a.course_name)}${a.year ? ` · ${a.year}` : ""}</p>
                <div class="text-xs mt-0.5">${stars(a.rating)}</div>
              </div>
              <span class="ml-auto shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                a.is_visible
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-slate-200 text-slate-500 border border-slate-300"
              }">${a.is_visible ? "Tampil" : "Disembunyikan"}</span>
            </div>
            <p class="text-sm text-slate-500 italic line-clamp-3 flex-grow">"${esc(a.testimonial)}"</p>
            <div class="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <button data-action="edit" data-id="${a.id}" class="flex-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100 transition"><i class="fas fa-pen mr-1"></i> Edit</button>
              <button data-action="toggle" data-id="${a.id}" class="flex-1 px-3 py-2 rounded-lg ${
                a.is_visible
                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              } text-sm font-bold transition">${a.is_visible ? '<i class="fas fa-eye-slash mr-1"></i> Sembunyikan' : '<i class="fas fa-eye mr-1"></i> Tampilkan'}</button>
              <button data-action="delete" data-id="${a.id}" class="w-10 px-0 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Hapus"><i class="fas fa-trash-can text-sm"></i></button>
            </div>
          </div>`,
        )
        .join("");
    };

    const loadAlumni = async () => {
      try {
        const res = await HTTP.get("/admin/landing/alumni");
        alumni = res.data || [];
      } catch (error) {
        AppToast.error(error.message || "Gagal memuat alumni.");
        alumni = [];
      }
      renderList();
    };

    const openForm = (item = null) => {
      const isEdit = !!item;
      ReusableModal.open({
        title: isEdit ? "Edit Alumni" : "Tambah Alumni",
        subtitle: "Testimonial tampil di landing page selama berstatus 'Tampil'.",
        content: `
          <form id="alumni-form" class="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 max-w-2xl mx-auto">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Nama Alumni <span class="text-red-500">*</span></label>
                <input name="name" type="text" required value="${esc(item?.name)}"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Nadia Putri" />
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Kursus yang Diambil</label>
                <input name="course_name" type="text" value="${esc(item?.course_name)}"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Kursus Bahasa Inggris" />
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Rating</label>
                <select name="rating"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  ${[5, 4, 3, 2, 1]
                    .map(
                      (r) =>
                        `<option value="${r}" ${(item?.rating ?? 5) === r ? "selected" : ""}>${"★".repeat(r)}${"☆".repeat(5 - r)} (${r})</option>`,
                    )
                    .join("")}
                </select>
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Tahun Mengikuti Kursus</label>
                <input name="year" type="number" min="1984" max="2100" value="${esc(item?.year)}"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="2025" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">Testimoni</label>
              <textarea name="testimonial" rows="4"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Belajar di LPIA sangat membantu...">${esc(item?.testimonial)}</textarea>
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">Foto Alumni</label>
              <input name="photo" id="alumni-photo-input" type="file" accept="image/png,image/jpeg,image/webp"
                class="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
              <div class="mt-3 ${item?.photo_url ? "" : "hidden"}" id="alumni-photo-preview-wrap">
                <img id="alumni-photo-preview" src="${esc(item?.photo_url)}" class="w-20 h-20 rounded-full object-cover border border-slate-200" />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Urutan</label>
                <input name="sort_order" type="number" value="${esc(item?.sort_order ?? 0)}"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div class="flex items-end pb-1">
                <label class="inline-flex items-center gap-3 cursor-pointer select-none">
                  <input name="is_visible" type="checkbox" class="w-5 h-5 rounded accent-blue-600" ${item?.is_visible === false ? "" : "checked"} />
                  <span class="text-sm font-bold text-slate-700">Tampilkan di landing</span>
                </label>
              </div>
            </div>
            <div class="pt-2">
              <button type="submit" id="alumni-submit-btn"
                class="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed">
                <i class="fas fa-floppy-disk mr-2"></i> ${isEdit ? "Simpan Perubahan" : "Tambah Alumni"}
              </button>
            </div>
          </form>`,
      });

      const form = document.getElementById("alumni-form");
      const fileInput = document.getElementById("alumni-photo-input");
      const previewWrap = document.getElementById("alumni-photo-preview-wrap");
      const preview = document.getElementById("alumni-photo-preview");
      const submitBtn = document.getElementById("alumni-submit-btn");

      fileInput?.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
          AppToast.error("Ukuran foto maksimal 3MB.");
          fileInput.value = "";
          return;
        }
        preview.src = URL.createObjectURL(file);
        previewWrap.classList.remove("hidden");
      });

      form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;

        try {
          const formData = new FormData(form);
          formData.set("is_visible", form.is_visible.checked ? "true" : "false");
          if (!fileInput.files?.length) formData.delete("photo");

          if (isEdit) {
            await HTTP.form(`/admin/landing/alumni/${item.id}`, formData, "PATCH");
            AppToast.success("Data alumni berhasil diperbarui.");
          } else {
            await HTTP.form("/admin/landing/alumni", formData);
            AppToast.success("Alumni berhasil ditambahkan.");
          }

          ReusableModal.close();
          await loadAlumni();
        } catch (error) {
          AppToast.error(error.message || "Gagal menyimpan alumni.");
        } finally {
          submitBtn.disabled = false;
        }
      });
    };

    listEl.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const id = btn.dataset.id;
      const item = alumni.find((a) => a.id === id);
      if (!item) return;

      if (btn.dataset.action === "edit") openForm(item);

      if (btn.dataset.action === "toggle") {
        try {
          await HTTP.patch(`/admin/landing/alumni/${id}`, {
            is_visible: !item.is_visible,
          });
          AppToast.success(item.is_visible ? "Alumni disembunyikan." : "Alumni ditampilkan.");
          await loadAlumni();
        } catch (error) {
          AppToast.error(error.message || "Gagal mengubah status alumni.");
        }
      }

      if (btn.dataset.action === "delete") {
        const result = await Swal.fire({
          title: "Hapus alumni ini?",
          text: item.name,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#dc2626",
          confirmButtonText: "Ya, Hapus",
          cancelButtonText: "Batal",
          reverseButtons: true,
        });

        if (result.isConfirmed) {
          try {
            await HTTP.delete(`/admin/landing/alumni/${id}`);
            AppToast.success("Alumni berhasil dihapus.");
            await loadAlumni();
          } catch (error) {
            AppToast.error(error.message || "Gagal menghapus alumni.");
          }
        }
      }
    });

    createBtn?.addEventListener("click", () => openForm());

    await loadAlumni();
  },

  // ─────────────────────────────────────────────────────────
  //  BRANCH — Info Cabang
  // ─────────────────────────────────────────────────────────
  async initBranch() {
    const form = document.getElementById("branch-form");
    if (!form) return;

    const preview = document.getElementById("branch-photo-preview");
    const empty = document.getElementById("branch-photo-empty");
    const fileInput = document.getElementById("branch-photo-input");
    const saveBtn = document.getElementById("branch-save-btn");

    const showPreview = (url) => {
      if (url) {
        preview.src = url;
        preview.classList.remove("hidden");
        empty.classList.add("hidden");
      } else {
        preview.src = "";
        preview.classList.add("hidden");
        empty.classList.remove("hidden");
      }
    };

    try {
      const res = await HTTP.get("/admin/landing/branch");
      const b = res.data || {};

      form.name.value = b.name || "";
      form.hours.value = b.hours || "";
      form.address.value = b.address || "";
      form.phone.value = b.phone || "";
      form.whatsapp.value = b.whatsapp || "";
      form.maps_link.value = b.maps_link || "";
      form.tagline.value = b.tagline || "";
      form.description.value = b.description || "";
      showPreview(b.photo_url || "");
    } catch (error) {
      AppToast.error(error.message || "Gagal memuat info cabang.");
    }

    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) {
        AppToast.error("Ukuran gambar maksimal 3MB.");
        fileInput.value = "";
        return;
      }
      showPreview(URL.createObjectURL(file));
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      saveBtn.disabled = true;

      try {
        const formData = new FormData(form);
        if (!fileInput.files?.length) formData.delete("photo");

        await HTTP.form("/admin/landing/branch", formData, "PATCH");
        AppToast.success("Info cabang berhasil diperbarui.");
      } catch (error) {
        AppToast.error(error.message || "Gagal menyimpan info cabang.");
      } finally {
        saveBtn.disabled = false;
      }
    });
  },

  // ─────────────────────────────────────────────────────────
  //  FAQ (CRUD)
  // ─────────────────────────────────────────────────────────
  async initFaq() {
    const listEl = document.getElementById("faq-list");
    if (!listEl) return;

    const createBtn = document.getElementById("faq-create-btn");
    let faqs = [];

    const esc = (s) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

    const renderList = () => {
      if (!faqs.length) {
        listEl.innerHTML = `
          <div class="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-slate-400">
            <i class="fas fa-circle-question text-4xl mb-3"></i>
            <p class="font-semibold">Belum ada FAQ. Klik "Tambah FAQ" untuk membuat.</p>
          </div>`;
        return;
      }

      listEl.innerHTML = faqs
        .map(
          (f) => `
          <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h4 class="font-black text-slate-900">${esc(f.question)}</h4>
                <p class="text-sm text-slate-500 mt-1.5 line-clamp-2">${esc(f.answer)}</p>
              </div>
              <span class="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                f.is_visible
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-slate-200 text-slate-500 border border-slate-300"
              }">${f.is_visible ? "Tampil" : "Disembunyikan"}</span>
            </div>
            <div class="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <button data-action="edit" data-id="${f.id}" class="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100 transition"><i class="fas fa-pen mr-1"></i> Edit</button>
              <button data-action="toggle" data-id="${f.id}" class="px-4 py-2 rounded-lg ${
                f.is_visible
                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              } text-sm font-bold transition">${f.is_visible ? '<i class="fas fa-eye-slash mr-1"></i> Sembunyikan' : '<i class="fas fa-eye mr-1"></i> Tampilkan'}</button>
              <button data-action="delete" data-id="${f.id}" class="ml-auto w-10 px-0 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Hapus"><i class="fas fa-trash-can text-sm"></i></button>
            </div>
          </div>`,
        )
        .join("");
    };

    const loadFaqs = async () => {
      try {
        const res = await HTTP.get("/admin/landing/faqs");
        faqs = res.data || [];
      } catch (error) {
        AppToast.error(error.message || "Gagal memuat FAQ.");
        faqs = [];
      }
      renderList();
    };

    const openForm = (item = null) => {
      const isEdit = !!item;
      ReusableModal.open({
        title: isEdit ? "Edit FAQ" : "Tambah FAQ",
        subtitle: "FAQ tampil di landing page selama berstatus 'Tampil'.",
        content: `
          <form id="faq-form" class="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 max-w-2xl mx-auto">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">Pertanyaan <span class="text-red-500">*</span></label>
              <input name="question" type="text" required value="${esc(item?.question)}"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Apa itu Platform LPIA LMS?" />
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">Jawaban</label>
              <textarea name="answer" rows="5"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Tulis jawaban lengkap...">${esc(item?.answer)}</textarea>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Urutan</label>
                <input name="sort_order" type="number" value="${esc(item?.sort_order ?? 0)}"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div class="flex items-end pb-1">
                <label class="inline-flex items-center gap-3 cursor-pointer select-none">
                  <input name="is_visible" type="checkbox" class="w-5 h-5 rounded accent-blue-600" ${item?.is_visible === false ? "" : "checked"} />
                  <span class="text-sm font-bold text-slate-700">Tampilkan di landing</span>
                </label>
              </div>
            </div>
            <div class="pt-2">
              <button type="submit" id="faq-submit-btn"
                class="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed">
                <i class="fas fa-floppy-disk mr-2"></i> ${isEdit ? "Simpan Perubahan" : "Tambah FAQ"}
              </button>
            </div>
          </form>`,
      });

      const form = document.getElementById("faq-form");
      const submitBtn = document.getElementById("faq-submit-btn");

      form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;

        try {
          const payload = {
            question: form.question.value.trim(),
            answer: form.answer.value.trim(),
            sort_order: parseInt(form.sort_order.value) || 0,
            is_visible: form.is_visible.checked,
          };

          if (isEdit) {
            await HTTP.patch(`/admin/landing/faqs/${item.id}`, payload);
            AppToast.success("FAQ berhasil diperbarui.");
          } else {
            await HTTP.post("/admin/landing/faqs", payload);
            AppToast.success("FAQ berhasil ditambahkan.");
          }

          ReusableModal.close();
          await loadFaqs();
        } catch (error) {
          AppToast.error(error.message || "Gagal menyimpan FAQ.");
        } finally {
          submitBtn.disabled = false;
        }
      });
    };

    listEl.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const id = btn.dataset.id;
      const item = faqs.find((f) => f.id === id);
      if (!item) return;

      if (btn.dataset.action === "edit") openForm(item);

      if (btn.dataset.action === "toggle") {
        try {
          await HTTP.patch(`/admin/landing/faqs/${id}`, {
            is_visible: !item.is_visible,
          });
          AppToast.success(item.is_visible ? "FAQ disembunyikan." : "FAQ ditampilkan.");
          await loadFaqs();
        } catch (error) {
          AppToast.error(error.message || "Gagal mengubah status FAQ.");
        }
      }

      if (btn.dataset.action === "delete") {
        const result = await Swal.fire({
          title: "Hapus FAQ ini?",
          text: item.question,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#dc2626",
          confirmButtonText: "Ya, Hapus",
          cancelButtonText: "Batal",
          reverseButtons: true,
        });

        if (result.isConfirmed) {
          try {
            await HTTP.delete(`/admin/landing/faqs/${id}`);
            AppToast.success("FAQ berhasil dihapus.");
            await loadFaqs();
          } catch (error) {
            AppToast.error(error.message || "Gagal menghapus FAQ.");
          }
        }
      }
    });

    createBtn?.addEventListener("click", () => openForm());

    await loadFaqs();
  },

  // ─────────────────────────────────────────────────────────
  //  CTA SECTION
  // ─────────────────────────────────────────────────────────
  async initCta() {
    const form = document.getElementById("cta-form");
    if (!form) return;

    const saveBtn = document.getElementById("cta-save-btn");

    try {
      const res = await HTTP.get("/admin/landing/cta");
      const c = res.data || {};

      form.title.value = c.title || "";
      form.subtitle.value = c.subtitle || "";
      form.primary_text.value = c.primary_text || "";
      form.primary_link.value = c.primary_link || "";
      form.secondary_text.value = c.secondary_text || "";
      form.secondary_link.value = c.secondary_link || "";
    } catch (error) {
      AppToast.error(error.message || "Gagal memuat data CTA.");
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      saveBtn.disabled = true;

      try {
        await HTTP.patch("/admin/landing/cta", {
          title: form.title.value.trim(),
          subtitle: form.subtitle.value.trim(),
          primary_text: form.primary_text.value.trim(),
          primary_link: form.primary_link.value.trim(),
          secondary_text: form.secondary_text.value.trim(),
          secondary_link: form.secondary_link.value.trim(),
        });
        AppToast.success("CTA section berhasil diperbarui.");
      } catch (error) {
        AppToast.error(error.message || "Gagal menyimpan CTA.");
      } finally {
        saveBtn.disabled = false;
      }
    });
  },
};
