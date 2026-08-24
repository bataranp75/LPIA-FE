import { CONFIG } from '../config/index.js';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api/v1';

function authHeaders(extra = {}) {
    const token = localStorage.getItem(CONFIG.STORAGE_KEY);
    return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra
    };
}

export const TeacherQuestionApi = {
    getTemplateUrl(teacherId) {
        return `${API_URL}/teacher/${teacherId}/questions/template`;
    },

    async createManualQuestion({ teacherId, payload, imageFile = null }) {
        const formData = new FormData();

        Object.entries(payload).forEach(([key, value]) => {
            // Jangan kirim string kosong untuk field ID (kolom UUID di database
            // akan menolak "" dengan error "invalid input syntax for type uuid").
            if (value === null || value === undefined || value === '') {
                if (key.endsWith('_id')) return;
                formData.append(key, '');
                return;
            }
            formData.append(key, value);
        });

        if (imageFile && imageFile.size) {
            formData.append('image', imageFile);
        }

        const res = await fetch(`${API_URL}/teacher/${teacherId}/questions/manual`, {
            method: 'POST',
            headers: authHeaders(),
            body: formData
        });

        const json = await res.json();

        if (!res.ok || json.status === 'error') {
            throw new Error(json.message || 'Gagal menyimpan soal.');
        }

        return json;
    },

    async syncQuestions({ teacherId, moduleId, mode = 'append', questions = [] }) {
        const formData = new FormData();

        const cleanQuestions = questions.map((question, index) => ({
            id: question.id || null,
            client_id: question.client_id,
            question_text: question.question_text,
            option_a: question.option_a,
            option_b: question.option_b,
            option_c: question.option_c,
            option_d: question.option_d,
            correct_answer: question.correct_answer,
            image_url: question.image_url,
            image_storage_path: question.image_storage_path,
            explanation: question.explanation,
            order_index: index + 1
        }));

        formData.append('module_id', moduleId);
        formData.append('mode', mode);
        formData.append('questions', JSON.stringify(cleanQuestions));

        questions.forEach(question => {
            if (question.image_file && question.image_file.size) {
                formData.append(`image_${question.client_id}`, question.image_file);
            }
        });

        const res = await fetch(`${API_URL}/teacher/${teacherId}/questions/sync`, {
            method: 'POST',
            headers: authHeaders(),
            body: formData
        });

        const json = await res.json();

        if (!res.ok || json.status === 'error') {
            throw new Error(json.message || 'Gagal menyimpan kumpulan soal.');
        }

        return json;
    },

    async importQuestionsCsv({ teacherId, moduleId, csvFile }) {
        const formData = new FormData();

        formData.append('module_id', moduleId);
        formData.append('csv', csvFile);

        const res = await fetch(`${API_URL}/teacher/${teacherId}/questions/import`, {
            method: 'POST',
            headers: authHeaders(),
            body: formData
        });

        const json = await res.json();

        if (!res.ok || json.status === 'error') {
            throw new Error(json.message || 'Gagal import soal.');
        }

        return json;
    },

    async deleteQuestions({ teacherId, moduleId, questionIds = [] }) {
        const res = await fetch(`${API_URL}/teacher/${teacherId}/questions`, {
            method: 'DELETE',
            headers: authHeaders({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify({
                module_id: moduleId,
                question_ids: questionIds
            })
        });

        const json = await res.json();

        if (!res.ok || json.status === 'error') {
            throw new Error(json.message || 'Gagal menghapus soal.');
        }

        return json;
    }
};