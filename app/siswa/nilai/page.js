"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function SiswaNilaiPage() {
  const [user, setUser] = useState(null)
  const [nilaiList, setNilaiList] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(function () { loadData() }, [])

  async function loadData() {
    var authResult = await supabase.auth.getUser()
    var authUser = authResult.data.user
    if (!authUser) { router.push("/login"); return }

    var userResult = await supabase.from("users").select("*").eq("id", authUser.id).single()
    if (!userResult.data || userResult.data.role !== "siswa") { router.push("/dashboard"); return }
    setUser(userResult.data)

    var nilaiResult = await supabase.from("nilai_lengkap").select("*").eq("siswa_id", authUser.id).order("created_at", { ascending: false })

    var nilaiDenganMateri = await Promise.all(
      (nilaiResult.data || []).map(async function (n) {
        var materiResult = await supabase.from("materi").select("judul, pertemuan_ke").eq("id", n.materi_id).single()
        return {
          ...n,
          materi_judul: materiResult.data ? "P" + materiResult.data.pertemuan_ke + " - " + materiResult.data.judul : "Tidak ditemukan",
        }
      })
    )

    setNilaiList(nilaiDenganMateri)
    setLoading(false)
  }

  function getNilaiColor(rata) {
    if (rata >= 80) return { bg: "#dcfce7", color: "#166534", label: "Sangat Baik 🌟" }
    if (rata >= 70) return { bg: "#dbeafe", color: "#1e40af", label: "Baik 👍" }
    if (rata >= 60) return { bg: "#fef3c7", color: "#92400e", label: "Cukup 📝" }
    return { bg: "#fee2e2", color: "#991b1b", label: "Perlu Belajar 💪" }
  }

  var totalNilai = nilaiList.length
  var avgTugas = totalNilai > 0 ? Math.round(nilaiList.reduce(function (s, n) { return s + n.tugas_harian }, 0) / totalNilai) : 0
  var avgAkhlak = totalNilai > 0 ? Math.round(nilaiList.reduce(function (s, n) { return s + n.akhlak }, 0) / totalNilai) : 0
  var avgUlangan = totalNilai > 0 ? Math.round(nilaiList.reduce(function (s, n) { return s + n.ulangan_bab }, 0) / totalNilai) : 0
  var avgTotal = totalNilai > 0 ? Math.round((avgTugas + avgAkhlak + avgUlangan) / 3) : 0

  if (loading) {
    return (<div style={st.center}><div style={st.spinner}></div><p style={{ marginTop: "16px", color: "#666" }}>Loading...</p></div>)
  }

  return (
    <div style={st.container}>
      <div style={st.header}>
        <button onClick={function () { router.push("/dashboard") }} style={st.backBtn}>← Kembali</button>
        <h1 style={st.title}>🏆 Nilai Saya</h1>
      </div>

      {/* Statistik */}
      <div style={st.statsGrid}>
        <div style={st.statCard}>
          <p style={st.statEmoji}>📝</p>
          <p style={st.statLabel}>Tugas Harian</p>
          <p style={{ ...st.statNumber, color: avgTugas >= 70 ? "#16a34a" : "#dc2626" }}>{avgTugas}</p>
        </div>
        <div style={st.statCard}>
          <p style={st.statEmoji}>🤲</p>
          <p style={st.statLabel}>Akhlak</p>
          <p style={{ ...st.statNumber, color: avgAkhlak >= 70 ? "#16a34a" : "#dc2626" }}>{avgAkhlak}</p>
        </div>
        <div style={st.statCard}>
          <p style={st.statEmoji}>📋</p>
          <p style={st.statLabel}>Ulangan Bab</p>
          <p style={{ ...st.statNumber, color: avgUlangan >= 70 ? "#16a34a" : "#dc2626" }}>{avgUlangan}</p>
        </div>
        <div style={st.statCard}>
          <p style={st.statEmoji}>🏆</p>
          <p style={st.statLabel}>Rata-rata</p>
          <p style={{ ...st.statNumber, color: avgTotal >= 70 ? "#16a34a" : "#dc2626" }}>{avgTotal}</p>
        </div>
      </div>

      {/* Motivasi */}
      <div style={st.motivasiCard}>
        <p style={{ margin: 0, fontSize: "15px" }}>
          {avgTotal >= 80 ? "🌟 Luar biasa! Pertahankan prestasimu!"
            : avgTotal >= 60 ? "👍 Bagus! Terus tingkatkan ya!"
            : totalNilai === 0 ? "📝 Belum ada nilai. Semangat belajar!"
            : "💪 Semangat! Terus berlatih!"}
        </p>
      </div>

      {/* Daftar Nilai */}
      <h2 style={{ margin: "0 0 16px 0", fontSize: "20px" }}>📋 Riwayat Nilai</h2>

      {nilaiList.length === 0 ? (
        <div style={st.empty}>
          <p style={{ fontSize: "48px", margin: 0 }}>📭</p>
          <p style={{ color: "#666", marginTop: "12px" }}>Belum ada nilai.</p>
        </div>
      ) : (
        <div style={st.listWrap}>
          {nilaiList.map(function (item, index) {
            var rata = Math.round((item.tugas_harian + item.akhlak + item.ulangan_bab) / 3)
            var info = getNilaiColor(rata)

            return (
              <div key={item.id} style={st.nilaiCard}>
                <div style={st.nilaiHeader}>
                  <div style={st.nomor}>{index + 1}</div>
                  <div style={{ flex: 1 }}>
                    <p style={st.materiJudul}>{item.materi_judul}</p>
                    <p style={st.tanggal}>
                      {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ ...st.rataBadge, background: info.bg, color: info.color }}>{rata}</div>
                    <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: info.color, fontWeight: "600" }}>{info.label}</p>
                  </div>
                </div>

                <div style={st.nilaiDetail}>
                  <div style={st.nilaiItem}>
                    <p style={st.nilaiItemLabel}>📝 Tugas</p>
                    <p style={st.nilaiItemValue}>{item.tugas_harian}</p>
                  </div>
                  <div style={st.nilaiItem}>
                    <p style={st.nilaiItemLabel}>🤲 Akhlak</p>
                    <p style={st.nilaiItemValue}>{item.akhlak}</p>
                  </div>
                  <div style={st.nilaiItem}>
                    <p style={st.nilaiItemLabel}>📋 Ulangan</p>
                    <p style={st.nilaiItemValue}>{item.ulangan_bab}</p>
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
  header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", flexWrap: "wrap" },
  backBtn: { padding: "10px 18px", background: "white", border: "2px solid #e5e7eb", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#374151" },
  title: { flex: 1, margin: 0, fontSize: "28px", color: "#1a1a1a" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" },
  statCard: { background: "white", padding: "16px", borderRadius: "14px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  statEmoji: { margin: "0 0 4px 0", fontSize: "24px" },
  statLabel: { margin: "0 0 6px 0", fontSize: "12px", color: "#6b7280", fontWeight: "600" },
  statNumber: { margin: 0, fontSize: "28px", fontWeight: "700" },
  motivasiCard: { background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", padding: "20px 24px", borderRadius: "14px", marginBottom: "24px" },
  empty: { textAlign: "center", background: "white", padding: "48px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  listWrap: { display: "flex", flexDirection: "column", gap: "12px" },
  nilaiCard: { background: "white", padding: "20px", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  nilaiHeader: { display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" },
  nomor: { width: "36px", height: "36px", borderRadius: "8px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", fontSize: "14px", flexShrink: 0 },
  materiJudul: { margin: 0, fontWeight: "700", fontSize: "15px", color: "#1a1a1a" },
  tanggal: { margin: "2px 0 0 0", fontSize: "12px", color: "#9ca3af" },
  rataBadge: { width: "50px", height: "50px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "18px", fontWeight: "700" },
  nilaiDetail: { display: "flex", gap: "12px", flexWrap: "wrap" },
  nilaiItem: { flex: 1, minWidth: "80px", padding: "10px", background: "#f9fafb", borderRadius: "8px", textAlign: "center" },
  nilaiItemLabel: { margin: "0 0 4px 0", fontSize: "12px", color: "#6b7280", fontWeight: "600" },
  nilaiItemValue: { margin: 0, fontSize: "22px", fontWeight: "700", color: "#1a1a1a" },
}