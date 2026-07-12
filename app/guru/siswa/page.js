"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function GuruSiswaPage() {
  const [user, setUser] = useState(null)
  const [siswaList, setSiswaList] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("pending")
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
    await loadSiswa()
    setLoading(false)
  }

  async function loadSiswa() {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "siswa")
      .order("created_at", { ascending: false })

    if (error) {
      console.log("Error:", error)
      return
    }

    setSiswaList(data || [])
  }

  async function handleApprove(id) {
    const { error } = await supabase
      .from("users")
      .update({ status: "approved" })
      .eq("id", id)

    if (error) {
      alert("Gagal approve: " + error.message)
      return
    }

    await loadSiswa()
  }

  async function handleReject(id) {
    if (!confirm("Yakin mau tolak siswa ini?")) return

    const { error } = await supabase
      .from("users")
      .update({ status: "rejected" })
      .eq("id", id)

    if (error) {
      alert("Gagal reject: " + error.message)
      return
    }

    await loadSiswa()
  }

  async function handleDelete(id) {
    if (!confirm("Yakin mau hapus siswa ini?")) return

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id)

    if (error) {
      alert("Gagal hapus: " + error.message)
      return
    }

    await loadSiswa()
  }

  function getStatusStyle(status) {
    if (status === "approved") return { bg: "#dcfce7", color: "#166534", label: "✅ Disetujui" }
    if (status === "rejected") return { bg: "#fee2e2", color: "#991b1b", label: "❌ Ditolak" }
    return { bg: "#fef3c7", color: "#92400e", label: "⏳ Menunggu" }
  }

  const filteredSiswa = siswaList.filter((s) => {
    if (tab === "pending") return s.status === "pending" || !s.status
    if (tab === "approved") return s.status === "approved"
    if (tab === "rejected") return s.status === "rejected"
    return true
  })

  const pendingCount = siswaList.filter((s) => s.status === "pending" || !s.status).length

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
      <div style={styles.header}>
        <button onClick={() => router.push("/dashboard")} style={styles.backBtn}>
          ← Kembali
        </button>
        <h1 style={styles.title}>👥 Daftar Siswa</h1>
        {pendingCount > 0 && (
          <div style={styles.notifBadge}>
            {pendingCount} menunggu
          </div>
        )}
      </div>

      {/* Tab */}
      <div style={styles.tabWrap}>
        {["pending", "approved", "rejected"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...styles.tabBtn,
              background: tab === t ? "linear-gradient(135deg, #667eea, #764ba2)" : "white",
              color: tab === t ? "white" : "#374151",
            }}
          >
            {t === "pending" ? "⏳ Menunggu" : t === "approved" ? "✅ Disetujui" : "❌ Ditolak"}
          </button>
        ))}
      </div>

      {/* List */}
      {filteredSiswa.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ fontSize: "48px", margin: 0 }}>📭</p>
          <p style={{ color: "#666", marginTop: "12px" }}>
            Tidak ada siswa di kategori ini.
          </p>
        </div>
      ) : (
        <div style={styles.listWrap}>
          {filteredSiswa.map((siswa) => {
            const info = getStatusStyle(siswa.status || "pending")
            return (
              <div key={siswa.id} style={styles.siswaCard}>
                <div style={styles.siswaInfo}>
                  <div style={{
                    ...styles.avatarSmall,
                    background: siswa.is_online
                      ? "linear-gradient(135deg, #16a34a, #22c55e)"
                      : "linear-gradient(135deg, #9ca3af, #6b7280)",
                  }}>
                    {siswa.nama.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.nameRow}>
                      <h3 style={styles.siswaNama}>{siswa.nama}</h3>
                      <span style={{
                        ...styles.onlineBadge,
                        background: siswa.is_online ? "#dcfce7" : "#f3f4f6",
                        color: siswa.is_online ? "#16a34a" : "#9ca3af",
                      }}>
                        {siswa.is_online ? "🟢 Online" : "⚫ Offline"}
                      </span>
                    </div>
                    <p style={styles.siswaEmail}>{siswa.email}</p>
                    <p style={styles.siswaDate}>
                      Daftar: {new Date(siswa.created_at).toLocaleDateString("id-ID", {
                        day: "numeric", month: "long", year: "numeric"
                      })}
                    </p>
                    {siswa.last_seen && (
                      <p style={styles.lastSeen}>
                        Terakhir aktif: {new Date(siswa.last_seen).toLocaleString("id-ID")}
                      </p>
                    )}
                  </div>
                </div>

                <div style={styles.actionWrap}>
                  <span style={{
                    ...styles.statusBadge,
                    background: info.bg,
                    color: info.color,
                  }}>
                    {info.label}
                  </span>

                  {(siswa.status === "pending" || !siswa.status) && (
                    <div style={styles.btnGroup}>
                      <button
                        onClick={() => handleApprove(siswa.id)}
                        style={styles.approveBtn}
                      >
                        ✅ Setujui
                      </button>
                      <button
                        onClick={() => handleReject(siswa.id)}
                        style={styles.rejectBtn}
                      >
                        ❌ Tolak
                      </button>
                    </div>
                  )}

                  {siswa.status === "rejected" && (
                    <div style={styles.btnGroup}>
                      <button
                        onClick={() => handleApprove(siswa.id)}
                        style={styles.approveBtn}
                      >
                        ✅ Setujui
                      </button>
                      <button
                        onClick={() => handleDelete(siswa.id)}
                        style={styles.deleteBtn}
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  )}

                  {siswa.status === "approved" && (
                    <div style={styles.btnGroup}>
                      <button
                        onClick={() => handleReject(siswa.id)}
                        style={styles.rejectBtn}
                      >
                        ❌ Cabut Akses
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
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
  notifBadge: {
    padding: "8px 16px",
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: "20px",
    fontWeight: "700",
    fontSize: "13px",
  },
  tabWrap: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  tabBtn: {
    padding: "12px 24px",
    borderRadius: "10px",
    border: "2px solid #e5e7eb",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
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
  siswaCard: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  siswaInfo: {
    display: "flex",
    gap: "16px",
    marginBottom: "16px",
  },
  avatarSmall: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "20px",
    fontWeight: "700",
    flexShrink: 0,
  },
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  siswaNama: {
    margin: 0,
    fontSize: "17px",
    color: "#1a1a1a",
  },
  onlineBadge: {
    padding: "3px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
  },
  siswaEmail: {
    margin: "4px 0 2px 0",
    fontSize: "13px",
    color: "#6b7280",
  },
  siswaDate: {
    margin: "2px 0",
    fontSize: "12px",
    color: "#9ca3af",
  },
  lastSeen: {
    margin: "2px 0 0 0",
    fontSize: "12px",
    color: "#9ca3af",
  },
  actionWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
  statusBadge: {
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "700",
  },
  btnGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  approveBtn: {
    padding: "10px 18px",
    background: "#dcfce7",
    color: "#166534",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "13px",
  },
  rejectBtn: {
    padding: "10px 18px",
    background: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "13px",
  },
  deleteBtn: {
    padding: "10px 18px",
    background: "#fecaca",
    color: "#991b1b",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "13px",
  },
}