"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function GuruSoalPage() {
  const [user, setUser] = useState(null)
  const [materiList, setMateriList] = useState([])
  const [soalList, setSoalList] = useState([])
  const [loading, setLoading] = useState(true)
  const [pesan, setPesan] = useState("")
  const [tab, setTab] = useState("manual")
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  // Form manual
  const [materiId, setMateriId] = useState("")
  const [jenisSoal, setJenisSoal] = useState("pg")
  const [pertanyaan, setPertanyaan] = useState("")
  const [pilihanA, setPilihanA] = useState("")
  const [pilihanB, setPilihanB] = useState("")
  const [pilihanC, setPilihanC] = useState("")
  const [pilihanD, setPilihanD] = useState("")
  const [jawabanBenar, setJawabanBenar] = useState("A")
  const [kunciEssay, setKunciEssay] = useState("")

  // Filter
  const [filterMateri, setFilterMateri] = useState("semua")
  const [filterJenis, setFilterJenis] = useState("semua")
  const [showKunci, setShowKunci] = useState({})

  useEffect(function () { loadData() }, [])

  async function loadData() {
    var authResult = await supabase.auth.getUser()
    var authUser = authResult.data.user
    if (!authUser) { router.push("/login"); return }

    var userResult = await supabase.from("users").select("*").eq("id", authUser.id).single()
    if (!userResult.data || userResult.data.role !== "guru") { router.push("/dashboard"); return }
    setUser(userResult.data)

    var materiResult = await supabase.from("materi").select("*").eq("guru_id", authUser.id).order("pertemuan_ke", { ascending: true })
    setMateriList(materiResult.data || [])
    if (materiResult.data && materiResult.data.length > 0) {
      setMateriId(String(materiResult.data[0].id))
    }

    await loadSoal(materiResult.data || [])
    setLoading(false)
  }

  async function loadSoal(daftarMateri) {
    if (!daftarMateri || daftarMateri.length === 0) { setSoalList([]); return }
    var ids = daftarMateri.map(function (m) { return m.id })
    var result = await supabase.from("soal").select("*").in("materi_id", ids).order("created_at", { ascending: false })
    if (result.error) { console.log("Error:", result.error) }
    else { setSoalList(result.data || []) }
  }

  function getMateriJudul(id) {
    var m = materiList.find(function (item) { return String(item.id) === String(id) })
    return m ? "P" + m.pertemuan_ke + " - " + m.judul : "Tidak ditemukan"
  }

  async function handleTambahManual(e) {
    e.preventDefault()

    if (!materiId) { setPesan("❌ Pilih materi dulu!"); return }
    if (!pertanyaan) { setPesan("❌ Pertanyaan wajib diisi!"); return }

    if (jenisSoal === "pg") {
      if (!pilihanA || !pilihanB || !pilihanC || !pilihanD) {
        setPesan("❌ Semua pilihan jawaban wajib diisi!")
        return
      }
    } else {
      if (!kunciEssay) { setPesan("❌ Kunci jawaban wajib diisi!"); return }
    }

    setSubmitting(true)
    setPesan("")

    var dataInsert = {
      pertanyaan: pertanyaan,
      materi_id: isNaN(Number(materiId)) ? materiId : Number(materiId),
      jenis_soal: jenisSoal,
      is_auto_generated: false,
    }

    if (jenisSoal === "pg") {
      dataInsert.pilihan = { A: pilihanA, B: pilihanB, C: pilihanC, D: pilihanD }
      dataInsert.jawaban_benar = jawabanBenar
    } else {
      dataInsert.kunci_essay = kunciEssay
    }

    var result = await supabase.from("soal").insert([dataInsert])

    if (result.error) {
      setPesan("❌ Gagal simpan: " + result.error.message)
    } else {
      setPesan("✅ Soal berhasil ditambahkan!")
      setPertanyaan(""); setPilihanA(""); setPilihanB("")
      setPilihanC(""); setPilihanD(""); setJawabanBenar("A")
      setKunciEssay("")
      await loadSoal(materiList)
    }

    setSubmitting(false)
  }

  async function handleHapus(id) {
    if (!confirm("Yakin hapus soal ini?")) return
    await supabase.from("soal").delete().eq("id", id)
    await loadSoal(materiList)
  }

  function toggleKunci(id) {
    setShowKunci(function (prev) {
      return { ...prev, [id]: !prev[id] }
    })
  }

  function getPilihanObject(pilihan) {
    if (!pilihan) return {}
    if (typeof pilihan === "object") return pilihan
    try { return JSON.parse(pilihan) } catch (e) { return {} }
  }

  var filteredSoal = soalList.filter(function (s) {
    var matchMateri = filterMateri === "semua" || String(s.materi_id) === filterMateri
    var matchJenis = filterJenis === "semua" || (s.jenis_soal || "pg") === filterJenis
    return matchMateri && matchJenis
  })

  if (loading) {
    return (<div style={st.center}><div style={st.spinner}></div><p style={{ marginTop: "16px", color: "#666" }}>Loading...</p></div>)
  }

  return (
    <div style={st.container}>
      <div style={st.header}>
        <button onClick={function () { router.push("/dashboard") }} style={st.backBtn}>← Kembali</button>
        <h1 style={st.title}>❓ Kelola Soal</h1>
      </div>

      {pesan && (
        <div style={{ ...st.pesan, background: pesan.startsWith("✅") ? "#dcfce7" : "#fee2e2", color: pesan.startsWith("✅") ? "#166534" : "#dc2626" }}>
          {pesan}
        </div>
      )}

      {/* Tab */}
      <div style={st.tabWrap}>
        <button onClick={function () { setTab("manual") }} style={{ ...st.tabBtn, background: tab === "manual" ? "linear-gradient(135deg, #667eea, #764ba2)" : "white", color: tab === "manual" ? "white" : "#374151" }}>
          ✍️ Buat Soal Manual
        </button>
        <button onClick={function () { setTab("daftar") }} style={{ ...st.tabBtn, background: tab === "daftar" ? "linear-gradient(135deg, #667eea, #764ba2)" : "white", color: tab === "daftar" ? "white" : "#374151" }}>
          📋 Daftar Soal ({soalList.length})
        </button>
      </div>

      {/* TAB MANUAL */}
      {tab === "manual" && (
        <div style={st.card}>
          <h2 style={st.cardTitle}>✍️ Buat Soal Manual</h2>

          {materiList.length === 0 ? (
            <div style={st.emptySmall}>⚠️ Belum ada materi. Upload materi dulu!</div>
          ) : (
            <form onSubmit={handleTambahManual}>
              <div style={st.formGroup}>
                <label style={st.label}>Pilih Materi *</label>
                <select value={materiId} onChange={function (e) { setMateriId(e.target.value) }} style={st.select}>
                  {materiList.map(function (m) {
                    return <option key={m.id} value={m.id}>P{m.pertemuan_ke} - {m.judul}</option>
                  })}
                </select>
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>Jenis Soal *</label>
                <div style={st.jenisWrap}>
                  <div onClick={function () { setJenisSoal("pg") }} style={{ ...st.jenisCard, border: jenisSoal === "pg" ? "2px solid #667eea" : "2px solid #e5e7eb", background: jenisSoal === "pg" ? "#eef2ff" : "white" }}>
                    <p style={{ margin: 0, fontWeight: "700", fontSize: "14px" }}>📝 Pilihan Ganda</p>
                    <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280" }}>A, B, C, D + kunci</p>
                  </div>
                  <div onClick={function () { setJenisSoal("essay") }} style={{ ...st.jenisCard, border: jenisSoal === "essay" ? "2px solid #667eea" : "2px solid #e5e7eb", background: jenisSoal === "essay" ? "#eef2ff" : "white" }}>
                    <p style={{ margin: 0, fontWeight: "700", fontSize: "14px" }}>✍️ Essay</p>
                    <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280" }}>Uraian + panduan jawaban</p>
                  </div>
                </div>
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>Pertanyaan *</label>
                <textarea
                  value={pertanyaan}
                  onChange={function (e) { setPertanyaan(e.target.value) }}
                  placeholder="Tulis pertanyaan di sini..."
                  style={st.textarea}
                  rows={3}
                />
              </div>

              {jenisSoal === "pg" && (
                <>
                  <div style={st.formGroup}>
                    <label style={st.label}>Pilihan Jawaban *</label>
                    {[
                      { key: "A", value: pilihanA, setter: setPilihanA },
                      { key: "B", value: pilihanB, setter: setPilihanB },
                      { key: "C", value: pilihanC, setter: setPilihanC },
                      { key: "D", value: pilihanD, setter: setPilihanD },
                    ].map(function (p) {
                      return (
                        <div key={p.key} style={st.pilihanRow}>
                          <span style={{ ...st.pilihanKey, background: jawabanBenar === p.key ? "#667eea" : "#9ca3af" }}>
                            {p.key}
                          </span>
                          <input
                            type="text"
                            placeholder={"Pilihan " + p.key}
                            value={p.value}
                            onChange={function (e) { p.setter(e.target.value) }}
                            style={st.pilihanInput}
                          />
                        </div>
                      )
                    })}
                  </div>

                  <div style={st.formGroup}>
                    <label style={st.label}>Jawaban Benar *</label>
                    <div style={st.jawabanWrap}>
                      {["A", "B", "C", "D"].map(function (j) {
                        return (
                          <button key={j} type="button" onClick={function () { setJawabanBenar(j) }}
                            style={{ ...st.jawabanBtn, background: jawabanBenar === j ? "linear-gradient(135deg, #667eea, #764ba2)" : "white", color: jawabanBenar === j ? "white" : "#374151", border: jawabanBenar === j ? "2px solid #667eea" : "2px solid #e5e7eb" }}>
                            {j}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {jenisSoal === "essay" && (
                <div style={st.formGroup}>
                  <label style={st.label}>🔑 Kunci Jawaban (hanya guru yang lihat) *</label>
                  <textarea
                    value={kunciEssay}
                    onChange={function (e) { setKunciEssay(e.target.value) }}
                    placeholder="Tulis panduan/kunci jawaban essay..."
                    style={{ ...st.textarea, background: "#fef3c7" }}
                    rows={4}
                  />
                </div>
              )}

              <button type="submit" disabled={submitting} style={{ ...st.submitBtn, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "⏳ Menyimpan..." : "💾 Simpan Soal"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB DAFTAR */}
      {tab === "daftar" && (
        <div>
          <div style={st.filterWrap}>
            <div style={st.filterItem}>
              <label style={st.filterLabel}>Materi:</label>
              <select value={filterMateri} onChange={function (e) { setFilterMateri(e.target.value) }} style={st.filterSelect}>
                <option value="semua">Semua</option>
                {materiList.map(function (m) {
                  return <option key={m.id} value={String(m.id)}>P{m.pertemuan_ke} - {m.judul}</option>
                })}
              </select>
            </div>
            <div style={st.filterItem}>
              <label style={st.filterLabel}>Jenis:</label>
              <select value={filterJenis} onChange={function (e) { setFilterJenis(e.target.value) }} style={st.filterSelect}>
                <option value="semua">Semua</option>
                <option value="pg">Pilihan Ganda</option>
                <option value="essay">Essay</option>
              </select>
            </div>
          </div>

          {filteredSoal.length === 0 ? (
            <div style={st.empty}>
              <p style={{ fontSize: "48px", margin: 0 }}>📭</p>
              <p style={{ color: "#666", marginTop: "12px" }}>Belum ada soal.</p>
            </div>
          ) : (
            <div style={st.listWrap}>
              {filteredSoal.map(function (item, index) {
                var pil = getPilihanObject(item.pilihan)
                var isEssay = (item.jenis_soal || "pg") === "essay"

                return (
                  <div key={item.id} style={st.soalCard}>
                    <div style={st.soalTop}>
                      <div style={st.nomor}>{index + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={st.soalTags}>
                          <span style={st.materiTag}>📚 {getMateriJudul(item.materi_id)}</span>
                          <span style={{ ...st.jenisTag, background: isEssay ? "#fef3c7" : "#dbeafe", color: isEssay ? "#92400e" : "#1e40af" }}>
                            {isEssay ? "✍️ Essay" : "📝 PG"}
                          </span>
                        </div>
                        <p style={st.soalText}>{item.pertanyaan}</p>
                      </div>
                    </div>

                    {!isEssay && pil && Object.keys(pil).length > 0 && (
                      <div style={st.pilihanList}>
                        {Object.entries(pil).map(function (entry) {
                          return (
                            <div key={entry[0]} style={{ ...st.pilihanItem, background: item.jawaban_benar === entry[0] ? "#dcfce7" : "#f9fafb", border: item.jawaban_benar === entry[0] ? "1px solid #86efac" : "1px solid #e5e7eb" }}>
                              <span style={{ ...st.pilihanKeyShow, background: item.jawaban_benar === entry[0] ? "#16a34a" : "#9ca3af" }}>{entry[0]}</span>
                              <span style={{ fontSize: "14px" }}>{entry[1]}</span>
                              {item.jawaban_benar === entry[0] && <span style={st.benarText}>✅ Jawaban</span>}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {isEssay && item.kunci_essay && (
                      <div>
                        <button onClick={function () { toggleKunci(item.id) }} style={st.kunciBtn}>
                          {showKunci[item.id] ? "🔒 Sembunyikan Kunci" : "🔑 Lihat Kunci Jawaban"}
                        </button>
                        {showKunci[item.id] && (
                          <div style={st.kunciBox}>
                            <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: "1.6" }}>{item.kunci_essay}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <button onClick={function () { handleHapus(item.id) }} style={st.hapusBtn}>🗑️ Hapus</button>
                  </div>
                )
              })}
            </div>
          )}
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
  title: { flex: 1, margin: 0, fontSize: "28px", color: "#1a1a1a" },
  pesan: { padding: "14px 20px", borderRadius: "10px", marginBottom: "20px", fontWeight: "600" },
  tabWrap: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" },
  tabBtn: { padding: "12px 24px", borderRadius: "10px", border: "2px solid #e5e7eb", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  card: { background: "white", padding: "28px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" },
  cardTitle: { margin: "0 0 24px 0", fontSize: "20px", color: "#1a1a1a" },
  emptySmall: { padding: "20px", textAlign: "center", color: "#92400e", background: "#fef3c7", borderRadius: "10px" },
  formGroup: { marginBottom: "20px" },
  label: { display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#374151" },
  select: { width: "100%", padding: "12px 16px", border: "2px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "white" },
  textarea: { width: "100%", padding: "12px 16px", border: "2px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" },
  jenisWrap: { display: "flex", gap: "10px", flexWrap: "wrap" },
  jenisCard: { padding: "14px 18px", borderRadius: "12px", cursor: "pointer", flex: 1, minWidth: "140px" },
  pilihanRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" },
  pilihanKey: { width: "36px", height: "36px", borderRadius: "8px", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", fontSize: "14px", flexShrink: 0 },
  pilihanInput: { flex: 1, padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", outline: "none" },
  jawabanWrap: { display: "flex", gap: "10px" },
  jawabanBtn: { width: "50px", height: "50px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "18px" },
  submitBtn: { width: "100%", padding: "14px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "16px", fontWeight: "700" },
  filterWrap: { display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap", background: "white", padding: "16px 20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  filterItem: { display: "flex", alignItems: "center", gap: "8px" },
  filterLabel: { fontSize: "14px", fontWeight: "600", color: "#374151" },
  filterSelect: { padding: "8px 12px", border: "2px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", background: "white" },
  empty: { textAlign: "center", background: "white", padding: "48px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  listWrap: { display: "flex", flexDirection: "column", gap: "16px" },
  soalCard: { background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  soalTop: { display: "flex", gap: "14px", marginBottom: "14px" },
  nomor: { width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", flexShrink: 0 },
  soalTags: { display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" },
  materiTag: { padding: "2px 8px", background: "#f3f4f6", borderRadius: "6px", fontSize: "11px", color: "#6b7280", fontWeight: "600" },
  jenisTag: { padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" },
  soalText: { margin: 0, fontSize: "15px", fontWeight: "600", lineHeight: "1.5", color: "#1a1a1a" },
  pilihanList: { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" },
  pilihanItem: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px" },
  pilihanKeyShow: { width: "28px", height: "28px", borderRadius: "6px", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", fontSize: "13px", flexShrink: 0 },
  benarText: { marginLeft: "auto", fontSize: "12px", fontWeight: "600", color: "#16a34a" },
  kunciBtn: { padding: "8px 16px", background: "#fef3c7", color: "#92400e", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", marginBottom: "8px" },
  kunciBox: { padding: "12px 16px", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fde68a" },
  hapusBtn: { display: "block", width: "100%", padding: "10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", marginTop: "12px" },
}