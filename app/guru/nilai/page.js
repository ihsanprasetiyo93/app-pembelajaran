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

    if (!userData || userData.role !== "guru") {
      router.push("/dashboard")
      return
    }

    setUser(userData)

    // Ambil materi milik guru
    const { data: materiData } = await supabase
      .from("materi")
      .select("*")
      .eq("guru_id", authUser.id)
      .order("created_at", { ascending: false })

    setMateriList(materiData || [])

    // Ambil nilai siswa
    await loadNilai(materiData || [])
    setLoading(false)
  }

  async function loadNilai(materiData) {
    if (!materiData || materiData.length === 0) {
      setNilaiList([])
      return
    }

    const materiIds = materiData.map((m) => m.id)

    const { data, error } = await supabase
      .from("nilai")
      .select("*")
      .in("materi_id", materiIds)
      .order("created_at", { ascending: false })

    if (error) {
      console.log("Error nilai:", error)
      return
    }

    // Ambil data siswa dan materi untuk setiap nilai
    const nilaiDenganDetail = await Promise.all(
      (data || []).map(async (item) => {
        // Ambil nama siswa
        const { data: siswaData } = await supabase
          .from("users")
          .select("nama, email")
          .eq("id", item.siswa_id)
          .single()

        // Ambil judul materi
        const { data: materiDetail } = await supabase
          .from("materi")
          .select("judul")
          .eq("id", item.materi_id)
          .single()

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

  const filteredNilai = filterMateri === "semua"
    ? nilaiList
    : nilaiList.filter((item) => String(item.materi_id) === filterMateri)

  const rataRata = filteredNilai.length > 0
    ? Math.round(filteredNilai.reduce((sum, item) => sum + item.skor, 0) / filteredNilai.length)
    : 0

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: "16px", color: "#666" }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => router.push("/dashboard")} style={styles.backBtn}>
          ← Kembali
        </button>
        <h1 style={styles.title}>📊 Nilai Siswa</h1>
      </div>

      {/* Statistik */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Total Pengerjaan</p>
          <p style={styles.statNumber}>{filteredNilai.length}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Rata-rata Nilai</p>
          <p style={{
            ...styles.statNumber,
            color: rataRata >= 70 ? "#16a34a" : "#dc2626"
          }}>
            {rataRata}
          </p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Nilai Tertinggi</p>
          <p style={{ ...styles.statNumber, color: "#16a34a" }}>
            {filteredNilai.length > 0
              ? Math.max(...filteredNilai.map((n) => n.skor))
              : 0}
          </p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Nilai Terendah</p>
          <p style={{ ...styles.statNumber, color: "#dc2626" }}>
            {filteredNilai.length > 0
              ? Math.min(...filteredNilai.map((n) => n.skor))
              : 0}
          </p>
        </div>
      </div>

      {/* Filter Materi */}
      <div style={styles.filterCard}>
        <label style={styles.filterLabel}>🔍 Filter berdasarkan Materi:</label>
        <select
          value={filterMateri}
          onChange={(e) => setFilterMateri(e.target.value)}
          style={styles.select}
        >
          <option value="semua">Semua Materi</option>
          {materiList.map((m) => (
            <option key={m.id} value={String(m.id)}>
              {m.judul}
            </option>
          ))}
        </select>
      </div>

      {/* Tabel Nilai */}
      <div style={styles.tableCard}>
        <h2 style={styles.tableTitle}>
          📋 Daftar Nilai ({filteredNilai.length} data)
        </h2>

        {filteredNilai.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: "48px", margin: 0 }}>📭</p>
            <p style={{ color: "#666", marginTop: "12px" }}>
              Belum ada siswa yang mengerjakan kuis.
            </p>
          </div>
        ) : (
          <div style={styles.listWrap}>
            {filteredNilai.map((item, index) => {
              const nilaiInfo = getNilaiColor(item.skor)
              return (
                <div key={item.id} style={styles.nilaiRow}>
                  {/* Nomor */}
                  <div style={styles.nomor}>{index + 1}</div>

                  {/* Info Siswa */}
                  <div style={{ flex: 1 }}>
                    <p style={styles.siswaNama}>{item.siswa_nama}</p>
                    <p style={styles.siswaEmail}>{item.siswa_email}</p>
                    <p style={styles.materiJudul}>📚 {item.materi_judul}</p>
                    <p style={styles.tanggal}>
                      🗓️ {new Date(item.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Nilai */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      ...styles.skorBadge,
                      background: nilaiInfo.bg,
                      color: nilaiInfo.color,
                    }}>
                      {item.skor}
                    </div>
                    <p style={{
                      margin: "6px 0 0 0",
                      fontSize: "11px",
                      color: nilaiInfo.color,
                      fontWeight: "600",
                    }}>
                      {nilaiInfo.label}
                    </p>
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
    fontSize: "28px",
    color: "#1a1a1a",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  statCard: {
    background: "white",
    padding: "20px",
    borderRadius: "16px",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  statLabel: {
    margin: "0 0 8px 0",
    fontSize: "13px",
    color: "#6b7280",
    fontWeight: "600",
  },
  statNumber: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "700",
    color: "#1a1a1a",
  },
  filterCard: {
    background: "white",
    padding: "20px 24px",
    borderRadius: "16px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  filterLabel: {
    fontWeight: "600",
    fontSize: "14px",
    color: "#374151",
  },
  select: {
    padding: "10px 14px",
    border: "2px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
    background: "white",
    minWidth: "200px",
  },
  tableCard: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  tableTitle: {
    margin: "0 0 20px 0",
    fontSize: "18px",
    color: "#1a1a1a",
  },
  empty: {
    textAlign: "center",
    padding: "40px",
  },
  listWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  nilaiRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px",
    background: "#f9fafb",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
  },
  nomor: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: "700",
    fontSize: "14px",
    flexShrink: 0,
  },
  siswaNama: {
    margin: "0 0 2px 0",
    fontSize: "15px",
    fontWeight: "700",
    color: "#1a1a1a",
  },
  siswaEmail: {
    margin: "0 0 4px 0",
    fontSize: "12px",
    color: "#6b7280",
  },
  materiJudul: {
    margin: "0 0 2px 0",
    fontSize: "12px",
    color: "#6b7280",
    fontWeight: "600",
  },
  tanggal: {
    margin: 0,
    fontSize: "12px",
    color: "#9ca3af",
  },
  skorBadge: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "20px",
    fontWeight: "700",
  },
}