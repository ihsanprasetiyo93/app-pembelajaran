"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { generateModulAjar } from "../../../lib/gemini"
import { useRouter } from "next/navigation"

export default function GuruMateriPage() {
  const [user, setUser] = useState(null)
  const [materiList, setMateriList] = useState([])
  const [modulList, setModulList] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [pesan, setPesan] = useState("")
  const [generatingAI, setGeneratingAI] = useState(false)
  const [viewModul, setViewModul] = useState(null)
  const [tab, setTab] = useState("materi")
  const router = useRouter()

  const [judul, setJudul] = useState("")
  const [isi, setIsi] = useState("")
  const [file, setFile] = useState(null)
  const [pertemuanKe, setPertemuanKe] = useState(1)
  const [namaPenyusun, setNamaPenyusun] = useState("")
  const [satuanPendidikan, setSatuanPendidikan] = useState("")
  const [mataPelajaran, setMataPelajaran] = useState("")
  const [fase, setFase] = useState("")
  const [jenjang, setJenjang] = useState("")
  const [kelas, setKelas] = useState("")
  const [semester, setSemester] = useState("Gasal")
  const [alokasiWaktu, setAlokasiWaktu] = useState("2 x 45 Menit")

  useEffect(function () { loadData() }, [])

  async function loadData() {
    var authResult = await supabase.auth.getUser()
    var authUser = authResult.data.user
    if (!authUser) { router.push("/login"); return }

    var userResult = await supabase.from("users").select("*").eq("id", authUser.id).single()
    if (!userResult.data || userResult.data.role !== "guru") { router.push("/dashboard"); return }

    setUser(userResult.data)
    setNamaPenyusun(userResult.data.nama)
    await loadMateri(authUser.id)
    await loadModul(authUser.id)
    setLoading(false)
  }

  async function loadMateri(guruId) {
    var result = await supabase.from("materi").select("*").eq("guru_id", guruId).order("pertemuan_ke", { ascending: true })
    setMateriList(result.data || [])
    setPertemuanKe((result.data || []).length + 1)
  }

  async function loadModul(guruId) {
    var result = await supabase.from("modul_ajar").select("*").eq("guru_id", guruId).order("pertemuan_ke", { ascending: true })
    setModulList(result.data || [])
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!judul || !isi) { setPesan("❌ Judul dan isi wajib diisi!"); return }
    if (!satuanPendidikan || !mataPelajaran || !kelas) { setPesan("❌ Data sekolah wajib diisi!"); return }

    setSubmitting(true)
    setPesan("")

    var fileUrl = null
    if (file) {
      var fileName = Date.now().toString() + "_" + file.name
      var uploadResult = await supabase.storage.from("materi-files").upload(fileName, file)
      if (uploadResult.error) { setPesan("❌ Gagal upload: " + uploadResult.error.message); setSubmitting(false); return }
      fileUrl = supabase.storage.from("materi-files").getPublicUrl(fileName).data.publicUrl
    }

    var insertResult = await supabase.from("materi").insert({
      judul: judul, isi: isi, file_url: fileUrl, guru_id: user.id,
      pertemuan_ke: pertemuanKe, nama_penyusun: namaPenyusun, satuan_pendidikan: satuanPendidikan,
      mata_pelajaran: mataPelajaran, fase: fase, jenjang: jenjang, kelas: kelas,
      semester: semester, alokasi_waktu: alokasiWaktu,
    }).select().single()

    if (insertResult.error) { setPesan("❌ Gagal simpan: " + insertResult.error.message); setSubmitting(false); return }

    var materiBaru = insertResult.data

    // Generate Modul Ajar
    setGeneratingAI(true)
    setPesan("⏳ Materi tersimpan! Ihsan AI sedang membuat Modul Ajar...")

    var aiResult = await generateModulAjar({
      nama_penyusun: namaPenyusun, satuan_pendidikan: satuanPendidikan,
      mata_pelajaran: mataPelajaran, fase: fase, jenjang: jenjang,
      kelas: kelas, semester: semester, alokasi_waktu: alokasiWaktu,
      pertemuan_ke: pertemuanKe, judul: judul, isi: isi,
    })

    if (aiResult.success) {
      var d = aiResult.data
      var modulInsert = await supabase.from("modul_ajar").insert({
        materi_id: materiBaru.id, guru_id: user.id,
        nama_penyusun: namaPenyusun, satuan_pendidikan: satuanPendidikan,
        mata_pelajaran: mataPelajaran, fase: fase, jenjang: jenjang,
        kelas: kelas, semester: semester, alokasi_waktu: alokasiWaktu,
        topik_pembahasan: d.topik_pembahasan, profil_pelajar: d.profil_pelajar,
        pertemuan_ke: pertemuanKe, level_ke: aiResult.level, fokus_level: d.fokus_level || aiResult.fokus_level,
        tujuan_pembelajaran: d.tujuan_pembelajaran, media_digital: d.media_digital, media_konkret: d.media_konkret,
        pendahuluan: d.pendahuluan, aktivitas_inti: d.aktivitas_inti,
        penutup: d.penutup, refleksi: d.refleksi,
        asesmen_aspek1_nama: d.asesmen_aspek1_nama, asesmen_aspek1_dasar: d.asesmen_aspek1_dasar,
        asesmen_aspek1_mahir: d.asesmen_aspek1_mahir, asesmen_aspek1_bobot: d.asesmen_aspek1_bobot,
        asesmen_aspek2_nama: d.asesmen_aspek2_nama, asesmen_aspek2_dasar: d.asesmen_aspek2_dasar,
        asesmen_aspek2_mahir: d.asesmen_aspek2_mahir, asesmen_aspek2_bobot: d.asesmen_aspek2_bobot,
      })

      if (modulInsert.error) {
        setPesan("✅ Materi tersimpan! Tapi gagal simpan modul: " + modulInsert.error.message)
      } else {
        setPesan("🎉 Materi & Modul Ajar Level " + aiResult.level + " berhasil dibuat oleh Ihsan AI!")
      }
    } else {
      setPesan("✅ Materi tersimpan! Tapi gagal generate modul: " + aiResult.error)
    }

    setGeneratingAI(false)
    setJudul(""); setIsi(""); setFile(null); setShowForm(false)
    await loadMateri(user.id)
    await loadModul(user.id)
    setSubmitting(false)
  }

  async function handleHapus(id, fileUrl) {
    if (!confirm("Yakin hapus materi & modul terkait?")) return
    if (fileUrl) { await supabase.storage.from("materi-files").remove([fileUrl.split("/").pop()]) }
    await supabase.from("modul_ajar").delete().eq("materi_id", id)
    await supabase.from("soal").delete().eq("materi_id", id)
    await supabase.from("materi").delete().eq("id", id)
    await loadMateri(user.id)
    await loadModul(user.id)
  }

  function getLevelColor(level) {
    var colors = { 1: "#3b82f6", 2: "#10b981", 3: "#f59e0b", 4: "#8b5cf6", 5: "#ec4899" }
    return colors[level] || "#667eea"
  }

  if (loading) {
    return (
      <div style={st.center}><div style={st.spinner}></div><p style={{ marginTop: "16px", color: "#666" }}>Loading...</p></div>
    )
  }

  return (
    <div style={st.container}>
      <div style={st.header}>
        <button onClick={function () { router.push("/dashboard") }} style={st.backBtn}>← Kembali</button>
        <h1 style={st.title}>📚 Materi & Modul Ajar</h1>
        <button onClick={function () { setShowForm(!showForm); setPesan("") }} style={st.addBtn}>
          {showForm ? "✕ Tutup" : "+ Tambah Materi"}
        </button>
      </div>

      {pesan && (
        <div style={{ ...st.pesan, background: pesan.startsWith("✅") || pesan.startsWith("🎉") ? "#dcfce7" : pesan.startsWith("⏳") ? "#fef3c7" : "#fee2e2", color: pesan.startsWith("✅") || pesan.startsWith("🎉") ? "#166534" : pesan.startsWith("⏳") ? "#92400e" : "#dc2626" }}>
          {pesan}
        </div>
      )}

      <div style={st.infoCard}>
        <p style={{ margin: 0, fontSize: "14px" }}>
          🤖 <strong>Ihsan AI</strong> otomatis membuat Modul Ajar lengkap (Level 1-5) setiap kali guru upload materi!
        </p>
      </div>

      {/* FORM */}
      {showForm && (
        <div style={st.formCard}>
          <h2 style={st.formTitle}>➕ Upload Materi + Generate Modul Ajar</h2>
          <form onSubmit={handleUpload}>
            <p style={st.sectionLabel}>📋 Data Sekolah</p>
            <div style={st.row2}>
              <div style={st.inputGroup}>
                <label style={st.label}>Nama Penyusun</label>
                <input type="text" value={namaPenyusun} onChange={function (e) { setNamaPenyusun(e.target.value) }} style={st.input} />
              </div>
              <div style={st.inputGroup}>
                <label style={st.label}>Satuan Pendidikan *</label>
                <input type="text" placeholder="MTs/MA Darul Amanah" value={satuanPendidikan} onChange={function (e) { setSatuanPendidikan(e.target.value) }} style={st.input} />
              </div>
            </div>
            <div style={st.row2}>
              <div style={st.inputGroup}>
                <label style={st.label}>Mata Pelajaran *</label>
                <input type="text" placeholder="Fiqh" value={mataPelajaran} onChange={function (e) { setMataPelajaran(e.target.value) }} style={st.input} />
              </div>
              <div style={st.inputGroup}>
                <label style={st.label}>Fase</label>
                <input type="text" placeholder="Fase D / E" value={fase} onChange={function (e) { setFase(e.target.value) }} style={st.input} />
              </div>
            </div>
            <div style={st.row2}>
              <div style={st.inputGroup}>
                <label style={st.label}>Jenjang</label>
                <input type="text" placeholder="MTs / MA" value={jenjang} onChange={function (e) { setJenjang(e.target.value) }} style={st.input} />
              </div>
              <div style={st.inputGroup}>
                <label style={st.label}>Kelas *</label>
                <input type="text" placeholder="VII / X" value={kelas} onChange={function (e) { setKelas(e.target.value) }} style={st.input} />
              </div>
            </div>
            <div style={st.row2}>
              <div style={st.inputGroup}>
                <label style={st.label}>Semester</label>
                <select value={semester} onChange={function (e) { setSemester(e.target.value) }} style={st.input}>
                  <option value="Gasal">Gasal</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
              <div style={st.inputGroup}>
                <label style={st.label}>Alokasi Waktu</label>
                <input type="text" value={alokasiWaktu} onChange={function (e) { setAlokasiWaktu(e.target.value) }} style={st.input} />
              </div>
            </div>

            <p style={st.sectionLabel}>📖 Materi</p>
            <div style={st.inputGroup}>
              <label style={st.label}>Pertemuan Ke-</label>
              <input type="number" min="1" value={pertemuanKe} onChange={function (e) { setPertemuanKe(Number(e.target.value)) }} style={{ ...st.input, width: "120px" }} />
              <p style={st.hint}>🤖 Modul akan di-generate sebagai Level {((pertemuanKe - 1) % 5) + 1}</p>
            </div>
            <div style={st.inputGroup}>
              <label style={st.label}>Judul Materi *</label>
              <input type="text" placeholder="Contoh: Konsep Bersuci (Thaharah)" value={judul} onChange={function (e) { setJudul(e.target.value) }} style={st.input} />
            </div>
            <div style={st.inputGroup}>
              <label style={st.label}>Isi / Penjelasan Materi *</label>
              <textarea placeholder="Tulis penjelasan materi..." value={isi} onChange={function (e) { setIsi(e.target.value) }} style={st.textarea} rows={8} />
            </div>
            <div style={st.inputGroup}>
              <label style={st.label}>Upload File (Opsional)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={function (e) { setFile(e.target.files[0]) }} style={st.fileInput} />
            </div>

            <button type="submit" disabled={submitting || generatingAI} style={{ ...st.submitBtn, opacity: submitting || generatingAI ? 0.7 : 1 }}>
              {generatingAI ? "🤖 Ihsan AI sedang membuat Modul Ajar..." : submitting ? "⏳ Menyimpan..." : "💾 Simpan & Generate Modul Ajar"}
            </button>
          </form>
        </div>
      )}

      {/* TABS */}
      <div style={st.tabWrap}>
        <button onClick={function () { setTab("materi"); setViewModul(null) }} style={{ ...st.tabBtn, background: tab === "materi" ? "linear-gradient(135deg, #667eea, #764ba2)" : "white", color: tab === "materi" ? "white" : "#374151" }}>
          📚 Materi ({materiList.length})
        </button>
        <button onClick={function () { setTab("modul"); setViewModul(null) }} style={{ ...st.tabBtn, background: tab === "modul" ? "linear-gradient(135deg, #667eea, #764ba2)" : "white", color: tab === "modul" ? "white" : "#374151" }}>
          📋 Modul Ajar ({modulList.length})
        </button>
      </div>

      {/* TAB MATERI */}
      {tab === "materi" && (
        <div>
          {materiList.length === 0 ? (
            <div style={st.empty}><p style={{ fontSize: "48px", margin: 0 }}>📭</p><p style={{ color: "#666", marginTop: "12px" }}>Belum ada materi.</p></div>
          ) : (
            <div style={st.grid}>
              {materiList.map(function (item) {
                var lvl = ((item.pertemuan_ke - 1) % 5) + 1
                return (
                  <div key={item.id} style={st.card}>
                    <div style={st.cardTags}>
                      <span style={st.pertemuanBadge}>Pertemuan {item.pertemuan_ke}</span>
                      <span style={{ ...st.levelBadge, background: getLevelColor(lvl) }}>Level {lvl}</span>
                    </div>
                    <h3 style={st.cardJudul}>{item.judul}</h3>
                    <p style={st.cardDate}>{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                    <p style={st.cardIsi}>{item.isi.length > 80 ? item.isi.substring(0, 80) + "..." : item.isi}</p>
                    {item.file_url && <a href={item.file_url} target="_blank" rel="noopener noreferrer" style={st.fileLink}>📎 File</a>}
                    <button onClick={function () { handleHapus(item.id, item.file_url) }} style={st.hapusBtn}>🗑️ Hapus</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB MODUL */}
      {tab === "modul" && !viewModul && (
        <div>
          {modulList.length === 0 ? (
            <div style={st.empty}><p style={{ fontSize: "48px", margin: 0 }}>📭</p><p style={{ color: "#666", marginTop: "12px" }}>Belum ada modul ajar.</p></div>
          ) : (
            <div style={st.grid}>
              {modulList.map(function (m) {
                return (
                  <div key={m.id} style={st.card} onClick={function () { setViewModul(m) }}>
                    <div style={st.cardTags}>
                      <span style={st.pertemuanBadge}>Pertemuan {m.pertemuan_ke}</span>
                      <span style={{ ...st.levelBadge, background: getLevelColor(m.level_ke) }}>Level {m.level_ke}</span>
                      <span style={st.aiBadge}>🤖 AI</span>
                    </div>
                    <h3 style={st.cardJudul}>{m.topik_pembahasan || m.mata_pelajaran}</h3>
                    <p style={st.cardDate}>{m.satuan_pendidikan} • {m.kelas}</p>
                    <p style={st.cardIsi}>{m.fokus_level}</p>
                    <div style={st.viewBtn}>👁️ Lihat Modul</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODUL DETAIL */}
      {tab === "modul" && viewModul && (
        <div style={st.modulView}>
          <button onClick={function () { setViewModul(null) }} style={st.backModulBtn}>← Kembali ke Daftar</button>

          <div style={st.modulHeader}>
            <h2 style={st.modulTitle}>MODUL AJAR PERTEMUAN {viewModul.pertemuan_ke} (LEVEL {viewModul.level_ke})</h2>
          </div>

          {/* I. INFORMASI UMUM */}
          <div style={st.modulSection}>
            <h3 style={st.modulSectionTitle}>I. KOMPONEN INFORMASI UMUM</h3>
            <table style={st.infoTable}>
              <tbody>
                <tr><td style={st.tdLabel}>Nama Penyusun / Satuan Pendidikan</td><td style={st.tdValue}>{viewModul.nama_penyusun} / {viewModul.satuan_pendidikan}</td></tr>
                <tr><td style={st.tdLabel}>Mata Pelajaran / Fase / Jenjang</td><td style={st.tdValue}>{viewModul.mata_pelajaran} / {viewModul.fase} / {viewModul.jenjang}</td></tr>
                <tr><td style={st.tdLabel}>Kelas / Semester / Alokasi Waktu</td><td style={st.tdValue}>{viewModul.kelas} / {viewModul.semester} / {viewModul.alokasi_waktu}</td></tr>
                <tr><td style={st.tdLabel}>Materi Pokok / Topik</td><td style={st.tdValue}>{viewModul.topik_pembahasan}</td></tr>
                <tr><td style={st.tdLabel}>Profil Pelajar</td><td style={st.tdValue}>{viewModul.profil_pelajar}</td></tr>
              </tbody>
            </table>
          </div>

          {/* II. TUJUAN */}
          <div style={st.modulSection}>
            <h3 style={st.modulSectionTitle}>II. KOMPONEN INTI & TUJUAN PEMBELAJARAN</h3>
            <div style={st.modulBlock}>
              <p style={st.modulBlockLabel}>1. Tujuan Pembelajaran:</p>
              <p style={st.modulBlockText}>{viewModul.tujuan_pembelajaran}</p>
            </div>
            <div style={st.modulBlock}>
              <p style={st.modulBlockLabel}>2. Media & Alat Belajar:</p>
              <p style={st.modulBlockText}><strong>Media Digital:</strong> {viewModul.media_digital}</p>
              <p style={st.modulBlockText}><strong>Media Konkret:</strong> {viewModul.media_konkret}</p>
            </div>
          </div>

          {/* III. SKENARIO */}
          <div style={st.modulSection}>
            <h3 style={st.modulSectionTitle}>III. SKENARIO PEMBELAJARAN (FOKUS: LEVEL {viewModul.level_ke})</h3>
            <p style={st.modulFokus}>{viewModul.fokus_level}</p>

            <div style={st.skenarioCard}>
              <h4 style={st.skenarioTitle}>📌 Pendahuluan (15 Menit)</h4>
              <p style={st.skenarioText}>{viewModul.pendahuluan}</p>
            </div>

            <div style={st.skenarioCard}>
              <h4 style={st.skenarioTitle}>📌 Aktivitas Inti (60 Menit)</h4>
              <p style={st.skenarioText}>{viewModul.aktivitas_inti}</p>
            </div>

            <div style={st.skenarioCard}>
              <h4 style={st.skenarioTitle}>📌 Penutup & Refleksi (15 Menit)</h4>
              <p style={st.skenarioText}>{viewModul.penutup}</p>
            </div>

            <div style={st.refleksiCard}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>🪞 Refleksi Makna:</h4>
              <p style={{ margin: 0, fontSize: "14px", fontStyle: "italic", lineHeight: "1.6" }}>{viewModul.refleksi}</p>
            </div>
          </div>

          {/* IV. ASESMEN */}
          <div style={st.modulSection}>
            <h3 style={st.modulSectionTitle}>IV. INSTRUMEN ASESMEN & RUBRIK PENILAIAN</h3>
            <table style={st.asesmenTable}>
              <thead>
                <tr>
                  <th style={st.th}>Aspek yang Dinilai</th>
                  <th style={st.th}>Kriteria Skor 1-2 (Dasar)</th>
                  <th style={st.th}>Kriteria Skor 3-4 (Mahir)</th>
                  <th style={st.th}>Bobot</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={st.td}>{viewModul.asesmen_aspek1_nama}</td>
                  <td style={st.td}>{viewModul.asesmen_aspek1_dasar}</td>
                  <td style={st.td}>{viewModul.asesmen_aspek1_mahir}</td>
                  <td style={st.tdCenter}>{viewModul.asesmen_aspek1_bobot}</td>
                </tr>
                <tr>
                  <td style={st.td}>{viewModul.asesmen_aspek2_nama}</td>
                  <td style={st.td}>{viewModul.asesmen_aspek2_dasar}</td>
                  <td style={st.td}>{viewModul.asesmen_aspek2_mahir}</td>
                  <td style={st.tdCenter}>{viewModul.asesmen_aspek2_bobot}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

var st = {
  container: { minHeight: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%)", padding: "24px", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  center: { minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" },
  spinner: { width: "40px", height: "40px", border: "4px solid #e0e0e0", borderTop: "4px solid #3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" },
  header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", flexWrap: "wrap" },
  backBtn: { padding: "10px 18px", background: "white", border: "2px solid #e5e7eb", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#374151" },
  title: { flex: 1, margin: 0, fontSize: "26px", color: "#1a1a1a" },
  addBtn: { padding: "10px 20px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600" },
  pesan: { padding: "14px 20px", borderRadius: "10px", marginBottom: "20px", fontWeight: "600" },
  infoCard: { background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", padding: "16px 20px", borderRadius: "12px", marginBottom: "20px" },
  formCard: { background: "white", padding: "28px", borderRadius: "16px", marginBottom: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" },
  formTitle: { margin: "0 0 20px 0", fontSize: "20px" },
  sectionLabel: { margin: "20px 0 12px 0", fontSize: "16px", fontWeight: "700", color: "#667eea" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  inputGroup: { marginBottom: "16px" },
  label: { display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "13px", color: "#374151" },
  input: { width: "100%", padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" },
  fileInput: { width: "100%", padding: "10px", border: "2px dashed #d1d5db", borderRadius: "8px", boxSizing: "border-box" },
  hint: { margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280", fontStyle: "italic" },
  submitBtn: { width: "100%", padding: "14px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "16px", fontWeight: "700" },
  tabWrap: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" },
  tabBtn: { padding: "12px 24px", borderRadius: "10px", border: "2px solid #e5e7eb", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  empty: { textAlign: "center", background: "white", padding: "48px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" },
  card: { background: "white", padding: "20px", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", cursor: "pointer" },
  cardTags: { display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" },
  pertemuanBadge: { padding: "3px 10px", background: "#dbeafe", color: "#1e40af", borderRadius: "16px", fontSize: "11px", fontWeight: "700" },
  levelBadge: { padding: "3px 10px", color: "white", borderRadius: "16px", fontSize: "11px", fontWeight: "700" },
  aiBadge: { padding: "3px 10px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", borderRadius: "16px", fontSize: "11px", fontWeight: "700" },
  cardJudul: { margin: "0 0 4px 0", fontSize: "15px", color: "#1a1a1a" },
  cardDate: { margin: "0 0 8px 0", fontSize: "12px", color: "#9ca3af" },
  cardIsi: { margin: "0 0 12px 0", fontSize: "13px", color: "#4b5563", lineHeight: "1.5" },
  fileLink: { display: "inline-block", marginBottom: "8px", color: "#3b82f6", fontSize: "13px", fontWeight: "600", textDecoration: "none" },
  hapusBtn: { display: "block", width: "100%", padding: "8px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  viewBtn: { padding: "8px 14px", background: "#eef2ff", color: "#667eea", borderRadius: "8px", textAlign: "center", fontWeight: "600", fontSize: "13px" },
  // MODUL VIEW
  modulView: { background: "white", padding: "32px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" },
  backModulBtn: { padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", marginBottom: "20px", color: "#374151" },
  modulHeader: { textAlign: "center", marginBottom: "28px", borderBottom: "3px solid #667eea", paddingBottom: "16px" },
  modulTitle: { margin: 0, fontSize: "22px", color: "#1a1a1a" },
  modulSection: { marginBottom: "28px" },
  modulSectionTitle: { margin: "0 0 16px 0", fontSize: "18px", color: "#1e40af", borderBottom: "2px solid #dbeafe", paddingBottom: "8px" },
  infoTable: { width: "100%", borderCollapse: "collapse" },
  tdLabel: { padding: "10px 14px", background: "#f9fafb", fontWeight: "600", fontSize: "13px", color: "#374151", border: "1px solid #e5e7eb", width: "35%" },
  tdValue: { padding: "10px 14px", fontSize: "13px", color: "#1a1a1a", border: "1px solid #e5e7eb", lineHeight: "1.5" },
  modulBlock: { marginBottom: "16px" },
  modulBlockLabel: { margin: "0 0 6px 0", fontWeight: "700", fontSize: "14px", color: "#374151" },
  modulBlockText: { margin: "0 0 8px 0", fontSize: "14px", color: "#4b5563", lineHeight: "1.6" },
  modulFokus: { padding: "12px 16px", background: "#f0f4ff", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", color: "#1e40af", fontWeight: "600", fontStyle: "italic", border: "1px solid #e0e7ff" },
  skenarioCard: { padding: "16px 20px", background: "#f9fafb", borderRadius: "10px", marginBottom: "12px", border: "1px solid #e5e7eb" },
  skenarioTitle: { margin: "0 0 10px 0", fontSize: "15px", color: "#1e40af" },
  skenarioText: { margin: 0, fontSize: "14px", color: "#374151", lineHeight: "1.7", whiteSpace: "pre-wrap" },
  refleksiCard: { padding: "16px 20px", background: "#fef3c7", borderRadius: "10px", border: "1px solid #fde68a" },
  asesmenTable: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "12px 14px", background: "#667eea", color: "white", fontSize: "13px", fontWeight: "700", border: "1px solid #5b72d4", textAlign: "left" },
  td: { padding: "10px 14px", fontSize: "13px", color: "#374151", border: "1px solid #e5e7eb", lineHeight: "1.5", verticalAlign: "top" },
  tdCenter: { padding: "10px 14px", fontSize: "14px", color: "#374151", border: "1px solid #e5e7eb", textAlign: "center", fontWeight: "700" },
}