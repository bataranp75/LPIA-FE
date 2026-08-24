import { HTTP } from "../../fetch/http.js";
import Swal from "sweetalert2";

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "")
    return "Belum ditentukan";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const safe = (val) =>
  val === null || val === undefined || val === "" ? "-" : val;

const formatTime = (value) => (value ? String(value).slice(0, 5) : "-");

const scheduleStatusText = {
  confirmed: "Dikonfirmasi",
};

const statusColors = {
  pending_review: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  confirmed: "bg-purple-100 text-purple-700",
  waiting_payment: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  completed: "bg-green-100 text-green-700",
};

const statusText = {
  pending_review: "Menunggu Review",
  contacted: "Sudah Dihubungi",
  confirmed: "Dikonfirmasi",
  waiting_payment: "Menunggu Pembayaran",
  paid: "Sudah Dibayar",
  completed: "Selesai",
};

const tableBody = document.getElementById("offline-registrations-table-body");
const detailModal = document.getElementById("detail-modal");
const detailModalContent = document.getElementById("detail-modal-content");

const fetchRegistrations = async () => {
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="px-6 py-8 text-center text-sm text-slate-500">Memuat data...</td>
    </tr>
  `;
  try {
    const response = await HTTP.get("/admin/offline-registrations");
    renderTable(response.data);
  } catch (error) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-8 text-center text-sm text-rose-500">Gagal memuat data: ${error.message || "terjadi kesalahan"}</td>
      </tr>
    `;
  }
};

