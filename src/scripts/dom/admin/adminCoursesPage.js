import Swal from "sweetalert2";
import { HTTP } from "../../fetch/http.js";
import { AppToast } from "../../components/toast.js";
import { ReusableModal } from "../../components/reusableModal.js";
import { SidePanel } from "../../components/sidePanel.js";

export const AdminCoursesPage = {
  initialized: false,
  courses: [],
  teachers: [],
  isSubmittingCourse: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.grid = document.getElementById("courses-grid");
    this.btnCreate = document.getElementById("btn-create-course");

    if (!this.grid) return;

    this.bindEvents();
    this.loadData();
  },

  bindEvents() {
    this.btnCreate?.addEventListener("click", () =>
      this.openCreateCourseModal(),
    );

    document.addEventListener("submit", (e) => this.handleSubmit(e));
    document.addEventListener("click", (e) => this.handleClick(e));
    document.addEventListener("click", async (event) => {
      const deleteBtn = event.target.closest("[data-delete-course]");
      if (!deleteBtn) return;

      event.preventDefault();
      event.stopPropagation();

      const courseId = deleteBtn.dataset.deleteCourse;
      const course = this.courses.find((item) => item.id === courseId);
      const result = await Swal.fire({
        title: "Hapus kursus?",
        text: `Kursus "${course?.title || "ini"}" akan dihapus permanen.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, Hapus",
        cancelButtonText: "Batal",
        confirmButtonColor: "#dc2626",
      });

      if (!result.isConfirmed) return;

      try {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
        await this.deleteCourse(courseId);
        Swal.fire("Berhasil", "Kursus berhasil dihapus.", "success");
        await this.loadData();
      } catch (error) {
        if (!error.cancelled) {
          Swal.fire("Gagal", error.message || "Gagal menghapus kursus.", "error");
        }
      } finally {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = `<i class="fas fa-trash"></i>`;
      }
    });
  },

  async loadData() {
    try {
      const [coursesRes, accountsRes] = await Promise.all([
        HTTP.get("/admin/courses"),
        HTTP.get("/admin/accounts"),
      ]);

      this.courses = coursesRes.data || [];
      this.teachers = (accountsRes.data || []).filter(
        (user) => user.role === "guru",
      );

      this.renderCourses();
    } catch (error) {
      AppToast.error(error.message || "Gagal memuat kursus.");
    }
  },

  renderCourses() {
    this.grid.innerHTML = this.courses
      .map((course) => {
        const studentCount = (course.transactions || []).filter(
          (t) => t.status_pembayaran === "success" || t.is_confirmed_by_admin,
        ).length;

        const moduleCount = course.modules?.length || 0;

        return `
                <article class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col h-full">
                    <div class="flex items-start justify-between gap-4 mb-5">
                        <div class="flex-1">
                            <h2 class="text-xl font-black line-clamp-2">${course.title}</h2>
                            <p class="text-sm text-slate-500 mt-1">${course.category || "Tanpa kategori"}</p>
                        </div>

                        <div class="flex flex-col items-end gap-2 shrink-0">
                            <span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 whitespace-nowrap">
                                Rp ${Number(course.price || 0).toLocaleString("id-ID")}
                            </span>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-3 mb-5 mt-auto">
                        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p class="text-xs text-slate-400 font-bold">Guru</p>
                            <p class="font-black text-sm mt-1 truncate" title="${course.teacher?.full_name || "-"}">${course.teacher?.full_name || "-"}</p>
                        </div>

                        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p class="text-xs text-slate-400 font-bold">Murid</p>
                            <p class="font-black text-2xl mt-1 text-blue-600">${studentCount}</p>
                        </div>

                        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p class="text-xs text-slate-400 font-bold">Total Modul</p>
                            <p class="font-black text-2xl mt-1 text-emerald-600">${moduleCount}</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 mt-5">
                        <button class="btn-detail-course flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black transition"
                            data-id="${course.id}">
                            Detail Kursus
                        </button>

                        <button class="btn-edit-course w-11 h-11 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                            data-id="${course.id}">
                            <i class="fas fa-pen"></i>
                        </button>

                        <button
                            type="button"
                            data-delete-course="${course.id}"
                            class="w-11 h-11 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition"
                            title="Hapus Kursus"
                        >
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </article>
            `;
      })
      .join("");
  },

  openCreateCourseModal() {
    ReusableModal.open({
      title: "Buat Kursus Baru",
      subtitle: "Lengkapi informasi kursus di bawah ini",
      content: this.renderCourseForm(),
    });
    this.bindThumbnailPreview();
  },

  // Form dipakai bersama oleh modal create & edit. course = null berarti create.
  renderCourseForm(course = null) {
    const isEdit = !!course;
    const inputClass =
      "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white";

    return `
        <form id="${isEdit ? "form-edit-course" : "form-create-course"}"
              ${isEdit ? `data-id="${course.id}"` : ""}
              class="space-y-5">

            <div>
                <label class="block text-sm font-black mb-2">Judul Kursus <span class="text-red-500">*</span></label>
                <input name="title" required placeholder="Contoh: Bahasa Inggris Dasar"
                    value="${course?.title || ""}" class="${inputClass}">
            </div>

            <div>
                <label class="block text-sm font-black mb-2">Deskripsi</label>
                <textarea name="description" rows="3" placeholder="Jelaskan singkat isi kursus ini"
                    class="${inputClass} resize-none">${course?.description || ""}</textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-black mb-2">Kategori <span class="text-red-500">*</span></label>
                    ${this.renderCategorySelect(course?.category || "")}
                </div>
                <div>
                    <label class="block text-sm font-black mb-2">Metode Pelaksanaan <span class="text-red-500">*</span></label>
                    <select name="delivery_type" required class="${inputClass}">
                        <option value="">Pilih metode</option>
                        <option value="Online" ${course?.delivery_type === "Online" ? "selected" : ""}>Online</option>
                        <option value="Offline" ${course?.delivery_type === "Offline" ? "selected" : ""}>Offline</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label class="block text-sm font-black mb-2">Level <span class="text-red-500">*</span></label>
                    <select name="level" required class="${inputClass}">
                        <option value="">Pilih level</option>
                        <optgroup label="Bahasa Inggris  ">
                            <option value="pre-schooler" ${course?.level === "pre-schooler" ? "selected" : ""}>pre-schooler</option>
                            <option value="pre-foundation" ${course?.level === "pre-foundation" ? "selected" : ""}>pre-foundation</option>
                            <option value="foundation" ${course?.level === "foundation" ? "selected" : ""}>foundation</option>
                            <option value="Basic" ${course?.level === "Basic" ? "selected" : ""}>Basic</option>
                            <option value="Elementary" ${course?.level === "Elementary" ? "selected" : ""}>Elementary</option>
                            <option value="Intermediate" ${course?.level === "Intermediate" ? "selected" : ""}>Intermediate</option>
                            <option value="Advanced" ${course?.level === "Advanced" ? "selected" : ""}>Advanced</option>
                            <option value="Conversation" ${course?.level === "Conversation" ? "selected" : ""}>Conversation</option>
                        </optgroup>
                        <optgroup label="Level Umum">
                            <option value="Dasar" ${course?.level === "Dasar" ? "selected" : ""}>Dasar</option>
                            <option value="Menengah" ${course?.level === "Menengah" ? "selected" : ""}>Menengah</option>
                            <option value="Lanjutan" ${course?.level === "Lanjutan" ? "selected" : ""}>Lanjutan</option>
                        </optgroup>
                        <optgroup label="Level Pendidikan">
                            <option value="SD" ${course?.level === "SD" ? "selected" : ""}>SD</option>
                            <option value="SMP" ${course?.level === "SMP" ? "selected" : ""}>SMP</option>
                            <option value="SMA" ${course?.level === "SMA" ? "selected" : ""}>SMA</option>
                            <option value="Persiapan UTBK" ${course?.level === "Persiapan UTBK" ? "selected" : ""}>Persiapan UTBK</option>
                        </optgroup>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-black mb-2">Jenis Kelas <span class="text-red-500">*</span></label>
                    <select name="learning_type" required class="${inputClass}">
                        <option value="">Pilih jenis</option>
                        <option value="Regular" ${course?.learning_type === "Regular" ? "selected" : ""}>Regular</option>
                        <option value="Private" ${course?.learning_type === "Private" ? "selected" : ""}>Private</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-black mb-2">Harga (Rp) <span class="text-red-500">*</span></label>
                    <input name="price" type="number" min="0" required placeholder="0"
                        value="${course?.price ?? ""}" class="${inputClass}">
                </div>
            </div>

            <div>
                <label class="block text-sm font-black mb-2">Tag Kursus</label>
                <input name="tags" type="text" placeholder="Pisahkan dengan koma: excel, office, data entry"
                    value="${Array.isArray(course?.tags) ? course.tags.join(", ") : course?.tags || ""}" class="${inputClass}">
                <p class="text-xs text-slate-400 mt-1">Untuk Content-Based Filtering. Pisahkan dengan koma.</p>
            </div>

            <div>
                <label class="block text-sm font-black mb-2">Guru Pengampu</label>
                <select name="teacher_id" class="${inputClass}">
                    <option value="">Pilih guru pengampu</option>
                    ${this.teachers
                      .map(
                        (teacher) => `
                        <option value="${teacher.id}" ${course?.teacher?.id === teacher.id ? "selected" : ""}>
                            ${teacher.full_name}
                        </option>`,
                      )
                      .join("")}
                </select>
            </div>

            <div>
                <label class="block text-sm font-black mb-2">Banner Kursus</label>

                <div id="thumbnail-preview-wrap" class="${course?.thumbnail_url ? "" : "hidden"} mb-3">
                    <img id="thumbnail-preview" src="${course?.thumbnail_url || ""}"
                        alt="Banner kursus" class="w-full h-48 object-cover rounded-2xl border border-slate-200">
                </div>

                <label class="flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition cursor-pointer text-center">
                    <i class="fas fa-cloud-arrow-up text-2xl text-slate-400"></i>
                    <span id="thumbnail-filename" class="text-sm font-bold text-slate-600">
                        ${isEdit ? "Klik untuk mengganti banner" : "Klik untuk memilih gambar"}
                    </span>
                    <span class="text-xs text-slate-400">JPG, PNG, atau WEBP. Maksimal 3MB.</span>
                    <input name="thumbnail" type="file" accept="image/jpeg,image/png,image/webp" class="hidden">
                </label>
                ${isEdit ? `<p class="text-xs text-slate-400 mt-2">Kosongkan jika tidak ingin mengganti banner.</p>` : ""}
            </div>

            <button id="btn-save-course" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition">
                <span class="btn-label">${isEdit ? "Simpan Perubahan" : "Simpan Kursus"}</span>
                <span class="btn-loading hidden"><i class="fas fa-spinner fa-spin"></i> Menyimpan...</span>
            </button>
        </form>
    `;
  },

  // Preview banner + validasi ukuran/tipe sebelum submit.
  bindThumbnailPreview() {
    const input = document.querySelector('#modal-root input[name="thumbnail"]');
    if (!input) return;

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      const wrap = document.getElementById("thumbnail-preview-wrap");
      const img = document.getElementById("thumbnail-preview");
      const nameEl = document.getElementById("thumbnail-filename");
      if (!file) return;

      if (file.size > 3 * 1024 * 1024) {
        AppToast.error("Ukuran gambar maksimal 3MB.");
        input.value = "";
        return;
      }

      if (nameEl) nameEl.textContent = file.name;
      if (img && wrap) {
        img.src = URL.createObjectURL(file);
        wrap.classList.remove("hidden");
      }
    });
  },

  renderCategorySelect(selected = "") {
    const categories = ["Komputer", "Bahasa Inggris", "Bahasa Asing", "Desain", "Programming", "Marketing", "Akuntansi", "Bimbingan Belajar"];
    return `
      <select name="category" required class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white">
        <option value="">Pilih kategori</option>
        ${categories.map(cat => `<option value="${cat}" ${selected === cat ? "selected" : ""}>${cat}</option>`).join("")}
      </select>
    `;
  },

  setCourseSubmitLoading(form, isLoading) {
    const button = form?.querySelector("#btn-save-course");
    const label = button?.querySelector(".btn-label");
    const loading = button?.querySelector(".btn-loading");

    if (!button) return;

    button.disabled = isLoading;
    button.classList.toggle("opacity-70", isLoading);
    button.classList.toggle("cursor-not-allowed", isLoading);
    label?.classList.toggle("hidden", isLoading);
    loading?.classList.toggle("hidden", !isLoading);
  },

  async handleSubmit(e) {
    const createForm = e.target.closest("#form-create-course");
    const editForm = e.target.closest("#form-edit-course");

    if (createForm) {
      e.preventDefault();
      await this.createCourse(createForm);
      return;
    }

    if (editForm) {
      e.preventDefault();
      await this.updateCourse(editForm);
      return;
    }
  },

  async createCourse(form) {
    if (this.isSubmittingCourse) return;
    this.isSubmittingCourse = true;
    this.setCourseSubmitLoading(form, true);

    try {
      const formData = new FormData(form);

      if (!formData.get("teacher_id")) {
        formData.set("teacher_id", "");
      }

      // Pakai HTTP.form agar token Authorization ikut terkirim (admin router diproteksi).
      await HTTP.form("/admin/courses", formData);

      ReusableModal.close();
      AppToast.success("Kursus berhasil dibuat.");
      await this.loadData();
    } catch (error) {
      AppToast.error(error.message || "Gagal membuat kursus.");
    } finally {
      this.isSubmittingCourse = false;
      this.setCourseSubmitLoading(form, false);
    }
  },

  async updateCourse(form) {
    if (this.isSubmittingCourse) return;
    this.isSubmittingCourse = true;
    this.setCourseSubmitLoading(form, true);

    try {
      const courseId = form.dataset.id;
      const formData = new FormData(form);

      if (!formData.get("teacher_id")) {
        formData.set("teacher_id", "");
      }

      // Pakai HTTP.form agar token Authorization ikut terkirim (admin router diproteksi).
      await HTTP.form(`/admin/courses/${courseId}`, formData, "PATCH");

      ReusableModal.close();
      AppToast.success("Kursus berhasil diperbarui.");
      await this.loadData();
    } catch (error) {
      AppToast.error(error.message || "Gagal memperbarui kursus.");
    } finally {
      this.isSubmittingCourse = false;
      this.setCourseSubmitLoading(form, false);
    }
  },

  handleClick(e) {
    const detailBtn = e.target.closest(".btn-detail-course");
    if (detailBtn) {
      const course = this.courses.find(
        (item) => item.id === detailBtn.dataset.id,
      );
      if (course) this.openCourseDetail(course);
    }
    const editBtn = e.target.closest(".btn-edit-course");
    if (editBtn) {
      const course = this.courses.find(
        (item) => item.id === editBtn.dataset.id,
      );
      if (course) this.openEditCourseModal(course);
    }

    const deleteBtn = e.target.closest(".btn-delete-course");
    if (deleteBtn) {
      const course = this.courses.find(
        (item) => item.id === deleteBtn.dataset.id,
      );
      Swal.fire({
        title: "Hapus kursus?",
        text: `Kursus "${course?.title || "ini"}" akan dihapus permanen.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, Hapus",
        cancelButtonText: "Batal",
        confirmButtonColor: "#dc2626",
      }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await this.deleteCourse(deleteBtn.dataset.id);
          await this.loadData();
        } catch (error) {
          if (!error.cancelled) {
            Swal.fire("Gagal", error.message, "error");
          }
        }
      });
    }

    const peopleBtn = e.target.closest(".btn-open-course-people");
    if (peopleBtn) {
      const course = this.courses.find(
        (item) => item.id === peopleBtn.dataset.id,
      );
      if (course) this.openPeoplePanel(course, peopleBtn.dataset.tab);
    }

    const tabBtn = e.target.closest(".btn-people-tab");
    if (tabBtn) {
      if (this.peoplePanelState) {
        this.peoplePanelState.tab = tabBtn.dataset.tab;
        this.renderPeoplePanel(); // Render ulang panel dengan data tab baru
      }
    }
  },

  openPeoplePanel(course, defaultTab = "guru") {
    this.peoplePanelState = {
      course,
      tab: defaultTab,
      search: "",
      page: 1,
    };

    this.renderPeoplePanel();
  },

  renderPeoplePanel() {
    const { course, tab } = this.peoplePanelState;

    const teachers = course.teacher ? [course.teacher] : [];
    const students = (course.transactions || [])
      .filter(
        (t) => t.is_confirmed_by_admin || t.status_pembayaran === "success",
      )
      .map((t) => t.profiles)
      .filter(Boolean);

    const source = tab === "guru" ? teachers : students;

    SidePanel.open({
      title: `Peserta Kursus: ${course.title}`,
      content: `
                        <div class="space-y-4">
                            ${
                              modules
                                .map((module, index) => {
                                  const moduleMaterials =
                                    module.materials || [];
                                  const moduleQuestions = (
                                    module.questions || []
                                  ).filter((q) => !q.is_exam);
                                  const moduleExams = (
                                    module.questions || []
                                  ).filter((q) => q.is_exam);
                                  const displayOrder =
                                    module.order_index || index + 1;

                                  return `
                                    <div class="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition">
                                        <div class="bg-gradient-to-r from-blue-50 to-white px-5 py-4 border-b border-slate-100 flex items-center gap-4">
                                            <div class="w-10 h-10 shrink-0 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-lg">
                                                ${displayOrder}
                                            </div>
                                            <div class="flex-1">
                                                <p class="font-black text-slate-800 text-lg">${module.title}</p>
                                                <p class="text-xs text-slate-500 font-medium mt-0.5">Modul ke-${displayOrder}</p>
                                            </div>
                                        </div>

                                        <div class="p-5">
                                            <div class="grid grid-cols-3 gap-3 text-center">
                                                <div class="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                                                    <p class="text-xs font-bold mb-1 opacity-80"><i class="fas fa-book-open mr-1"></i> Materi</p>
                                                    <p class="font-black text-2xl">${moduleMaterials.length}</p>
                                                </div>

                                                <div class="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                                                    <p class="text-xs font-bold mb-1 opacity-80"><i class="fas fa-tasks mr-1"></i> Tugas/Soal</p>
                                                    <p class="font-black text-2xl">${moduleQuestions.length}</p>
                                                </div>

                                                <div class="p-4 rounded-xl border border-purple-200 bg-purple-50 text-purple-700">
                                                    <p class="text-xs font-bold mb-1 opacity-80"><i class="fas fa-file-contract mr-1"></i> Ujian</p>
                                                    <p class="font-black text-2xl">${moduleExams.length}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                })
                                .join("") ||
                              `
                                <div class="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                    <i class="fas fa-folder-open text-3xl text-slate-300 mb-2"></i>
                                    <p class="text-sm font-medium text-slate-500">Belum ada modul yang ditambahkan oleh guru.</p>
                                </div>
                            `
                            }
                        </div>
            `,
    });
  },

  openEditCourseModal(course) {
    ReusableModal.open({
      title: "Edit Kursus",
      subtitle: course.title,
      content: this.renderCourseForm(course),
    });
    this.bindThumbnailPreview();
  },

  async deleteCourse(courseId) {
    // Pakai HTTP.delete agar token Authorization ikut terkirim.
    try {
      return await HTTP.delete(`/admin/courses/${courseId}`);
    } catch (error) {
      // 409 = course masih punya data siswa aktif; minta konfirmasi ulang.
      if (error.status === 409) {
        const info = error.data?.data || {};
        const result = await Swal.fire({
          title: "Course masih memiliki data siswa aktif",
          html: `Transaksi sukses: <b>${info.success_transactions ?? "?"}</b><br>Progress belajar: <b>${info.progress_rows ?? "?"}</b><br><br>Apakah ingin melanjutkan?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Ya, Tetap Hapus",
          cancelButtonText: "Batal",
          confirmButtonColor: "#dc2626",
        });
        if (!result.isConfirmed) {
          const cancelled = new Error("Penghapusan dibatalkan.");
          cancelled.cancelled = true;
          throw cancelled;
        }
        return await HTTP.delete(`/admin/courses/${courseId}?force=1`);
      }
      throw error;
    }
  },

  openCourseDetail(course) {
    const modules = course.modules || [];

    const studentCount = (course.transactions || []).filter(
      (t) => t.status_pembayaran === "success" || t.is_confirmed_by_admin,
    ).length;

    const materialCount = modules.reduce((sum, module) => {
      return sum + (module.materials?.length || 0);
    }, 0);

    const questionCount = modules.reduce((sum, module) => {
      return sum + (module.questions || []).filter((q) => !q.is_exam).length;
    }, 0);

    const examCount = modules.reduce((sum, module) => {
      return sum + (module.questions || []).filter((q) => q.is_exam).length;
    }, 0);

    ReusableModal.open({
      title: `Detail Kursus: ${course.title}`,
      isWide: true,
      content: `
                <div class="space-y-6">
                    <div class="rounded-3xl overflow-hidden bg-slate-100 border border-slate-200">
                        ${
                          course.thumbnail_url
                            ? `<img src="${course.thumbnail_url}" class="w-full h-56 object-cover">`
                            : `<div class="h-56 flex items-center justify-center text-slate-300 text-5xl"><i class="fas fa-image"></i></div>`
                        }
                    </div>

                    <div>
                        <h2 class="text-3xl font-black text-slate-950">${course.title}</h2>
                        <p class="text-slate-500 font-semibold mt-2">${course.description || "Belum ada deskripsi."}</p>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                            <p class="text-xs font-black text-blue-500 uppercase">Kategori</p>
                            <h3 class="font-black text-slate-900 mt-1">${course.category || "-"}</h3>
                        </div>
                        <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                            <p class="text-xs font-black text-emerald-500 uppercase">Harga</p>
                            <h3 class="font-black text-slate-900 mt-1">Rp ${Number(course.price || 0).toLocaleString("id-ID")}</h3>
                        </div>
                        <div class="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                            <p class="text-xs font-black text-purple-500 uppercase">Guru</p>
                            <h3 class="font-black text-slate-900 mt-1">${course.teacher?.full_name || course.teacher_name || "-"}</h3>
                        </div>
                        <div class="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                            <p class="text-xs font-black text-orange-500 uppercase">Total Modul</p>
                            <h3 class="font-black text-slate-900 mt-1">${course.modules?.length || course.total_modules || 0}</h3>
                        </div>
                    </div>

                    <div class="bg-white border border-slate-200 rounded-3xl p-5">
                        <h3 class="font-black text-slate-900 mb-4">Ringkasan Course</h3>
                        <div class="space-y-3 text-sm font-semibold text-slate-600">
                            <div class="flex justify-between border-b border-slate-100 pb-3">
                                <span>Course ID</span>
                                <span class="text-slate-900">${course.id}</span>
                            </div>
                            <div class="flex justify-between border-b border-slate-100 pb-3">
                                <span>Dibuat</span>
                                <span class="text-slate-900">${course.created_at ? new Date(course.created_at).toLocaleDateString("id-ID") : "-"}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Jumlah Murid</span>
                                <span class="text-slate-900">${course.total_students || studentCount}</span>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <button class="btn-open-course-people w-full text-left p-4 rounded-2xl bg-slate-50 border border-slate-100"
                            data-id="${course.id}"
                            data-tab="guru">
                            <p class="text-xs text-slate-400 font-bold">Guru</p>
                            <p class="font-black text-sm mt-1">${course.teacher?.full_name || "-"}</p>
                        </button>

                        <button class="btn-open-course-people w-full text-left p-4 rounded-2xl bg-slate-50 border border-slate-100"
                            data-id="${course.id}"
                            data-tab="murid">
                            <p class="text-xs text-slate-400 font-bold">Murid</p>
                            <p class="font-black text-2xl mt-1">${studentCount}</p>
                        </button>
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="font-black">Monitoring Modul</h3>
                        </div>

                        <div class="space-y-3">
                            ${
                              modules
                                .map((module) => {
                                  const moduleMaterials =
                                    module.materials || [];
                                  const moduleQuestions = (
                                    module.questions || []
                                  ).filter((q) => !q.is_exam);
                                  const moduleExams = (
                                    module.questions || []
                                  ).filter((q) => q.is_exam);

                                  return `
                                    <div class="p-4 rounded-2xl border border-slate-200">
                                        <div class="flex items-start justify-between gap-3 mb-3">
                                            <div>
                                                <p class="font-black">${module.title}</p>
                                                <p class="text-xs text-slate-400">Urutan modul: ${module.order_index || 0}</p>
                                            </div>
                                        </div>

                                        <div class="grid grid-cols-3 gap-2 text-center">
                                            <div class="p-3 rounded-xl bg-slate-50">
                                                <p class="text-xs text-slate-400 font-bold">Materi</p>
                                                <p class="font-black">${moduleMaterials.length}</p>
                                            </div>

                                            <div class="p-3 rounded-xl bg-slate-50">
                                                <p class="text-xs text-slate-400 font-bold">Soal/Tugas</p>
                                                <p class="font-black">${moduleQuestions.length}</p>
                                            </div>

                                            <div class="p-3 rounded-xl bg-slate-50">
                                                <p class="text-xs text-slate-400 font-bold">Ujian</p>
                                                <p class="font-black">${moduleExams.length}</p>
                                            </div>
                                        </div>

                                    </div>
                                `;
                                })
                                .join("") ||
                              '<p class="text-sm text-slate-400">Belum ada modul yang diupload guru.</p>'
                            }
                        </div>
                    </div>
                </div>
            `,
    });
  },
};
