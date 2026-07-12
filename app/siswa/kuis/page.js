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

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      router.push("/login")
      return
    }

    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single()

    if (!userData || userData.role !== "siswa") {
      router.push("/dashboard")
      return
    }

    setUser(userData)

    // Ambil semua materi yang punya soal
    const { data: soalData } = await supabase
      .from("soal")
      .select("materi_id")

    const materiIds = [...new Set((soalData || []).map((s) => s.materi_id))]

    if (materiIds.length > 0) {
      const { data: materiData } = await supabase
        .from("materi")
        .select("*")
        .in("id", materiIds)
        .order("created_at", { ascending: false })

      // Ambil nama guru
      const materiDenganGuru = await Promise.all(
        (materiData || []).map(async (item) => {
          const { data: guruData } = await supabase
            .from("users")
            .select("nama")
            .eq("id", item.guru_id)
            .single()

          // Hitung jumlah soal
          const { count } = await supabase
            .from("soal")
            .select("*", { count: "exact", head: true })
            .eq("materi_id", item.id)

          return {
            ...item,
            guru_nama: guruData?.nama || "Guru",
            jumlah_soal: count || 0,
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

    // Ambil soal untuk materi ini
    const { data: soalData, error } = await supabase
      .from("soal")
      .select("*")
      .eq("materi_id", materi.id)
      .order("created_at", { ascending: true })

    if (error) {
      console.log("Error soal:", error)
      return
    }

    setSoalList(soalData || [])
    setMode("kerjakan")
  }

  function pilihJawaban(soalId, pilihan) {
    setJawaban((prev) => ({
      ...prev,
      [soalId]: pilihan,
    }))
  }

  function getPilihanObject(pilihan) {
    if (!pilihan) return {}
    if (typeof pilihan === "object") return pilihan
    try {
      return JSON.parse(pilihan)
    } catch {
      return {}
    }
  }

  async function handleSubmit() {
    // Cek semua soal sudah dijawab
    const belumDijawab = soalList.filter((s) => !jawaban[s.id])
    if (belumDijawab.length > 0) {
      alert("Masih ada " + belumDijawab.length + " soal yang belum dijawab!")
      return
    }

    setSubmitting(true)

    // Hitung skor
    let benar = 0
    soalList.forEach((soal) => {
      if (jawaban[soal.id] === soal.jawaban_benar) {
        benar++
      }
    })

    const skor = Math.round((benar / soalList.length) * 100)

    // Simpan nilai ke database
    const { error } = await supabase.from("nilai").insert([
      {
        siswa_id: user.id,
        materi_id: selectedMateri.id,
        skor: skor,
      },
    ])

    if (error) {
      console.log("Error simpan nilai:", error)
      alert("Gagal simpan nilai: " + error.message)
      setSubmitting(false)
      return
    }

    setHasil({
      benar: benar,
      total: soalList.length,
      skor: skor,
    })

    setMode("hasil")
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: "16px", color: "#666" }}>Loading...</p>
      </div>
    )
  }

  // MODE: Pilih Kuis
  if (mode === "pilih") {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => router.push("/dashboard")} style={styles.backBtn}>
            ← Kembali
          </button>
          <h1 style={styles.title}>✍️ Kerjakan Kuis</h1>
        </div>

        <div style={styles.infoCard}>
          <p style={{ margin: 0, fontSize: "15px" }}>
            📝 Pilih materi di bawah untuk mulai mengerjakan kuis.
          </p>
        </div>

        {materiList.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: "48px", margin: 0 }}>📭</p>
            <p style={{ color: "#666", marginTop: "12px" }}>
              Belum ada kuis yang tersedia.
            </p>
          </div>
        ) : (
          <div style={styles.listWrap}>
            {materiList.map((item) => (
              <div key={item.id} style={styles.kuisCard}>
                <div style={{ flex: 1 }}>
                  <h3 style={styles.kuisJudul}>{item.judul}</h3>
                  <p style={styles.kuisMeta}>
                    👨‍🏫 {item.guru_nama} • ❓ {item.jumlah_soal} soal
                  </p>
                </div>
                <button
                  onClick={() => mulaiKuis(item)}
                  style={styles.mulaiBtn}
                >
                  🚀 Mulai
                </button>
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
              if (confirm("Yakin mau keluar? Jawaban tidak akan disimpan.")) {
                setMode("pilih")
              }
            }}
            style={styles.backBtn}
          >
            ← Kembali
          </button>
          <h1 style={styles.title}>📝 {selectedMateri.judul}</h1>
        </div>

        {/* Progress */}
        <div style={styles.progressCard}>
          <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
            Dijawab: <strong>{Object.keys(jawaban).length}</strong> / {soalList.length} soal
          </p>
          <div style={styles.progressBar}>
            <div style={{
              ...styles.progressFill,
              width: `${(Object.keys(jawaban).length / soalList.length) * 100}%`,
            }}></div>
          </div>
        </div>

        {/* Soal-soal */}
        <div style={styles.listWrap}>
          {soalList.map((soal, index) => {
            const pilihanObj = getPilihanObject(soal.pilihan)

            return (
              <div key={soal.id} style={styles.soalCard}>
                <div style={styles.soalHeader}>
                  <div style={styles.nomor}>{index + 1}</div>
                  <p style={styles.soalText}>{soal.pertanyaan}</p>
                </div>

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
                          border: selected
                            ? "2px solid #667eea"
                            : "2px solid #e5e7eb",
                        }}
                      >
                        <span style={{
                          ...styles.pilihanKey,
                          background: selected ? "#667eea" : "#9ca3af",
                        }}>
                          {key}
                        </span>
                        <span style={{
                          fontSize: "14px",
                          color: selected ? "#1a1a1a" : "#4b5563",
                          fontWeight: selected ? "600" : "400",
                        }}>
                          {value}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tombol Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            ...styles.submitBtn,
            opacity: submitting ? 0.7 : 1,
            marginTop: "24px",
          }}
        >
          {submitting ? "⏳ Mengirim..." : "📤 Submit Jawaban"}
        </button>
      </div>
    )
  }

  // MODE: Hasil
  if (mode === "hasil") {
    return (
      <div style={styles.container}>
        <div style={styles.hasilCard}>
          <p style={{ fontSize: "64px", margin: 0 }}>
            {hasil.skor >= 80 ? "🎉" : hasil.skor >= 60 ? "👍" : "💪"}
          </p>
          <h1 style={styles.hasilTitle}>
            {hasil.skor >= 80 ? "Luar Biasa!" : hasil.skor >= 60 ? "Bagus!" : "Semangat!"}
          </h1>

          <div style={styles.skorCircle}>
            <p style={styles.skorNumber}>{hasil.skor}</p>
            <p style={styles.skorLabel}>Nilai</p>
          </div>

          <div style={styles.hasilDetail}>
            <div style={styles.hasilItem}>
              <p style={styles.hasilItemLabel}>Benar</p>
              <p style={{ ...styles.hasilItemValue, color: "#16a34a" }}>
                {hasil.benar}
              </p>
            </div>
            <div style={styles.hasilItem}>
              <p style={styles.hasilItemLabel}>Salah</p>
              <p style={{ ...styles.hasilItemValue, color: "#dc2626" }}>
                {hasil.total - hasil.benar}
              </p>
            </div>
            <div style={styles.hasilItem}>
              <p style={styles.hasilItemLabel}>Total</p>
              <p style={styles.hasilItemValue}>{hasil.total}</p>
            </div>
          </div>

          <div style={styles.hasilBtnWrap}>
            <button
              onClick={() => setMode("pilih")}
              style={styles.hasilBtn}
            >
              📝 Kuis Lain
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              style={styles.hasilBtnPrimary}
            >
              🏠 Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%)",
    padding: "24px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  center: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e0e0e0",
    borderTop: "4px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  backBtn: {
    padding: "10px 18px",
    background: "white",
    border: "2px solid #e5e7eb",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
  },
  title: {
    flex: 1,
    margin: 0,
    fontSize: "24px",
    color: "#1a1a1a",
  },
  infoCard: {
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    padding: "20px 24px",
    borderRadius: "16px",
    marginBottom: "24px",
  },
  empty: {
    textAlign: "center",
    background: "white",
    padding: "48px",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  listWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  kuisCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "white",
    padding: "20px 24px",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    flexWrap: "wrap",
  },
  kuisJudul: {
    margin: "0 0 4px 0",
    fontSize: "17px",
    color: "#1a1a1a",
  },
  kuisMeta: {
    margin: 0,
    fontSize: "13px",
    color: "#6b7280",
  },
  mulaiBtn: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
  },
  progressCard: {
    background: "white",
    padding: "16px 24px",
    borderRadius: "16px",
    marginBottom: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  progressBar: {
    width: "100%",
    height: "8px",
    background: "#e5e7eb",
    borderRadius: "4px",
    marginTop: "10px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    borderRadius: "4px",
    transition: "width 0.3s ease",
  },
  soalCard: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  soalHeader: {
    display: "flex",
    gap: "14px",
    marginBottom: "16px",
  },
  nomor: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: "700",
    flexShrink: 0,
  },
  soalText: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
    color: "#1a1a1a",
    lineHeight: "1.5",
  },
  pilihanWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  pilihanBtn: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  pilihanKey: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: "700",
    fontSize: "14px",
    flexShrink: 0,
  },
  submitBtn: {
    width: "100%",
    padding: "16px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: "700",
  },
  hasilCard: {
    background: "white",
    padding: "48px 32px",
    borderRadius: "24px",
    textAlign: "center",
    maxWidth: "500px",
    margin: "0 auto",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },
  hasilTitle: {
    margin: "16px 0 24px 0",
    fontSize: "28px",
    color: "#1a1a1a",
  },
  skorCircle: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto 24px auto",
  },
  skorNumber: {
    margin: 0,
    fontSize: "36px",
    fontWeight: "700",
  },
  skorLabel: {
    margin: 0,
    fontSize: "14px",
    opacity: 0.9,
  },
  hasilDetail: {
    display: "flex",
    justifyContent: "center",
    gap: "32px",
    marginBottom: "32px",
  },
  hasilItem: {
    textAlign: "center",
  },
  hasilItemLabel: {
    margin: "0 0 4px 0",
    fontSize: "13px",
    color: "#6b7280",
  },
  hasilItemValue: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "700",
    color: "#1a1a1a",
  },
  hasilBtnWrap: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  hasilBtn: {
    padding: "12px 24px",
    background: "white",
    border: "2px solid #e5e7eb",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },
  hasilBtnPrimary: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },
}