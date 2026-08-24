// src/scripts/dom/admin/adminCertificatesPage.js
import { HTTP } from "../../fetch/http.js";
import { AppToast } from "../../components/toast.js";
import { ReusableModal } from "../../components/reusableModal.js";

export const AdminCertificatesPage = {
  initialized: false,
  certificates: [],
  templates: [],
  courses: [],

  init() {
    if (!document.getElementById("certificates-table-body")) return;
    if (this.initialized) return;
    this.initialized = true;

    document
      .getElementById("certificate-status-filter")
      ?.addEventListener("change", () => this.renderCertificates());
    document
      .getElementById("certificate-search")
      ?.addEventListener("input", () => this.renderCertificates());
    document
      .getElementById("template-upload-form")
      ?.addEventListener("submit", (e) => {
        e.preventDefault();
        this.uploadTemplate();
      });
    document
      .getElementById("certificates-table-body")
      ?.addEventListener("click", (e) => {
        const uploadBtn = e.target.closest("[data-upload-cert]");
        if (uploadBtn) this.openUploadModal(uploadBtn.dataset.uploadCert);
      });

    this.loadAll();
  },

  async loadAll() {
    try {
      const [certRes, templateRes, coursesRes] = await Promise.all([
        HTTP.get("/admin/certificates"),
        HTTP.get("/admin/certificate-templates"),
        HTTP.get("/admin/courses"),
      ]);

      this.certificates = certRes.data || [];
      this.templates = templateRes.data || [];
      this.courses = coursesRes.data || [];

      this.renderStats();
      this.renderCertificates();
      this.renderTemplates();
      this.renderCourseOptions();
    } catch (error) {
      AppToast.error(error.message || "Gagal memuat data sertifikat.");
    }
  },

  formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  },

  renderStats() {
    const pending = this.certificates.filter((c) => c.status === "pending").length;
    const issued = this.certificates.filter((c) => c.status === "issued").length;

    document.getElementById("cert-total-pending").textContent = pending;
    document.getElementById("cert-total-issued").textContent = issued;
    document.getElementById("cert-total-all").textContent = this.certificates.length;
  },

  renderCertificates() {
    const tbody = document.getElementById("certificates-table-body");
    const statusFilter = document.getElementById("certificate-status-filter")?.value || "";
    const search = (document.getElementById("certificate-search")?.value || "").toLowerCase();

    let rows = this.certificates;
    if (statusFilter) rows = rows.filter((c) => c.status === statusFilter);
    if (search) {
      rows = rows.filter((c) => {
        const student = (c.profiles?.full_name || "").toLowerCase();
        const course = (c.courses?.title || "").toLowerCase();
        return student.includes(search) || course.includes(search);
      });
    }

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-8 text-center text-slate-400 font-semibold">
            Tidak ada sertifikat.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((cert) => {
        const isPending = cert.status === "pending";
        const badge = isPending
          ? `<span class="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-black">Menunggu</span>`
          : `<span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black">Diterbitkan</span>`;

        const action = isPending
          ? `<button data-upload-cert="${cert.id}" class="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-black hover:bg-blue-700">
               <i class="fas fa-upload mr-1"></i> Upload PDF
             </button>`
          : `<a href="${cert.certificate_url}" target="_blank" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black hover:bg-slate-200 inline-block">
               <i class="fas fa-eye mr-1"></i> Lihat
             </a>`;

        return `
          <tr class="hover:bg-slate-50">
            <td class="p-4 font-bold text-slate-800">${cert.profiles?.full_name || "-"}</td>
            <td class="p-4 text-slate-600">${cert.courses?.title || "-"}</td>
            <td class="p-4 text-slate-500 font-mono text-xs">${cert.certificate_number || "-"}</td>
            <td class="p-4">${badge}</td>
            <td class="p-4 text-slate-500">${this.formatDate(cert.issued_at)}</td>
            <td class="p-4">${action}</td>
          </tr>`;
      })
      .join("");
  },

  openUploadModal(certificateId) {
    const cert = this.certificates.find((c) => c.id === certificateId);
    if (!cert) return;

    ReusableModal.open({
      title: "Terbitkan Sertifikat",
      subtitle: `${cert.profiles?.full_name || "-"} • ${cert.courses?.title || "-"}`,
      content: `
        <form id="certificate-upload-form" class="space-y-5">
          <div class="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs font-bold text-amber-700">
            <i class="fas fa-circle-info mr-1"></i>
            Setelah diterbitkan, siswa langsung bisa mengunduh sertifikat dari halaman profil.
          </div>

          <div>
            <label class="block text-sm font-black text-slate-700 mb-2">File Sertifikat (PDF)</label>
            <input name="certificate" type="file" accept="application/pdf" required
              class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm">
          </div>

          <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700">
            <span class="btn-label"><i class="fas fa-award mr-1"></i> Terbitkan Sertifikat</span>
            <span class="btn-loading hidden"><i class="fas fa-spinner fa-spin"></i> Mengunggah...</span>
          </button>
        </form>
      `,
    });

    document
      .getElementById("certificate-upload-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const fileInput = form.querySelector('input[name="certificate"]');
        if (!fileInput?.files?.length) {
          return AppToast.warning("Pilih file PDF terlebih dahulu.");
        }

        const btnLabel = form.querySelector(".btn-label");
        const btnLoading = form.querySelector(".btn-loading");
        btnLabel?.classList.add("hidden");
        btnLoading?.classList.remove("hidden");

        try {
          const fd = new FormData();
          fd.append("certificate", fileInput.files[0]);
          await HTTP.form(`/admin/certificates/${certificateId}/file`, fd);

          ReusableModal.close();
          AppToast.success("Sertifikat berhasil diterbitkan.");
          await this.loadAll();
        } catch (error) {
          AppToast.error(error.message || "Gagal menerbitkan sertifikat.");
          btnLabel?.classList.remove("hidden");
          btnLoading?.classList.add("hidden");
        }
      });
  },

  renderCourseOptions() {
    const select = document.getElementById("template-course-select");
    if (!select) return;

    select.innerHTML =
      `<option value="">Pilih kursus...</option>` +
      this.courses
        .map((course) => `<option value="${course.id}">${course.title}</option>`)
        .join("");
  },

  renderTemplates() {
    const container = document.getElementById("certificate-templates-list");
    if (!container) return;

    if (!this.templates.length) {
      container.innerHTML = `
        <div class="col-span-full text-center text-slate-400 font-semibold text-sm py-6">
          Belum ada template sertifikat.
        </div>`;
      return;
    }

    container.innerHTML = this.templates
      .map(
        (template) => `
        <div class="flex items-center justify-between gap-3 border border-slate-200 rounded-xl px-4 py-3">
          <div class="min-w-0">
            <p class="font-bold text-sm text-slate-800 truncate">${template.courses?.title || "-"}</p>
            <p class="text-xs text-slate-400 truncate">${template.file_name || "template.pdf"}</p>
          </div>
          <a href="${template.template_file}" target="_blank" class="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-black hover:bg-slate-200 shrink-0">
            <i class="fas fa-eye mr-1"></i> Lihat
          </a>
        </div>`,
      )
      .join("");
  },

  async uploadTemplate() {
    const courseId = document.getElementById("template-course-select")?.value;
    const fileInput = document.getElementById("template-file-input");

    if (!courseId) return AppToast.warning("Pilih kursus terlebih dahulu.");
    if (!fileInput?.files?.length) {
      return AppToast.warning("Pilih file PDF template terlebih dahulu.");
    }

    try {
      const fd = new FormData();
      fd.append("course_id", courseId);
      fd.append("template", fileInput.files[0]);
      await HTTP.form("/admin/certificate-templates", fd);

      AppToast.success("Template sertifikat berhasil disimpan.");
      fileInput.value = "";
      await this.loadAll();
    } catch (error) {
      AppToast.error(error.message || "Gagal menyimpan template.");
    }
  },
};
