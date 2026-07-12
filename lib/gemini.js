import { GoogleGenerativeAI } from "@google/generative-ai"

var apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
var genAI = new GoogleGenerativeAI(apiKey)
var model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

export async function generateSoalPG(judulMateri, isiMateri, jumlahSoal) {
  var prompt = "Kamu adalah AI pembuat soal pendidikan bernama Ihsan AI.\n"
  prompt += "Buatkan " + jumlahSoal + " soal PILIHAN GANDA berdasarkan materi berikut:\n\n"
  prompt += "Judul: " + judulMateri + "\n"
  prompt += "Isi Materi: " + isiMateri + "\n\n"
  prompt += 'Format output HARUS berupa JSON array (tanpa markdown, tanpa backtick):\n'
  prompt += '[{"pertanyaan":"...","pilihan":{"A":"...","B":"...","C":"...","D":"..."},"jawaban_benar":"A"}]\n\n'
  prompt += "Output HANYA JSON array, tidak ada teks lain"

  try {
    var result = await model.generateContent(prompt)
    var text = result.response.text()
    var cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim()
    return { success: true, data: JSON.parse(cleaned) }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function generateSoalEssay(judulMateri, isiMateri, jumlahSoal) {
  var prompt = "Kamu adalah AI pembuat soal bernama Ihsan AI.\n"
  prompt += "Buatkan " + jumlahSoal + " soal ESSAY berdasarkan materi:\n\n"
  prompt += "Judul: " + judulMateri + "\nIsi: " + isiMateri + "\n\n"
  prompt += 'Format JSON array (tanpa markdown):\n'
  prompt += '[{"pertanyaan":"...","kunci_jawaban":"..."}]\n'
  prompt += "Output HANYA JSON array"

  try {
    var result = await model.generateContent(prompt)
    var text = result.response.text()
    var cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim()
    return { success: true, data: JSON.parse(cleaned) }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function generateSoalCampuran(judulMateri, isiMateri, jumlahPG, jumlahEssay) {
  var prompt = "Buatkan " + jumlahPG + " soal PG dan " + jumlahEssay + " soal Essay.\n"
  prompt += "Judul: " + judulMateri + "\nIsi: " + isiMateri + "\n\n"
  prompt += 'Format JSON object (tanpa markdown):\n'
  prompt += '{"pilihan_ganda":[{"pertanyaan":"...","pilihan":{"A":"...","B":"...","C":"...","D":"..."},"jawaban_benar":"A"}],"essay":[{"pertanyaan":"...","kunci_jawaban":"..."}]}\n'
  prompt += "Output HANYA JSON object"

  try {
    var result = await model.generateContent(prompt)
    var text = result.response.text()
    var cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim()
    return { success: true, data: JSON.parse(cleaned) }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function generateContohKongkrit(teks, konteksMateri) {
  var prompt = "Kamu adalah Ihsan AI.\n"
  prompt += 'Siswa memilih teks: "' + teks + '"\n'
  prompt += "Konteks: " + (konteksMateri || "Materi umum") + "\n"
  prompt += "Beri 2-3 contoh konkrit kehidupan sehari-hari. Max 150 kata. Bahasa Indonesia."

  try {
    var result = await model.generateContent(prompt)
    return { success: true, data: result.response.text().trim() }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function generateModulAjar(dataModul) {
  var levelDesc = {
    1: "Pengenalan konsep dasar, hafalan, dan pemahaman awal melalui gamifikasi pengetahuan",
    2: "Eksplorasi karakteristik objek secara mendalam dan komunikasi hasil temuan",
    3: "Kolaborasi sosio-emosional, analisis pemecahan masalah kontekstual secara kelompok",
    4: "Penerapan teori ke rekayasa alat konkret untuk memecahkan masalah nyata",
    5: "Pengetahuan diri, interdependensi total, refleksi makna spiritual dan integrasi ilmu"
  }

  var level = dataModul.pertemuan_ke
  if (level > 5) level = ((level - 1) % 5) + 1

  var fokusLevel = levelDesc[level] || levelDesc[1]

  var prompt = "Kamu adalah Ihsan AI, pembuat Modul Ajar / RPP profesional.\n\n"
  prompt += "Buatkan MODUL AJAR LENGKAP dengan format berikut berdasarkan data ini:\n\n"
  prompt += "DATA:\n"
  prompt += "- Nama Penyusun: " + dataModul.nama_penyusun + "\n"
  prompt += "- Satuan Pendidikan: " + dataModul.satuan_pendidikan + "\n"
  prompt += "- Mata Pelajaran: " + dataModul.mata_pelajaran + "\n"
  prompt += "- Fase: " + dataModul.fase + "\n"
  prompt += "- Jenjang: " + dataModul.jenjang + "\n"
  prompt += "- Kelas: " + dataModul.kelas + "\n"
  prompt += "- Semester: " + dataModul.semester + "\n"
  prompt += "- Alokasi Waktu: " + dataModul.alokasi_waktu + "\n"
  prompt += "- Pertemuan Ke: " + dataModul.pertemuan_ke + "\n"
  prompt += "- Level: " + level + " (" + fokusLevel + ")\n"
  prompt += "- Judul Materi: " + dataModul.judul + "\n"
  prompt += "- Isi Materi: " + dataModul.isi + "\n\n"

  prompt += "FORMAT OUTPUT HARUS JSON object (tanpa markdown, tanpa backtick):\n"
  prompt += '{\n'
  prompt += '  "topik_pembahasan": "Topik sesuai materi",\n'
  prompt += '  "profil_pelajar": "Profil pelajar yang relevan (contoh: Berkeadaban, Mandiri, Bergotong Royong, Bernalar Kritis)",\n'
  prompt += '  "fokus_level": "Deskripsi fokus level pertemuan ini",\n'
  prompt += '  "tujuan_pembelajaran": "Tujuan pembelajaran lengkap menggunakan kata kerja operasional, diawali Melalui...",\n'
  prompt += '  "media_digital": "Media digital yang digunakan (contoh: Slide presentasi, E-modul, LKPD Digital)",\n'
  prompt += '  "media_konkret": "Media konkret/riil yang digunakan beserta penjelasan tujuan penggunaannya",\n'
  prompt += '  "pendahuluan": "Deskripsi lengkap kegiatan pendahuluan (15 menit) meliputi: mindful activity, aktivitas pemantik joyful, dan penyampaian fokus kompetensi. Tulis dalam format narasi bertahap dengan penomoran romawi (i, ii, iii)",\n'
  prompt += '  "aktivitas_inti": "Deskripsi lengkap kegiatan inti (60 menit) meliputi 3 tahap aktivitas utama sesuai level. Tulis dalam format narasi bertahap dengan penomoran romawi (i, ii, iii). Setiap tahap ada estimasi waktu.",\n'
  prompt += '  "penutup": "Deskripsi kegiatan penutup (15 menit) meliputi apresiasi, kesimpulan, dan informasi lanjutan",\n'
  prompt += '  "refleksi": "Pertanyaan refleksi bermakna yang mengaitkan materi dengan kehidupan dan nilai spiritual",\n'
  prompt += '  "asesmen_aspek1_nama": "Nama aspek penilaian pertama (contoh: Penguasaan Konsep / Meaningful)",\n'
  prompt += '  "asesmen_aspek1_dasar": "Kriteria skor 1-2 (Dasar) untuk aspek pertama",\n'
  prompt += '  "asesmen_aspek1_mahir": "Kriteria skor 3-4 (Mahir) untuk aspek pertama",\n'
  prompt += '  "asesmen_aspek1_bobot": "Bobot penilaian aspek pertama (contoh: 60%)",\n'
  prompt += '  "asesmen_aspek2_nama": "Nama aspek penilaian kedua (contoh: Atensi & Fokus / Mindful)",\n'
  prompt += '  "asesmen_aspek2_dasar": "Kriteria skor 1-2 (Dasar) untuk aspek kedua",\n'
  prompt += '  "asesmen_aspek2_mahir": "Kriteria skor 3-4 (Mahir) untuk aspek kedua",\n'
  prompt += '  "asesmen_aspek2_bobot": "Bobot penilaian aspek kedua (contoh: 40%)"\n'
  prompt += '}\n\n'

  prompt += "PANDUAN LEVEL:\n"
  prompt += "Level 1: Fokus hafalan, gamifikasi, flashcard, pengenalan konsep dasar\n"
  prompt += "Level 2: Fokus eksplorasi objek mendalam, observasi berpasangan, presentasi komunikasi\n"
  prompt += "Level 3: Fokus kolaborasi kelompok, studi kasus nyata, analisis pemecahan masalah\n"
  prompt += "Level 4: Fokus penerapan teori ke alat konkret, eksperimen fisik, rekayasa\n"
  prompt += "Level 5: Fokus refleksi spiritual, pengetahuan diri, integrasi ilmu dunia-akhirat, jurnaling\n\n"

  prompt += "PENTING:\n"
  prompt += "- Sesuaikan skenario dengan LEVEL " + level + "\n"
  prompt += "- Gunakan pendekatan Meaningful, Mindful, dan Joyful\n"
  prompt += "- Aktivitas harus konkret dan aplikatif\n"
  prompt += "- Output HANYA JSON object, tidak ada teks lain"

  try {
    var result = await model.generateContent(prompt)
    var text = result.response.text()
    var cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim()
    return { success: true, data: JSON.parse(cleaned), level: level, fokus_level: fokusLevel }
  } catch (error) {
    console.log("Error generate modul:", error)
    return { success: false, error: error.message }
  }
}