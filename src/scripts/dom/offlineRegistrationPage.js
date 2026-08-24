import { HTTP } from "../fetch/http.js";
import Swal from "sweetalert2";

const HOURS = [
  "08.00 - 09.30",
  "09.30 - 11.00",
  "13.30 - 15.00",
  "15.00 - 16.30",
  "16.30 - 18.00",
  "18.30 - 20.00",
];

const SOURCES = [
  "Presentasi",
  "Brosur",
  "Spanduk",
  "Majalah",
  "Teman",
  "Media Sosial",
  "Website",
  "Lain-lain",
];

const FIELD_CLASS =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const LABEL_CLASS = "text-sm font-bold text-slate-700";

const getValue = (form, name) => form.querySelector(`[name="${name}"]`);

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"]+/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  }[ch]));

const renderInput = (name, label, type = "text") => `
  <div>
    <label class="${LABEL_CLASS}" for="${name}">${label}</label>
    <input id="${name}" name="${name}" type="${type}" class="${FIELD_CLASS}" />
    <p class="mt-1 text-sm text-rose-600 hidden" data-error-for="${name}"></p>
  </div>
`;

const renderTextarea = (name, label) => `
  <div>
    <label class="${LABEL_CLASS}" for="${name}">${label}</label>
    <textarea id="${name}" name="${name}" rows="4" class="${FIELD_CLASS}"></textarea>
    <p class="mt-1 text-sm text-rose-600 hidden" data-error-for="${name}"></p>
  </div>
`;

const renderSelect = (name, label, options) => `
  <div>
    <label class="${LABEL_CLASS}" for="${name}">${label}</label>
    <select id="${name}" name="${name}" class="${FIELD_CLASS}">
      <option value="">Pilih ${label}</option>
      ${options.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}
    </select>
    <p class="mt-1 text-sm text-rose-600 hidden" data-error-for="${name}"></p>
  </div>
`;

const renderCheckboxes = () => `
  <div>
    <p class="${LABEL_CLASS}">Sumber Informasi</p>
    <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      ${SOURCES.map(
        (item) => `
          <label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            <input type="checkbox" name="sumber_informasi" value="${escapeHtml(item)}" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span>${escapeHtml(item)}</span>
          </label>
        `,
      ).join("")}
    </div>
    <p class="mt-1 text-sm text-rose-600 hidden" data-error-for="sumber_informasi"></p>
  </div>
`;

const renderForm = (course) => `
  <form id="offline-registration-form" class="space-y-6">
    <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
      ${renderInput("nama_lengkap", "Nama Lengkap")}
      ${renderInput("tempat_lahir", "Tempat Lahir")}
      ${renderInput("tanggal_lahir", "Tanggal Lahir", "date")}
      ${renderInput("agama", "Agama")}
      <div class="md:col-span-2">${renderTextarea("alamat_lengkap", "Alamat Lengkap")}</div>
      ${renderInput("no_telp_wa", "No Telp/WA")}
      ${renderInput("asal_sekolah_kampus", "Asal Sekolah/Kampus")}
      ${renderInput("kelas", "Kelas")}
      ${renderTextarea("prestasi_sekolah", "Prestasi Sekolah")}
      ${renderTextarea("prestasi_luar_sekolah", "Prestasi Luar Sekolah")}
      ${renderInput("nama_orang_tua", "Nama Orang Tua")}
      ${renderInput("no_telp_orang_tua", "No Telp Orang Tua")}
      ${renderInput("pekerjaan", "Pekerjaan")}
      ${renderSelect("pilihan_jam_belajar", "Pilihan Jam Belajar", HOURS)}
      <div class="md:col-span-2">${renderCheckboxes()}</div>
    </div>

    <div class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
      Kursus: <span class="font-bold text-slate-900">${escapeHtml(course?.title || "-")}</span>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row">
      <button id="submit-btn" type="submit" class="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3.5 font-bold text-white shadow-[0_4px_0_0_#1e40af] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
        Daftar Sekarang
      </button>
    </div>
  </form>
`;

const state = { courseId: null, course: null };

const setError = (name, message) => {
  const el = document.querySelector(`[data-error-for="${name}"]`);
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("hidden", !message);
};

const clearErrors = () => document.querySelectorAll("[data-error-for]").forEach((el) => { el.textContent = ""; el.classList.add("hidden"); });

