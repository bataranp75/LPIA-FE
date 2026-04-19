import { LandingDOM } from './dom/landingPage.js';
import { AuthDOM } from './dom/authPage.js';
import { ProfileDOM } from './dom/profilePage.js';
import { CoursesPageDOM } from './dom/coursesPage.js';
import { CourseDetailDOM } from './dom/courseDetailPage.js'; // <-- Import file baru

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('course-list')) LandingDOM.init();
    if (document.getElementById('auth-form')) AuthDOM.init();
    if (document.getElementById('profile-page')) ProfileDOM.init();
    if (document.getElementById('courses-grid-page')) CoursesPageDOM.init();
    if (document.getElementById('course-detail-page')) CourseDetailDOM.init(); // <-- Panggil init
});