const renderTable = (registrations) => {
  if (registrations.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-8 text-center text-sm text-slate-500">Tidak ada pendaftaran offline.</td>
      </tr>
    `;
    return;
  }
  tableBody.innerHTML = registrations
    .map(
      (reg) => `
        <tr>
          <td class="whitespace-nowrap px-6 py-4 text-sm font-bold text-slate-900">${safe(reg.nama_lengkap)}</td>
          <td class="whitespace-nowrap px-6 py-4 text-sm text-slate-600">${safe(reg.course?.title)}</td>
          <td class="whitespace-nowrap px-6 py-4 text-sm">
            <span class="inline-block rounded-full px-3 py-1 text-xs font-bold ${statusColors[reg.status] || "bg-slate-100 text-slate-600"}">${statusText[reg.status] || reg.status}</span>
          </td>
          <td class="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-700">${formatCurrency(reg.final_price)}</td>
          <td class="whitespace-nowrap px-6 py-4 text-sm text-slate-500">${formatDate(reg.created_at)}</td>
          <td class="whitespace-nowrap px-6 py-4 text-sm font-bold">
            <button class="rounded-xl bg-blue-50 px-4 py-2 text-blue-700 transition hover:bg-blue-100" onclick="window.showDetailModal('${reg.id}')">Lihat Detail</button>
          </td>
        </tr>
      `,
    )
    .join("");
};

const fetchOfflineSchedule = async (registrationId) => {
  try {
    const response = await HTTP.get(`/offline-schedules/${registrationId}`);
    return response.data;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
};

window.showDetailModal = async (id) => {
  detailModalContent.innerHTML = `
    <div class="flex items-center justify-center py-16 text-slate-400">
      <div class="text-center">
        <i class="fas fa-spinner fa-spin text-3xl"></i>
        <p class="mt-3 font-semibold">Memuat detail...</p>
      </div>
    </div>
  `;
  detailModal.classList.remove("hidden");
  detailModal.classList.add("flex");
  detailModal.showModal && detailModal.showModal();

  try {
    const [registrationResponse, schedule] = await Promise.all([
      HTTP.get(`/admin/offline-registrations/${id}`),
      fetchOfflineSchedule(id),
    ]);
    renderDetailModal(registrationResponse.data, schedule);
  } catch (error) {
    detailModalContent.innerHTML = `<div class="px-6 py-12 text-center text-rose-600 font-semibold">Gagal memuat detail: ${error.message}</div>`;
  }
};

window.closeDetailModal = () => {
  detailModal.classList.add("hidden");
  detailModal.classList.remove("flex");
  detailModal.close && detailModal.close();
};

window.createOfflinePayment = async (id) => {
  const button = document.getElementById("create-offline-payment-button");
  if (!button || button.disabled) return;

  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Membuat Pembayaran...';

  try {
    const response = await HTTP.post(
      `/admin/offline-registrations/${id}/payment`,
    );
    Swal.fire({
      title: "Berhasil!",
      text: response.message || "Pembayaran berhasil dibuat.",
      icon: "success",
      confirmButtonColor: "#2563eb",
    });
    await window.showDetailModal(id);
    fetchRegistrations();
  } catch (error) {
    Swal.fire({
      title: "Gagal",
      text: error.message || "Gagal membuat pembayaran.",
      icon: "error",
      confirmButtonColor: "#2563eb",
    });
    button.disabled = false;
    button.innerHTML = originalHtml;
  }
};

const labelRow = (label, value) => `
  <div>
    <p class="text-xs font-bold uppercase tracking-wider text-slate-400">${label}</p>
    <p class="mt-1 text-sm font-semibold text-slate-900">${value}</p>
  </div>
`;

const sectionCard = (title, content) => `
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h5 class="mb-4 text-xs font-black uppercase tracking-[0.28em] text-blue-600">${title}</h5>
    <div class="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">${content}</div>
  </div>
`;

const renderScheduleSection = (reg, schedule) => {
  if (schedule) {
    return sectionCard(
      "Jadwal Kelas Offline",
      `${labelRow("Hari", safe(schedule.day))}${labelRow("Jam", `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`)}${labelRow("Lokasi", safe(schedule.location))}${labelRow("Status", scheduleStatusText[schedule.status] || safe(schedule.status))}`,
    );
  }

  const canConfigureSchedule = reg.payment_status === "paid";

  return `
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h5 class="mb-4 text-xs font-black uppercase tracking-[0.28em] text-blue-600">Jadwal Kelas Offline</h5>
      <p class="text-sm font-semibold text-slate-500">Jadwal kelas belum diatur.</p>
      ${
        canConfigureSchedule
          ? `
            <button id="configure-offline-schedule-button" type="button" class="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#047857] transition hover:bg-emerald-700 active:translate-y-0.5 active:shadow-none">
              <i class="fas fa-calendar-plus"></i> Atur Jadwal
            </button>
            <form id="offline-schedule-form" data-registration-id="${reg.id}" class="mt-5 hidden border-t border-slate-200 pt-5">
              <div class="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Hari</label>
                  <select name="day" required class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                    <option value="">Pilih Hari</option>
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                    <option value="Sabtu">Sabtu</option>
                    <option value="Minggu">Minggu</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Lokasi</label>
                  <input type="text" name="location" value="LPIA Wisma Asri" required class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Jam Mulai</label>
                  <input type="time" name="start_time" required class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Jam Selesai</label>
                  <input type="time" name="end_time" required class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                </div>
                <div class="md:col-span-2">
                  <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Catatan</label>
                  <textarea name="notes" rows="3" class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"></textarea>
                </div>
              </div>
              <div class="mt-5">
                <button type="submit" class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#1e40af] transition hover:bg-blue-700 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60">
                  <i class="fas fa-save"></i> Simpan Jadwal
                </button>
              </div>
            </form>
          `
          : `<p class="mt-2 text-sm font-semibold text-amber-600">Jadwal dapat diatur setelah pembayaran lunas.</p>`
      }
    </div>
  `;
};

const renderDetailModal = (reg, schedule) => {
  const sumberInfo = Array.isArray(reg.sumber_informasi)
    ? reg.sumber_informasi.filter(Boolean).join(", ") || "-"
    : safe(reg.sumber_informasi);

  const statusOption = (val, label) =>
    `<option value="${val}" ${reg.status === val ? "selected" : ""}>${label}</option>`;
  const paymentTypeOption = (val, label) =>
    `<option value="${val}" ${reg.payment_type === val ? "selected" : ""}>${label}</option>`;
  const paymentStatusOption = (val, label) =>
    `<option value="${val}" ${reg.payment_status === val ? "selected" : ""}>${label}</option>`;

  const formField = (label, field) => `
    <div>
      <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">${label}</label>
      ${field}
    </div>
  `;

  const accountIdentity = safe(reg.profiles?.full_name || reg.nama_lengkap);

  const selectInput = (name, options) =>
    `<select name="${name}" class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100">${options}</select>`;

  detailModalContent.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p class="text-xs font-black uppercase tracking-[0.28em] text-blue-600">Detail Pendaftaran Offline</p>
          <h3 class="mt-1 text-2xl font-black text-slate-900">${safe(reg.nama_lengkap)}</h3>
          <p class="mt-1 text-sm font-semibold text-slate-500">${safe(reg.course?.title)}</p>
        </div>
        <span class="inline-block rounded-full px-4 py-1.5 text-xs font-bold ${statusColors[reg.status] || "bg-slate-100 text-slate-600"}">${statusText[reg.status] || reg.status}</span>
      </div>

      ${sectionCard("Data Siswa", `${labelRow("Nama Lengkap", safe(reg.nama_lengkap))}${labelRow("Akun LMS", accountIdentity)}${labelRow("Tempat Lahir", safe(reg.tempat_lahir))}${labelRow("Tanggal Lahir", safe(reg.tanggal_lahir))}${labelRow("Agama", safe(reg.agama))}${labelRow("Alamat Lengkap", safe(reg.alamat_lengkap))}${labelRow("No Telp/WA", safe(reg.no_telp))}`)}

      ${sectionCard("Data Akademik", `${labelRow("Asal Sekolah/Kampus", safe(reg.asal_sekolah_kampus))}${labelRow("Kelas", safe(reg.kelas))}${labelRow("Prestasi Sekolah", safe(reg.prestasi_sekolah))}${labelRow("Prestasi Luar Sekolah", safe(reg.prestasi_luar_sekolah))}`)}

      ${sectionCard("Data Orang Tua", `${labelRow("Nama Orang Tua", safe(reg.nama_orang_tua))}${labelRow("No Telp Orang Tua", safe(reg.no_telp_ortu))}${labelRow("Pekerjaan", safe(reg.pekerjaan))}`)}

      ${sectionCard("Detail Pendaftaran", `${labelRow("Pilihan Jam Belajar", safe(reg.pilihan_jam_belajar))}${labelRow("Sumber Informasi", sumberInfo)}${labelRow("Tanggal Daftar", formatDate(reg.created_at))}`)}

      ${renderScheduleSection(reg, schedule)}

      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h5 class="mb-4 text-xs font-black uppercase tracking-[0.28em] text-blue-600">Admin Management</h5>
        <form id="update-registration-form" data-id="${reg.id}">
          <div class="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
            ${formField("Status Pendaftaran", selectInput("status", `${statusOption("pending_review", "Menunggu Review")}${statusOption("contacted", "Sudah Dihubungi")}${statusOption("confirmed", "Dikonfirmasi")}${statusOption("waiting_payment", "Menunggu Pembayaran")}${statusOption("paid", "Sudah Dibayar")}${statusOption("completed", "Selesai")}`))}

            ${formField("Harga Normal Kursus", `<input type="text" value="${formatCurrency(reg.course.price)}" disabled class="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500 outline-none transition placeholder:text-slate-400" />`)}

            ${formField("Harga Final", `<input type="number" name="final_price" value="${reg.final_price ?? ""}" placeholder="Belum ditentukan" class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />`)}

            ${formField("Metode Pembayaran", selectInput("payment_type", `<option value="">Pilih Metode</option>${paymentTypeOption("full_payment", "Pembayaran Penuh")}${paymentTypeOption("installment", "Cicilan")}`))}

            ${formField("Status Pembayaran", selectInput("payment_status", `${paymentStatusOption("waiting_payment", "Menunggu Pembayaran")}${paymentStatusOption("partial_paid", "Dibayar Sebagian")}${paymentStatusOption("paid", "Lunas")}`))}
          </div>

          <div class="mt-5">
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Catatan Admin</label>
            <textarea name="admin_notes" rows="3" class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100">${safe(reg.admin_notes)}</textarea>
          </div>

          <div class="mt-6 flex flex-wrap items-center gap-3">
            <button type="submit" class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#1e40af] transition hover:bg-blue-700 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60">
              <i class="fas fa-save"></i> Simpan Perubahan
            </button>
            <button id="create-offline-payment-button" type="button" onclick="window.createOfflinePayment('${reg.id}')" ${reg.final_price === null || reg.final_price === undefined || reg.final_price === "" ? "disabled" : ""} class="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#5b21b6] transition hover:bg-violet-700 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60">
              <i class="fas fa-credit-card"></i> Buat Pembayaran
            </button>
            <a href="${generateWhatsAppLink(reg)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#047857] transition hover:bg-emerald-700 active:translate-y-0.5 active:shadow-none">
              <i class="fab fa-whatsapp"></i> Hubungi WhatsApp
            </a>
            <button type="button" onclick="window.closeDetailModal()" class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 shadow-[0_4px_0_0_#e5e7eb] transition hover:bg-slate-50 active:translate-y-0.5 active:shadow-none">
              Tutup
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document
    .getElementById("update-registration-form")
    .addEventListener("submit", handleUpdateSubmit);

  const configureScheduleButton = document.getElementById(
    "configure-offline-schedule-button",
  );
  const scheduleForm = document.getElementById("offline-schedule-form");

  if (configureScheduleButton && scheduleForm) {
    configureScheduleButton.addEventListener("click", () => {
      configureScheduleButton.classList.add("hidden");
      scheduleForm.classList.remove("hidden");
      scheduleForm.elements.day.focus();
    });
    scheduleForm.addEventListener("submit", handleScheduleSubmit);
  }

  detailModal.addEventListener(
    "click",
    (e) => {
      if (e.target === detailModal) closeDetailModal();
    },
    { once: true },
  );
};

const handleUpdateSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const id = form.dataset.id;
  const btn = form.querySelector("button[type='submit']");
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

  const payload = {
    final_price:
      form.final_price.value === "" ? null : parseFloat(form.final_price.value),
    payment_type: form.payment_type.value || null,
    payment_status: form.payment_status.value || null,
    status: form.status.value,
    admin_notes: form.admin_notes.value,
  };

  try {
    await HTTP.patch(`/admin/offline-registrations/${id}`, payload);
    Swal.fire({
      title: "Berhasil!",
      text: "Pendaftaran berhasil diperbarui.",
      icon: "success",
      confirmButtonColor: "#2563eb",
    });
    closeDetailModal();
    fetchRegistrations();
  } catch (error) {
    Swal.fire({
      title: "Gagal",
      text: error.message || "Gagal memperbarui pendaftaran.",
      icon: "error",
      confirmButtonColor: "#2563eb",
    });
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
};

const handleScheduleSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const registrationId = form.dataset.registrationId;
  const button = form.querySelector("button[type='submit']");
  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

  const payload = {
    offline_registration_id: registrationId,
    day: form.day.value,
    start_time: form.start_time.value,
    end_time: form.end_time.value,
    location: form.location.value,
    notes: form.notes.value,
  };

  try {
    await HTTP.post("/offline-schedules", payload);
    closeDetailModal();
    await Swal.fire({
      title: "Berhasil!",
      text: "Jadwal berhasil dibuat",
      icon: "success",
      confirmButtonColor: "#2563eb",
    });
    fetchRegistrations();
  } catch (error) {
    Swal.fire({
      title: "Gagal",
      text: error.message || "Gagal membuat jadwal.",
      icon: "error",
      confirmButtonColor: "#2563eb",
    });
    button.disabled = false;
    button.innerHTML = originalHtml;
  }
};

const generateWhatsAppLink = (reg) => {
  const message = encodeURIComponent(
    `Halo Bapak/Ibu.\nKami dari LPIA Wisma Asri ingin mengkonfirmasi pendaftaran:\n\nNama: ${reg.nama_lengkap}\nProgram: ${reg.course?.title}`,
  );
  const waNumber = reg.no_telp || reg.no_telp_wa;
  return `https://wa.me/${waNumber || "6281234567890"}?text=${message}`;
};

if (document.getElementById("admin-offline-registrations-page")) {
  fetchRegistrations();
}
