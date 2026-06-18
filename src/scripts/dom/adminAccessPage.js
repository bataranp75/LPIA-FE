import { HTTP } from '../fetch/http.js';
import { ReusableModal } from '../components/reusableModal.js';
import { AppToast } from '../components/toast.js';

export const AdminAccessPage = {
    tableBody: null,
    createTeacherBtn: null,
    currentRoleTab: 'siswa',
    cachedAccounts: [],
    initialized: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        this.tableBody = document.getElementById('accounts-table-body');
        this.createTeacherBtn = document.getElementById('btn-open-create-teacher');

        if (!this.tableBody) return;

        this.bindEvents();
        this.updateTabs();
        this.updateTableHeader();
        this.loadAccounts();
    },


    bindEvents() {
        document.getElementById('tab-siswa')?.addEventListener('click', () => {
            this.currentRoleTab = 'siswa';
            this.updateTabs();
            this.updateTableHeader();
            this.renderAccounts();
        });

        document.getElementById('tab-guru')?.addEventListener('click', () => {
            this.currentRoleTab = 'guru';
            this.updateTabs();
            this.updateTableHeader();
            this.renderAccounts();
        });

        this.createTeacherBtn?.addEventListener('click', () => this.openCreateTeacherModal());

        document.addEventListener('submit', (e) => this.handleSubmit(e));
        document.addEventListener('click', (e) => this.handleClick(e));
        document.addEventListener('change', (e) => this.handleChange(e));
    },

    async loadAccounts() {
        const response = await HTTP.get('/admin/accounts');
        this.cachedAccounts = response.data || [];
        this.renderAccounts();
    },

    renderAccounts() {
        const accounts = this.cachedAccounts.filter(account => account.role === this.currentRoleTab);

        this.tableBody.innerHTML = accounts.map(account => {
            const permission = account.teacher_permissions?.[0] || {};

            return `
                <tr>
                    <td class="p-4">
                        <div class="font-bold text-slate-900">${account.full_name || '-'}</div>
                        <div class="text-xs text-slate-400">${account.id}</div>
                    </td>

                    <td class="p-4">
                        <span class="px-3 py-1 rounded-full text-xs font-bold ${this.getRoleClass(account.role)}">
                            ${account.role}
                        </span>
                    </td>

                    ${this.currentRoleTab === 'guru' ? `
                        <td class="p-4">${this.renderSwitch(account.id, 'can_create_material', permission.can_create_material)}</td>
                        <td class="p-4">${this.renderSwitch(account.id, 'can_update_material', permission.can_update_material)}</td>
                        <td class="p-4">${this.renderSwitch(account.id, 'can_delete_material', permission.can_delete_material)}</td>
                    ` : ''}

                    <td class="p-4">
                        <div class="flex items-center gap-2">
                            <button 
                                class="btn-reset-password w-9 h-9 inline-flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                                data-id="${account.id}"
                                data-name="${account.full_name || 'User'}"
                                title="Reset Password">
                                <i class="fas fa-key"></i>
                            </button>

                            <button 
                                class="btn-delete-account w-9 h-9 inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                                data-id="${account.id}"
                                data-name="${account.full_name || 'User'}"
                                title="Hapus Akun">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderSwitch(teacherId, field, checked) {
        return `
            <label class="inline-flex items-center gap-2 text-xs font-semibold">
                <input 
                    type="checkbox"
                    class="permission-switch sr-only"
                    data-teacher-id="${teacherId}"
                    data-field="${field}"
                    ${checked ? 'checked' : ''}
                >
                <span class="switch-ui w-10 h-5 rounded-full bg-slate-300 relative cursor-pointer transition">
                    <span class="switch-dot absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition"></span>
                </span>
            </label>
        `;
    },

    updateTableHeader() {
        const headRow = document.querySelector('thead tr');

        headRow.innerHTML = `
            <th class="p-4 text-left">Nama</th>
            <th class="p-4 text-left">Role</th>
            ${this.currentRoleTab === 'guru' ? `
                <th class="p-4 text-left">Create</th>
                <th class="p-4 text-left">Update</th>
                <th class="p-4 text-left">Delete</th>
            ` : ''}
            <th class="p-4 text-left">Aksi</th>
        `;
    },

    updateTabs() {
        const tabSiswa = document.getElementById('tab-siswa');
        const tabGuru = document.getElementById('tab-guru');

        tabSiswa.className = this.currentRoleTab === 'siswa'
            ? 'role-tab px-5 py-2 rounded-lg text-sm font-bold bg-white text-blue-600 shadow-sm'
            : 'role-tab px-5 py-2 rounded-lg text-sm font-bold text-slate-500';

        tabGuru.className = this.currentRoleTab === 'guru'
            ? 'role-tab px-5 py-2 rounded-lg text-sm font-bold bg-white text-blue-600 shadow-sm'
            : 'role-tab px-5 py-2 rounded-lg text-sm font-bold text-slate-500';

        this.createTeacherBtn?.classList.toggle('hidden', this.currentRoleTab !== 'guru');
    },

    getRoleClass(role) {
        if (role === 'admin') return 'bg-blue-100 text-blue-700';
        if (role === 'guru') return 'bg-emerald-100 text-emerald-700';
        return 'bg-slate-100 text-slate-600';
    },

    openCreateTeacherModal() {
        ReusableModal.open({
            title: 'Buat Akun Guru',
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
            `
        });
    },

    async handleSubmit(e) {
        const createForm = e.target.closest('#form-create-teacher');
        const resetForm = e.target.closest('#form-reset-password');
        const deleteForm = e.target.closest('#form-delete-account');

        if (createForm) {
            e.preventDefault();
            await this.createTeacher(createForm);
        }

        if (deleteForm) {
            e.preventDefault();
            await this.deleteAccount(deleteForm);
        }

        if (resetForm) {
            e.preventDefault();
            await this.resetPassword(resetForm);
        }
    },

    async createTeacher(form) {
        try {
            const payload = Object.fromEntries(new FormData(form).entries());
            const response = await HTTP.post('/admin/teachers', payload);

            if (response.status === 'success') {
                const teacher = response.data;

                ReusableModal.close();

                setTimeout(() => {
                    ReusableModal.open({
                        title: 'Akun Guru Berhasil Dibuat',
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
                        `
                    });

                    AppToast.success('Akun guru berhasil dibuat.');
                }, 100);

                await this.loadAccounts();
            }
        } catch (error) {
            AppToast.error(error.message || 'Gagal membuat akun guru.');
        }
    },

    async resetPassword(form) {
        try {
            const userId = form.dataset.userId;
            const payload = Object.fromEntries(new FormData(form).entries());

            const response = await HTTP.patch(`/admin/users/${userId}/password`, payload);

            if (response.status === 'success') {
                ReusableModal.close();
                AppToast.success('Password berhasil diperbarui.');
            }
        } catch (error) {
            AppToast.error(error.message || 'Gagal memperbarui password.');
        }
    },

    async handleClick(e) {
        const copyBtn = e.target.closest('#btn-copy-teacher-account');
        const resetBtn = e.target.closest('.btn-reset-password');
        const deleteBtn = e.target.closest('.btn-delete-account');


        if (copyBtn) {
            const text = document.getElementById('teacher-account-copy')?.value || '';
            await navigator.clipboard.writeText(text);
            AppToast.success('Data akun guru sudah disalin.');
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
                `
            });
        }

        if (deleteBtn) {
            const userId = deleteBtn.dataset.id;
            const name = deleteBtn.dataset.name;

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
                `
            });
        }
    },


    async handleChange(e) {
        const checkbox = e.target.closest('.permission-switch');
        if (!checkbox) return;

        const teacherId = checkbox.dataset.teacherId;
        const field = checkbox.dataset.field;
        const previousValue = !checkbox.checked;

        const account = this.cachedAccounts.find(item => item.id === teacherId);
        const permission = account?.teacher_permissions?.[0] || {};

        const payload = {
            can_create_material: Boolean(permission.can_create_material),
            can_update_material: Boolean(permission.can_update_material),
            can_delete_material: Boolean(permission.can_delete_material),
            [field]: checkbox.checked
        };

        try {
            const response = await HTTP.patch(`/admin/teachers/${teacherId}/permissions`, payload);

            if (response.status === 'success') {
                if (!account.teacher_permissions) {
                    account.teacher_permissions = [];
                }

                account.teacher_permissions[0] = response.data;

                AppToast.success('Permission guru berhasil diperbarui.');
                this.renderAccounts();
            }
        } catch (error) {
            checkbox.checked = previousValue;
            AppToast.error(error.message || 'Gagal memperbarui permission.');
        }
    },

    async deleteAccount(form) {
        try {
            const userId = form.dataset.userId;
            const payload = Object.fromEntries(new FormData(form).entries());

            if (payload.confirm !== 'HAPUS') {
                AppToast.warning('Ketik HAPUS untuk menghapus akun.');
                return;
            }

            const response = await HTTP.delete(`/admin/users/${userId}`);

            if (response.status === 'success') {
                ReusableModal.close();
                AppToast.success('Akun berhasil dihapus.');
                await this.loadAccounts();
            }
        } catch (error) {
            AppToast.error(error.message || 'Gagal menghapus akun.');
        }
    }
};