import Groq from "groq-sdk";

const API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;

const MODEL_CANDIDATES = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-20b",
];

function getClient() {
  if (!API_KEY) {
    throw new Error("NEXT_PUBLIC_GROQ_API_KEY belum diisi di .env.local");
  }

  return new Groq({
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true,
  });
}

function removeCodeFence(text = "") {
  return String(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonString(text = "") {
  const cleaned = removeCodeFence(text);

  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (_) {}

  const objectStart = cleaned.indexOf("{");
  const objectEnd = cleaned.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    const possibleObject = cleaned.slice(objectStart, objectEnd + 1);
    try {
      JSON.parse(possibleObject);
      return possibleObject;
    } catch (_) {}
  }

  const arrayStart = cleaned.indexOf("[");
  const arrayEnd = cleaned.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    const possibleArray = cleaned.slice(arrayStart, arrayEnd + 1);
    try {
      JSON.parse(possibleArray);
      return possibleArray;
    } catch (_) {}
  }

  return cleaned;
}

function safeJsonParse(text = "") {
  const jsonString = extractJsonString(text);
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error("Respons AI bukan JSON valid.\n\nIsi respons AI:\n" + text);
  }
}

function toText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(", ") || fallback;
  if (typeof value === "object") return Object.values(value).map(String).filter(Boolean).join(", ") || fallback;
  return String(value).trim() || fallback;
}

function toInt(value, fallback = 0) {
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? fallback : num;
}

function normalizePilihan(pilihan) {
  if (!pilihan) return [];
  if (Array.isArray(pilihan)) return pilihan.map(String).filter(Boolean).slice(0, 5);
  if (typeof pilihan === "object") return Object.values(pilihan).map(String).filter(Boolean).slice(0, 5);
  return String(pilihan).split("\n").map(item => item.replace(/^[A-E][\.\)]\s*/i, "").trim()).filter(Boolean).slice(0, 5);
}

function normalizeJenisSoal(value) {
  const jenis = toText(value).toLowerCase();
  if (jenis.includes("essay")) return "essay";
  return "pg";
}

function normalizeSoalItem(item = {}, index = 0, tingkat = "") {
  const jenis = normalizeJenisSoal(item.jenis_soal || item.jenis || item.type || "pg");
  const pilihan = jenis === "pg" ? normalizePilihan(item.pilihan) : [];

  return {
    pertanyaan: toText(item.pertanyaan || item.soal, `Soal ${index + 1}`),
    pilihan,
    jawaban_benar: jenis === "pg" ? toText(item.jawaban_benar || item.jawaban || item.kunci_jawaban, "") : "",
    jenis_soal: jenis,
    kunci_essay: jenis === "essay" ? toText(item.kunci_essay || item.jawaban || item.kunci_jawaban, "") : "",
    is_auto_generated: true,
    tingkat: toText(item.tingkat || tingkat, ""),
  };
}

async function generateRawText(prompt, useJson = false) {
  const client = getClient();
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const config = {
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 8000,
        top_p: 0.95,
      };

      if (useJson) {
        config.response_format = { type: "json_object" };
      }

      const chatCompletion = await client.chat.completions.create(config);
      const text = chatCompletion?.choices?.[0]?.message?.content;

      if (!text || !text.trim()) {
        throw new Error(`Respons kosong dari model ${modelName}`);
      }

      console.log(`✅ Model berhasil: ${modelName}`);
      return text.trim();
    } catch (error) {
      console.warn(`❌ Model ${modelName} gagal:`, error?.message || error);
      lastError = error;
    }
  }

  throw new Error(`Semua model AI gagal. Error terakhir: ${lastError?.message || "Unknown error"}`);
}

export async function askGemini(prompt = "") {
  if (!prompt || !String(prompt).trim()) throw new Error("Prompt tidak boleh kosong");
  return await generateRawText(prompt);
}

