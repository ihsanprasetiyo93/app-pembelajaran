"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function GuruNilaiPage() {
  const [user, setUser] = useState(null)
  const [nilaiList, setNilaiList] = useState([])
  const [materiList, setMateriList] = useState([])
  const [filterMateri, setFilterMateri] = useState("semua")
  const [loading, setLoading] = useState(true)
  const [viewDetail, setViewDetail] = useState(null)
  const [editingSkor, setEditingSkor] = useState({})
  const [saving, setSaving] = useState(false)
  const [pesan, setPesan] = useState("")
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push("/login"); return }

    const { data: userData } = await supabase.from("users").select("*").eq("id", authUser.id).single()
    if (!userData || userData.role !== "guru") { router.push("/dashboard"); return }

    setUser(userData)

    const { data: materiData } = await supabase.from("materi").select("*").eq("guru_id", authUser.id).order("created_at", { ascending: false })
    setMateriList(materiData || [])

    await loadNilai(materiData || [])
    setLoading(false)
  }

  async function loadNilai(materiData) {
    if (!materiData || materiData.length === 0) { setNilaiList([]); return }

    const materiIds = materiData.map((m) => m.id)

    const { data, error } = await supabase.from("nilai").select("*").in("materi_id", materiIds).order("created_at", { ascending: false })

    if (error) { console.log("Error nilai:", error); return }

    const nilaiDenganDetail = await Promise.all(
      (data || []).map(async (item) => {
        const { data: siswaData } = await supabase.from("users").select("nama, email").eq("id", item.siswa_id).single()
        const { data: materiDetail } = await supabase.from("materi").select("judul").eq("id", item.materi_id).single()

        return {
          ...item,
          siswa_nama: siswaData?.nama || "Tidak diketahui",
          siswa_email: siswaData?.email || "-",
          materi_judul: materiDetail?.judul || "Materi dihapus",
        }
      })
    )

    setNilaiList(nilaiDenganDetail)
  }

  function getNilaiColor(skor) {
    if (skor >= 80) return { bg: "#dcfce7", color: "#166534", label: "Sangat Baik" }
    if (skor >= 70) return { bg: "#dbeafe", color: "#1e40af", label: "Baik" }
    if (skor >= 60) return { bg: "#fef3c7", color: "#92400e", label: "Cukup" }
    return { bg: "#fee2e2", color: "#991b1b", label: "Perlu Bimbingan" }
  }

  function parseJawabanEssay(str) {
    if (!str) return null
    try { return JSON.parse(str) } catch { return null }
  }

  function openDetail(item) {
    setViewDetail(item)
    setEditingSkor({})
    setPesan("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handleEditSkor(soalId, nilaiBaru) {
    const num = parseInt(nilaiBaru, 10)
    if (isNaN(num) || num < 0 || num > 100) return
    setEditingSkor(prev => ({ ...prev, [soalId]: num }))
  }

  async function simpanNilaiEssay() {
    if (!viewDetail) return

    const data = parseJawabanEssay(viewDetail.jawaban_essay)
    if (!data) return

    setSaving(true)

    // Update skor essay yang diedit
    const detailEssayBaru = data.essay.map(e => {
      if (editingSkor[e.soal_id] !== undefined) {
        return { ...e, skor: editingSkor[e.soal_id] }
      }
      return e
    })

    // Hitung ulang nilai akhir
    const totalPG = data.total_pg || 0
    const totalEssay = data.total_essay || 0
    const totalSoal = totalPG + totalEssay
    const benarPG = data.benar_pg || 0

    let skorFinal = 0
    if (totalSoal > 0) {
      const nilaiPerSoal = 100 / totalSoal
      const skorPG = benarPG * nilaiPerSoal
      let skorEssayFinal = 0
      if (totalEssay > 0) {
        const totalSkorEssay = detailEssayBaru.reduce((sum, e) => sum + (e.skor || 0), 0)
        const rataEssay = totalSkorEssay / totalEssay
        skorEssayFinal = (rataEssay / 100) * (totalEssay * nilaiPerSoal)
      }
      skorFinal = Math.round(skorPG + skorEssayFinal)
    }

    const dataBaru = { ...data, essay: detailEssayBaru }

    const { error } = await supabase.from("nilai").update({
      skor: skorFinal,
      jawaban_essay: JSON.stringify(dataBaru),
    }).eq("id", viewDetail.id)

    if (error) {
      setPesan("❌ Gagal simpan: " + error.message)
    } else {
      setPesan("✅ Nilai berhasil diupdate!")
      setEditingSkor({})
      await loadNilai(materiList)
      setViewDetail({ ...viewDetail, skor: skorFinal, jawaban_essay: JSON.stringify(dataBaru) })
    }
    setSaving(false)
  }

  async function handleHapusNilai(id) {
    if (!confirm("Yakin hapus nilai ini?")) return
    await supabase.from("nilai").delete().eq("id", id)
    setViewDetail(null)
    await loadNilai(materiList)
    setPesan("🗑️ Nilai berhasil dihapus!")
  }

  const filteredNilai = filterMateri === "semua"
    ? nilaiList
    : nilaiList.filter((item) => String(item.materi_id) === filterMateri)

  const rataRata = filteredNilai.length > 0
    ? Math.round(filteredNilai.reduce((sum, item) => sum + item.skor, 0) / filteredNilai.length)
    : 0

  if (loading) {
    return (<div style={styles.center}><div style={styles.spinner}></div><p style={{ marginTop: "16px", color: "#666" }}>Loading...</p></div>)
  }

  // MODE DETAIL
  if (viewDetail) {
    const data = parseJawabanEssay(viewDetail.jawaban_essay)
    const nilaiInfo = getNilaiColor(viewDetail.skor)

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => { setViewDetail(null); setPesan("") }} style={styles.backBtn}>← Kembali</button>
          <h1 style={styles.title}>📊 Detail Jawaban Siswa</h1>
        </div>

        {pesan && (
          <div style={{
            padding: "12px 20px",
            borderRadius: "10px",
            marginBottom: "16px",
            background: pesan.startsWith("✅") || pesan.startsWith("🗑️") ? "#dcfce7" : "#fee2e2",
            color: pesan.startsWith("✅") || pesan.startsWith("🗑️") ? "#166534" : "#dc2626",
            fontWeight: "600",
          }}>{pesan}</div>
        )}

        <div style={styles.detailHeader}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "20px" }}>{viewDetail.siswa_nama}</h2>
            <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#6b7280" }}>{viewDetail.siswa_email}</p>
            <p style={{ margin: 0, fontSize: "13px", color: "#667eea", fontWeight: "600" }}>📚 {viewDetail.materi_judul}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ ...styles.skorBesar, background: nilaiInfo.bg, color: nilaiInfo.color }}>
              {viewDetail.skor}
            </div>
            <p style={{ margin: "6px 0 0 0", fontSize: "12px", fontWeight: "600", color: nilaiInfo.color }}>{nilaiInfo.label}</p>
          </div>
        </div>

        {data ? (
          <div>
            {/* Detail PG */}
            {data.pg && data.pg.length > 0 && (
              <div style={styles.sectionCard}>
                <h3 style={styles.sectionTitle}>📝 Pilihan Ganda ({data.benar_pg || 0}/{data.total_pg || 0} benar)</h3>
                {data.pg.map((d, i) => (
                  <div key={"pg-" + i} style={styles.detailCard}>
                    <p style={styles.detailQ}><strong>{i + 1}.</strong> {d.pertanyaan}</p>
                    <div style={{ display: "flex", gap: "12px", marginTop: "10px", flexWrap: "wrap" }}>
                      <span style={{
                        padding: "6px 12px",
                        background: d.benar ? "#dcfce7" : "#fee2e2",
                        color: d.benar ? "#166534" : "#991b1b",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}>
                        Jawaban Siswa: <strong>{d.jawaban_siswa}</strong> {d.benar ? "✅" : "❌"}
                      </span>
                      {!d.benar && (
                        <span style={{ padding: "6px 12px", background: "#dcfce7", color: "#166534", borderRadius: "8px", fontSize: "13px", fontWeight: "600" }}>
                          Jawaban Benar: <strong>{d.jawaban_benar}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Detail Essay */}
            {data.essay && data.essay.length > 0 && (
              <div style={styles.sectionCard}>
                <h3 style={styles.sectionTitle}>✍️ Essay ({data.total_essay} soal)</h3>
                <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#6b7280", fontStyle: "italic" }}>
                  💡 Nilai essay adalah auto-koreksi. Kamu bisa edit nilainya (0-100).
                </p>
                {data.essay.map((d, i) => {
                  const skorSekarang = editingSkor[d.soal_id] !== undefined ? editingSkor[d.soal_id] : d.skor
                  const isEdited = editingSkor[d.soal_id] !== undefined
                  return (
                    <div key={"essay-" + i} style={styles.detailCard}>
                      <p style={styles.detailQ}><strong>{(data.pg?.length || 0) + i + 1}.</strong> {d.pertanyaan}</p>

                      <div style={styles.essayBox}>
                        <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#0891b2", fontWeight: "700" }}>📝 Jawaban Siswa:</p>
                        <p style={{ margin: 0, fontSize: "13px", color: "#1a1a1a", lineHeight: "1.6" }}>{d.jawaban_siswa}</p>
                      </div>

                      <div style={{ ...styles.essayBox, background: "#fef3c7", border: "1px solid #fde68a" }}>
                        <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#92400e", fontWeight: "700" }}>🔑 Kunci Jawaban:</p>
                        <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: "1.6" }}>{d.kunci_essay}</p>
                      </div>

                      <div style={styles.skorEssayWrap}>
                        <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>Nilai (0-100):</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={skorSekarang}
                          onChange={(e) => handleEditSkor(d.soal_id, e.target.value)}
                          style={{
                            ...styles.skorInput,
                            border: isEdited ? "2px solid #667eea" : "2px solid #e5e7eb",
                            background: isEdited ? "#eef2ff" : "white",
                          }}
                        />
                        {isEdited && <span style={{ fontSize: "12px", color: "#667eea", fontWeight: "600" }}>✏️ Diedit</span>}
                      </div>
                    </div>
                  )
                })}

                {Object.keys(editingSkor).length > 0 && (
                  <button onClick={simpanNilaiEssay} disabled={saving} style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}>
                    {saving ? "⏳ Menyimpan..." : "💾 Simpan Perubahan Nilai"}
                  </button>
                )}
              </div>
            )}

            <button onClick={() => handleHapusNilai(viewDetail.id)} style={styles.hapusBtn}>
              🗑️ Hapus Nilai Ini
            </button>
          </div>
        ) : (
          <div style={styles.empty}>
            <p style={{ color: "#666" }}>Data jawaban tidak tersedia (nilai lama sebelum update)</p>
            <p style={{ color: "#666" }}>Skor: {viewDetail.skor}</p>
          </div>
        )}
      </div>
    )
  }

  // MODE UTAMA
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => router.push("/dashboard")} style={styles.backBtn}>← Kembali</button>
        <h1 style={styles.title}>📊 Nilai Siswa</h1>
      </div>

      {pesan && (
        <div style={{
          padding: "12px 20px", borderRadius: "10px", marginBottom: "16px",
          background: pesan.startsWith("✅") || pesan.startsWith("🗑️") ? "#dcfce7" : "#fee2e2",
          color: pesan.startsWith("✅") || pesan.startsWith("🗑️") ? "#166534" : "#dc2626",
          fontWeight: "600",
        }}>{pesan}</div>
      )}

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Total Pengerjaan</p>
          <p style={styles.statNumber}>{filteredNilai.length}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Rata-rata Nilai</p>
          <p style={{ ...styles.statNumber, color: rataRata >= 70 ? "#16a34a" : "#dc2626" }}>{rataRata}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Nilai Tertinggi</p>
          <p style={{ ...styles.statNumber, color: "#16a34a" }}>
            {filteredNilai.length > 0 ? Math.max(...filteredNilai.map((n) => n.skor)) : 0}
          </p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Nilai Terendah</p>
          <p style={{ ...styles.statNumber, color: "#dc2626" }}>
            {filteredNilai.length > 0 ? Math.min(...filteredNilai.map((n) => n.skor)) : 0}
          </p>
        </div>
      </div>

      <div style={styles.filterCard}>
        <label style={styles.filterLabel}>🔍 Filter Materi:</label>
        <select value={filterMateri} onChange={(e) => setFilterMateri(e.target.value)} style={styles.select}>
          <option value="semua">Semua Materi</option>
          {materiList.map((m) => (
            <option key={m.id} value={String(m.id)}>{m.judul}</option>
          ))}
        </select>
      </div>

      <div style={styles.tableCard}>
        <h2 style={styles.tableTitle}>📋 Daftar Nilai ({filteredNilai.length} data)</h2>

        {filteredNilai.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: "48px", margin: 0 }}>📭</p>
            <p style={{ color: "#666", marginTop: "12px" }}>Belum ada siswa yang mengerjakan kuis.</p>
          </div>
        ) : (
          <div style={styles.listWrap}>
            {filteredNilai.map((item, index) => {
              const nilaiInfo = getNilaiColor(item.skor)
              const punyaJawaban = !!item.jawaban_essay
              return (
                <div key={item.id} style={styles.nilaiRow} onClick={() => openDetail(item)}>
                  <div style={styles.nomor}>{index + 1}</div>

                  <div style={{ flex: 1 }}>
                    <p style={styles.siswaNama}>{item.siswa_nama}</p>
                    <p style={styles.siswaEmail}>{item.siswa_email}</p>
                    <p style={styles.materiJudul}>📚 {item.materi_judul}</p>
                    <p style={styles.tanggal}>
                      🗓️ {new Date(item.created_at).toLocaleDateString("id-ID", {
                        day: "numeric", month: "long", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                    {punyaJawaban && <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#667eea", fontWeight: "600" }}>👁️ Klik untuk lihat detail</p>}
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <div style={{ ...styles.skorBadge, background: nilaiInfo.bg, color: nilaiInfo.color }}>
                      {item.skor}
                    </div>
                    <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: nilaiInfo.color, fontWeight: "600" }}>{nilaiInfo.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%)", padding: "24px", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  center: { minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" },
  spinner: { width: "40px", height: "40px", border: "4px solid #e0e0e0", borderTop: "4px solid #3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" },
  header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", flexWrap: "wrap" },
  backBtn: { padding: "10px 18px", background: "white", border: "2px solid #e5e7eb", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#374151" },
  title: { flex: 1, margin: 0, fontSize: "28px", color: "#1a1a1a" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "20px" },
  statCard: { background: "white", padding: "20px", borderRadius: "16px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  statLabel: { margin: "0 0 8px 0", fontSize: "13px", color: "#6b7280", fontWeight: "600" },
  statNumber: { margin: 0, fontSize: "32px", fontWeight: "700", color: "#1a1a1a" },
  filterCard: { background: "white", padding: "20px 24px", borderRadius: "16px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" },
  filterLabel: { fontWeight: "600", fontSize: "14px", color: "#374151" },
  select: { padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", outline: "none", background: "white", minWidth: "200px" },
  tableCard: { background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  tableTitle: { margin: "0 0 20px 0", fontSize: "18px", color: "#1a1a1a" },
  empty: { textAlign: "center", padding: "40px" },
  listWrap: { display: "flex", flexDirection: "column", gap: "12px" },
  nilaiRow: { display: "flex", alignItems: "center", gap: "16px", padding: "16px", background: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb", cursor: "pointer", transition: "all 0.2s" },
  nomor: { width: "36px", height: "36px", borderRadius: "8px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", fontSize: "14px", flexShrink: 0 },
  siswaNama: { margin: "0 0 2px 0", fontSize: "15px", fontWeight: "700", color: "#1a1a1a" },
  siswaEmail: { margin: "0 0 4px 0", fontSize: "12px", color: "#6b7280" },
  materiJudul: { margin: "0 0 2px 0", fontSize: "12px", color: "#6b7280", fontWeight: "600" },
  tanggal: { margin: 0, fontSize: "12px", color: "#9ca3af" },
  skorBadge: { width: "60px", height: "60px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "20px", fontWeight: "700" },
  detailHeader: { background: "white", padding: "24px", borderRadius: "16px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" },
  skorBesar: { width: "80px", height: "80px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "28px", fontWeight: "700" },
  sectionCard: { background: "white", padding: "24px", borderRadius: "16px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  sectionTitle: { margin: "0 0 16px 0", fontSize: "18px", color: "#1a1a1a", borderBottom: "2px solid #e5e7eb", paddingBottom: "10px" },
  detailCard: { padding: "16px", background: "#f9fafb", borderRadius: "10px", marginBottom: "12px", border: "1px solid #e5e7eb" },
  detailQ: { margin: 0, fontSize: "14px", fontWeight: "600", color: "#1a1a1a", lineHeight: "1.5" },
  essayBox: { padding: "10px 14px", background: "#eff6ff", borderRadius: "8px", marginTop: "8px", border: "1px solid #bfdbfe" },
  skorEssayWrap: { display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", padding: "12px", background: "white", borderRadius: "8px", border: "1px solid #e5e7eb" },
  skorInput: { width: "80px", padding: "8px 12px", borderRadius: "8px", fontSize: "16px", fontWeight: "700", textAlign: "center", outline: "none" },
  saveBtn: { width: "100%", padding: "14px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "15px", fontWeight: "700", marginTop: "16px" },
  hapusBtn: { width: "100%", padding: "12px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600" },
}