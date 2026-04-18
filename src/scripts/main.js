import { LandingDOM } from './dom/landingPage.js';
import { AuthDOM } from './dom/authPage.js';

document.addEventListener('DOMContentLoaded', () => {
    // Jalankan init sesuai keberadaan elemen di halaman
    if (document.getElementById('course-list')) LandingDOM.init();
    if (document.getElementById('auth-form')) AuthDOM.init();
});