"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function SiswaMateriPage() {
  const [user, setUser] = useState(null)
  const [kelasUser, setKelasUser] = useState(null)
  const [materiList, setMateriList] = useState([])
  const [loading, setLoading] = useState(true)
  const [openMateri, setOpenMateri] = useState(null)
  const router = useRouter()

  useEffect(function () { loadData() }, [])

  async function loadData() {
    var authResult = await supabase.auth.getUser()
    var authUser = authResult.data.user
    if (!authUser) { router.push("/login"); return }

    var userResult = await supabase.from("users").select("*").eq("id", authUser.id).single()
    if (!userResult.data || userResult.data.role !== "siswa") { router.push("/dashboard"); return }

    setUser(userResult.data)

    var tingkatUser = null
    if (userResult.data.kelas_id) {
      var kelasResult = await supabase.from("kelas").select("*").eq("id", userResult.data.kelas_id).single()
      if (kelasResult.data) {
        setKelasUser(kelasResult.data)
        tingkatUser = kelasResult.data.tingkat
      }
    }

    if (!tingkatUser) { setLoading(false); return }

    var materiResult = await supabase.from("materi").select("*").eq("tingkat", tingkatUser).order("pertemuan_ke", { ascending: true })

    var materiDenganGuru = await Promise.all(
      (materiResult.data || []).map(async function (item) {
        var guruResult = await supabase.from("users").select("nama, foto_url").eq("id", item.guru_id).single()
        return {
          ...item,
          guru_nama: guruResult.data ? guruResult.data.nama : "Guru",
          guru_foto: guruResult.data ? guruResult.data.foto_url : null,
        }
      })
    )

    setMateriList(materiDenganGuru)
    setLoading(false)
  }

  if (loading) {
    return (<div style={st.center}><div style={st.spinner}></div><p style={{ marginTop: "16px", color: "#666" }}>Loading...</p></div>)
  }

  return (
    <div style={st.container}>
      <div style={st.header}>
        <button onClick={function () { router.push("/dashboard") }} style={st.backBtn}>← Kembali</button>
        <h1 style={st.title}>📖 Materi Pelajaran</h1>
      </div>

      <div style={st.kelasInfo}>
        <p style={{ margin: 0, fontSize: "14px" }}>
          🏫 Kelas: <strong>{kelasUser ? kelasUser.nama_kelas : "Belum ada kelas"}</strong>
          {kelasUser && <span> • {kelasUser.jenjang}</span>}
        </p>
      </div>

      {!kelasUser ? (
        <div style={st.empty}>
          <p style={{ fontSize: "48px", margin: 0 }}>⚠️</p>
          <p style={{ color: "#666", marginTop: "12px" }}>Kelas belum diatur. Hubungi guru.</p>
        </div>
      ) : materiList.length === 0 ? (
        <div style={st.empty}>
          <p style={{ fontSize: "48px", margin: 0 }}>📭</p>
          <p style={{ color: "#666", marginTop: "12px" }}>Belum ada materi untuk kelas {kelasUser.nama_kelas}.</p>
        </div>
      ) : (
        <div style={st.listWrap}>
          {materiList.map(function (item) {
            return (
              <div key={item.id} style={st.materiCard}>
                <div
                  onClick={function () { setOpenMateri(openMateri === item.id ? null : item.id) }}
                  style={st.materiHeader}
                >
                  <div style={st.pertemuanBadge}>Pertemuan {item.pertemuan_ke}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={st.materiJudul}>{item.judul}</h3>
                    <div style={st.guruInfo}>
                      {item.guru_foto ? (
                        <img src={item.guru_foto} alt="Guru" style={st.guruFoto} />
                      ) : (
                        <div style={st.guruAvatar}>{item.guru_nama.charAt(0).toUpperCase()}</div>
                      )}
                      <p style={st.materiMeta}>
                        👨‍🏫 {item.guru_nama} • 🗓️ {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div style={st.expandIcon}>{openMateri === item.id ? "▲" : "▼"}</div>
                </div>

                {openMateri === item.id && (
                  <div style={st.materiBody}>
                    <div style={st.materiIsi}>
                      {item.isi.split("\n").map(function (p, i) {
                        return <p key={i} style={{ margin: "0 0 10px 0", lineHeight: "1.8" }}>{p}</p>
                      })}
                    </div>
                    {item.file_url && (
                      <a href={item.file_url} target="_blank" rel="noopener noreferrer" style={st.downloadBtn}>
                        📎 Download File Materi
                      </a>
                    )}
                  </div>
                )}
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
  kelasInfo: { background: "white", padding: "14px 20px", borderRadius: "12px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", border: "2px solid #dbeafe" },
  empty: { textAlign: "center", background: "white", padding: "48px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  listWrap: { display: "flex", flexDirection: "column", gap: "16px" },
  materiCard: { background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" },
  materiHeader: { display: "flex", alignItems: "center", gap: "12px", padding: "20px 24px", cursor: "pointer", flexWrap: "wrap" },
  pertemuanBadge: { padding: "4px 12px", background: "#dbeafe", color: "#1e40af", borderRadius: "20px", fontSize: "12px", fontWeight: "700", flexShrink: 0 },
  materiJudul: { margin: "0 0 6px 0", fontSize: "17px", color: "#1a1a1a", fontWeight: "700" },
  guruInfo: { display: "flex", alignItems: "center", gap: "8px" },
  guruFoto: { width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", border: "2px solid #667eea" },
  guruAvatar: { width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "12px", fontWeight: "700", flexShrink: 0 },
  materiMeta: { margin: 0, fontSize: "12px", color: "#6b7280" },
  expandIcon: { fontSize: "14px", color: "#9ca3af", flexShrink: 0 },
  materiBody: { padding: "0 24px 24px 24px", borderTop: "1px solid #e5e7eb" },
  materiIsi: { fontSize: "15px", color: "#374151", lineHeight: "1.8", padding: "16px 0" },
  downloadBtn: { display: "inline-block", padding: "12px 20px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", borderRadius: "10px", textDecoration: "none", fontWeight: "600", fontSize: "14px" },
}