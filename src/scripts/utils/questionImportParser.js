// Parser file import soal: format AIKEN (.txt) dan CSV standar.
// Menghasilkan { questions, errors, totalParsed } — errors berisi nomor baris
// agar guru tahu persis bagian mana yang salah sebelum import.

const ANSWER_KEYS = ['A', 'B', 'C', 'D'];

function parseCsvLine(line) {
    const result = [];
    let current = '';
    let insideQuote = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"' && next === '"') {
            current += '"';
            i++;
            continue;
        }

        if (char === '"') {
            insideQuote = !insideQuote;
            continue;
        }

        if (char === ',' && !insideQuote) {
            result.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    result.push(current.trim());
    return result;
}

function createQuestion({ question_text, option_a, option_b, option_c, option_d, correct_answer, explanation = '' }) {
    return {
        client_id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
        id: null,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        image_url: '',
        image_storage_path: '',
        explanation: explanation || ''
    };
}

// ── FORMAT 1: AIKEN ──────────────────────────────────────────
// Soal dipisah baris kosong. Struktur per blok:
//   Teks pertanyaan (boleh multi-baris)
//   A. opsi   /   A) opsi
//   B. opsi ... D. opsi
//   ANSWER: A
export function parseAiken(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const questions = [];
    const errors = [];

    let block = [];
    let blockStartLine = 1;

    const flushBlock = () => {
        if (!block.length) return;

        const startLine = blockStartLine;
        const parsed = parseAikenBlock(block, startLine);

        if (parsed.error) {
            errors.push(parsed.error);
        } else {
            questions.push(parsed.question);
        }

        block = [];
    };

    lines.forEach((rawLine, index) => {
        const line = rawLine.trim();

        if (!line) {
            flushBlock();
            return;
        }

        if (!block.length) {
            blockStartLine = index + 1;
        }

        block.push({ text: line, lineNumber: index + 1 });
    });

    flushBlock();

    return { questions, errors };
}

function parseAikenBlock(blockLines, startLine) {
    const optionRegex = /^([A-D])[.)]\s*(.+)$/i;
    const answerRegex = /^ANSWER\s*:\s*([A-D])\s*$/i;

    const questionParts = [];
    const options = {};
    let answer = null;
    let seenOption = false;

    for (const { text, lineNumber } of blockLines) {
        const answerMatch = text.match(answerRegex);

        if (answerMatch) {
            answer = answerMatch[1].toUpperCase();
            continue;
        }

        const optionMatch = text.match(optionRegex);

        if (optionMatch) {
            const key = optionMatch[1].toUpperCase();

            if (options[key] !== undefined) {
                return { error: { line: lineNumber, message: `Opsi ${key} ditulis dua kali dalam satu soal.` } };
            }

            options[key] = optionMatch[2].trim();
            seenOption = true;
            continue;
        }

        if (seenOption) {
            return { error: { line: lineNumber, message: 'Baris tidak dikenali. Setelah opsi A-D seharusnya baris "ANSWER: X".' } };
        }

        questionParts.push(text);
    }

    const questionText = questionParts.join(' ').trim();

    if (!questionText) {
        return { error: { line: startLine, message: 'Teks pertanyaan kosong.' } };
    }

    const missing = ANSWER_KEYS.filter(key => !options[key]);

    if (missing.length) {
        return { error: { line: startLine, message: `Opsi ${missing.join(', ')} tidak ditemukan atau kosong.` } };
    }

    if (!answer) {
        return { error: { line: startLine, message: 'Baris "ANSWER: X" tidak ditemukan.' } };
    }

    return {
        question: createQuestion({
            question_text: questionText,
            option_a: options.A,
            option_b: options.B,
            option_c: options.C,
            option_d: options.D,
            correct_answer: answer
        })
    };
}

// ── FORMAT 2: CSV STANDAR ────────────────────────────────────
// Header: question,option_a,option_b,option_c,option_d,answer,explanation
// Alias header lama tetap diterima (question_text, correct_answer) agar
// file dari template versi sebelumnya tidak langsung ditolak.
const CSV_HEADER_ALIASES = {
    question: ['question', 'question_text'],
    option_a: ['option_a'],
    option_b: ['option_b'],
    option_c: ['option_c'],
    option_d: ['option_d'],
    answer: ['answer', 'correct_answer'],
    explanation: ['explanation']
};

