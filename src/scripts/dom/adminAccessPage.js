import { HTTP } from "../fetch/http.js";
import { ReusableModal } from "../components/reusableModal.js";
import { AppToast } from "../components/toast.js";

export const AdminAccessPage = {
  tableBody: null,
  createTeacherBtn: null,
  currentRoleTab: "siswa",
  cachedAccounts: [],
  searchQuery: "",
  initialized: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.tableBody = document.getElementById("accounts-table-body");
    this.createTeacherBtn = document.getElementById("btn-open-create-teacher");

    if (!this.tableBody) return;

    this.bindEvents();
    this.updateTabs();
    this.updateTableHeader();
    this.loadAccounts();
  },

  bindEvents() {
    document.getElementById("tab-siswa")?.addEventListener("click", () => {
      this.currentRoleTab = "siswa";
      this.updateTabs();
      this.updateTableHeader();
      this.renderAccounts();
    });

    document.getElementById("tab-guru")?.addEventListener("click", () => {
      this.currentRoleTab = "guru";
      this.updateTabs();
      this.updateTableHeader();
      this.renderAccounts();
    });

    this.createTeacherBtn?.addEventListener("click", () =>
      this.openCreateTeacherModal(),
    );

    document
      .getElementById("account-search")
      ?.addEventListener("input", (e) => {
        this.searchQuery = e.target.value || "";
        this.renderAccounts();
      });

    document
      .getElementById("btn-clear-account-search")
      ?.addEventListener("click", () => {
        this.searchQuery = "";
        const input = document.getElementById("account-search");
        if (input) input.value = "";
        this.renderAccounts();
      });

    document.addEventListener("submit", (e) => this.handleSubmit(e));
    document.addEventListener("click", (e) => this.handleClick(e));
    // removed permission toggle change listener
  },

  async loadAccounts() {
    const response = await HTTP.get("/admin/accounts");
    this.cachedAccounts = response.data || [];
    this.renderAccounts();
  },

  renderAccounts() {
    const query = this.searchQuery.trim().toLowerCase();
    const accounts = this.cachedAccounts.filter((account) => {
      const haystack = [
        account.full_name,
        account.role,
        account.current_level,
        account.id,
        account.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        account.role === this.currentRoleTab &&
        (!query || haystack.includes(query))
      );
    });

    if (!accounts.length) {
      this.tableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="p-8 text-center text-slate-500 font-semibold">
                        Akun tidak ditemukan.
                    </td>
                </tr>
            `;
      return;
    }

    this.tableBody.innerHTML = accounts
      .map((account) => {
        if (account.role === "guru") {
          return `
                    <tr class="border-b border-slate-100">
                        <td class="px-4 py-4">
                            <div class="flex items-center gap-3">
                                ${this.renderAvatar(account)}

                                <div>
                                    <h4 class="font-black text-slate-900">${account.full_name || "-"}</h4>
                                    <p class="text-xs text-slate-400">${account.email || ""}</p>
                                </div>
                            </div>
                        </td>

                        <td class="px-4 py-4">
                            <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black">
                                guru
                            </span>
                        </td>

                        <td class="px-4 py-4">
                            <div class="flex items-center gap-2">
                                <button 
                                    data-edit-user="${account.id}" 
                                    class="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                                >
                                    <i class="fas fa-pen"></i>
                                </button>

                                <button 
                                    data-delete-user="${account.id}" 
                                    class="w-9 h-9 rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
                                >
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
        }

        // default row for non-guru (siswa / admin)
        return `
                <tr class="border-b border-slate-100">
                    <td class="px-4 py-4">
                        <div class="flex items-center gap-3">
                            ${this.renderAvatar(account)}
                            <div>
                                <div class="font-bold text-slate-900">${account.full_name || "-"}</div>
                            </div>
                        </div>
                    </td>

                    <td class="px-4 py-4">
                        <span class="px-3 py-1 rounded-full text-xs font-bold ${this.getRoleClass(account.role)}">
                            ${account.role}
                        </span>
                    </td>

                    <td class="px-4 py-4">
                        <div class="flex items-center gap-2">
                            <button 
                                class="btn-edit-account w-9 h-9 inline-flex items-center justify-center rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700"
                                data-id="${account.id}"
                                data-name="${account.full_name || "User"}"
                                title="Edit Akun">
                                <i class="fas fa-pen-to-square"></i>
                            </button>

                            <button 
                                class="btn-delete-account w-9 h-9 inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                                data-id="${account.id}"
                                data-name="${account.full_name || "User"}"
                                title="Hapus Akun">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
      })
      .join("");
  },

  renderAvatar(account) {
    if (account.avatar_url) {
      return `
                <img
                    src="${account.avatar_url}"
                    alt="${account.full_name || "User"}"
                    class="w-11 h-11 rounded-xl object-cover border border-slate-200 bg-slate-100"
                    onerror="this.onerror=null; this.outerHTML='<div class=&quot;w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black border border-blue-100&quot;>${this.getInitials(account.full_name)}</div>';"
                >
            `;
    }

    return `
            <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black border border-blue-100">
                ${this.getInitials(account.full_name)}
            </div>
        `;
  },

  getInitials(name = "") {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "U";
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  },

  updateTableHeader() {
    const headRow = document.querySelector("thead tr");

    headRow.innerHTML = `
            <th class="p-4 text-left">Nama</th>
            <th class="p-4 text-left">Role</th>
            ${
              this.currentRoleTab === "guru"
                ? `
            `
                : ""
            }
            <th class="p-4 text-left">Aksi</th>
        `;
  },

  updateTabs() {
    const tabSiswa = document.getElementById("tab-siswa");
    const tabGuru = document.getElementById("tab-guru");

    tabSiswa.className =
      this.currentRoleTab === "siswa"
        ? "role-tab px-5 py-2 rounded-lg text-sm font-bold bg-white text-blue-600 shadow-sm"
        : "role-tab px-5 py-2 rounded-lg text-sm font-bold text-slate-500";

    tabGuru.className =
      this.currentRoleTab === "guru"
        ? "role-tab px-5 py-2 rounded-lg text-sm font-bold bg-white text-blue-600 shadow-sm"
        : "role-tab px-5 py-2 rounded-lg text-sm font-bold text-slate-500";

    this.createTeacherBtn?.classList.toggle(
      "hidden",
      this.currentRoleTab !== "guru",
    );
  },

  getRoleClass(role) {
    if (role === "admin") return "bg-blue-100 text-blue-700";
    if (role === "guru") return "bg-emerald-100 text-emerald-700";
    return "bg-slate-100 text-slate-600";
  },

  openCreateTeacherModal() {
    ReusableModal.open({
      title: "Buat Akun Guru",
      content: `
                <form id="form-create-teacher" class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold mb-1">Nama Guru</label>
                        <input name="full_name" required class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500">
                    </div>

                    <div>
                        <label class="block text-sm font-bold mb-1">Email</label>
                        <input name="email" type="email" required class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500">
                    </div>

                    <div>
                        <label class="block text-sm font-bold mb-1">Password</label>
                        <input name="password" required minlength="8" class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500">
                    </div>

                    <button class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">
                        Buat Guru
                    </button>
                </form>
            `,
    });
  },

  async handleSubmit(e) {
    const createForm = e.target.closest("#form-create-teacher");
    const editForm = e.target.closest("#form-edit-account");
    const resetForm = e.target.closest("#form-reset-password");
    const deleteForm = e.target.closest("#form-delete-account");

    if (createForm) {
      e.preventDefault();
      await this.createTeacher(createForm);
    }

    if (deleteForm) {
      e.preventDefault();
      await this.deleteAccount(deleteForm);
    }

    if (editForm) {
      e.preventDefault();
      await this.updateAccount(editForm);
    }

    if (resetForm) {
      e.preventDefault();
      await this.resetPassword(resetForm);
    }
  },

  async createTeacher(form) {
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const response = await HTTP.post("/admin/teachers", payload);

      if (response.status === "success") {
        const teacher = response.data;

        ReusableModal.close();

        setTimeout(() => {
          ReusableModal.open({
            title: "Akun Guru Berhasil Dibuat",
            content: `
                            <div class="space-y-4">
                                <p class="text-sm text-slate-600">Salin pesan akun berikut dan kirimkan ke guru.</p>

                                <textarea id="teacher-account-copy" class="w-full h-52 p-4 rounded-xl border border-slate-200 text-sm outline-none" readonly>Halo ${teacher.full_name},

Akun guru LPIA kamu sudah berhasil dibuat.

Email: ${teacher.email}
Password: ${teacher.password}

Silakan login melalui menu Login Guru / Admin.

Terima kasih.</textarea>

                                <button id="btn-copy-teacher-account" class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">
                                    Copy Akun
                                </button>
                            </div>
                        `,
          });

          AppToast.success("Akun guru berhasil dibuat.");
        }, 100);

        await this.loadAccounts();
      }
    } catch (error) {
      AppToast.error(error.message || "Gagal membuat akun guru.");
    }
  },

  async resetPassword(form) {
    try {
      const userId = form.dataset.userId;
      const payload = Object.fromEntries(new FormData(form).entries());

      const response = await HTTP.patch(
        `/admin/users/${userId}/password`,
        payload,
      );

      if (response.status === "success") {
        ReusableModal.close();
        AppToast.success("Password berhasil diperbarui.");
      }
    } catch (error) {
      AppToast.error(error.message || "Gagal memperbarui password.");
    }
  },

  async handleClick(e) {
    const copyBtn = e.target.closest("#btn-copy-teacher-account");
    const editBtn = e.target.closest(".btn-edit-account, [data-edit-user]");
    const resetBtn = e.target.closest(".btn-reset-password");
    const deleteBtn = e.target.closest(
      ".btn-delete-account, [data-delete-user]",
    );

    if (copyBtn) {
      const text = document.getElementById("teacher-account-copy")?.value || "";
      await navigator.clipboard.writeText(text);
      AppToast.success("Data akun guru sudah disalin.");
    }

    if (editBtn) {
      const editId = editBtn.dataset.id || editBtn.dataset.editUser;
      await this.openAccountDetailModal(editId);
    }

    if (resetBtn) {
      const userId = resetBtn.dataset.id;
      const name = resetBtn.dataset.name;

      ReusableModal.open({
        title: `Reset Password ${name}`,
        content: `
                    <form id="form-reset-password" data-user-id="${userId}" class="space-y-4">
                        <div>
                            <label class="block text-sm font-bold mb-1">Password Baru</label>
                            <input name="password" required minlength="8" class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500">
                        </div>

                        <button class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">
                            Simpan Password
                        </button>
                    </form>
                `,
      });
    }

    if (deleteBtn) {
      const userId = deleteBtn.dataset.id || deleteBtn.dataset.deleteUser;
      const name =
        deleteBtn.dataset.name ||
        this.cachedAccounts.find((a) => a.id === userId)?.full_name ||
        "User";

      ReusableModal.open({
        title: `Hapus Akun ${name}`,
        content: `
                    <div class="space-y-4">
                        <div class="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-semibold">
                            Akun ini akan dihapus permanen dari Supabase Auth dan data profilnya juga tidak bisa dipakai lagi.
                        </div>

                        <p class="text-sm text-slate-600">
                            Ketik <b>HAPUS</b> untuk melanjutkan.
                        </p>

                        <form id="form-delete-account" data-user-id="${userId}" class="space-y-4">
                            <input 
                                name="confirm"
                                required
                                placeholder="Ketik HAPUS"
                                class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-red-500"
                            >

                            <button class="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700">
                                Hapus Akun
                            </button>
                        </form>
                    </div>
                `,
      });
    }
  },

  async openAccountDetailModal(userId) {
    ReusableModal.open({
      title: "Memuat Detail Akun",
      isWide: true,
      content: `
                <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 font-semibold">
                    <i class="fas fa-spinner fa-spin mr-2"></i> Mengambil data akun...
                </div>
            `,
    });

    try {
      const response = await HTTP.get(`/admin/users/${userId}`);
      const detail = response.data;
      const account = detail.account || {};
      const isStudent = account.role === "siswa";

      ReusableModal.open({
        title: `Edit ${account.full_name || "Akun"}`,
        subtitle: isStudent
          ? "Detail siswa, kursus, sertifikat, transaksi, dan update akun."
          : "Update nama dan password akun.",
        isWide: true,
        content: this.renderAccountDetail(detail),
      });
    } catch (error) {
      ReusableModal.close();
      AppToast.error(error.message || "Gagal memuat detail akun.");
    }
  },

  renderAccountDetail(detail) {
    const account = detail.account || {};
    const isStudent = account.role === "siswa";

    return `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div class="lg:col-span-1 space-y-5">
                    <div class="bg-white border border-slate-200 rounded-2xl p-5">
                        <div class="flex items-center gap-4 mb-5">
                            ${this.renderAvatar(account)}
                            <div class="min-w-0">
                                <h3 class="font-black text-slate-900 truncate">${account.full_name || "-"}</h3>
                                <p class="text-sm text-slate-500 capitalize">${account.role || "-"}</p>
                            </div>
                        </div>

                        <form id="form-edit-account" data-user-id="${account.id}" class="space-y-4">
                            <div>
                                <label class="block text-sm font-bold mb-1">Nama Lengkap</label>
                                <input name="full_name" required value="${account.full_name || ""}" class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500">
                            </div>

                            <div>
                                <label class="block text-sm font-bold mb-1">Password Baru</label>
                                <input name="password" type="password" minlength="8" placeholder="Kosongkan jika tidak diubah" class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500">
                                <p class="text-xs text-slate-400 mt-1">Minimal 8 karakter jika ingin mengganti password.</p>
                            </div>

                            <button class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">
                                Simpan Perubahan
                            </button>
                        </form>
                    </div>
                </div>

                <div class="lg:col-span-2 space-y-5">
                    ${
                      isStudent
                        ? this.renderStudentDetail(detail)
                        : `
                        <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 font-semibold">
                            Detail kursus, sertifikat, dan transaksi hanya tersedia untuk akun siswa.
                        </div>
                    `
                    }
                </div>
            </div>
        `;
  },

  renderStudentDetail(detail) {
    const courses = detail.courses || [];
    const certificates = detail.certificates || [];
    const transactions = detail.transactions || [];

    return `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-white border border-slate-200 rounded-2xl p-5">
                    <p class="text-xs font-black uppercase text-slate-400">Kursus Diambil</p>
                    <p class="text-3xl font-black text-blue-600 mt-2">${courses.length}</p>
                </div>
                <div class="bg-white border border-slate-200 rounded-2xl p-5">
                    <p class="text-xs font-black uppercase text-slate-400">Sertifikat</p>
                    <p class="text-3xl font-black text-emerald-600 mt-2">${certificates.length}</p>
                </div>
                <div class="bg-white border border-slate-200 rounded-2xl p-5">
                    <p class="text-xs font-black uppercase text-slate-400">Transaksi</p>
                    <p class="text-3xl font-black text-slate-900 mt-2">${transactions.length}</p>
                </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 class="font-black text-slate-900 mb-4">Course yang Diambil</h3>
                ${
                  courses.length
                    ? `
                    <div class="space-y-3">
                        ${courses
                          .map(
                            (item) => `
                            <div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <div>
                                    <p class="font-bold text-slate-900">${item.title || "Tanpa Judul"}</p>
                                    <p class="text-xs text-slate-500">${item.category || "Kursus"}</p>
                                </div>
                                <span class="text-xs font-black px-3 py-1 rounded-full bg-green-100 text-green-700">Aktif</span>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                `
                    : this.renderEmptyBlock("Belum ada kursus yang aktif.")
                }
            </div>

            <div class="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 class="font-black text-slate-900 mb-4">Sertifikat</h3>
                ${
                  certificates.length
                    ? `
                    <div class="space-y-3">
                        ${certificates
                          .map(
                            (cert) => `
                            <div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <div>
                                    <p class="font-bold text-slate-900">${cert.courses?.title || "Sertifikat"}</p>
                                    <p class="text-xs text-slate-500">${cert.issued_at ? this.formatDate(cert.issued_at) : "Menunggu diterbitkan"}</p>
                                </div>
                                ${
                                  cert.certificate_url
                                    ? `<a href="${cert.certificate_url}" target="_blank" class="px-3 py-2 rounded-lg bg-white border border-slate-200 text-blue-700 font-bold text-xs">
                                    Buka
                                </a>`
                                    : `<a href="/admin/certificates" class="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs">
                                    Pending
                                </a>`
                                }
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                `
                    : this.renderEmptyBlock("Belum ada sertifikat.")
                }
            </div>

            <div class="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 class="font-black text-slate-900 mb-4">Riwayat Transaksi</h3>
                ${
                  transactions.length
                    ? `
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="text-slate-400 border-b border-slate-100">
                                <tr>
                                    <th class="py-3 text-left">Course</th>
                                    <th class="py-3 text-left">Status</th>
                                    <th class="py-3 text-left">Total</th>
                                    <th class="py-3 text-left">Tanggal</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${transactions
                                  .map(
                                    (trx) => `
                                    <tr>
                                        <td class="py-3 font-bold text-slate-800">${trx.courses?.title || "Produk"}</td>
                                        <td class="py-3">
                                            <span class="px-2 py-1 rounded-md text-[10px] font-black uppercase ${trx.status_pembayaran === "success" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}">
                                                ${trx.status_pembayaran || "-"}
                                            </span>
                                        </td>
                                        <td class="py-3 font-bold text-blue-600">Rp ${Number(trx.amount || 0).toLocaleString("id-ID")}</td>
                                        <td class="py-3 text-slate-500">${this.formatDate(trx.created_at)}</td>
                                    </tr>
                                `,
                                  )
                                  .join("")}
                            </tbody>
                        </table>
                    </div>
                `
                    : this.renderEmptyBlock("Belum ada transaksi.")
                }
            </div>
        `;
  },

  renderEmptyBlock(message) {
    return `
            <div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 font-semibold">
                ${message}
            </div>
        `;
  },

  formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  },

  async updateAccount(form) {
    try {
      const userId = form.dataset.userId;
      const payload = Object.fromEntries(new FormData(form).entries());

      if (!payload.password) {
        delete payload.password;
      }

      const response = await HTTP.patch(`/admin/users/${userId}`, payload);

      if (response.status === "success") {
        AppToast.success("Akun berhasil diperbarui.");
        await this.loadAccounts();
        await this.openAccountDetailModal(userId);
      }
    } catch (error) {
      AppToast.error(error.message || "Gagal memperbarui akun.");
    }
  },

  async deleteAccount(form) {
    try {
      const userId = form.dataset.userId;
      const payload = Object.fromEntries(new FormData(form).entries());

      if (payload.confirm !== "HAPUS") {
        AppToast.warning("Ketik HAPUS untuk menghapus akun.");
        return;
      }

      const response = await HTTP.delete(`/admin/users/${userId}`);

      if (response.status === "success") {
        ReusableModal.close();
        AppToast.success("Akun berhasil dihapus.");
        await this.loadAccounts();
      }
    } catch (error) {
      AppToast.error(error.message || "Gagal menghapus akun.");
    }
  },
};
