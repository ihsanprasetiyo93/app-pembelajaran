"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function SiswaAbsensiPage() {
  const [user, setUser] = useState(null)
  const [absensiList, setAbsensiList] = useState([])
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

    if (!userData || userData.role !== "siswa") {
      router.push("/dashboard")
      return
    }

    setUser(userData)

    // Ambil absensi siswa ini
    const { data: absensiData, error } = await supabase
      .from("absensi")
      .select("*")
      .eq("siswa_id", authUser.id)
      .order("tanggal", { ascending: false })

    if (error) {
      console.log("Error absensi:", error)
    }

    setAbsensiList(absensiData || [])
    setLoading(false)
  }

  function getStatusStyle(status) {
    if (status === "hadir") return { bg: "#dcfce7", color: "#166534", emoji: "✅", label: "Hadir" }
    if (status === "izin") return { bg: "#fef3c7", color: "#92400e", emoji: "📝", label: "Izin" }
    if (status === "sakit") return { bg: "#dbeafe", color: "#1e40af", emoji: "🤒", label: "Sakit" }
    return { bg: "#fee2e2", color: "#991b1b", emoji: "❌", label: "Alpa" }
  }

  // Hitung statistik
  const totalHadir = absensiList.filter((a) => a.status === "hadir").length
  const totalIzin = absensiList.filter((a) => a.status === "izin").length
  const totalSakit = absensiList.filter((a) => a.status === "sakit").length
  const totalAlpa = absensiList.filter((a) => a.status === "alpa").length
  const totalHari = absensiList.length

  const persenHadir = totalHari > 0
    ? Math.round((totalHadir / totalHari) * 100)
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
        <h1 style={styles.title}>📅 Absensi Saya</h1>
      </div>

      {/* Persentase Kehadiran */}
      <div style={styles.persenCard}>
        <div style={styles.persenCircle}>
          <p style={styles.persenNumber}>{persenHadir}%</p>
          <p style={styles.persenLabel}>Kehadiran</p>
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: "0 0 8px 0", color: "white", fontSize: "20px" }}>
            {persenHadir >= 90
              ? "🌟 Kehadiran Sangat Baik!"
              : persenHadir >= 75
              ? "👍 Kehadiran Baik!"
              : totalHari === 0
              ? "📝 Belum ada data absensi"
              : "💪 Tingkatkan kehadiranmu!"}
          </h2>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.85)", fontSize: "14px" }}>
            Total {totalHari} hari tercatat
          </p>
        </div>
      </div>

      {/* Statistik */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statEmoji}>✅</p>
          <p style={styles.statLabel}>Hadir</p>
          <p style={{ ...styles.statNumber, color: "#16a34a" }}>{totalHadir}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statEmoji}>📝</p>
          <p style={styles.statLabel}>Izin</p>
          <p style={{ ...styles.statNumber, color: "#d97706" }}>{totalIzin}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statEmoji}>🤒</p>
          <p style={styles.statLabel}>Sakit</p>
          <p style={{ ...styles.statNumber, color: "#2563eb" }}>{totalSakit}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statEmoji}>❌</p>
          <p style={styles.statLabel}>Alpa</p>
          <p style={{ ...styles.statNumber, color: "#dc2626" }}>{totalAlpa}</p>
        </div>
      </div>

      {/* Progress Bar */}
      {totalHari > 0 && (
        <div style={styles.barCard}>
          <p style={styles.barLabel}>Distribusi Kehadiran</p>
          <div style={styles.barWrap}>
            {totalHadir > 0 && (
              <div style={{
                ...styles.barSegment,
                width: `${(totalHadir / totalHari) * 100}%`,
                background: "#16a34a",
                borderRadius: totalIzin + totalSakit + totalAlpa === 0 ? "8px" : "8px 0 0 8px",
              }}>
                {persenHadir > 15 && `${Math.round((totalHadir / totalHari) * 100)}%`}
              </div>
            )}
            {totalIzin > 0 && (
              <div style={{
                ...styles.barSegment,
                width: `${(totalIzin / totalHari) * 100}%`,
                background: "#d97706",
              }}>
                {Math.round((totalIzin / totalHari) * 100) > 15 && `${Math.round((totalIzin / totalHari) * 100)}%`}
              </div>
            )}
            {totalSakit > 0 && (
              <div style={{
                ...styles.barSegment,
                width: `${(totalSakit / totalHari) * 100}%`,
                background: "#2563eb",
              }}>
                {Math.round((totalSakit / totalHari) * 100) > 15 && `${Math.round((totalSakit / totalHari) * 100)}%`}
              </div>
            )}
            {totalAlpa > 0 && (
              <div style={{
                ...styles.barSegment,
                width: `${(totalAlpa / totalHari) * 100}%`,
                background: "#dc2626",
                borderRadius: "0 8px 8px 0",
              }}>
                {Math.round((totalAlpa / totalHari) * 100) > 15 && `${Math.round((totalAlpa / totalHari) * 100)}%`}
              </div>
            )}
          </div>
          <div style={styles.legendWrap}>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#16a34a" }}></span> Hadir</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#d97706" }}></span> Izin</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#2563eb" }}></span> Sakit</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#dc2626" }}></span> Alpa</span>
          </div>
        </div>
      )}

      {/* Riwayat */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📋 Riwayat Kehadiran</h2>

        {absensiList.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: "48px", margin: 0 }}>📭</p>
            <p style={{ color: "#666", marginTop: "12px" }}>
              Belum ada data absensi.
            </p>
          </div>
        ) : (
          <div style={styles.listWrap}>
            {absensiList.map((item) => {
              const info = getStatusStyle(item.status)
              return (
                <div key={item.id} style={styles.absensiRow}>
                  <div style={{ flex: 1 }}>
                    <p style={styles.absensiTanggal}>
                      🗓️ {new Date(item.tanggal).toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div style={{
                    ...styles.statusBadge,
                    background: info.bg,
                    color: info.color,
                  }}>
                    {info.emoji} {info.label}
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
  persenCard: {
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    padding: "28px",
    borderRadius: "16px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "24px",
    flexWrap: "wrap",
  },
  persenCircle: {
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  persenNumber: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "700",
  },
  persenLabel: {
    margin: 0,
    fontSize: "12px",
    opacity: 0.9,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  statCard: {
    background: "white",
    padding: "16px",
    borderRadius: "16px",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  statEmoji: {
    margin: "0 0 4px 0",
    fontSize: "20px",
  },
  statLabel: {
    margin: "0 0 6px 0",
    fontSize: "12px",
    color: "#6b7280",
    fontWeight: "600",
  },
  statNumber: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "700",
  },
  barCard: {
    background: "white",
    padding: "20px 24px",
    borderRadius: "16px",
    marginBottom: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  barLabel: {
    margin: "0 0 12px 0",
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
  },
  barWrap: {
    display: "flex",
    height: "32px",
    borderRadius: "8px",
    overflow: "hidden",
    marginBottom: "12px",
  },
  barSegment: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "white",
    fontSize: "12px",
    fontWeight: "700",
    minWidth: "4px",
  },
  legendWrap: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#4b5563",
  },
  legendDot: {
    width: "12px",
    height: "12px",
    borderRadius: "3px",
    display: "inline-block",
  },
  section: {
    marginTop: "8px",
  },
  sectionTitle: {
    margin: "0 0 16px 0",
    fontSize: "20px",
    color: "#1a1a1a",
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
    gap: "10px",
  },
  absensiRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    background: "white",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  absensiTanggal: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "600",
    color: "#1a1a1a",
  },
  statusBadge: {
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "700",
    flexShrink: 0,
  },
}