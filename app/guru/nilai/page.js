"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function GuruNilaiPage() {
  const [user, setUser] = useState(null)
  const [siswaList, setSiswaList] = useState([])
  const [materiList, setMateriList] = useState([])
  const [nilaiList, setNilaiList] = useState([])
  const [kelasList, setKelasList] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pesan, setPesan] = useState("")
  const [filterKelas, setFilterKelas] = useState("semua")
  const [filterMateri, setFilterMateri] = useState("semua")
  const [tab, setTab] = useState("input")
  const [editValues, setEditValues] = useState({})
  const router = useRouter()

  useEffect(function () { loadData() }, [])

  async function loadData() {
    var authResult = await supabase.auth.getUser()
    var authUser = authResult.data.user
    if (!authUser) { router.push("/login"); return }

    var userResult = await supabase.from("users").select("*").eq("id", authUser.id).single()
    if (!userResult.data || userResult.data.role !== "guru") { router.push("/dashboard"); return }
    setUser(userResult.data)

    var kelasResult = await supabase.from("kelas").select("*").order("jenjang").order("tingkat").order("rombel")
    setKelasList(kelasResult.data || [])

    var materiResult = await supabase.from("materi").select("*").eq("guru_id", authUser.id).order("pertemuan_ke", { ascending: true })
    setMateriList(materiResult.data || [])

    await loadSiswa()
    await loadNilai()
    setLoading(false)
  }

  async function loadSiswa() {
    var result = await supabase.from("users").select("*").eq("role", "siswa").eq("status", "approved").order("nama")

    var siswaWithKelas = await Promise.all(
      (result.data || []).map(async function (s) {
        if (s.kelas_id) {
          var kelasResult = await supabase.from("kelas").select("nama_kelas, tingkat").eq("id", s.kelas_id).single()
          return { ...s, kelas: kelasResult.data || null }
        }
        return { ...s, kelas: null }
      })
    )

    setSiswaList(siswaWithKelas)
  }

  async function loadNilai() {
    var result = await supabase.from("nilai_lengkap").select("*").order("created_at", { ascending: false })
    setNilaiList(result.data || [])

    var values = {}
    if (result.data) {
      result.data.forEach(function (n) {
        var key = n.siswa_id + "_" + n.materi_id
        values[key] = {
          id: n.id,
          tugas_harian: n.tugas_harian || 0,
          akhlak: n.akhlak || 0,
          ulangan_bab: n.ulangan_bab || 0,
          catatan: n.catatan || "",
        }
      })
    }
    setEditValues(values)
  }

  function handleChange(siswaId, materiId, field, value) {
    var key = siswaId + "_" + materiId
    setEditValues(function (prev) {
      var current = prev[key] || { tugas_harian: 0, akhlak: 0, ulangan_bab: 0, catatan: "" }
      var updated = { ...current }
      if (field === "catatan") {
        updated[field] = value
      } else {
        var num = Number(value)
        if (num < 0) num = 0
        if (num > 100) num = 100
        updated[field] = num
      }
      return { ...prev, [key]: updated }
    })
  }

  async function handleSimpan(siswaId, materiId) {
    var key = siswaId + "_" + materiId
    var data = editValues[key]
    if (!data) return

    setSaving(true)
    setPesan("")

    if (data.id) {
      var updateResult = await supabase.from("nilai_lengkap").update({
        tugas_harian: data.tugas_harian,
        akhlak: data.akhlak,
        ulangan_bab: data.ulangan_bab,
        catatan: data.catatan,
      }).eq("id", data.id)

      if (updateResult.error) {
        setPesan("❌ Gagal update: " + updateResult.error.message)
      } else {
        setPesan("✅ Nilai berhasil diupdate!")
      }
    } else {
      var insertResult = await supabase.from("nilai_lengkap").insert({
        siswa_id: siswaId,
        materi_id: materiId,
        tugas_harian: data.tugas_harian,
        akhlak: data.akhlak,
        ulangan_bab: data.ulangan_bab,
        catatan: data.catatan,
        guru_id: user.id,
      })

      if (insertResult.error) {
        setPesan("❌ Gagal simpan: " + insertResult.error.message)
      } else {
        setPesan("✅ Nilai berhasil disimpan!")
      }
    }

    await loadNilai()
    setSaving(false)
  }

  async function handleSimpanSemua() {
    if (filterMateri === "semua") {
      setPesan("❌ Pilih materi dulu!")
      return
    }

    setSaving(true)
    setPesan("")
    var berhasil = 0
    var gagal = 0

    for (var i = 0; i < filteredSiswa.length; i++) {
      var siswa = filteredSiswa[i]
      var key = siswa.id + "_" + filterMateri
      var data = editValues[key]

      if (!data) continue
      if (data.tugas_harian === 0 && data.akhlak === 0 && data.ulangan_bab === 0) continue

      if (data.id) {
        var res = await supabase.from("nilai_lengkap").update({
          tugas_harian: data.tugas_harian,
          akhlak: data.akhlak,
          ulangan_bab: data.ulangan_bab,
          catatan: data.catatan,
        }).eq("id", data.id)
        if (res.error) gagal++
        else berhasil++
      } else {
        var res2 = await supabase.from("nilai_lengkap").insert({
          siswa_id: siswa.id,
          materi_id: Number(filterMateri),
          tugas_harian: data.tugas_harian,
          akhlak: data.akhlak,
          ulangan_bab: data.ulangan_bab,
          catatan: data.catatan,
          guru_id: user.id,
        })
        if (res2.error) gagal++
        else berhasil++
      }
    }

    await loadNilai()
    setPesan("✅ " + berhasil + " nilai disimpan" + (gagal > 0 ? ", " + gagal + " gagal" : ""))
    setSaving(false)
  }

  function getRataRata(data) {
    if (!data) return 0
    return Math.round((data.tugas_harian + data.akhlak + data.ulangan_bab) / 3)
  }

  function getNilaiColor(rata) {
    if (rata >= 80) return { bg: "#dcfce7", color: "#166534" }
    if (rata >= 70) return { bg: "#dbeafe", color: "#1e40af" }
    if (rata >= 60) return { bg: "#fef3c7", color: "#92400e" }
    return { bg: "#fee2e2", color: "#991b1b" }
  }

  function getMateriJudul(id) {
    var m = materiList.find(function (item) { return String(item.id) === String(id) })
    return m ? "Pertemuan " + m.pertemuan_ke + " - " + m.judul : "Tidak ditemukan"
  }

  var filteredSiswa = siswaList.filter(function (s) {
    if (filterKelas === "semua") return true
    return String(s.kelas_id) === filterKelas
  })

  if (loading) {
    return (<div style={st.center}><div style={st.spinner}></div><p style={{ marginTop: "16px", color: "#666" }}>Loading...</p></div>)
  }

  return (
    <div style={st.container}>
      <div style={st.header}>
        <button onClick={function () { router.push("/dashboard") }} style={st.backBtn}>← Kembali</button>
        <h1 style={st.title}>📊 Nilai Siswa</h1>
      </div>

      {pesan && (
        <div style={{ ...st.pesan, background: pesan.startsWith("✅") ? "#dcfce7" : "#fee2e2", color: pesan.startsWith("✅") ? "#166534" : "#dc2626" }}>
          {pesan}
        </div>
      )}

      {/* Tab */}
      <div style={st.tabWrap}>
        <button onClick={function () { setTab("input") }} style={{ ...st.tabBtn, background: tab === "input" ? "linear-gradient(135deg, #667eea, #764ba2)" : "white", color: tab === "input" ? "white" : "#374151" }}>
          📝 Input Nilai
        </button>
        <button onClick={function () { setTab("rekap") }} style={{ ...st.tabBtn, background: tab === "rekap" ? "linear-gradient(135deg, #667eea, #764ba2)" : "white", color: tab === "rekap" ? "white" : "#374151" }}>
          📋 Rekap Nilai
        </button>
      </div>

      {/* Filter */}
      <div style={st.filterWrap}>
        <div style={st.filterItem}>
          <label style={st.filterLabel}>Kelas:</label>
          <select value={filterKelas} onChange={function (e) { setFilterKelas(e.target.value) }} style={st.filterSelect}>
            <option value="semua">Semua Kelas</option>
            {kelasList.map(function (k) {
              return <option key={k.id} value={String(k.id)}>{k.nama_kelas}</option>
            })}
          </select>
        </div>
        <div style={st.filterItem}>
          <label style={st.filterLabel}>Materi:</label>
          <select value={filterMateri} onChange={function (e) { setFilterMateri(e.target.value) }} style={st.filterSelect}>
            <option value="semua">Semua Materi</option>
            {materiList.map(function (m) {
              return <option key={m.id} value={String(m.id)}>P{m.pertemuan_ke} - {m.judul}</option>
            })}
          </select>
        </div>
      </div>

      {/* TAB INPUT */}
      {tab === "input" && (
        <div>
          {filterMateri === "semua" ? (
            <div style={st.infoBox}>
              <p style={{ margin: 0 }}>⚠️ Pilih <strong>Materi</strong> di filter di atas untuk mulai input nilai.</p>
            </div>
          ) : (
            <div>
              <div style={st.inputHeader}>
                <h3 style={{ margin: 0, fontSize: "16px" }}>📝 Input Nilai: {getMateriJudul(filterMateri)}</h3>
                <button onClick={handleSimpanSemua} disabled={saving} style={{ ...st.saveAllBtn, opacity: saving ? 0.7 : 1 }}>
                  {saving ? "⏳ Menyimpan..." : "💾 Simpan Semua"}
                </button>
              </div>

              {/* Header Tabel */}
              <div style={st.tableHeader}>
                <div style={{ ...st.col, width: "40px" }}>No</div>
                <div style={{ ...st.col, flex: 1 }}>Nama Siswa</div>
                <div style={{ ...st.col, width: "80px" }}>Kelas</div>
                <div style={{ ...st.col, width: "90px" }}>Tugas Harian</div>
                <div style={{ ...st.col, width: "70px" }}>Akhlak</div>
                <div style={{ ...st.col, width: "90px" }}>Ulangan Bab</div>
                <div style={{ ...st.col, width: "60px" }}>Rata²</div>
                <div style={{ ...st.col, width: "70px" }}>Aksi</div>
              </div>

              {filteredSiswa.length === 0 ? (
                <div style={st.empty}><p style={{ color: "#666" }}>Tidak ada siswa.</p></div>
              ) : (
                filteredSiswa.map(function (siswa, index) {
                  var key = siswa.id + "_" + filterMateri
                  var data = editValues[key] || { tugas_harian: 0, akhlak: 0, ulangan_bab: 0, catatan: "" }
                  var rata = getRataRata(data)
                  var warna = getNilaiColor(rata)

                  return (
                    <div key={siswa.id} style={st.tableRow}>
                      <div style={{ ...st.col, width: "40px" }}>{index + 1}</div>
                      <div style={{ ...st.col, flex: 1 }}>
                        <p style={st.siswaName}>{siswa.nama}</p>
                        <p style={st.siswaEmail}>{siswa.email}</p>
                      </div>
                      <div style={{ ...st.col, width: "80px" }}>
                        <span style={st.kelasBadge}>{siswa.kelas ? siswa.kelas.nama_kelas : "-"}</span>
                      </div>
                      <div style={{ ...st.col, width: "90px" }}>
                        <input type="number" min="0" max="100" value={data.tugas_harian}
                          onChange={function (e) { handleChange(siswa.id, filterMateri, "tugas_harian", e.target.value) }}
                          style={st.nilaiInput} />
                      </div>
                      <div style={{ ...st.col, width: "70px" }}>
                        <input type="number" min="0" max="100" value={data.akhlak}
                          onChange={function (e) { handleChange(siswa.id, filterMateri, "akhlak", e.target.value) }}
                          style={st.nilaiInput} />
                      </div>
                      <div style={{ ...st.col, width: "90px" }}>
                        <input type="number" min="0" max="100" value={data.ulangan_bab}
                          onChange={function (e) { handleChange(siswa.id, filterMateri, "ulangan_bab", e.target.value) }}
                          style={st.nilaiInput} />
                      </div>
                      <div style={{ ...st.col, width: "60px" }}>
                        <span style={{ ...st.rataBadge, background: warna.bg, color: warna.color }}>{rata}</span>
                      </div>
                      <div style={{ ...st.col, width: "70px" }}>
                        <button onClick={function () { handleSimpan(siswa.id, Number(filterMateri)) }}
                          disabled={saving} style={st.simpanBtn}>
                          💾
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB REKAP */}
      {tab === "rekap" && (
        <div>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>📋 Rekap Nilai Seluruh Siswa</h3>

          {filteredSiswa.length === 0 ? (
            <div style={st.empty}><p style={{ color: "#666" }}>Tidak ada siswa.</p></div>
          ) : (
            <div style={st.rekapWrap}>
              {filteredSiswa.map(function (siswa, index) {
                var nilaiSiswa = nilaiList.filter(function (n) { return n.siswa_id === siswa.id })

                return (
                  <div key={siswa.id} style={st.rekapCard}>
                    <div style={st.rekapHeader}>
                      <div style={st.rekapNomor}>{index + 1}</div>
                      <div>
                        <p style={st.rekapNama}>{siswa.nama}</p>
                        <p style={st.rekapKelas}>🏫 {siswa.kelas ? siswa.kelas.nama_kelas : "-"}</p>
                      </div>
                    </div>

                    {nilaiSiswa.length === 0 ? (
                      <p style={{ color: "#9ca3af", fontSize: "13px", margin: "8px 0 0 0" }}>Belum ada nilai</p>
                    ) : (
                      <div style={st.rekapTable}>
                        <div style={st.rekapTHead}>
                          <div style={{ ...st.rekapTH, flex: 1 }}>Materi</div>
                          <div style={{ ...st.rekapTH, width: "70px" }}>Tugas</div>
                          <div style={{ ...st.rekapTH, width: "70px" }}>Akhlak</div>
                          <div style={{ ...st.rekapTH, width: "70px" }}>Ulangan</div>
                          <div style={{ ...st.rekapTH, width: "60px" }}>Rata²</div>
                        </div>
                        {nilaiSiswa.map(function (n) {
                          var rata = Math.round((n.tugas_harian + n.akhlak + n.ulangan_bab) / 3)
                          var warna = getNilaiColor(rata)
                          return (
                            <div key={n.id} style={st.rekapTRow}>
                              <div style={{ ...st.rekapTD, flex: 1 }}>{getMateriJudul(n.materi_id)}</div>
                              <div style={{ ...st.rekapTD, width: "70px", textAlign: "center" }}>{n.tugas_harian}</div>
                              <div style={{ ...st.rekapTD, width: "70px", textAlign: "center" }}>{n.akhlak}</div>
                              <div style={{ ...st.rekapTD, width: "70px", textAlign: "center" }}>{n.ulangan_bab}</div>
                              <div style={{ ...st.rekapTD, width: "60px", textAlign: "center" }}>
                                <span style={{ ...st.rataBadge, background: warna.bg, color: warna.color }}>{rata}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
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
  pesan: { padding: "14px 20px", borderRadius: "10px", marginBottom: "20px", fontWeight: "600" },
  tabWrap: { display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" },
  tabBtn: { padding: "12px 24px", borderRadius: "10px", border: "2px solid #e5e7eb", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  filterWrap: { display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap", background: "white", padding: "16px 20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  filterItem: { display: "flex", alignItems: "center", gap: "8px" },
  filterLabel: { fontSize: "14px", fontWeight: "600", color: "#374151" },
  filterSelect: { padding: "8px 12px", border: "2px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", background: "white" },
  infoBox: { background: "#fef3c7", padding: "16px 20px", borderRadius: "12px", color: "#92400e", fontWeight: "600" },
  inputHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" },
  saveAllBtn: { padding: "10px 20px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px" },
  tableHeader: { display: "flex", gap: "8px", padding: "12px 16px", background: "#667eea", borderRadius: "10px 10px 0 0", color: "white", fontSize: "12px", fontWeight: "700", alignItems: "center" },
  tableRow: { display: "flex", gap: "8px", padding: "12px 16px", background: "white", borderBottom: "1px solid #e5e7eb", alignItems: "center", fontSize: "13px" },
  col: { display: "flex", alignItems: "center" },
  siswaName: { margin: 0, fontWeight: "600", fontSize: "14px", color: "#1a1a1a" },
  siswaEmail: { margin: "2px 0 0 0", fontSize: "11px", color: "#9ca3af" },
  kelasBadge: { padding: "2px 8px", background: "#dbeafe", color: "#1e40af", borderRadius: "8px", fontSize: "11px", fontWeight: "600" },
  nilaiInput: { width: "100%", padding: "6px 8px", border: "2px solid #e5e7eb", borderRadius: "6px", fontSize: "14px", textAlign: "center", outline: "none", boxSizing: "border-box" },
  rataBadge: { padding: "4px 10px", borderRadius: "8px", fontSize: "14px", fontWeight: "700", display: "inline-block" },
  simpanBtn: { padding: "6px 12px", background: "#dcfce7", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "16px" },
  empty: { textAlign: "center", padding: "40px", background: "white", borderRadius: "12px" },
  // Rekap
  rekapWrap: { display: "flex", flexDirection: "column", gap: "16px" },
  rekapCard: { background: "white", padding: "20px", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  rekapHeader: { display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" },
  rekapNomor: { width: "36px", height: "36px", borderRadius: "8px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", fontSize: "14px", flexShrink: 0 },
  rekapNama: { margin: 0, fontWeight: "700", fontSize: "15px", color: "#1a1a1a" },
  rekapKelas: { margin: "2px 0 0 0", fontSize: "12px", color: "#6b7280" },
  rekapTable: { borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb" },
  rekapTHead: { display: "flex", background: "#f3f4f6", padding: "8px 12px", gap: "4px" },
  rekapTH: { fontSize: "11px", fontWeight: "700", color: "#374151", textAlign: "center" },
  rekapTRow: { display: "flex", padding: "8px 12px", gap: "4px", borderTop: "1px solid #e5e7eb", alignItems: "center" },
  rekapTD: { fontSize: "13px", color: "#374151" },
}