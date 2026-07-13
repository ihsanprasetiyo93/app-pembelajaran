"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function GuruSiswaPage() {
  const [user, setUser] = useState(null)
  const [siswaList, setSiswaList] = useState([])
  const [kelasList, setKelasList] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("pending")
  const [filterKelas, setFilterKelas] = useState("semua")
  const router = useRouter()

  useEffect(function () {
    loadData()
    var interval = setInterval(function () { loadSiswa() }, 5000)
    return function () { clearInterval(interval) }
  }, [])

  async function loadData() {
    var authResult = await supabase.auth.getUser()
    var authUser = authResult.data.user
    if (!authUser) { router.push("/login"); return }

    var userResult = await supabase.from("users").select("*").eq("id", authUser.id).single()
    if (!userResult.data || userResult.data.role !== "guru") { router.push("/dashboard"); return }

    setUser(userResult.data)

    var kelasResult = await supabase.from("kelas").select("*").order("jenjang").order("tingkat").order("rombel")
    setKelasList(kelasResult.data || [])

    await loadSiswa()
    setLoading(false)
  }

  async function loadSiswa() {
    var result = await supabase.from("users").select("*, kelas(nama_kelas, tingkat, jenjang)").eq("role", "siswa").order("created_at", { ascending: false })
    if (result.error) { console.log("Error:", result.error); return }
    setSiswaList(result.data || [])
  }

  async function handleApprove(id) {
    await supabase.from("users").update({ status: "approved" }).eq("id", id)
    await loadSiswa()
  }

  async function handleReject(id) {
    if (!confirm("Yakin tolak siswa ini?")) return
    await supabase.from("users").update({ status: "rejected" }).eq("id", id)
    await loadSiswa()
  }

  async function handleDelete(id) {
    if (!confirm("Yakin hapus siswa ini?")) return
    await supabase.from("users").delete().eq("id", id)
    await loadSiswa()
  }

  function isOnline(siswa) {
    if (!siswa.last_seen) return false
    return Date.now() - new Date(siswa.last_seen).getTime() < 15000
  }

  function getStatusStyle(status) {
    if (status === "approved") return { bg: "#dcfce7", color: "#166534", label: "✅ Disetujui" }
    if (status === "rejected") return { bg: "#fee2e2", color: "#991b1b", label: "❌ Ditolak" }
    return { bg: "#fef3c7", color: "#92400e", label: "⏳ Menunggu" }
  }

  var filteredSiswa = siswaList.filter(function (s) {
    var matchTab = tab === "semua" ? true : tab === "pending" ? (s.status === "pending" || !s.status) : s.status === tab
    var matchKelas = filterKelas === "semua" ? true : String(s.kelas_id) === filterKelas
    return matchTab && matchKelas
  })

  var pendingCount = siswaList.filter(function (s) { return s.status === "pending" || !s.status }).length

  // Group siswa by kelas untuk statistik
  var kelasStats = {}
  siswaList.forEach(function (s) {
    var kelasName = s.kelas ? s.kelas.nama_kelas : "Belum ada kelas"
    if (!kelasStats[kelasName]) kelasStats[kelasName] = { total: 0, online: 0 }
    kelasStats[kelasName].total++
    if (isOnline(s)) kelasStats[kelasName].online++
  })

  if (loading) {
    return (
      <div style={st.center}><div style={st.spinner}></div><p style={{ marginTop: "16px", color: "#666" }}>Loading...</p></div>
    )
  }

  return (
    <div style={st.container}>
      <div style={st.header}>
        <button onClick={function () { router.push("/dashboard") }} style={st.backBtn}>← Kembali</button>
        <h1 style={st.title}>👥 Daftar Siswa</h1>
        {pendingCount > 0 && <div style={st.notifBadge}>{pendingCount} menunggu</div>}
      </div>

      {/* Statistik Per Kelas */}
      <div style={st.statsWrap}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "16px" }}>📊 Statistik Per Kelas</h3>
        <div style={st.statsGrid}>
          {Object.entries(kelasStats).map(function (entry) {
            return (
              <div key={entry[0]} style={st.statCard}>
                <p style={st.statKelas}>{entry[0]}</p>
                <p style={st.statTotal}>{entry[1].total} siswa</p>
                <p style={st.statOnline}>🟢 {entry[1].online} online</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter */}
      <div style={st.filterWrap}>
        <div style={st.tabWrap}>
          {["pending", "approved", "rejected", "semua"].map(function (t) {
            return (
              <button key={t} onClick={function () { setTab(t) }}
                style={{ ...st.tabBtn, background: tab === t ? "linear-gradient(135deg, #667eea, #764ba2)" : "white", color: tab === t ? "white" : "#374151" }}>
                {t === "pending" ? "⏳ Menunggu" : t === "approved" ? "✅ Disetujui" : t === "rejected" ? "❌ Ditolak" : "📋 Semua"}
              </button>
            )
          })}
        </div>

        <div style={st.kelasFilter}>
          <label style={{ fontSize: "14px", fontWeight: "600" }}>Filter Kelas:</label>
          <select value={filterKelas} onChange={function (e) { setFilterKelas(e.target.value) }} style={st.filterSelect}>
            <option value="semua">Semua Kelas</option>
            {kelasList.map(function (k) {
              return <option key={k.id} value={String(k.id)}>{k.nama_kelas}</option>
            })}
          </select>
        </div>
      </div>

      {/* List Siswa */}
      {filteredSiswa.length === 0 ? (
        <div style={st.empty}><p style={{ fontSize: "48px", margin: 0 }}>📭</p><p style={{ color: "#666", marginTop: "12px" }}>Tidak ada siswa.</p></div>
      ) : (
        <div style={st.listWrap}>
          {filteredSiswa.map(function (siswa) {
            var info = getStatusStyle(siswa.status || "pending")
            var online = isOnline(siswa)

            return (
              <div key={siswa.id} style={st.siswaCard}>
                <div style={st.siswaInfo}>
                  <div style={{ ...st.avatar, background: online ? "linear-gradient(135deg, #16a34a, #22c55e)" : "linear-gradient(135deg, #9ca3af, #6b7280)" }}>
                    {siswa.nama.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={st.nameRow}>
                      <h3 style={st.siswaNama}>{siswa.nama}</h3>
                      <span style={{ ...st.onlineBadge, background: online ? "#dcfce7" : "#f3f4f6", color: online ? "#16a34a" : "#9ca3af" }}>
                        {online ? "🟢 Online" : "⚫ Offline"}
                      </span>
                    </div>
                    <p style={st.siswaEmail}>{siswa.email}</p>
                    <p style={st.siswaKelas}>🏫 {siswa.kelas ? siswa.kelas.nama_kelas : "Belum ada kelas"}</p>
                    <p style={st.siswaDate}>
                      Daftar: {new Date(siswa.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>

                <div style={st.actionWrap}>
                  <span style={{ ...st.statusBadge, background: info.bg, color: info.color }}>{info.label}</span>
                  <div style={st.btnGroup}>
                    {(siswa.status === "pending" || !siswa.status) && (
                      <>
                        <button onClick={function () { handleApprove(siswa.id) }} style={st.approveBtn}>✅ Setujui</button>
                        <button onClick={function () { handleReject(siswa.id) }} style={st.rejectBtn}>❌ Tolak</button>
                      </>
                    )}
                    {siswa.status === "approved" && (
                      <button onClick={function () { handleReject(siswa.id) }} style={st.rejectBtn}>❌ Cabut</button>
                    )}
                    {siswa.status === "rejected" && (
                      <>
                        <button onClick={function () { handleApprove(siswa.id) }} style={st.approveBtn}>✅ Setujui</button>
                        <button onClick={function () { handleDelete(siswa.id) }} style={st.deleteBtn}>🗑️ Hapus</button>
                      </>
                    )}
                  </div>
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
  title: { flex: 1, margin: 0, fontSize: "28px", color: "#1a1a1a" },
  notifBadge: { padding: "8px 16px", background: "#fef3c7", color: "#92400e", borderRadius: "20px", fontWeight: "700", fontSize: "13px" },
  statsWrap: { background: "white", padding: "20px 24px", borderRadius: "16px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px" },
  statCard: { padding: "12px", background: "#f9fafb", borderRadius: "10px", textAlign: "center", border: "1px solid #e5e7eb" },
  statKelas: { margin: "0 0 4px 0", fontSize: "14px", fontWeight: "700", color: "#1a1a1a" },
  statTotal: { margin: "0 0 2px 0", fontSize: "12px", color: "#6b7280" },
  statOnline: { margin: 0, fontSize: "12px", color: "#16a34a" },
  filterWrap: { marginBottom: "20px" },
  tabWrap: { display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap" },
  tabBtn: { padding: "10px 20px", borderRadius: "10px", border: "2px solid #e5e7eb", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  kelasFilter: { display: "flex", alignItems: "center", gap: "10px", background: "white", padding: "12px 16px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  filterSelect: { padding: "8px 12px", border: "2px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", background: "white" },
  empty: { textAlign: "center", background: "white", padding: "48px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  listWrap: { display: "flex", flexDirection: "column", gap: "12px" },
  siswaCard: { background: "white", padding: "20px", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  siswaInfo: { display: "flex", gap: "14px", marginBottom: "14px" },
  avatar: { width: "48px", height: "48px", borderRadius: "50%", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "20px", fontWeight: "700", flexShrink: 0 },
  nameRow: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  siswaNama: { margin: 0, fontSize: "16px", color: "#1a1a1a" },
  onlineBadge: { padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600" },
  siswaEmail: { margin: "2px 0", fontSize: "12px", color: "#6b7280" },
  siswaKelas: { margin: "2px 0", fontSize: "13px", color: "#1e40af", fontWeight: "600" },
  siswaDate: { margin: "2px 0", fontSize: "11px", color: "#9ca3af" },
  actionWrap: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" },
  statusBadge: { padding: "5px 14px", borderRadius: "16px", fontSize: "12px", fontWeight: "700" },
  btnGroup: { display: "flex", gap: "6px", flexWrap: "wrap" },
  approveBtn: { padding: "8px 16px", background: "#dcfce7", color: "#166534", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "12px" },
  rejectBtn: { padding: "8px 16px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "12px" },
  deleteBtn: { padding: "8px 16px", background: "#fecaca", color: "#991b1b", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "12px" },
}