// src/scripts/dom/guru/teacherProfilePage.js
import { HTTP } from "../../fetch/http.js";
import Swal from "sweetalert2";
import { CONFIG } from "../../config/index.js";
import { ProfileStore } from "../../utils/profileStore.js";

export const TeacherProfileDOM = {
  isSavingProfile: false,
  isChangingPassword: false,
  avatarFile: null,
  teacherId: null,

  init() {
    const page = document.getElementById("guru-profile-page");
    if (!page) return;

    const token = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!token) {
      window.location.href = "/login";
      return;
    }

    // Get teacher ID from localStorage
    const userInfo = JSON.parse(localStorage.getItem(CONFIG.USER_INFO) || "{}");
    this.teacherId = userInfo.id;

    if (!this.teacherId) {
      window.location.href = "/login";
      return;
    }

    this.loadProfileData();
    this.initProfileUpdate();
    this.initPasswordChange();
  },

  // ─────────────────────────────────────────────────────────
  //  DATA FETCHING & RENDER
  // ─────────────────────────────────────────────────────────
  async loadProfileData() {
    try {
      const response = await HTTP.get(`/teacher/${this.teacherId}/profile`);
      const user = response.data;

      // Populate form
      document.getElementById("input-full-name").value = user.full_name || "";
      document.getElementById("input-email").value = user.email || "";
      document.getElementById("user-display-name").textContent = user.full_name || "Guru";

      // Load avatar
      if (user.avatar_url) {
        this.updateAvatarUI(user.avatar_url);
      }

      // Sinkronkan cache + sidebar dengan data server (sumber kebenaran satu).
      ProfileStore.applyUpdate(user);
    } catch (error) {
      console.error("Error loading profile:", error);
      this.handleAuthError(error);
    }
  },

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

  // ─────────────────────────────────────────────────────────
  //  UI HELPERS
  // ─────────────────────────────────────────────────────────
  updateAvatarUI(avatarUrl) {
    if (!avatarUrl) return;

    const avatarPreview = document.getElementById("avatarPreview");
    const avatarPreviewDisplay = document.getElementById("avatarPreviewDisplay");

    if (avatarPreview) {
      avatarPreview.src = avatarUrl;
    }

    if (avatarPreviewDisplay) {
      avatarPreviewDisplay.src = avatarUrl;
    }
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

  // ─────────────────────────────────────────────────────────
  //  INTERACTIONS
  // ─────────────────────────────────────────────────────────
  initProfileUpdate() {
    // Preview foto profil
    const avatarInput = document.getElementById("avatarInput");
    const avatarPreview = document.getElementById("avatarPreview");

    avatarInput?.addEventListener("change", () => {
      const file = avatarInput.files?.[0];
      const fileNameText = document.getElementById("avatarFileName");

      if (!file) {
        if (fileNameText) fileNameText.innerText = "Belum ada file dipilih";
        this.avatarFile = null;
        return;
      }

      if (!file.type.startsWith("image/")) {
        Swal.fire("Format tidak valid", "Pilih file gambar ya.", "warning");
        avatarInput.value = "";
        if (fileNameText) fileNameText.innerText = "Belum ada file dipilih";
        this.avatarFile = null;
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        Swal.fire("File terlalu besar", "Ukuran foto maksimal 5MB.", "warning");
        avatarInput.value = "";
        if (fileNameText) fileNameText.innerText = "Belum ada file dipilih";
        this.avatarFile = null;
        return;
      }

      if (fileNameText) fileNameText.innerText = file.name;
      this.avatarFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        avatarPreview.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    // Form submission
    document
      .getElementById("form-update-guru-profile")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (this.isSavingProfile) return;

        const submitBtn = document.getElementById("btn-save-guru-profile");
        const newName = document
          .getElementById("input-full-name")
          ?.value?.trim();

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

          // Update profile name
          const profileRes = await HTTP.put(`/teacher/${this.teacherId}/profile`, {
            full_name: newName,
          });

          let avatarUrl = profileRes.data?.avatar_url || null;

          // Update avatar if changed
          if (this.avatarFile) {
            const formData = new FormData();
            formData.append("avatar", this.avatarFile);

            const avatarRes = await HTTP.form(
              `/teacher/${this.teacherId}/profile/avatar`,
              formData,
              "POST",
            );

            avatarUrl = avatarRes.data?.avatar_url || avatarUrl;

            if (avatarUrl) {
              this.updateAvatarUI(avatarUrl);
            }

            this.avatarFile = null;
          }

          // Reset form
          const avatarInput = document.getElementById("avatarInput");
          if (avatarInput) avatarInput.value = "";

          const fileNameText = document.getElementById("avatarFileName");
          if (fileNameText) fileNameText.innerText = "Belum ada file dipilih";

          // Update display
          const displayName = document.getElementById("user-display-name");
          if (displayName) displayName.innerText = newName;

          // Satu sumber data: update cache + broadcast ke sidebar/dashboard
          // agar nama & foto langsung sinkron tanpa reload.
          ProfileStore.applyUpdate({
            full_name: newName,
            ...(avatarUrl ? { avatar_url: avatarUrl } : {})
          });

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
  },

  initPasswordChange() {
    document
      .getElementById("form-change-password")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (this.isChangingPassword) return;

        const submitBtn = document.getElementById("btn-change-password");
        const currentPassword = document.getElementById("input-current-password")?.value || "";
        const newPassword = document.getElementById("input-new-password")?.value || "";
        const confirmPassword = document.getElementById("input-confirm-password")?.value || "";

        if (newPassword.length < 8) {
          Swal.fire("Password terlalu pendek", "Password baru minimal 8 karakter.", "warning");
          return;
        }

        if (newPassword !== confirmPassword) {
          Swal.fire("Konfirmasi tidak cocok", "Password baru dan konfirmasinya harus sama.", "warning");
          return;
        }

        try {
          this.isChangingPassword = true;
          this.setButtonLoading(submitBtn, true, "Mengubah...");

          await HTTP.put(`/teacher/${this.teacherId}/profile/password`, {
            current_password: currentPassword,
            new_password: newPassword,
          });

          document.getElementById("form-change-password")?.reset();

          Swal.fire(
            "Password diubah",
            "Gunakan password baru saat login berikutnya.",
            "success",
          );
        } catch (error) {
          Swal.fire(
            "Gagal",
            error.message || "Gagal mengubah password.",
            "error",
          );
        } finally {
          this.isChangingPassword = false;
          this.setButtonLoading(submitBtn, false);
        }
      });
  },
};
