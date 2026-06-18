const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const TeacherExamApi = {
    async getCourseExam({ teacherId, courseId }) {
        const res = await fetch(`${API_URL}/teacher/${teacherId}/courses/${courseId}/exam`);
        const json = await res.json();

        if (!res.ok || json.status === 'error') {
            throw new Error(json.message || 'Gagal mengambil data ujian.');
        }

        return json.data;
    },

    async syncExamQuestions({ teacherId, courseId, mode = 'append', questions = [] }) {
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
            order_index: index + 1
        }));

        formData.append('course_id', courseId);
        formData.append('mode', mode);
        formData.append('questions', JSON.stringify(cleanQuestions));

        questions.forEach(question => {
            if (question.image_file && question.image_file.size) {
                formData.append(`image_${question.client_id}`, question.image_file);
            }
        });

        const res = await fetch(`${API_URL}/teacher/${teacherId}/exam/sync`, {
            method: 'POST',
            body: formData
        });

        const json = await res.json();

        if (!res.ok || json.status === 'error') {
            throw new Error(json.message || 'Gagal menyimpan soal ujian.');
        }

        return json;
    },

    async deleteExamQuestions({ teacherId, courseId, questionIds = [] }) {
        const res = await fetch(`${API_URL}/teacher/${teacherId}/exam/questions`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                course_id: courseId,
                question_ids: questionIds
            })
        });

        const json = await res.json();

        if (!res.ok || json.status === 'error') {
            throw new Error(json.message || 'Gagal menghapus soal ujian.');
        }

        return json;
    },

    async updateExamTimer({ teacherId, courseId, durationMinutes }) {
        const res = await fetch(`${API_URL}/teacher/${teacherId}/exam/setting`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                course_id: courseId,
                duration_minutes: durationMinutes
            })
        });

        const json = await res.json();

        if (!res.ok || json.status === 'error') {
            throw new Error(json.message || 'Gagal menyimpan timer ujian.');
        }

        return json;
    },

    getTemplateUrl(teacherId) {
        return `${API_URL}/teacher/${teacherId}/exam/template`;
    },

    async importExamCsv({ teacherId, courseId, csvFile }) {
        const formData = new FormData();

        formData.append('course_id', courseId);
        formData.append('csv', csvFile);

        const res = await fetch(`${API_URL}/teacher/${teacherId}/exam/import`, {
            method: 'POST',
            body: formData
        });

        const json = await res.json();

        if (!res.ok || json.status === 'error') {
            throw new Error(json.message || 'Gagal import soal ujian.');
        }

        return json;
    }
};