export async function generateSoalAI(payload = {}) {
  const data = typeof payload === "string" ? { materi: payload } : payload;

  const judul = toText(data.judul, "");
  const isi = toText(data.isi || data.materi || data.konten, "");
  const jumlahSoal = toInt(data.jumlahSoal || data.jumlah_soal, 5);
  const jenisSoal = toText(data.jenisSoal || data.jenis_soal, "campuran");
  const tingkat = toText(data.tingkat, "");
  const mataPelajaran = toText(data.mata_pelajaran || data.mataPelajaran, "");
  const kelas = toText(data.kelas, "");
  const jenjang = toText(data.jenjang, "");

  const prompt = `
Kamu adalah asisten guru profesional.

Buatkan ${jumlahSoal} soal berdasarkan materi berikut.

DATA:
- Judul Materi: ${judul}
- Tingkat: ${tingkat}
- Mata Pelajaran: ${mataPelajaran}
- Kelas: ${kelas}
- Jenjang: ${jenjang}
- Jenis Soal: ${jenisSoal}

ISI MATERI:
${isi}

ATURAN:
1. Gunakan bahasa Indonesia yang jelas dan sesuai siswa.
2. Soal harus relevan dengan materi.
3. Jika jenis soal "pg", semua soal pilihan ganda.
4. Jika jenis soal "essay", semua soal essay.
5. Jika jenis soal "campuran", buat campuran PG dan essay.
6. Untuk pilihan ganda, berikan 4 pilihan jawaban.
7. Untuk essay, field pilihan harus berupa array kosong [].
8. Kembalikan JSON VALID SAJA.
9. JANGAN pakai markdown.
10. JANGAN pakai penjelasan tambahan.

FORMAT JSON WAJIB:
{
  "soal": [
    {
      "pertanyaan": "string",
      "pilihan": ["opsi 1", "opsi 2", "opsi 3", "opsi 4"],
      "jawaban_benar": "string",
      "jenis_soal": "pg",
      "kunci_essay": ""
    },
    {
      "pertanyaan": "string",
      "pilihan": [],
      "jawaban_benar": "",
      "jenis_soal": "essay",
      "kunci_essay": "string"
    }
  ]
}
`;

  const text = await generateRawText(prompt, true);
  const parsed = safeJsonParse(text);

  let rawSoal = [];
  if (Array.isArray(parsed)) rawSoal = parsed;
  else if (Array.isArray(parsed.soal)) rawSoal = parsed.soal;
  else if (Array.isArray(parsed.questions)) rawSoal = parsed.questions;
  else if (Array.isArray(parsed.data)) rawSoal = parsed.data;
  else throw new Error("Format soal dari AI tidak sesuai");

  return rawSoal.map((item, index) => normalizeSoalItem(item, index, tingkat));
}

export async function generateContohKonkrit(textDipilih = "", context = {}) {
  const data = typeof context === "object" ? context : {};
  const judul = toText(data.judul, "");
  const tingkat = toText(data.tingkat, "");
  const mataPelajaran = toText(data.mata_pelajaran || data.mataPelajaran, "");
  const kelas = toText(data.kelas, "");

  const prompt = `
Kamu adalah tutor yang membantu siswa memahami materi.

TUGAS:
Jelaskan teks berikut menjadi contoh yang lebih konkret, sederhana, dan mudah dipahami siswa.

DATA:
- Judul Materi: ${judul}
- Tingkat: ${tingkat}
- Mata Pelajaran: ${mataPelajaran}
- Kelas: ${kelas}

TEKS YANG DIPILIH SISWA:
${textDipilih}

ATURAN:
1. Gunakan bahasa sederhana.
2. Beri contoh nyata dalam kehidupan sehari-hari.
3. Jika cocok, gunakan analogi.
4. Jawab langsung, tanpa format JSON.
5. Maksimal 3 paragraf.
`;

  return await generateRawText(prompt);
}

export const generateSoal = generateSoalAI;
export const buatSoal = generateSoalAI;
export const buatSoalAI = generateSoalAI;
export const generateContohKonkret = generateContohKonkrit;
export const contohKonkritAI = generateContohKonkrit;
export const contohKonkretAI = generateContohKonkrit;

export default {
  askGemini,
  generateSoalAI,
  generateSoal,
  buatSoal,
  buatSoalAI,
  generateContohKonkrit,
  generateContohKonkret,
  contohKonkritAI,
  contohKonkretAI,
};