"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function GuruAbsensiPage() {
  const [user, setUser] = useState(null)
  const [siswaList, setSiswaList] = useState([])
  const [absensiList, setAbsensiList] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pesan, setPesan] = useState("")
  const [tanggal, setTanggal] = useState("")
  const [absensiHariIni, setAbsensiHariIni] = useState({})
  const [tab, setTab] = useState("input")
  const router = useRouter()

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    setTanggal(today)
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

    // Ambil semua siswa
    const { data: siswaData } = await supabase
      .from("users")
      .select("*")
      .eq("role", "siswa")
      .order("nama", { ascending: true })

    setSiswaList(siswaData || [])

    // Set default absensi semua siswa = hadir
    const defaultAbsensi = {}
    if (siswaData) {
      siswaData.forEach((s) => {
        defaultAbsensi[s.id] = "hadir"
      })
    }
    setAbsensiHariIni(defaultAbsensi)

    // Ambil riwayat absensi
    await loadRiwayat()
    setLoading(false)
  }

  async function loadRiwayat() {
    const { data, error } = await supabase
      .from("absensi")
      .select("*")
      .order("tanggal", { ascending: false })

    if (error) {
      console.log("Error absensi:", error)
      return
    }

    // Ambil nama siswa untuk setiap absensi
    const absensiDenganNama = await Promise.all(
      (data || []).map(async (item) => {
        const { data: siswaData } = await supabase
          .from("users")
          .select("nama")
          .eq("id", item.siswa_id)
          .single()

        return {
          ...item,
          siswa_nama: siswaData?.nama || "Tidak diketahui",
        }
      })
    )

    setAbsensiList(absensiDenganNama)
  }

  function handleStatusChange(siswaId, status) {
    setAbsensiHariIni((prev) => ({
      ...prev,
      [siswaId]: status,
    }))
  }

  async function handleSimpanAbsensi() {
    if (!tanggal) {
      setPesan("❌ Pilih tanggal dulu!")
      return
    }

    if (siswaList.length === 0) {
      setPesan("❌ Belum ada data siswa!")
      return
    }

    setSubmitting(true)
    setPesan("")

    // Hapus absensi tanggal ini dulu (kalau ada)
    await supabase
      .from("absensi")
      .delete()
      .eq("tanggal", tanggal)

    // Insert absensi baru
    const dataAbsensi = siswaList.map((siswa) => ({
      siswa_id: siswa.id,
      tanggal: tanggal,
      status: absensiHariIni[siswa.id] || "hadir",
    }))

    const { error } = await supabase
      .from("absensi")
      .insert(dataAbsensi)

    if (error) {
      setPesan("❌ Gagal simpan absensi: " + error.message)
      setSubmitting(false)
      return
    }

    setPesan("✅ Absensi berhasil disimpan!")
    await loadRiwayat()
    setSubmitting(false)
  }

  function getStatusStyle(status) {
    if (status === "hadir") return { bg: "#dcfce7", color: "#166534", emoji: "✅" }
    if (status === "izin") return { bg: "#fef3c7", color: "#92400e", emoji: "📝" }
    if (status === "sakit") return { bg: "#dbeafe", color: "#1e40af", emoji: "🤒" }
    return { bg: "#fee2e2", color: "#991b1b", emoji: "❌" }
  }

  // Group riwayat absensi per tanggal
  function groupByTanggal() {
    const grouped = {}
    absensiList.forEach((item) => {
      if (!grouped[item.tanggal]) {
        grouped[item.tanggal] = []
      }
      grouped[item.tanggal].push(item)
    })
    return grouped
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: "16px", color: "#666" }}>Loading...</p>
      </div>
    )
  }

  const riwayatGrouped = groupByTanggal()

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => router.push("/dashboard")} style={styles.backBtn}>
          ← Kembali
        </button>
        <h1 style={styles.title}>✅ Absensi Siswa</h1>
      </div>

      {/* Pesan */}
      {pesan && (
        <div style={{
          ...styles.pesan,
          background: pesan.startsWith("✅") ? "#dcfce7" : "#fee2e2",
          color: pesan.startsWith("✅") ? "#166534" : "#dc2626",
        }}>
          {pesan}
        </div>
      )}

      {/* Tab */}
      <div style={styles.tabWrap}>
        <button
          onClick={() => setTab("input")}
          style={{
            ...styles.tabBtn,
            background: tab === "input" ? "linear-gradient(135deg, #667eea, #764ba2)" : "white",
            color: tab === "input" ? "white" : "#374151",
          }}
        >
          📝 Input Absensi
        </button>
        <button
          onClick={() => setTab("riwayat")}
          style={{
            ...styles.tabBtn,
            background: tab === "riwayat" ? "linear-gradient(135deg, #667eea, #764ba2)" : "white",
            color: tab === "riwayat" ? "white" : "#374151",
          }}
        >
          📋 Riwayat
        </button>
      </div>

      {/* Tab Input */}
      {tab === "input" && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📝 Input Absensi</h2>

          {/* Pilih Tanggal */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              style={styles.input}
            />
          </div>

          {/* Daftar Siswa */}
          {siswaList.length === 0 ? (
            <div style={styles.empty}>
              <p>Belum ada data siswa terdaftar.</p>
            </div>
          ) : (
            <div style={styles.siswaList}>
              {siswaList.map((siswa, index) => (
                <div key={siswa.id} style={styles.siswaRow}>
                  <div style={styles.siswaInfo}>
                    <div style={styles.nomor}>{index + 1}</div>
                    <div>
                      <p style={styles.siswaNama}>{siswa.nama}</p>
                      <p style={styles.siswaEmail}>{siswa.email}</p>
                    </div>
                  </div>

                  <div style={styles.statusWrap}>
                    {["hadir", "izin", "sakit", "alpa"].map((status) => {
                      const info = getStatusStyle(status)
                      const selected = absensiHariIni[siswa.id] === status
                      return (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(siswa.id, status)}
                          style={{
                            ...styles.statusBtn,
                            background: selected ? info.bg : "white",
                            color: selected ? info.color : "#9ca3af",
                            border: selected
                              ? "2px solid " + info.color
                              : "2px solid #e5e7eb",
                            fontWeight: selected ? "700" : "500",
                          }}
                        >
                          {info.emoji} {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tombol Simpan */}
          {siswaList.length > 0 && (
            <button
              onClick={handleSimpanAbsensi}
              disabled={submitting}
              style={{
                ...styles.submitBtn,
                opacity: submitting ? 0.7 : 1,
                marginTop: "20px",
              }}
            >
              {submitting ? "⏳ Menyimpan..." : "💾 Simpan Absensi"}
            </button>
          )}
        </div>
      )}

      {/* Tab Riwayat */}
      {tab === "riwayat" && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📋 Riwayat Absensi</h2>

          {Object.keys(riwayatGrouped).length === 0 ? (
            <div style={styles.empty}>
              <p style={{ fontSize: "48px", margin: 0 }}>📭</p>
              <p style={{ color: "#666", marginTop: "12px" }}>
                Belum ada riwayat absensi.
              </p>
            </div>
          ) : (
            Object.entries(riwayatGrouped).map(([tgl, list]) => (
              <div key={tgl} style={styles.riwayatGroup}>
                <h3 style={styles.riwayatTanggal}>
                  🗓️ {new Date(tgl).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h3>

                <div style={styles.riwayatList}>
                  {list.map((item) => {
                    const info = getStatusStyle(item.status)
                    return (
                      <div key={item.id} style={styles.riwayatRow}>
                        <span style={styles.riwayatNama}>{item.siswa_nama}</span>
                        <span style={{
                          ...styles.riwayatStatus,
                          background: info.bg,
                          color: info.color,
                        }}>
                          {info.emoji} {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
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
  pesan: {
    padding: "14px 20px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontWeight: "600",
  },
  tabWrap: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  tabBtn: {
    padding: "12px 24px",
    borderRadius: "10px",
    border: "2px solid #e5e7eb",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },
  card: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  cardTitle: {
    margin: "0 0 20px 0",
    fontSize: "20px",
    color: "#1a1a1a",
  },
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    fontSize: "14px",
    color: "#374151",
  },
  input: {
    padding: "12px 16px",
    border: "2px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "15px",
    outline: "none",
  },
  empty: {
    textAlign: "center",
    padding: "40px",
    color: "#666",
  },
  siswaList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  siswaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    background: "#f9fafb",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    flexWrap: "wrap",
    gap: "12px",
  },
  siswaInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
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
    margin: 0,
    fontWeight: "700",
    fontSize: "15px",
    color: "#1a1a1a",
  },
  siswaEmail: {
    margin: "2px 0 0 0",
    fontSize: "12px",
    color: "#6b7280",
  },
  statusWrap: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  statusBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "700",
  },
  riwayatGroup: {
    marginBottom: "24px",
  },
  riwayatTanggal: {
    margin: "0 0 12px 0",
    fontSize: "16px",
    color: "#374151",
    borderBottom: "2px solid #e5e7eb",
    paddingBottom: "8px",
  },
  riwayatList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  riwayatRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    background: "#f9fafb",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
  },
  riwayatNama: {
    fontWeight: "600",
    fontSize: "14px",
    color: "#1a1a1a",
  },
  riwayatStatus: {
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "600",
  },
}