const validate = (form) => {
  clearErrors();
  const required = ["nama_lengkap","tempat_lahir","tanggal_lahir","agama","alamat_lengkap","no_telp_wa","asal_sekolah_kampus","kelas","nama_orang_tua","no_telp_orang_tua","pekerjaan","pilihan_jam_belajar"];
  let ok = true;
  required.forEach((name) => { if (!getValue(form, name)?.value?.trim()) { setError(name, "Wajib diisi"); ok = false; } });
  if (!form.querySelectorAll('input[name="sumber_informasi"]:checked').length) { setError("sumber_informasi", "Pilih minimal satu sumber informasi"); ok = false; }
  return ok;
};

const buildPayload = (form) => ({
  course_id: state.courseId,
  nama_lengkap: getValue(form, "nama_lengkap").value.trim(),
  tempat_lahir: getValue(form, "tempat_lahir").value.trim(),
  tanggal_lahir: getValue(form, "tanggal_lahir").value,
  agama: getValue(form, "agama").value.trim(),
  alamat_lengkap: getValue(form, "alamat_lengkap").value.trim(),
  no_telp_wa: getValue(form, "no_telp_wa").value.trim(),
  asal_sekolah_kampus: getValue(form, "asal_sekolah_kampus").value.trim(),
  kelas: getValue(form, "kelas").value.trim(),
  prestasi_sekolah: getValue(form, "prestasi_sekolah").value.trim(),
  prestasi_luar_sekolah: getValue(form, "prestasi_luar_sekolah").value.trim(),
  nama_orang_tua: getValue(form, "nama_orang_tua").value.trim(),
  no_telp_orang_tua: getValue(form, "no_telp_orang_tua").value.trim(),
  pekerjaan: getValue(form, "pekerjaan").value.trim(),
  pilihan_jam_belajar: getValue(form, "pilihan_jam_belajar").value,
  sumber_informasi: [...form.querySelectorAll('input[name="sumber_informasi"]:checked')].map((input) => input.value),
});

const renderSuccess = () => {
  const root = document.getElementById("form-container");
  root.innerHTML = `
    <div class="rounded-[2rem] border border-blue-200 bg-blue-50 p-6 md:p-8">
      <div class="text-2xl font-black text-slate-900">Pendaftaran berhasil 🎉</div>
      <p class="mt-3 font-bold text-blue-700">${escapeHtml(state.course?.title || "Kelas Offline")}</p>
      <p class="mt-2 text-slate-700">Status: Menunggu konfirmasi admin LPIA Wisma Asri</p>
      <div class="mt-6 space-y-3 rounded-2xl bg-white p-5 text-sm text-slate-600">
        <p>1. Admin akan memeriksa data pendaftaran.</p>
        <p>2. Admin menghubungi melalui WhatsApp.</p>
        <p>3. Pembayaran dilakukan setelah harga dan jadwal disepakati.</p>
      </div>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" class="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3.5 font-bold text-white shadow-[0_4px_0_0_#047857] transition hover:bg-emerald-700">
          Hubungi WhatsApp Admin
        </a>
<a href="/profile?tab=riwayat" class="inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-white px-6 py-3.5 font-bold text-blue-700 transition hover:bg-blue-50">
            Lihat Status Pendaftaran
          </a>
      </div>
    </div>
  `;
};

const init = async () => {
  const page = document.getElementById("offline-registration-page");
  if (!page) return;
  state.courseId = window.location.pathname.split("/").filter(Boolean).slice(-2, -1)[0];
  const container = document.getElementById("form-container");
  try {
    const response = await HTTP.get(`/courses/${state.courseId}`);
    state.course = response.data;
    document.getElementById("page-title").textContent = `Daftar Kelas Offline`;
    document.getElementById("page-subtitle").textContent = state.course?.title || "Lengkapi formulir di bawah.";
    container.innerHTML = renderForm(state.course);
    const form = document.getElementById("offline-registration-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!validate(form)) return;
      const btn = document.getElementById("submit-btn");
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Memproses...';
      try {
        await HTTP.post("/offline-registrations", buildPayload(form));
        renderSuccess();
        Swal.fire("Pendaftaran berhasil", "Menunggu konfirmasi admin LPIA Wisma Asri", "success");
      } catch (error) {
        Swal.fire("Gagal", error.message || "Pendaftaran gagal.", "error");
        btn.disabled = false;
        btn.innerHTML = original;
      }
    });
  } catch (error) {
    container.innerHTML = `<div class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">Gagal memuat formulir.</div>`;
  }
};

init();
