import { LandingDOM } from './dom/landingPage.js';
import { AuthDOM } from './dom/authPage.js';
import { ProfileDOM } from './dom/profilePage.js';
import { CoursesPageDOM } from './dom/coursesPage.js';
import { CourseDetailDOM } from './dom/courseDetailPage.js'; // <-- Import file baru
import { LearnDOM } from './dom/learnPage.js';
import { AdminAccessPage } from './dom/adminAccessPage.js';
import { SidebarDrawer } from './components/sidebarDrawer.js';
import { AdminDashboardPage } from './dom/admin/adminDashboardPage.js';
import { LogoutButton } from './components/logoutButton.js';
import { AdminTransactionsPage } from './dom/admin/adminTransactionsPage.js';
import { AdminCoursesPage } from './dom/admin/adminCoursesPage.js';
import { AdminCertificatesPage } from './dom/admin/adminCertificatesPage.js';
import { AdminLandingPage } from './dom/admin/adminLandingPage.js';
import { TeacherMaterialsPage } from './dom/guru/teacherMaterialsPage.js';
import { TeacherProfileDOM } from './dom/guru/teacherProfilePage.js';

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('course-list')) LandingDOM.init();
    if (document.getElementById('auth-form')) AuthDOM.init();
    if (document.getElementById('profile-page')) ProfileDOM.init();
    if (document.getElementById('guru-profile-page')) TeacherProfileDOM.init();
    if (document.getElementById('courses-grid-page')) CoursesPageDOM.init();
    if (document.getElementById('course-detail-page')) CourseDetailDOM.init();
    if (document.getElementById('learn-page')) LearnDOM.init();
    if (document.getElementById('admin-access-page')) AdminAccessPage.init();
    if (document.getElementById('admin-sidebar')) SidebarDrawer.init();
    if (document.getElementById('admin-dashboard-page')) AdminDashboardPage.init();
    if (document.getElementById('admin-logout-btn')) LogoutButton.init();
    if (document.getElementById('admin-transactions-page')) AdminTransactionsPage.init();
    if (document.getElementById('admin-courses-page')) AdminCoursesPage.init();
    if (document.getElementById('admin-certificates-page')) AdminCertificatesPage.init();
    if (document.getElementById('admin-landing-page')) AdminLandingPage.init();
    if (document.getElementById('teacher-materials-page')) TeacherMaterialsPage.init();
});