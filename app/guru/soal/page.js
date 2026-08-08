"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function GuruSoalPage() {
  const [user, setUser] = useState(null)
  const [materiList, setMateriList] = useState([])
  const [soalList, setSoalList] = useState([])
  const [loading, setLoading] = useState(true)
  const [pesan, setPesan] = useState("")
  const [tab, setTab] = useState("daftar")
  const router = useRouter()

  const [materiId, setMateriId] = useState("")
  const [teksSoal, setTeksSoal] = useState("")
  const [previewSoal, setPreviewSoal] = useState(null)
  const [saving, setSaving] = useState(false)

  const [filterMateri, setFilterMateri] = useState("semua")
  const [filterJenis, setFilterJenis] = useState("semua")
  const [showKunci, setShowKunci] = useState({})

  useEffect(function () { loadData() }, [])

  async function loadData() {
    var authResult = await supabase.auth.getUser()
    var authUser = authResult.data.user
    if (!authUser) { router.push("/login"); return }

    var userResult = await supabase.from("users").select("*").eq("id", authUser.id).single()
    if (!userResult.data || userResult.data.role !== "guru") { router.push("/dashboard"); return }

    setUser(userResult.data)

    var materiResult = await supabase.from("materi").select("*").eq("guru_id", authUser.id).order("pertemuan_ke", { ascending: true })
    setMateriList(materiResult.data || [])

    if (materiResult.data && materiResult.data.length > 0) {
      setMateriId(String(materiResult.data[0].id))
    }

    await loadSoal(materiResult.data || [])
    setLoading(false)
  }

  async function loadSoal(daftarMateri) {
    if (!daftarMateri || daftarMateri.length === 0) { setSoalList([]); return }
    var ids = daftarMateri.map(function (m) { return m.id })
    var result = await supabase.from("soal").select("*").in("materi_id", ids).order("created_at", { ascending: false })
    if (!result.error) setSoalList(result.data || [])
  }

  function getMateri(id) {
    return materiList.find(function (item) { return String(item.id) === String(id) })
  }

  function getMateriJudul(id) {
    var m = getMateri(id)
    return m ? m.judul : "Tidak ditemukan"
  }

  // Hitung soal per materi
  function getSoalPerMateri(id) {
    var soalMateri = soalList.filter(function (s) { return String(s.materi_id) === String(id) })
    var totalPG = soalMateri.filter(function (s) { return (s.jenis_soal || "pg") === "pg" }).length
    var totalEssay = soalMateri.filter(function (s) { return s.jenis_soal === "essay" }).length
    return { total: soalMateri.length, pg: totalPG, essay: totalEssay }
  }

  // 🎯 PARSER SOAL
  function parseSoal(text) {
    if (!text || !text.trim()) return []

    var soalArray = []
    var blocks = text.split(/\n\s*\n/).map(function (b) { return b.trim() }).filter(Boolean)

    blocks.forEach(function (block) {
      var lines = block.split("\n").map(function (l) { return l.trim() }).filter(Boolean)
      if (lines.length === 0) return

      var pertanyaan = lines[0].replace(/^\d+[\.\)]\s*/, "").trim()
      if (!pertanyaan) return

      var jawabLineIdx = lines.findIndex(function (l) { return /^JAWAB\s*:/i.test(l) })
      var isEssay = jawabLineIdx > 0

      if (isEssay) {
        // Ambil semua text setelah "JAWAB:" (bisa multi-line)
        var kunciEssay = lines.slice(jawabLineIdx).join(" ").replace(/^JAWAB\s*:\s*/i, "").trim()
        // Kalau pertanyaan ternyata ada di baris kedua/ketiga (multi-line question)
        if (jawabLineIdx > 1) {
          pertanyaan = lines.slice(0, jawabLineIdx).join(" ").replace(/^\d+[\.\)]\s*/, "").trim()
        }
        soalArray.push({
          pertanyaan: pertanyaan,
          jenis_soal: "essay",
          kunci_essay: kunciEssay,
          pilihan: null,
          jawaban_benar: null,
        })
      } else {
        var pilihanObj = {}
        var jawabanBenar = ""
        var pertanyaanLines = [lines[0]]
        var mulaiPilihan = false

        for (var i = 1; i < lines.length; i++) {
          var line = lines[i]
          var match = line.match(/^([A-E])[\.\)]\s*(.+)$/)
          if (match) {
            mulaiPilihan = true
            var huruf = match[1].toUpperCase()
            var isi = match[2].trim()
            if (isi.endsWith("*")) {
              isi = isi.slice(0, -1).trim()
              jawabanBenar = huruf
            }
            pilihanObj[huruf] = isi
          } else if (!mulaiPilihan) {
            // Multi-line pertanyaan
            pertanyaanLines.push(line)
          }
        }

        pertanyaan = pertanyaanLines.join(" ").replace(/^\d+[\.\)]\s*/, "").trim()

        if (Object.keys(pilihanObj).length >= 2) {
          soalArray.push({
            pertanyaan: pertanyaan,
            jenis_soal: "pg",
            pilihan: pilihanObj,
            jawaban_benar: jawabanBenar || "A",
            kunci_essay: null,
          })
        }
      }
    })

    return soalArray
  }

  function handlePreview() {
    if (!materiId) { setPesan("❌ Pilih materi dulu!"); return }
    if (!teksSoal.trim()) { setPesan("❌ Tulis soal dulu!"); return }

    var hasil = parseSoal(teksSoal)

    if (hasil.length === 0) {
      setPesan("❌ Tidak ada soal terdeteksi. Cek format soal!")
      setPreviewSoal(null)
      return
    }

    var totalPG = hasil.filter(function (s) { return s.jenis_soal === "pg" }).length
    var totalEssay = hasil.filter(function (s) { return s.jenis_soal === "essay" }).length

    var noAnswer = hasil.filter(function (s) { return s.jenis_soal === "pg" && !s.jawaban_benar })
    if (noAnswer.length > 0) {
      setPesan("⚠️ Ada " + noAnswer.length + " soal PG belum ditandai jawaban benar (pakai tanda * di akhir). Default jawaban = A")
    } else {
      setPesan("✅ " + hasil.length + " soal berhasil di-parse! (" + totalPG + " PG + " + totalEssay + " Essay)")
    }

    setPreviewSoal(hasil)
  }

  async function handleSimpan() {
    if (!previewSoal || previewSoal.length === 0) return

    setSaving(true)
    setPesan("⏳ Menyimpan " + previewSoal.length + " soal...")

    var mid = isNaN(Number(materiId)) ? materiId : Number(materiId)
    var materi = getMateri(materiId)
    var tingkat = materi ? (materi.tingkat || "") : ""

    var soalToInsert = previewSoal.map(function (s) {
      return {
        pertanyaan: s.pertanyaan,
        pilihan: s.pilihan,
        jawaban_benar: s.jawaban_benar,
        kunci_essay: s.kunci_essay,
        materi_id: mid,
        jenis_soal: s.jenis_soal,
        is_auto_generated: false,
        tingkat: tingkat,
      }
    })

    // Simpan bertahap kalau banyak (max 20 per batch)
    var BATCH_SIZE = 20
    var totalBerhasil = 0
    var errors = []

    for (var i = 0; i < soalToInsert.length; i += BATCH_SIZE) {
      var batch = soalToInsert.slice(i, i + BATCH_SIZE)
      var result = await supabase.from("soal").insert(batch)

      if (result.error) {
        errors.push("Batch " + (i + 1) + "-" + (i + batch.length) + ": " + result.error.message)
      } else {
        totalBerhasil += batch.length
      }

      setPesan("⏳ Menyimpan... " + totalBerhasil + "/" + soalToInsert.length)
    }

    if (errors.length > 0) {
      setPesan("⚠️ " + totalBerhasil + " soal tersimpan. Ada error: " + errors.join(" | "))
    } else {
      setPesan("🎉 " + totalBerhasil + " soal berhasil disimpan!")
    }

    if (totalBerhasil > 0) {
      setPreviewSoal(null)
      setTeksSoal("")
      await loadSoal(materiList)
    }

    setSaving(false)
  }

  async function handleHapusSoal(id) {
    if (!confirm("Yakin hapus soal ini?")) return
    await supabase.from("soal").delete().eq("id", id)
    await loadSoal(materiList)
  }

  async function handleHapusSemuaSoal(materiId) {
    var soalMateri = soalList.filter(function (s) { return String(s.materi_id) === String(materiId) })
    if (soalMateri.length === 0) return

    if (!confirm("Yakin hapus SEMUA " + soalMateri.length + " soal untuk materi ini?")) return

    var result = await supabase.from("soal").delete().eq("materi_id", materiId)
    if (result.error) {
      setPesan("❌ Gagal hapus: " + result.error.message)
    } else {
      setPesan("🗑️ Semua soal berhasil dihapus!")
      await loadSoal(materiList)
    }
  }

  function toggleKunci(id) {
    setShowKunci(function (prev) {
      var next = { ...prev }
      next[id] = !next[id]
      return next
    })
  }

  function getPilihanObject(pilihan) {
    if (!pilihan) return {}
    if (typeof pilihan === "object" && !Array.isArray(pilihan)) return pilihan
    if (Array.isArray(pilihan)) {
      var huruf = ["A", "B", "C", "D", "E"]
      var obj = {}
      pilihan.forEach(function (opsi, i) { if (i < huruf.length) obj[huruf[i]] = opsi })
      return obj
    }
    try { return JSON.parse(pilihan) } catch (e) { return {} }
  }

  function loadTemplate(jenis) {
    if (jenis === "pg") {
      setTeksSoal(`1. Apa ibukota Indonesia?
A. Bandung
B. Jakarta*
C. Surabaya
D. Medan

2. Berapa hasil 5 + 3?
A. 6
B. 7
C. 8*
D. 9

3. Warna bendera Indonesia?
A. Merah Putih*
B. Putih Merah
C. Hijau Kuning
D. Biru Merah`)
    } else if (jenis === "essay") {
      setTeksSoal(`1. Jelaskan pengertian demokrasi!
JAWAB: Demokrasi adalah sistem pemerintahan dari rakyat, oleh rakyat, dan untuk rakyat.

2. Sebutkan 3 rukun Islam!
JAWAB: Syahadat, Sholat, Zakat, Puasa, Haji

3. Apa manfaat berolahraga?
JAWAB: Menyehatkan tubuh, meningkatkan stamina, mencegah penyakit.`)
    } else {
      setTeksSoal(`1. Apa ibukota Indonesia?
A. Bandung
B. Jakarta*
C. Surabaya
D. Medan

2. Jelaskan pengertian demokrasi!
JAWAB: Demokrasi adalah sistem pemerintahan dari rakyat.

3. Warna bendera Indonesia?
A. Merah Putih*
B. Putih Merah
C. Hijau Putih
D. Biru Putih

4. Sebutkan 3 rukun Islam!
JAWAB: Syahadat, Sholat, Zakat`)
    }
  }

  var filteredSoal = soalList.filter(function (s) {
    var matchMateri = filterMateri === "semua" || String(s.materi_id) === filterMateri
    var matchJenis = filterJenis === "semua" || (s.jenis_soal || "pg") === filterJenis
    return matchMateri && matchJenis
  })

  // Preview count
  var previewCount = previewSoal ? {
    total: previewSoal.length,
    pg: previewSoal.filter(function (s) { return s.jenis_soal === "pg" }).length,
    essay: previewSoal.filter(function (s) { return s.jenis_soal === "essay" }).length,
  } : null

  if (loading) return (<div style={st.center}><div style={st.spinner}></div><p style={{ marginTop: "16px", color: "#666" }}>Loading...</p></div>)

  return (
    <div style={st.container}>
      <div style={st.header}>
        <button onClick={function () { router.push("/dashboard") }} style={st.backBtn}>← Kembali</button>
        <h1 style={st.title}>❓ Kelola Soal</h1>
      </div>

      {pesan && (
        <div style={{ ...st.pesan, background: pesan.startsWith("✅") || pesan.startsWith("🎉") || pesan.startsWith("🗑️") ? "#dcfce7" : pesan.startsWith("⚠️") || pesan.startsWith("⏳") ? "#fef3c7" : "#fee2e2", color: pesan.startsWith("✅") || pesan.startsWith("🎉") || pesan.startsWith("🗑️") ? "#166534" : pesan.startsWith("⚠️") || pesan.startsWith("⏳") ? "#92400e" : "#dc2626" }}>
          {pesan}
        </div>
      )}

      <div style={st.tabWrap}>
        <button onClick={function () { setTab("buat") }} style={{ ...st.tabBtn, background: tab === "buat" ? "linear-gradient(135deg, #667eea, #764ba2)" : "white", color: tab === "buat" ? "white" : "#374151" }}>
          📋 Buat Soal (Paste)
        </button>
        <button onClick={function () { setTab("daftar") }} style={{ ...st.tabBtn, background: tab === "daftar" ? "linear-gradient(135deg, #667eea, #764ba2)" : "white", color: tab === "daftar" ? "white" : "#374151" }}>
          📚 Daftar Soal ({soalList.length})
        </button>
      </div>

      {tab === "buat" && (
        <div style={st.card}>
          <h2 style={st.cardTitle}>📋 Buat Soal (Copy-Paste)</h2>

          {materiList.length === 0 ? (
            <div style={st.emptySmall}><p>⚠️ Belum ada materi. Upload materi dulu!</p></div>
          ) : (
            <div>
              <div style={st.formGroup}>
                <label style={st.label}>Pilih Materi *</label>
                <select value={materiId} onChange={function (e) { setMateriId(e.target.value) }} style={st.select}>
                  {materiList.map(function (m) {
                    var count = getSoalPerMateri(m.id)
                    return <option key={m.id} value={m.id}>
                      Pertemuan {m.pertemuan_ke} - {m.judul} ({count.total} soal)
                    </option>
                  })}
                </select>
                {materiId && (function () {
                  var count = getSoalPerMateri(materiId)
                  return (
                    <p style={st.materiInfo}>
                      📊 Soal saat ini: <strong>{count.total}</strong> ({count.pg} PG + {count.essay} Essay)
                    </p>
                  )
                })()}
              </div>

              <div style={st.templateBox}>
                <p style={st.templateTitle}>📝 Format Penulisan Soal:</p>
                <div style={st.templateContent}>
                  <p style={{ margin: "0 0 8px 0", fontSize: "13px" }}><strong>PG:</strong> Beri tanda <code style={st.code}>*</code> pada jawaban benar</p>
                  <p style={{ margin: "0 0 8px 0", fontSize: "13px" }}><strong>Essay:</strong> Diikuti <code style={st.code}>JAWAB:</code> untuk kunci jawaban</p>
                  <p style={{ margin: "0 0 8px 0", fontSize: "13px" }}><strong>Antar soal:</strong> Pisahkan dengan <code style={st.code}>baris kosong</code></p>
                  <p style={{ margin: "0 0 0 0", fontSize: "13px", color: "#059669" }}><strong>✅ TIDAK ADA BATASAN:</strong> Bisa 5, 25, 50, atau 100 soal sekaligus!</p>
                </div>
                <div style={st.templateBtnWrap}>
                  <button onClick={function () { loadTemplate("pg") }} style={st.templateBtn}>📝 Contoh PG</button>
                  <button onClick={function () { loadTemplate("essay") }} style={st.templateBtn}>✍️ Contoh Essay</button>
                  <button onClick={function () { loadTemplate("campuran") }} style={st.templateBtn}>📋 Contoh Campuran</button>
                </div>
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>Ketik / Paste Soal di Sini *</label>
                <textarea
                  value={teksSoal}
                  onChange={function (e) { setTeksSoal(e.target.value) }}
                  placeholder={"1. Apa ibukota Indonesia?\nA. Bandung\nB. Jakarta*\nC. Surabaya\nD. Medan\n\n2. Jelaskan demokrasi!\nJAWAB: Sistem pemerintahan dari rakyat."}
                  style={st.textareaBig}
                  rows={18}
                />
                <p style={st.hint}>💡 Jumlah baris: {teksSoal.split('\n').length} • Karakter: {teksSoal.length}</p>
              </div>

              <button onClick={handlePreview} style={st.submitBtn}>👀 Preview Soal</button>
            </div>
          )}

          {previewSoal && previewSoal.length > 0 && (
            <div style={st.previewWrap}>
              <div style={st.previewHeader}>
                <h3 style={st.previewTitle}>👀 Preview Soal</h3>
                <div style={st.previewStats}>
                  <span style={st.badgeTotal}>Total: {previewCount.total}</span>
                  {previewCount.pg > 0 && <span style={st.badgePG}>PG: {previewCount.pg}</span>}
                  {previewCount.essay > 0 && <span style={st.badgeEssay}>Essay: {previewCount.essay}</span>}
                </div>
              </div>

              {previewSoal.map(function (s, i) {
                var isEssay = s.jenis_soal === "essay"
                return (
                  <div key={i} style={st.previewCard}>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                      <span style={st.previewNum}>#{i + 1}</span>
                      <span style={{ padding: "2px 10px", background: isEssay ? "#fef3c7" : "#dbeafe", color: isEssay ? "#92400e" : "#1e40af", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                        {isEssay ? "✍️ Essay" : "📝 PG"}
                      </span>
                    </div>
                    <p style={st.previewQ}>{s.pertanyaan}</p>

                    {!isEssay && s.pilihan && (
                      <div>
                        {Object.entries(s.pilihan).map(function (entry) {
                          var isBenar = entry[0] === s.jawaban_benar
                          return (
                            <p key={entry[0]} style={{ ...st.previewOption, background: isBenar ? "#dcfce7" : "#f9fafb", fontWeight: isBenar ? "700" : "400" }}>
                              {entry[0]}. {entry[1]} {isBenar ? " ✅" : ""}
                            </p>
                          )
                        })}
                      </div>
                    )}

                    {isEssay && s.kunci_essay && (
                      <div style={st.kunciBox}>
                        <p style={{ margin: 0, fontSize: "12px", color: "#667eea", fontWeight: "700" }}>🔑 Kunci Jawaban:</p>
                        <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#374151" }}>{s.kunci_essay}</p>
                      </div>
                    )}
                  </div>
                )
              })}

              <div style={st.previewActions}>
                <button onClick={function () { setPreviewSoal(null); setPesan("") }} style={st.retryBtn}>🔄 Edit Ulang</button>
                <button onClick={handleSimpan} disabled={saving} style={{ ...st.saveBtn, opacity: saving ? 0.7 : 1 }}>
                  {saving ? "⏳ Menyimpan..." : "💾 Simpan " + previewCount.total + " Soal"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "daftar" && (
        <div>
          <div style={st.filterWrap}>
            <div style={st.filterItem}>
              <label style={st.filterLabel}>Materi:</label>
              <select value={filterMateri} onChange={function (e) { setFilterMateri(e.target.value) }} style={st.filterSelect}>
                <option value="semua">Semua ({soalList.length})</option>
                {materiList.map(function (m) {
                  var count = getSoalPerMateri(m.id)
                  return <option key={m.id} value={String(m.id)}>{m.judul} ({count.total})</option>
                })}
              </select>
            </div>
            <div style={st.filterItem}>
              <label style={st.filterLabel}>Jenis:</label>
              <select value={filterJenis} onChange={function (e) { setFilterJenis(e.target.value) }} style={st.filterSelect}>
                <option value="semua">Semua</option>
                <option value="pg">Pilihan Ganda</option>
                <option value="essay">Essay</option>
              </select>
            </div>
            {filterMateri !== "semua" && (
              <button onClick={function () { handleHapusSemuaSoal(filterMateri) }} style={st.hapusSemuaBtn}>
                🗑️ Hapus Semua Soal Materi Ini
              </button>
            )}
          </div>

          {filteredSoal.length === 0 ? (
            <div style={st.empty}><p style={{ fontSize: "48px", margin: 0 }}>📭</p><p style={{ color: "#666", marginTop: "12px" }}>Belum ada soal.</p></div>
          ) : (
            <div style={st.listWrap}>
              {filteredSoal.map(function (item, index) {
                var pil = getPilihanObject(item.pilihan)
                var isEssay = (item.jenis_soal || "pg") === "essay"
                return (
                  <div key={item.id} style={st.soalCard}>
                    <div style={st.soalTop}>
                      <div style={st.nomor}>{index + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={st.soalTags}>
                          <span style={st.materiTag}>📚 {getMateriJudul(item.materi_id)}</span>
                          <span style={{ ...st.jenisTag, background: isEssay ? "#fef3c7" : "#dbeafe", color: isEssay ? "#92400e" : "#1e40af" }}>
                            {isEssay ? "✍️ Essay" : "📝 PG"}
                          </span>
                        </div>
                        <p style={st.soalText}>{item.pertanyaan}</p>
                      </div>
                    </div>

                    {!isEssay && pil && Object.keys(pil).length > 0 && (
                      <div style={st.pilihanList}>
                        {Object.entries(pil).map(function (entry) {
                          return (
                            <div key={entry[0]} style={{ ...st.pilihanRow, background: item.jawaban_benar === entry[0] ? "#dcfce7" : "#f9fafb", borderWidth: "1px", borderStyle: "solid", borderColor: item.jawaban_benar === entry[0] ? "#86efac" : "#e5e7eb" }}>
                              <span style={{ ...st.pilihanKey, background: item.jawaban_benar === entry[0] ? "#16a34a" : "#9ca3af" }}>{entry[0]}</span>
                              <span style={{ fontSize: "14px" }}>{entry[1]}</span>
                              {item.jawaban_benar === entry[0] && (<span style={st.benarText}>✅ Jawaban</span>)}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {isEssay && item.kunci_essay && (
                      <div>
                        <button onClick={function () { toggleKunci(item.id) }} style={st.kunciBtn}>
                          {showKunci[item.id] ? "🔒 Sembunyikan Kunci" : "🔑 Lihat Kunci Jawaban"}
                        </button>
                        {showKunci[item.id] && (
                          <div style={st.kunciBox}>
                            <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: "1.6" }}>{item.kunci_essay}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <button onClick={function () { handleHapusSoal(item.id) }} style={st.hapusBtn}>🗑️ Hapus</button>
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
  spinner: { width: "40px", height: "40px", borderWidth: "4px", borderStyle: "solid", borderColor: "#e0e0e0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" },
  header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", flexWrap: "wrap" },
  backBtn: { padding: "10px 18px", background: "white", borderWidth: "2px", borderStyle: "solid", borderColor: "#e5e7eb", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#374151" },
  title: { flex: 1, margin: 0, fontSize: "28px", color: "#1a1a1a" },
  pesan: { padding: "14px 20px", borderRadius: "10px", marginBottom: "20px", fontWeight: "600" },
  tabWrap: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" },
  tabBtn: { padding: "12px 24px", borderRadius: "10px", borderWidth: "2px", borderStyle: "solid", borderColor: "#e5e7eb", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  card: { background: "white", padding: "28px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" },
  cardTitle: { margin: "0 0 24px 0", fontSize: "20px", color: "#1a1a1a" },
  emptySmall: { padding: "20px", textAlign: "center", color: "#92400e", background: "#fef3c7", borderRadius: "10px" },
  formGroup: { marginBottom: "20px" },
  label: { display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#374151" },
  select: { width: "100%", padding: "12px 16px", borderWidth: "2px", borderStyle: "solid", borderColor: "#e5e7eb", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "white" },
  materiInfo: { margin: "8px 0 0 0", padding: "10px 14px", background: "#eff6ff", borderRadius: "8px", fontSize: "13px", color: "#1e40af" },
  textareaBig: { width: "100%", padding: "14px", borderWidth: "2px", borderStyle: "solid", borderColor: "#e5e7eb", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "'Courier New', monospace", resize: "vertical" },
  templateBox: { padding: "16px 20px", background: "#eff6ff", borderRadius: "12px", marginBottom: "20px", borderWidth: "1px", borderStyle: "solid", borderColor: "#bfdbfe" },
  templateTitle: { margin: "0 0 8px 0", fontSize: "14px", fontWeight: "700", color: "#1e40af" },
  templateContent: { marginBottom: "12px" },
  code: { padding: "2px 6px", background: "#1e40af", color: "white", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace" },
  templateBtnWrap: { display: "flex", gap: "8px", flexWrap: "wrap" },
  templateBtn: { padding: "6px 12px", background: "white", color: "#1e40af", borderWidth: "1px", borderStyle: "solid", borderColor: "#bfdbfe", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  hint: { margin: "6px 0 0 0", fontSize: "12px", color: "#6b7280", fontStyle: "italic" },
  submitBtn: { width: "100%", padding: "14px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "16px", fontWeight: "700" },
  previewWrap: { marginTop: "24px", borderTopWidth: "2px", borderTopStyle: "solid", borderTopColor: "#e5e7eb", paddingTop: "24px" },
  previewHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" },
  previewTitle: { margin: 0, fontSize: "18px" },
  previewStats: { display: "flex", gap: "8px", flexWrap: "wrap" },
  badgeTotal: { padding: "6px 12px", background: "#eef2ff", color: "#4338ca", borderRadius: "8px", fontSize: "13px", fontWeight: "700" },
  badgePG: { padding: "6px 12px", background: "#dbeafe", color: "#1e40af", borderRadius: "8px", fontSize: "13px", fontWeight: "700" },
  badgeEssay: { padding: "6px 12px", background: "#fef3c7", color: "#92400e", borderRadius: "8px", fontSize: "13px", fontWeight: "700" },
  previewCard: { padding: "16px", background: "#f9fafb", borderRadius: "10px", marginBottom: "12px", borderWidth: "1px", borderStyle: "solid", borderColor: "#e5e7eb" },
  previewNum: { padding: "2px 10px", background: "#667eea", color: "white", borderRadius: "6px", fontSize: "11px", fontWeight: "700" },
  previewQ: { margin: "0 0 10px 0", fontSize: "15px", lineHeight: "1.5", color: "#1a1a1a", fontWeight: "600" },
  previewOption: { margin: "0 0 6px 0", padding: "8px 12px", borderRadius: "6px", fontSize: "14px" },
  kunciBox: { padding: "12px 16px", background: "#fef3c7", borderRadius: "8px", marginTop: "8px", borderWidth: "1px", borderStyle: "solid", borderColor: "#fde68a" },
  previewActions: { display: "flex", gap: "10px", marginTop: "20px", justifyContent: "flex-end", flexWrap: "wrap" },
  retryBtn: { padding: "12px 20px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  saveBtn: { padding: "12px 24px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px" },
  filterWrap: { display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap", background: "white", padding: "16px 20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", alignItems: "center" },
  filterItem: { display: "flex", alignItems: "center", gap: "8px" },
  filterLabel: { fontSize: "14px", fontWeight: "600", color: "#374151" },
  filterSelect: { padding: "8px 12px", borderWidth: "2px", borderStyle: "solid", borderColor: "#e5e7eb", borderRadius: "8px", fontSize: "14px", background: "white" },
  hapusSemuaBtn: { padding: "8px 16px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  empty: { textAlign: "center", background: "white", padding: "48px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  listWrap: { display: "flex", flexDirection: "column", gap: "16px" },
  soalCard: { background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  soalTop: { display: "flex", gap: "14px", marginBottom: "14px" },
  nomor: { width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", flexShrink: 0 },
  soalTags: { display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" },
  materiTag: { padding: "2px 8px", background: "#f3f4f6", borderRadius: "6px", fontSize: "11px", color: "#6b7280", fontWeight: "600" },
  jenisTag: { padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" },
  soalText: { margin: 0, fontSize: "15px", fontWeight: "600", lineHeight: "1.5", color: "#1a1a1a" },
  pilihanList: { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" },
  pilihanRow: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px" },
  pilihanKey: { width: "28px", height: "28px", borderRadius: "6px", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", fontSize: "13px", flexShrink: 0 },
  benarText: { marginLeft: "auto", fontSize: "12px", fontWeight: "600", color: "#16a34a" },
  kunciBtn: { padding: "8px 16px", background: "#fef3c7", color: "#92400e", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", marginBottom: "8px" },
  hapusBtn: { display: "block", width: "100%", padding: "10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", marginTop: "12px" },
}