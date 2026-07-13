"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function SiswaKuisPage() {
  const [user, setUser] = useState(null)
  const [materiList, setMateriList] = useState([])
  const [soalList, setSoalList] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState("pilih")
  const [selectedMateri, setSelectedMateri] = useState(null)
  const [jawaban, setJawaban] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [hasil, setHasil] = useState(null)
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push("/login"); return }

    const { data: userData } = await supabase.from("users").select("*").eq("id", authUser.id).single()
    if (!userData || userData.role !== "siswa") { router.push("/dashboard"); return }

    setUser(userData)

    const { data: soalData } = await supabase.from("soal").select("materi_id")
    const materiIds = [...new Set((soalData || []).map((s) => s.materi_id))]

    if (materiIds.length > 0) {
      const { data: materiData } = await supabase.from("materi").select("*").in("id", materiIds).order("created_at", { ascending: false })

      const materiDenganGuru = await Promise.all(
        (materiData || []).map(async (item) => {
          const { data: guruData } = await supabase.from("users").select("nama").eq("id", item.guru_id).single()

          const { data: allSoal } = await supabase.from("soal").select("jenis_soal").eq("materi_id", item.id)

          const totalPG = (allSoal || []).filter(s => (s.jenis_soal || "pg") === "pg").length
          const totalEssay = (allSoal || []).filter(s => s.jenis_soal === "essay").length

          return {
            ...item,
            guru_nama: guruData?.nama || "Guru",
            jumlah_soal: (allSoal || []).length,
            total_pg: totalPG,
            total_essay: totalEssay,
          }
        })
      )

      setMateriList(materiDenganGuru)
    }

    setLoading(false)
  }

  async function mulaiKuis(materi) {
    setSelectedMateri(materi)
    setJawaban({})
    setHasil(null)

    const { data: soalData, error } = await supabase.from("soal").select("*").eq("materi_id", materi.id).order("created_at", { ascending: true })

    if (error) { console.log("Error soal:", error); return }

    // Urutkan: PG dulu, baru essay
    const sorted = (soalData || []).sort((a, b) => {
      const ja = (a.jenis_soal || "pg") === "essay" ? 1 : 0
      const jb = (b.jenis_soal || "pg") === "essay" ? 1 : 0
      return ja - jb
    })

    setSoalList(sorted)
    setMode("kerjakan")
  }

  function pilihJawaban(soalId, jwb) {
    setJawaban((prev) => ({ ...prev, [soalId]: jwb }))
  }

  function getPilihanObject(pilihan) {
    if (!pilihan) return {}
    if (typeof pilihan === "object" && !Array.isArray(pilihan)) return pilihan
    if (Array.isArray(pilihan)) {
      const huruf = ["A", "B", "C", "D", "E"]
      const obj = {}
      pilihan.forEach((opsi, i) => { if (i < huruf.length) obj[huruf[i]] = opsi })
      return obj
    }
    try { return JSON.parse(pilihan) } catch { return {} }
  }

  // 🎯 AUTO KOREKSI ESSAY
  function koreksiEssay(jawabanSiswa, kunciJawaban) {
    if (!jawabanSiswa || !kunciJawaban) return 0

    const siswa = String(jawabanSiswa).toLowerCase().trim()
    const kunci = String(kunciJawaban).toLowerCase().trim()

    if (!siswa) return 0

    // Split kata kunci (buang kata yang terlalu pendek)
    const kataKunci = kunci
      .replace(/[.,!?;:()"]/g, " ")
      .split(/\s+/)
      .filter(k => k.length >= 4)

    if (kataKunci.length === 0) {
      // Kalau tidak ada kata kunci, cek apakah jawaban siswa mengandung sebagian besar kunci
      return siswa.includes(kunci.substring(0, Math.min(20, kunci.length))) ? 70 : 30
    }

    // Hitung berapa kata kunci yang ada di jawaban siswa
    const kataDitemukan = kataKunci.filter(k => siswa.includes(k))
    const persentase = (kataDitemukan.length / kataKunci.length) * 100

    return Math.round(persentase)
  }

  async function handleSubmit() {
    // Cek semua soal sudah dijawab
    const belumDijawab = soalList.filter((s) => !jawaban[s.id] || String(jawaban[s.id]).trim() === "")
    if (belumDijawab.length > 0) {
      alert("Masih ada " + belumDijawab.length + " soal yang belum dijawab!")
      return
    }

    setSubmitting(true)

    // Hitung skor PG
    const soalPG = soalList.filter(s => (s.jenis_soal || "pg") === "pg")
    const soalEssay = soalList.filter(s => s.jenis_soal === "essay")

    let benarPG = 0
    const detailPG = []
    soalPG.forEach((soal) => {
      const jawabanSiswa = jawaban[soal.id]
      const isBenar = jawabanSiswa === soal.jawaban_benar
      if (isBenar) benarPG++
      detailPG.push({
        soal_id: soal.id,
        pertanyaan: soal.pertanyaan,
        jawaban_siswa: jawabanSiswa,
        jawaban_benar: soal.jawaban_benar,
        pilihan: soal.pilihan,
        benar: isBenar,
      })
    })

    // Hitung skor Essay (auto koreksi)
    let totalSkorEssay = 0
    const detailEssay = []
    soalEssay.forEach((soal) => {
      const jawabanSiswa = jawaban[soal.id]
      const skorEssay = koreksiEssay(jawabanSiswa, soal.kunci_essay)
      totalSkorEssay += skorEssay
      detailEssay.push({
        soal_id: soal.id,
        pertanyaan: soal.pertanyaan,
        jawaban_siswa: jawabanSiswa,
        kunci_essay: soal.kunci_essay,
        skor: skorEssay,
      })
    })

    // Hitung nilai akhir
    const totalSoal = soalList.length
    let skorFinal = 0

    if (totalSoal > 0) {
      // Nilai per soal
      const nilaiPerSoal = 100 / totalSoal
      // PG: benar × nilai per soal
      const skorPG = benarPG * nilaiPerSoal
      // Essay: rata-rata × persentase soal essay dari total
      let skorEssayFinal = 0
      if (soalEssay.length > 0) {
        const rataEssay = totalSkorEssay / soalEssay.length
        skorEssayFinal = (rataEssay / 100) * (soalEssay.length * nilaiPerSoal)
      }
      skorFinal = Math.round(skorPG + skorEssayFinal)
    }

    // Simpan nilai + jawaban lengkap ke database
    const jawabanLengkap = {
      pg: detailPG,
      essay: detailEssay,
      total_pg: soalPG.length,
      total_essay: soalEssay.length,
      benar_pg: benarPG,
    }

    const { error } = await supabase.from("nilai").insert([{
      siswa_id: user.id,
      materi_id: selectedMateri.id,
      skor: skorFinal,
      jawaban_essay: JSON.stringify(jawabanLengkap),
    }])

    if (error) {
      console.log("Error simpan nilai:", error)
      alert("Gagal simpan nilai: " + error.message)
      setSubmitting(false)
      return
    }

    setHasil({
      skor: skorFinal,
      total_pg: soalPG.length,
      total_essay: soalEssay.length,
      benar_pg: benarPG,
      salah_pg: soalPG.length - benarPG,
      rata_essay: soalEssay.length > 0 ? Math.round(totalSkorEssay / soalEssay.length) : 0,
      detail_pg: detailPG,
      detail_essay: detailEssay,
    })

    setMode("hasil")
    setSubmitting(false)
  }

  function getGrade(skor) {
    if (skor >= 90) return { grade: "A", label: "Sangat Baik", color: "#16a34a", emoji: "🎉" }
    if (skor >= 80) return { grade: "B+", label: "Baik Sekali", color: "#059669", emoji: "😊" }
    if (skor >= 70) return { grade: "B", label: "Baik", color: "#0891b2", emoji: "👍" }
    if (skor >= 60) return { grade: "C", label: "Cukup", color: "#ca8a04", emoji: "💪" }
    if (skor >= 50) return { grade: "D", label: "Kurang", color: "#ea580c", emoji: "📚" }
    return { grade: "E", label: "Perlu Belajar Lagi", color: "#dc2626", emoji: "🔥" }
  }

  if (loading) {
    return (<div style={styles.center}><div style={styles.spinner}></div><p style={{ marginTop: "16px", color: "#666" }}>Loading...</p></div>)
  }

  // MODE: Pilih Kuis
  if (mode === "pilih") {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => router.push("/dashboard")} style={styles.backBtn}>← Kembali</button>
          <h1 style={styles.title}>✍️ Kerjakan Kuis</h1>
        </div>

        <div style={styles.infoCard}>
          <p style={{ margin: 0, fontSize: "15px" }}>📝 Pilih materi di bawah untuk mulai mengerjakan kuis.</p>
        </div>

        {materiList.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: "48px", margin: 0 }}>📭</p>
            <p style={{ color: "#666", marginTop: "12px" }}>Belum ada kuis yang tersedia.</p>
          </div>
        ) : (
          <div style={styles.listWrap}>
            {materiList.map((item) => (
              <div key={item.id} style={styles.kuisCard}>
                <div style={{ flex: 1 }}>
                  <h3 style={styles.kuisJudul}>{item.judul}</h3>
                  <p style={styles.kuisMeta}>👨‍🏫 {item.guru_nama}</p>
                  <div style={styles.badgeWrap}>
                    <span style={styles.badgeTotal}>❓ {item.jumlah_soal} soal</span>
                    {item.total_pg > 0 && <span style={styles.badgePG}>📝 {item.total_pg} PG</span>}
                    {item.total_essay > 0 && <span style={styles.badgeEssay}>✍️ {item.total_essay} Essay</span>}
                  </div>
                </div>
                <button onClick={() => mulaiKuis(item)} style={styles.mulaiBtn}>🚀 Mulai</button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // MODE: Kerjakan Kuis
  if (mode === "kerjakan") {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button
            onClick={() => {
              if (confirm("Yakin mau keluar? Jawaban tidak akan disimpan.")) setMode("pilih")
            }}
            style={styles.backBtn}
          >← Kembali</button>
          <h1 style={styles.title}>📝 {selectedMateri.judul}</h1>
        </div>

        <div style={styles.progressCard}>
          <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
            Dijawab: <strong>{Object.keys(jawaban).length}</strong> / {soalList.length} soal
          </p>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${(Object.keys(jawaban).length / soalList.length) * 100}%` }}></div>
          </div>
        </div>

        <div style={styles.listWrap}>
          {soalList.map((soal, index) => {
            const isEssay = (soal.jenis_soal || "pg") === "essay"
            const pilihanObj = getPilihanObject(soal.pilihan)

            return (
              <div key={soal.id} style={styles.soalCard}>
                <div style={styles.soalHeader}>
                  <div style={styles.nomor}>{index + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: "6px" }}>
                      <span style={{
                        padding: "2px 10px",
                        background: isEssay ? "#fef3c7" : "#dbeafe",
                        color: isEssay ? "#92400e" : "#1e40af",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "700",
                      }}>
                        {isEssay ? "✍️ Essay" : "📝 Pilihan Ganda"}
                      </span>
                    </div>
                    <p style={styles.soalText}>{soal.pertanyaan}</p>
                  </div>
                </div>

                {!isEssay && (
                  <div style={styles.pilihanWrap}>
                    {Object.entries(pilihanObj).map(([key, value]) => {
                      const selected = jawaban[soal.id] === key
                      return (
                        <div
                          key={key}
                          onClick={() => pilihJawaban(soal.id, key)}
                          style={{
                            ...styles.pilihanBtn,
                            background: selected ? "#eef2ff" : "white",
                            border: selected ? "2px solid #667eea" : "2px solid #e5e7eb",
                          }}
                        >
                          <span style={{ ...styles.pilihanKey, background: selected ? "#667eea" : "#9ca3af" }}>
                            {key}
                          </span>
                          <span style={{ fontSize: "14px", color: selected ? "#1a1a1a" : "#4b5563", fontWeight: selected ? "600" : "400" }}>
                            {value}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {isEssay && (
                  <div>
                    <textarea
                      value={jawaban[soal.id] || ""}
                      onChange={(e) => pilihJawaban(soal.id, e.target.value)}
                      placeholder="Tulis jawaban kamu di sini..."
                      style={styles.essayInput}
                      rows={5}
                    />
                    <p style={styles.essayHint}>💡 Jawab dengan jelas dan lengkap</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ ...styles.submitBtn, opacity: submitting ? 0.7 : 1, marginTop: "24px" }}
        >
          {submitting ? "⏳ Mengirim..." : "📤 Submit Jawaban"}
        </button>
      </div>
    )
  }

  // MODE: Hasil
  if (mode === "hasil") {
    const grade = getGrade(hasil.skor)

    return (
      <div style={styles.container}>
        <div style={styles.hasilCard}>
          <p style={{ fontSize: "64px", margin: 0 }}>{grade.emoji}</p>
          <h1 style={styles.hasilTitle}>{grade.label}</h1>

          <div style={{ ...styles.skorCircle, background: `linear-gradient(135deg, ${grade.color}, ${grade.color}dd)` }}>
            <p style={styles.skorNumber}>{hasil.skor}</p>
            <p style={styles.skorLabel}>Nilai • {grade.grade}</p>
          </div>

          <div style={styles.hasilDetail}>
            {hasil.total_pg > 0 && (
              <>
                <div style={styles.hasilItem}>
                  <p style={styles.hasilItemLabel}>PG Benar</p>
                  <p style={{ ...styles.hasilItemValue, color: "#16a34a" }}>{hasil.benar_pg}/{hasil.total_pg}</p>
                </div>
              </>
            )}
            {hasil.total_essay > 0 && (
              <div style={styles.hasilItem}>
                <p style={styles.hasilItemLabel}>Essay</p>
                <p style={{ ...styles.hasilItemValue, color: "#0891b2" }}>{hasil.rata_essay}</p>
              </div>
            )}
            <div style={styles.hasilItem}>
              <p style={styles.hasilItemLabel}>Total Soal</p>
              <p style={styles.hasilItemValue}>{hasil.total_pg + hasil.total_essay}</p>
            </div>
          </div>

          {hasil.total_essay > 0 && (
            <div style={styles.warningBox}>
              💡 Nilai essay adalah estimasi otomatis. Guru dapat mengoreksi ulang.
            </div>
          )}

          {/* DETAIL JAWABAN */}
          <div style={styles.reviewWrap}>
            <h3 style={styles.reviewTitle}>📋 Detail Jawaban</h3>

            {hasil.detail_pg.map((d, i) => (
              <div key={"pg-" + i} style={styles.reviewCard}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ padding: "2px 8px", background: "#dbeafe", color: "#1e40af", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>📝 PG</span>
                  <span style={{
                    padding: "2px 8px",
                    background: d.benar ? "#dcfce7" : "#fee2e2",
                    color: d.benar ? "#166534" : "#991b1b",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "700",
                  }}>
                    {d.benar ? "✅ Benar" : "❌ Salah"}
                  </span>
                </div>
                <p style={styles.reviewQ}><strong>{i + 1}.</strong> {d.pertanyaan}</p>
                <p style={{ margin: "8px 0 4px 0", fontSize: "13px", color: "#6b7280" }}>Jawaban Kamu: <strong style={{ color: d.benar ? "#16a34a" : "#dc2626" }}>{d.jawaban_siswa}</strong></p>
                {!d.benar && (
                  <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Jawaban Benar: <strong style={{ color: "#16a34a" }}>{d.jawaban_benar}</strong></p>
                )}
              </div>
            ))}

            {hasil.detail_essay.map((d, i) => (
              <div key={"essay-" + i} style={styles.reviewCard}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>✍️ Essay</span>
                  <span style={{ padding: "2px 8px", background: "#e0e7ff", color: "#4338ca", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>Skor: {d.skor}</span>
                </div>
                <p style={styles.reviewQ}><strong>{hasil.detail_pg.length + i + 1}.</strong> {d.pertanyaan}</p>
                <div style={styles.essayReviewBox}>
                  <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#667eea", fontWeight: "700" }}>📝 Jawaban Kamu:</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#374151" }}>{d.jawaban_siswa}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.hasilBtnWrap}>
            <button onClick={() => setMode("pilih")} style={styles.hasilBtn}>📝 Kuis Lain</button>
            <button onClick={() => router.push("/dashboard")} style={styles.hasilBtnPrimary}>🏠 Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

const styles = {
  container: { minHeight: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%)", padding: "24px", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  center: { minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" },
  spinner: { width: "40px", height: "40px", border: "4px solid #e0e0e0", borderTop: "4px solid #3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" },
  header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", flexWrap: "wrap" },
  backBtn: { padding: "10px 18px", background: "white", border: "2px solid #e5e7eb", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#374151" },
  title: { flex: 1, margin: 0, fontSize: "24px", color: "#1a1a1a" },
  infoCard: { background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", padding: "20px 24px", borderRadius: "16px", marginBottom: "24px" },
  empty: { textAlign: "center", background: "white", padding: "48px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  listWrap: { display: "flex", flexDirection: "column", gap: "16px" },
  kuisCard: { display: "flex", alignItems: "center", gap: "16px", background: "white", padding: "20px 24px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", flexWrap: "wrap" },
  kuisJudul: { margin: "0 0 4px 0", fontSize: "17px", color: "#1a1a1a" },
  kuisMeta: { margin: "0 0 8px 0", fontSize: "13px", color: "#6b7280" },
  badgeWrap: { display: "flex", gap: "6px", flexWrap: "wrap" },
  badgeTotal: { padding: "3px 10px", background: "#f3f4f6", color: "#374151", borderRadius: "6px", fontSize: "11px", fontWeight: "700" },
  badgePG: { padding: "3px 10px", background: "#dbeafe", color: "#1e40af", borderRadius: "6px", fontSize: "11px", fontWeight: "700" },
  badgeEssay: { padding: "3px 10px", background: "#fef3c7", color: "#92400e", borderRadius: "6px", fontSize: "11px", fontWeight: "700" },
  mulaiBtn: { padding: "12px 24px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px" },
  progressCard: { background: "white", padding: "16px 24px", borderRadius: "16px", marginBottom: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  progressBar: { width: "100%", height: "8px", background: "#e5e7eb", borderRadius: "4px", marginTop: "10px", overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(135deg, #667eea, #764ba2)", borderRadius: "4px", transition: "width 0.3s ease" },
  soalCard: { background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  soalHeader: { display: "flex", gap: "14px", marginBottom: "16px" },
  nomor: { width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", flexShrink: 0 },
  soalText: { margin: 0, fontSize: "16px", fontWeight: "600", color: "#1a1a1a", lineHeight: "1.5" },
  pilihanWrap: { display: "flex", flexDirection: "column", gap: "10px" },
  pilihanBtn: { display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "10px", cursor: "pointer", transition: "all 0.2s" },
  pilihanKey: { width: "32px", height: "32px", borderRadius: "8px", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", fontSize: "14px", flexShrink: 0 },
  essayInput: { width: "100%", padding: "14px", border: "2px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: "1.6" },
  essayHint: { margin: "6px 0 0 0", fontSize: "12px", color: "#6b7280", fontStyle: "italic" },
  submitBtn: { width: "100%", padding: "16px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontSize: "18px", fontWeight: "700" },
  hasilCard: { background: "white", padding: "48px 32px", borderRadius: "24px", textAlign: "center", maxWidth: "700px", margin: "0 auto", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" },
  hasilTitle: { margin: "16px 0 24px 0", fontSize: "28px", color: "#1a1a1a" },
  skorCircle: { width: "140px", height: "140px", borderRadius: "50%", color: "white", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", margin: "0 auto 24px auto" },
  skorNumber: { margin: 0, fontSize: "42px", fontWeight: "700" },
  skorLabel: { margin: "4px 0 0 0", fontSize: "13px", opacity: 0.9, fontWeight: "600" },
  hasilDetail: { display: "flex", justifyContent: "center", gap: "24px", marginBottom: "24px", flexWrap: "wrap" },
  hasilItem: { textAlign: "center", padding: "12px 20px", background: "#f9fafb", borderRadius: "10px", minWidth: "100px" },
  hasilItemLabel: { margin: "0 0 4px 0", fontSize: "13px", color: "#6b7280" },
  hasilItemValue: { margin: 0, fontSize: "24px", fontWeight: "700", color: "#1a1a1a" },
  warningBox: { padding: "12px 20px", background: "#fef3c7", color: "#92400e", borderRadius: "10px", fontSize: "13px", marginBottom: "24px", border: "1px solid #fde68a" },
  reviewWrap: { marginTop: "24px", textAlign: "left", borderTop: "2px solid #e5e7eb", paddingTop: "24px" },
  reviewTitle: { margin: "0 0 16px 0", fontSize: "18px", color: "#1a1a1a" },
  reviewCard: { padding: "16px", background: "#f9fafb", borderRadius: "10px", marginBottom: "12px", border: "1px solid #e5e7eb", textAlign: "left" },
  reviewQ: { margin: "0 0 8px 0", fontSize: "14px", color: "#1a1a1a", lineHeight: "1.5" },
  essayReviewBox: { padding: "10px 14px", background: "white", borderRadius: "8px", marginTop: "8px", border: "1px solid #e5e7eb" },
  hasilBtnWrap: { display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "24px" },
  hasilBtn: { padding: "12px 24px", background: "white", border: "2px solid #e5e7eb", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  hasilBtnPrimary: { padding: "12px 24px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
}