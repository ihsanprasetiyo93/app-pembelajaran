"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"
import RichEditor from "../../../components/RichEditor"

export default function GuruMateriPage() {
  const [user, setUser] = useState(null)
  const [materiList, setMateriList] = useState([])
  const [kelasList, setKelasList] = useState([])
  const [tingkatList, setTingkatList] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [pesan, setPesan] = useState("")
  const [filterTingkat, setFilterTingkat] = useState("semua")
  const [editMode, setEditMode] = useState(false)
  const [editId, setEditId] = useState(null)
  const router = useRouter()

  const [judul, setJudul] = useState("")
  const [isi, setIsi] = useState("")
  const [file, setFile] = useState(null)
  const [fileLama, setFileLama] = useState(null)
  const [pertemuanKe, setPertemuanKe] = useState(1)
  const [tingkat, setTingkat] = useState("")
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

    var kelasResult = await supabase.from("kelas").select("*").order("jenjang").order("tingkat").order("rombel")
    setKelasList(kelasResult.data || [])

    var uniqueTingkat = []
    var seen = {}
    if (kelasResult.data) {
      kelasResult.data.forEach(function (k) {
        if (!seen[k.tingkat]) {
          seen[k.tingkat] = true
          uniqueTingkat.push({ tingkat: k.tingkat, jenjang: k.jenjang })
        }
      })
    }
    setTingkatList(uniqueTingkat)

    if (uniqueTingkat.length > 0) {
      setTingkat(uniqueTingkat[0].tingkat)
      setJenjang(uniqueTingkat[0].jenjang || "")
      setKelas(uniqueTingkat[0].tingkat)
    }

    await loadMateri(authUser.id)
    setLoading(false)
  }

  async function loadMateri(guruId) {
    var result = await supabase.from("materi").select("*").eq("guru_id", guruId).order("tingkat").order("pertemuan_ke", { ascending: true })
    setMateriList(result.data || [])
  }

  function handleTingkatChange(val) {
    setTingkat(val)
    var found = tingkatList.find(function (t) { return t.tingkat === val })
    if (found) {
      setJenjang(found.jenjang || "")
      setKelas(val)
    }

    if (!editMode) {
      var materiForTingkat = materiList.filter(function (m) { return m.tingkat === val })
      setPertemuanKe(materiForTingkat.length + 1)
    }
  }

  function resetForm() {
    setJudul("")
    setIsi("")
    setFile(null)
    setFileLama(null)
    setEditMode(false)
    setEditId(null)
    setPertemuanKe(1)
    setSatuanPendidikan("")
    setMataPelajaran("")
    setFase("")
    setSemester("Gasal")
    setAlokasiWaktu("2 x 45 Menit")
  }

  function handleEdit(item) {
    setEditMode(true)
    setEditId(item.id)
    setJudul(item.judul || "")
    setIsi(item.isi || "")
    setFileLama(item.file_url || null)
    setFile(null)
    setPertemuanKe(item.pertemuan_ke || 1)
    setTingkat(item.tingkat || "")
    setNamaPenyusun(item.nama_penyusun || (user ? user.nama : ""))
    setSatuanPendidikan(item.satuan_pendidikan || "")
    setMataPelajaran(item.mata_pelajaran || "")
    setFase(item.fase || "")
    setJenjang(item.jenjang || "")
    setKelas(item.kelas || item.tingkat || "")
    setSemester(item.semester || "Gasal")
    setAlokasiWaktu(item.alokasi_waktu || "2 x 45 Menit")
    setShowForm(true)
    setPesan("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!judul || !isi) { setPesan("❌ Judul dan isi wajib diisi!"); return }
    if (!tingkat) { setPesan("❌ Pilih tingkat kelas!"); return }
    if (!satuanPendidikan || !mataPelajaran) { setPesan("❌ Data sekolah wajib diisi!"); return }

    setSubmitting(true)
    setPesan("")

    var fileUrl = fileLama
    if (file) {
      var fileName = Date.now().toString() + "_" + file.name
      var uploadResult = await supabase.storage.from("materi-files").upload(fileName, file)
      if (uploadResult.error) { setPesan("❌ Gagal upload: " + uploadResult.error.message); setSubmitting(false); return }
      fileUrl = supabase.storage.from("materi-files").getPublicUrl(fileName).data.publicUrl
    }

    var dataMateri = {
      judul: judul,
      isi: isi,
      file_url: fileUrl,
      guru_id: user.id,
      pertemuan_ke: pertemuanKe,
      tingkat: tingkat,
      nama_penyusun: namaPenyusun,
      satuan_pendidikan: satuanPendidikan,
      mata_pelajaran: mataPelajaran,
      fase: fase,
      jenjang: jenjang,
      kelas: kelas,
      semester: semester,
      alokasi_waktu: alokasiWaktu,
    }

    if (editMode) {
      var updateResult = await supabase.from("materi").update(dataMateri).eq("id", editId)
      if (updateResult.error) {
        setPesan("❌ Gagal update: " + updateResult.error.message)
        setSubmitting(false)
        return
      }
      setPesan("✅ Materi berhasil diupdate!")
    } else {
      var insertResult = await supabase.from("materi").insert(dataMateri)
      if (insertResult.error) {
        setPesan("❌ Gagal simpan: " + insertResult.error.message)
        setSubmitting(false)
        return
      }
      setPesan("🎉 Materi berhasil disimpan!")
    }

    resetForm()
    setShowForm(false)
    await loadMateri(user.id)
    setSubmitting(false)
  }

  async function handleHapus(id, fileUrl) {
    if (!confirm("Yakin hapus materi ini?")) return
    if (fileUrl) {
      try {
        var fileName = fileUrl.split("/").pop()
        await supabase.storage.from("materi-files").remove([fileName])
      } catch (err) { }
    }
    await supabase.from("soal").delete().eq("materi_id", id)
    await supabase.from("materi").delete().eq("id", id)
    await loadMateri(user.id)
    setPesan("🗑️ Materi berhasil dihapus!")
  }

  var filteredMateri = filterTingkat === "semua" ? materiList : materiList.filter(function (m) { return m.tingkat === filterTingkat })

  if (loading) {
    return (<div style={st.center}><div style={st.spinner}></div><p style={{ marginTop: "16px", color: "#666" }}>Loading...</p></div>)
  }

  return (
    <div style={st.container}>
      <div style={st.header}>
        <button onClick={function () { router.push("/dashboard") }} style={st.backBtn}>← Kembali</button>
        <h1 style={st.title}>📚 Materi Pembelajaran</h1>
        <button onClick={function () {
          if (showForm) { resetForm() }
          setShowForm(!showForm)
          setPesan("")
        }} style={st.addBtn}>
          {showForm ? "✕ Tutup" : "+ Tambah Materi"}
        </button>
      </div>

      {pesan && (
        <div style={{ ...st.pesan, background: pesan.startsWith("✅") || pesan.startsWith("🎉") || pesan.startsWith("🗑️") ? "#dcfce7" : "#fee2e2", color: pesan.startsWith("✅") || pesan.startsWith("🎉") || pesan.startsWith("🗑️") ? "#166534" : "#dc2626" }}>
          {pesan}
        </div>
      )}

      <div style={st.infoCard}>
        <p style={{ margin: 0, fontSize: "14px" }}>
          📝 Materi berlaku untuk semua rombel di tingkat yang sama. Contoh: kelas <strong>VII</strong> → berlaku untuk VII-A, VII-B, VII-C
        </p>
      </div>

      {/* FORM */}
      {showForm && (
        <div style={st.formCard}>
          <h2 style={st.formTitle}>
            {editMode ? "✏️ Edit Materi" : "➕ Upload Materi Baru"}
          </h2>
          <form onSubmit={handleSubmit}>
            <p style={st.sectionLabel}>🏫 Tingkat Kelas</p>
            <div style={st.inputGroup}>
              <label style={st.label}>Pilih Tingkat Kelas *</label>
              <select value={tingkat} onChange={function (e) { handleTingkatChange(e.target.value) }} style={st.select}>
                <option value="">-- Pilih Tingkat --</option>
                {tingkatList.map(function (t) {
                  return <option key={t.tingkat} value={t.tingkat}>{t.jenjang} - Kelas {t.tingkat}</option>
                })}
              </select>
              <p style={st.hint}>Materi berlaku untuk semua rombel di tingkat ini</p>
            </div>

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
                <label style={st.label}>Semester</label>
                <select value={semester} onChange={function (e) { setSemester(e.target.value) }} style={st.select}>
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
            </div>
            <div style={st.inputGroup}>
              <label style={st.label}>Judul Materi *</label>
              <input type="text" placeholder="Contoh: Konsep Bersuci (Thaharah)" value={judul} onChange={function (e) { setJudul(e.target.value) }} style={st.input} />
            </div>
            <div style={st.inputGroup}>
              <label style={st.label}>Isi Materi *</label>
              <RichEditor value={isi} onChange={setIsi} />
            </div>
            <div style={st.inputGroup}>
              <label style={st.label}>Upload File (Opsional)</label>
              {fileLama && !file && (
                <div style={st.fileLamaInfo}>
                  📎 <a href={fileLama} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", fontWeight: "600" }}>File saat ini</a>
                  <span style={{ marginLeft: "8px", color: "#6b7280", fontSize: "12px" }}>(Upload file baru untuk mengganti)</span>
                </div>
              )}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={function (e) { setFile(e.target.files[0]) }} style={st.fileInput} />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              {editMode && (
                <button type="button" onClick={function () { resetForm(); setShowForm(false); setPesan("") }} style={st.cancelBtn}>
                  ✕ Batal
                </button>
              )}
              <button type="submit" disabled={submitting} style={{ ...st.submitBtn, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "⏳ Menyimpan..." : editMode ? "💾 Update Materi" : "💾 Simpan Materi"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER TINGKAT */}
      <div style={st.filterWrap}>
        <label style={{ fontSize: "14px", fontWeight: "600" }}>Filter Tingkat:</label>
        <select value={filterTingkat} onChange={function (e) { setFilterTingkat(e.target.value) }} style={st.filterSelect}>
          <option value="semua">Semua Tingkat ({materiList.length})</option>
          {tingkatList.map(function (t) {
            var count = materiList.filter(function (m) { return m.tingkat === t.tingkat }).length
            return <option key={t.tingkat} value={t.tingkat}>{t.jenjang} - {t.tingkat} ({count})</option>
          })}
        </select>
      </div>

      {/* DAFTAR MATERI */}
      {filteredMateri.length === 0 ? (
        <div style={st.empty}>
          <p style={{ fontSize: "48px", margin: 0 }}>📭</p>
          <p style={{ color: "#666", marginTop: "12px" }}>Belum ada materi.</p>
        </div>
      ) : (
        <div style={st.grid}>
          {filteredMateri.map(function (item) {
            return (
              <div key={item.id} style={st.card}>
                <div style={st.cardTags}>
                  <span style={st.tingkatBadge}>🏫 {item.tingkat}</span>
                  <span style={st.pertemuanBadge}>Pertemuan {item.pertemuan_ke}</span>
                </div>
                <h3 style={st.cardJudul}>{item.judul}</h3>
                <p style={st.cardDate}>{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p style={st.cardMapel}>📚 {item.mata_pelajaran} • {item.semester}</p>
                <div style={st.cardIsi} dangerouslySetInnerHTML={{
                  __html: item.isi && item.isi.length > 200 ? item.isi.substring(0, 200) + "..." : (item.isi || "")
                }}></div>
                {item.file_url && (
                  <a href={item.file_url} target="_blank" rel="noopener noreferrer" style={st.fileLink}>
                    📎 Lihat File
                  </a>
                )}
                <div style={st.actionRow}>
                  <button onClick={function () { handleEdit(item) }} style={st.editBtn}>
                    ✏️ Edit
                  </button>
                  <button onClick={function () { handleHapus(item.id, item.file_url) }} style={st.hapusBtn}>
                    🗑️ Hapus
                  </button>
                </div>
              </div>
            )
          })}
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
  select: { width: "100%", padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "white" },
  fileInput: { width: "100%", padding: "10px", border: "2px dashed #d1d5db", borderRadius: "8px", boxSizing: "border-box" },
  fileLamaInfo: { padding: "10px 14px", background: "#eff6ff", borderRadius: "8px", marginBottom: "8px", fontSize: "13px" },
  hint: { margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280", fontStyle: "italic" },
  submitBtn: { flex: 1, padding: "14px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "16px", fontWeight: "700" },
  cancelBtn: { padding: "14px 24px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600" },
  filterWrap: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", background: "white", padding: "12px 16px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  filterSelect: { padding: "8px 12px", border: "2px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", background: "white" },
  empty: { textAlign: "center", background: "white", padding: "48px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" },
  card: { background: "white", padding: "20px", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  cardTags: { display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" },
  tingkatBadge: { padding: "3px 10px", background: "#fef3c7", color: "#92400e", borderRadius: "16px", fontSize: "11px", fontWeight: "700" },
  pertemuanBadge: { padding: "3px 10px", background: "#dbeafe", color: "#1e40af", borderRadius: "16px", fontSize: "11px", fontWeight: "700" },
  cardJudul: { margin: "0 0 4px 0", fontSize: "16px", color: "#1a1a1a" },
  cardDate: { margin: "0 0 4px 0", fontSize: "12px", color: "#9ca3af" },
  cardMapel: { margin: "0 0 8px 0", fontSize: "12px", color: "#667eea", fontWeight: "600" },
  cardIsi: { margin: "0 0 12px 0", fontSize: "13px", color: "#4b5563", lineHeight: "1.5", maxHeight: "120px", overflow: "hidden" },
  fileLink: { display: "inline-block", marginBottom: "12px", color: "#3b82f6", fontSize: "13px", fontWeight: "600", textDecoration: "none" },
  actionRow: { display: "flex", gap: "8px" },
  editBtn: { flex: 1, padding: "8px", background: "#dbeafe", color: "#1e40af", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  hapusBtn: { flex: 1, padding: "8px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
}