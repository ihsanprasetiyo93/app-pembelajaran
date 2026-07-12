"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { generateSoalPG, generateSoalEssay, generateSoalCampuran } from "../../../lib/gemini"
import { useRouter } from "next/navigation"

export default function GuruSoalPage() {
  const [user, setUser] = useState(null)
  const [materiList, setMateriList] = useState([])
  const [soalList, setSoalList] = useState([])
  const [loading, setLoading] = useState(true)
  const [pesan, setPesan] = useState("")
  const [tab, setTab] = useState("daftar")
  const router = useRouter()

  // AI Form
  const [materiId, setMateriId] = useState("")
  const [jenisSoal, setJenisSoal] = useState("pg")
  const [jumlahPG, setJumlahPG] = useState(5)
  const [jumlahEssay, setJumlahEssay] = useState(3)
  const [aiLoading, setAiLoading] = useState(false)
  const [previewSoal, setPreviewSoal] = useState(null)
  const [saving, setSaving] = useState(false)

  // Filter
  const [filterMateri, setFilterMateri] = useState("semua")
  const [filterJenis, setFilterJenis] = useState("semua")
  const [showKunci, setShowKunci] = useState({})

  useEffect(function () {
    loadData()
  }, [])

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
    return m ? m.judul : "Tidak ditemukan"
  }

  function getMateriIsi(id) {
    var m = materiList.find(function (item) { return String(item.id) === String(id) })
    return m ? m.isi : ""
  }

  async function handleGenerateAI() {
    if (!materiId) { setPesan("❌ Pilih materi dulu!"); return }

    var judulMateri = getMateriJudul(materiId)
    var isiMateri = getMateriIsi(materiId)

    if (!isiMateri) { setPesan("❌ Materi tidak ditemukan"); return }

    setAiLoading(true)
    setPesan("")
    setPreviewSoal(null)

    var result = null

    if (jenisSoal === "pg") {
      result = await generateSoalPG(judulMateri, isiMateri, jumlahPG)
      if (result.success) {
        setPreviewSoal({ type: "pg", data: result.data })
      }
    } else if (jenisSoal === "essay") {
      result = await generateSoalEssay(judulMateri, isiMateri, jumlahEssay)
      if (result.success) {
        setPreviewSoal({ type: "essay", data: result.data })
      }
    } else {
      result = await generateSoalCampuran(judulMateri, isiMateri, jumlahPG, jumlahEssay)
      if (result.success) {
        setPreviewSoal({ type: "campuran", data: result.data })
      }
    }

    if (!result.success) {
      setPesan("❌ Gagal generate: " + result.error)
    } else {
      setPesan("✅ Soal berhasil di-generate! Cek preview di bawah, lalu simpan.")
    }

    setAiLoading(false)
  }

  async function handleSimpanSoal() {
    if (!previewSoal) return

    setSaving(true)
    setPesan("")

    var soalToInsert = []
    var mid = isNaN(Number(materiId)) ? materiId : Number(materiId)

    if (previewSoal.type === "pg") {
      previewSoal.data.forEach(function (s) {
        soalToInsert.push({
          pertanyaan: s.pertanyaan,
          pilihan: s.pilihan,
          jawaban_benar: s.jawaban_benar,
          materi_id: mid,
          jenis_soal: "pg",
          is_auto_generated: true,
        })
      })
    } else if (previewSoal.type === "essay") {
      previewSoal.data.forEach(function (s) {
        soalToInsert.push({
          pertanyaan: s.pertanyaan,
          kunci_essay: s.kunci_jawaban,
          materi_id: mid,
          jenis_soal: "essay",
          is_auto_generated: true,
        })
      })
    } else if (previewSoal.type === "campuran") {
      if (previewSoal.data.pilihan_ganda) {
        previewSoal.data.pilihan_ganda.forEach(function (s) {
          soalToInsert.push({
            pertanyaan: s.pertanyaan,
            pilihan: s.pilihan,
            jawaban_benar: s.jawaban_benar,
            materi_id: mid,
            jenis_soal: "pg",
            is_auto_generated: true,
          })
        })
      }
      if (previewSoal.data.essay) {
        previewSoal.data.essay.forEach(function (s) {
          soalToInsert.push({
            pertanyaan: s.pertanyaan,
            kunci_essay: s.kunci_jawaban,
            materi_id: mid,
            jenis_soal: "essay",
            is_auto_generated: true,
          })
        })
      }
    }

    var result = await supabase.from("soal").insert(soalToInsert)

    if (result.error) {
      setPesan("❌ Gagal simpan: " + result.error.message)
    } else {
      setPesan("🎉 " + soalToInsert.length + " soal berhasil disimpan!")
      setPreviewSoal(null)
      await loadSoal(materiList)
    }

    setSaving(false)
  }

  async function handleHapusSoal(id) {
    if (!confirm("Yakin hapus soal ini?")) return
    await supabase.from("soal").delete().eq("id", id)
    await loadSoal(materiList)
  }

  function toggleKunci(id) {
    setShowKunci(function (prev) {
      var next = { ...prev }
      next[id] = !next[id]
      return next
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
    return (
      <div style={st.center}>
        <div style={st.spinner}></div>
        <p style={{ marginTop: "16px", color: "#666" }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={st.container}>
      <div style={st.header}>
        <button onClick={function () { router.push("/dashboard") }} style={st.backBtn}>← Kembali</button>
        <h1 style={st.title}>❓ Kelola Soal</h1>
      </div>

      {pesan && (
        <div style={{
          ...st.pesan,
          background: pesan.startsWith("✅") || pesan.startsWith("🎉") ? "#dcfce7" : pesan.startsWith("⏳") ? "#fef3c7" : "#fee2e2",
          color: pesan.startsWith("✅") || pesan.startsWith("🎉") ? "#166534" : pesan.startsWith("⏳") ? "#92400e" : "#dc2626",
        }}>
          {pesan}
        </div>
      )}

      {/* Tab */}
      <div style={st.tabWrap}>
        <button onClick={function () { setTab("ai") }} style={{ ...st.tabBtn, background: tab === "ai" ? "linear-gradient(135deg, #667eea, #764ba2)" : "white", color: tab === "ai" ? "white" : "#374151" }}>
          🤖 Buat Soal AI
        </button>
        <button onClick={function () { setTab("daftar") }} style={{ ...st.tabBtn, background: tab === "daftar" ? "linear-gradient(135deg, #667eea, #764ba2)" : "white", color: tab === "daftar" ? "white" : "#374151" }}>
          📋 Daftar Soal ({soalList.length})
        </button>
      </div>

      {/* TAB AI */}
      {tab === "ai" && (
        <div style={st.card}>
          <h2 style={st.cardTitle}>🤖 Ihsan AI - Buat Soal Otomatis</h2>

          {materiList.length === 0 ? (
            <div style={st.emptySmall}>
              <p>⚠️ Belum ada materi. Upload materi dulu!</p>
            </div>
          ) : (
            <div>
              <div style={st.formGroup}>
                <label style={st.label}>Pilih Materi *</label>
                <select value={materiId} onChange={function (e) { setMateriId(e.target.value) }} style={st.select}>
                  {materiList.map(function (m) {
                    return <option key={m.id} value={m.id}>Pertemuan {m.pertemuan_ke} - {m.judul}</option>
                  })}
                </select>
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>Jenis Soal *</label>
                <div style={st.jenisWrap}>
                  {[
                    { key: "pg", label: "📝 Pilihan Ganda", desc: "A, B, C, D + kunci jawaban" },
                    { key: "essay", label: "✍️ Essay", desc: "Soal uraian + panduan jawaban" },
                    { key: "campuran", label: "📋 Campuran", desc: "PG + Essay sekaligus" },
                  ].map(function (j) {
                    return (
                      <div
                        key={j.key}
                        onClick={function () { setJenisSoal(j.key) }}
                        style={{
                          ...st.jenisCard,
                          border: jenisSoal === j.key ? "2px solid #667eea" : "2px solid #e5e7eb",
                          background: jenisSoal === j.key ? "#eef2ff" : "white",
                        }}
                      >
                        <p style={{ margin: 0, fontWeight: "700", fontSize: "14px" }}>{j.label}</p>
                        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280" }}>{j.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {(jenisSoal === "pg" || jenisSoal === "campuran") && (
                <div style={st.formGroup}>
                  <label style={st.label}>Jumlah Soal Pilihan Ganda</label>
                  <input type="number" min="1" max="20" value={jumlahPG} onChange={function (e) { setJumlahPG(Number(e.target.value)) }} style={st.inputSmall} />
                </div>
              )}

              {(jenisSoal === "essay" || jenisSoal === "campuran") && (
                <div style={st.formGroup}>
                  <label style={st.label}>Jumlah Soal Essay</label>
                  <input type="number" min="1" max="10" value={jumlahEssay} onChange={function (e) { setJumlahEssay(Number(e.target.value)) }} style={st.inputSmall} />
                </div>
              )}

              <button
                onClick={handleGenerateAI}
                disabled={aiLoading}
                style={{ ...st.submitBtn, opacity: aiLoading ? 0.7 : 1 }}
              >
                {aiLoading ? "🤖 Ihsan AI sedang membuat soal..." : "✨ Generate Soal dengan Ihsan AI"}
              </button>
            </div>
          )}

          {/* Preview Soal */}
          {previewSoal && (
            <div style={st.previewWrap}>
              <h3 style={st.previewTitle}>👀 Preview Soal</h3>

              {/* PG Preview */}
              {(previewSoal.type === "pg" || previewSoal.type === "campuran") && (
                <div>
                  <h4 style={st.previewSubtitle}>📝 Pilihan Ganda</h4>
                  {(previewSoal.type === "pg" ? previewSoal.data : previewSoal.data.pilihan_ganda || []).map(function (s, i) {
                    return (
                      <div key={i} style={st.previewCard}>
                        <p style={st.previewQ}><strong>{i + 1}.</strong> {s.pertanyaan}</p>
                        {Object.entries(s.pilihan || {}).map(function (entry) {
                          return (
                            <p key={entry[0]} style={{
                              ...st.previewOption,
                              background: entry[0] === s.jawaban_benar ? "#dcfce7" : "#f9fafb",
                              fontWeight: entry[0] === s.jawaban_benar ? "700" : "400",
                            }}>
                              {entry[0]}. {entry[1]} {entry[0] === s.jawaban_benar ? " ✅" : ""}
                            </p>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Essay Preview */}
              {(previewSoal.type === "essay" || previewSoal.type === "campuran") && (
                <div>
                  <h4 style={st.previewSubtitle}>✍️ Essay</h4>
                  {(previewSoal.type === "essay" ? previewSoal.data : previewSoal.data.essay || []).map(function (s, i) {
                    return (
                      <div key={i} style={st.previewCard}>
                        <p style={st.previewQ}><strong>{i + 1}.</strong> {s.pertanyaan}</p>
                        <div style={st.kunciBox}>
                          <p style={{ margin: 0, fontSize: "12px", color: "#667eea", fontWeight: "700" }}>🔑 Kunci Jawaban (hanya guru):</p>
                          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#374151", lineHeight: "1.6" }}>{s.kunci_jawaban}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={st.previewActions}>
                <button onClick={handleGenerateAI} disabled={aiLoading} style={st.retryBtn}>
                  🔄 Generate Ulang
                </button>
                <button onClick={handleSimpanSoal} disabled={saving} style={{ ...st.saveBtn, opacity: saving ? 0.7 : 1 }}>
                  {saving ? "⏳ Menyimpan..." : "💾 Simpan Soal"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB DAFTAR SOAL */}
      {tab === "daftar" && (
        <div>
          {/* Filter */}
          <div style={st.filterWrap}>
            <div style={st.filterItem}>
              <label style={st.filterLabel}>Materi:</label>
              <select value={filterMateri} onChange={function (e) { setFilterMateri(e.target.value) }} style={st.filterSelect}>
                <option value="semua">Semua</option>
                {materiList.map(function (m) {
                  return <option key={m.id} value={String(m.id)}>{m.judul}</option>
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
                          <span style={{
                            ...st.jenisTag,
                            background: isEssay ? "#fef3c7" : "#dbeafe",
                            color: isEssay ? "#92400e" : "#1e40af",
                          }}>
                            {isEssay ? "✍️ Essay" : "📝 PG"}
                          </span>
                          {item.is_auto_generated && (
                            <span style={st.aiTag}>🤖 AI</span>
                          )}
                        </div>
                        <p style={st.soalText}>{item.pertanyaan}</p>
                      </div>
                    </div>

                    {/* Pilihan PG */}
                    {!isEssay && pil && Object.keys(pil).length > 0 && (
                      <div style={st.pilihanList}>
                        {Object.entries(pil).map(function (entry) {
                          return (
                            <div key={entry[0]} style={{
                              ...st.pilihanRow,
                              background: item.jawaban_benar === entry[0] ? "#dcfce7" : "#f9fafb",
                              border: item.jawaban_benar === entry[0] ? "1px solid #86efac" : "1px solid #e5e7eb",
                            }}>
                              <span style={{
                                ...st.pilihanKey,
                                background: item.jawaban_benar === entry[0] ? "#16a34a" : "#9ca3af",
                              }}>
                                {entry[0]}
                              </span>
                              <span style={{ fontSize: "14px" }}>{entry[1]}</span>
                              {item.jawaban_benar === entry[0] && (
                                <span style={st.benarText}>✅ Jawaban</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Kunci Essay */}
                    {isEssay && item.kunci_essay && (
                      <div>
                        <button onClick={function () { toggleKunci(item.id) }} style={st.kunciBtn}>
                          {showKunci[item.id] ? "🔒 Sembunyikan Kunci" : "🔑 Lihat Kunci Jawaban"}
                        </button>
                        {showKunci[item.id] && (
                          <div style={st.kunciBox}>
                            <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: "1.6" }}>
                              {item.kunci_essay}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <button onClick={function () { handleHapusSoal(item.id) }} style={st.hapusBtn}>
                      🗑️ Hapus
                    </button>
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
  inputSmall: { width: "120px", padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: "10px", fontSize: "15px", outline: "none" },
  jenisWrap: { display: "flex", gap: "10px", flexWrap: "wrap" },
  jenisCard: { padding: "14px 18px", borderRadius: "12px", cursor: "pointer", flex: 1, minWidth: "160px" },
  submitBtn: { width: "100%", padding: "14px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "16px", fontWeight: "700" },
  previewWrap: { marginTop: "24px", borderTop: "2px solid #e5e7eb", paddingTop: "24px" },
  previewTitle: { margin: "0 0 16px 0", fontSize: "18px" },
  previewSubtitle: { margin: "16px 0 12px 0", fontSize: "16px", color: "#374151" },
  previewCard: { padding: "16px", background: "#f9fafb", borderRadius: "10px", marginBottom: "12px", border: "1px solid #e5e7eb" },
  previewQ: { margin: "0 0 10px 0", fontSize: "15px", lineHeight: "1.5", color: "#1a1a1a" },
  previewOption: { margin: "0 0 6px 0", padding: "8px 12px", borderRadius: "6px", fontSize: "14px" },
  kunciBox: { padding: "12px 16px", background: "#fef3c7", borderRadius: "8px", marginTop: "8px", border: "1px solid #fde68a" },
  previewActions: { display: "flex", gap: "10px", marginTop: "20px", justifyContent: "flex-end" },
  retryBtn: { padding: "12px 20px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  saveBtn: { padding: "12px 24px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px" },
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
  aiTag: { padding: "2px 8px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", borderRadius: "6px", fontSize: "11px", fontWeight: "700" },
  soalText: { margin: 0, fontSize: "15px", fontWeight: "600", lineHeight: "1.5", color: "#1a1a1a" },
  pilihanList: { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" },
  pilihanRow: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px" },
  pilihanKey: { width: "28px", height: "28px", borderRadius: "6px", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", fontSize: "13px", flexShrink: 0 },
  benarText: { marginLeft: "auto", fontSize: "12px", fontWeight: "600", color: "#16a34a" },
  kunciBtn: { padding: "8px 16px", background: "#fef3c7", color: "#92400e", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", marginBottom: "8px" },
  hapusBtn: { display: "block", width: "100%", padding: "10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", marginTop: "12px" },
}