export function parseStandardCsv(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const questions = [];
    const errors = [];

    const headerIndex = lines.findIndex(line => line.trim());

    if (headerIndex === -1) {
        return { questions, errors: [{ line: 1, message: 'File CSV kosong.' }] };
    }

    const headers = parseCsvLine(lines[headerIndex]).map(item => item.toLowerCase());
    const columnMap = {};

    Object.entries(CSV_HEADER_ALIASES).forEach(([field, aliases]) => {
        const found = headers.findIndex(header => aliases.includes(header));
        if (found !== -1) columnMap[field] = found;
    });

    const requiredFields = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'answer'];
    const missingHeaders = requiredFields.filter(field => columnMap[field] === undefined);

    if (missingHeaders.length) {
        return {
            questions,
            errors: [{
                line: headerIndex + 1,
                message: `Header CSV tidak lengkap. Kolom wajib: ${missingHeaders.join(', ')}.`
            }]
        };
    }

    for (let i = headerIndex + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const lineNumber = i + 1;
        const values = parseCsvLine(lines[i]);

        const get = field => (columnMap[field] !== undefined ? values[columnMap[field]] || '' : '');

        const questionText = get('question').trim();
        const answer = get('answer').trim().toUpperCase();
        const options = {
            option_a: get('option_a').trim(),
            option_b: get('option_b').trim(),
            option_c: get('option_c').trim(),
            option_d: get('option_d').trim()
        };

        if (!questionText) {
            errors.push({ line: lineNumber, message: 'Kolom question kosong.' });
            continue;
        }

        const emptyOptions = Object.entries(options)
            .filter(([, value]) => !value)
            .map(([key]) => key);

        if (emptyOptions.length) {
            errors.push({ line: lineNumber, message: `Kolom ${emptyOptions.join(', ')} kosong.` });
            continue;
        }

        if (!ANSWER_KEYS.includes(answer)) {
            errors.push({ line: lineNumber, message: `Kolom answer harus A, B, C, atau D (ditemukan: "${answer || 'kosong'}").` });
            continue;
        }

        questions.push(createQuestion({
            question_text: questionText,
            ...options,
            correct_answer: answer,
            explanation: get('explanation').trim()
        }));
    }

    return { questions, errors };
}

// ── Deteksi format & entry point utama ───────────────────────
export function detectFormat(fileName, text) {
    const name = String(fileName || '').toLowerCase();

    if (name.endsWith('.csv')) return 'csv';
    if (name.endsWith('.txt')) return 'aiken';

    // Tanpa ekstensi jelas: kalau baris pertama non-kosong mengandung koma
    // dan kata kunci header, anggap CSV; selain itu Aiken.
    const firstLine = String(text || '').split('\n').find(line => line.trim()) || '';
    const lower = firstLine.toLowerCase();

    if (lower.includes(',') && (lower.includes('question') || lower.includes('option_a'))) {
        return 'csv';
    }

    return 'aiken';
}

export function parseImportFile(fileName, text) {
    const format = detectFormat(fileName, text);
    const result = format === 'csv' ? parseStandardCsv(text) : parseAiken(text);

    return {
        format,
        questions: result.questions,
        errors: result.errors,
        totalParsed: result.questions.length
    };
}

export const IMPORT_TEMPLATES = {
    csv: [
        'question,option_a,option_b,option_c,option_d,answer,explanation',
        'Apa kepanjangan dari CPU?,Central Processing Unit,Computer Personal Unit,Central Program User,Control Processing Unit,A,CPU adalah pusat pemrosesan komputer.'
    ].join('\n'),
    aiken: [
        'Apa kepanjangan dari CPU?',
        'A. Central Processing Unit',
        'B. Computer Personal Unit',
        'C. Central Program User',
        'D. Control Processing Unit',
        'ANSWER: A',
        '',
        'Perangkat untuk menampilkan output visual adalah?',
        'A. Keyboard',
        'B. Monitor',
        'C. Mouse',
        'D. Scanner',
        'ANSWER: B'
    ].join('\n')
};
