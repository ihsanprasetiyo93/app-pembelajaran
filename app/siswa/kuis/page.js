"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function SiswaKuisPage() {
  const [user, setUser] = useState(null)
  const [tingkatSiswa, setTingkatSiswa] = useState("")
  const [namaKelas, setNamaKelas] = useState("")
  const [bankSoal, setBankSoal] = useState([])
  const [soalList, setSoalList] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState("pilih")
  const [selectedMateri, setSelectedMateri] = useState(null)
  const [jawaban, setJawaban] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [hasil, setHasil] = useState(null)
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push("/login"); return }

    const { data: userData } = await supabase.from("users").select("*").eq("id", authUser.id).single()
    if (!userData || userData.role !== "siswa") { router.push("/dashboard"); return }

    setUser(userData)

    // 🎯 CERDAS: Ambil tingkat dari tabel kelas berdasarkan kelas_id
    let tingkat = ""
    let nama = ""

    if (userData.kelas_id) {
      // Coba cari di tabel kelas berdasarkan ID
      const { data: kelasData } = await supabase
        .from("kelas")
        .select("*")
        .eq("id", userData.kelas_id)
        .single()

      if (kelasData) {
        tingkat = kelasData.tingkat || ""
        nama = kelasData.nama_kelas || ""
      } else {
        // Kalau kelas_id sudah berupa tingkat langsung (misal "VIII")
        tingkat = userData.kelas_id
        nama = userData.kelas_id
      }
    }

    setTingkatSiswa(tingkat)
    setNamaKelas(nama)

    if (!tingkat) {
      setLoading(false)
      return
    }

    // Ambil semua materi yang tingkatnya sama dengan tingkat siswa
    const { data: materiData } = await supabase
      .from("materi")
      .select("*")
      .eq("tingkat", tingkat)
      .order("pertemuan_ke", { ascending: true })

    if (!materiData || materiData.length === 0) {
      setLoading(false)
      return
    }

    const bankSoalData = await Promise.all(
      materiData.map(async (materi) => {
        const { data: soalCheck } = await supabase
          .from("soal")
          .select("id, jenis_soal")
          .eq("materi_id", materi.id)

        const totalSoal = (soalCheck || []).length
        const totalPG = (soalCheck || []).filter(s => (s.jenis_soal || "pg") === "pg").length
        const totalEssay = (soalCheck || []).filter(s => s.jenis_soal === "essay").length

        const { data: nilaiSiswa } = await supabase
          .from("nilai")
          .select("skor, created_at")
          .eq("siswa_id", authUser.id)
          .eq("materi_id", materi.id)
          .order("created_at", { ascending: false })

        const sudahDikerjakan = (nilaiSiswa || []).length > 0
        const skorTerakhir = sudahDikerjakan ? nilaiSiswa[0].skor : null
        const jumlahDikerjakan = (nilaiSiswa || []).length

        const { data: guruData } = await supabase.from("users").select("nama, foto_url").eq("id", materi.guru_id).single()

        return {
          ...materi,
          jumlah_soal: totalSoal,
          total_pg: totalPG,
          total_essay: totalEssay,
          sudah_dikerjakan: sudahDikerjakan,
          skor_terakhir: skorTerakhir,
          jumlah_dikerjakan: jumlahDikerjakan,
          guru_nama: guruData?.nama || "Guru",
          guru_foto: guruData?.foto_url || null,
        }
      })
    )

    const withSoal = bankSoalData.filter(m => m.jumlah_soal > 0)
    setBankSoal(withSoal)
    setLoading(false)
  }

  async function mulaiKuis(materi) {
    if (materi.jumlah_soal === 0) {
      alert("Belum ada soal untuk materi ini")
      return
    }

    setSelectedMateri(materi)
    setJawaban({})
    setHasil(null)

    const { data: soalData, error } = await supabase.from("soal").select("*").eq("materi_id", materi.id).order("created_at", { ascending: true })

    if (error) { console.log("Error soal:", error); return }

    const sorted = (soalData || []).sort((a, b) => {
      const ja = (a.jenis_soal || "pg") === "essay" ? 1 : 0
      const jb = (b.jenis_soal || "pg") === "essay" ? 1 : 0
      return ja - jb
    })

    setSoalList(sorted)
    setMode("kerjakan")
  }

  function pilihJawaban(soalId, jwb) {
    setJawaban((prev) => ({ ...prev, [soalId]: jwb }))
  }

  function getPilihanObject(pilihan) {
    if (!pilihan) return {}
    if (typeof pilihan === "object" && !Array.isArray(pilihan)) return pilihan
    if (Array.isArray(pilihan)) {
      const huruf = ["A", "B", "C", "D", "E"]
      const obj = {}
      pilihan.forEach((opsi, i) => { if (i < huruf.length) obj[huruf[i]] = opsi })
      return obj
    }
    try { return JSON.parse(pilihan) } catch { return {} }
  }

  function koreksiEssay(jawabanSiswa, kunciJawaban) {
    if (!jawabanSiswa || !kunciJawaban) return 0
    const siswa = String(jawabanSiswa).toLowerCase().trim()
    const kunci = String(kunciJawaban).toLowerCase().trim()
    if (!siswa) return 0

    const kataKunci = kunci.replace(/[.,!?;:()"]/g, " ").split(/\s+/).filter(k => k.length >= 4)

    if (kataKunci.length === 0) {
      return siswa.includes(kunci.substring(0, Math.min(20, kunci.length))) ? 70 : 30
    }

    const kataDitemukan = kataKunci.filter(k => siswa.includes(k))
    const persentase = (kataDitemukan.length / kataKunci.length) * 100
    return Math.round(persentase)
  }

  async function handleSubmit() {
    const belumDijawab = soalList.filter((s) => !jawaban[s.id] || String(jawaban[s.id]).trim() === "")
    if (belumDijawab.length > 0) {
      alert("Masih ada " + belumDijawab.length + " soal yang belum dijawab!")
      return
    }

    setSubmitting(true)

    const soalPG = soalList.filter(s => (s.jenis_soal || "pg") === "pg")
    const soalEssay = soalList.filter(s => s.jenis_soal === "essay")

    let benarPG = 0
    const detailPG = []
    soalPG.forEach((soal) => {
      const jawabanSiswa = jawaban[soal.id]
      const isBenar = jawabanSiswa === soal.jawaban_benar
      if (isBenar) benarPG++
      detailPG.push({
        soal_id: soal.id,
        pertanyaan: soal.pertanyaan,
        jawaban_siswa: jawabanSiswa,
        jawaban_benar: soal.jawaban_benar,
        pilihan: soal.pilihan,
        benar: isBenar,
      })
    })

    let totalSkorEssay = 0
    const detailEssay = []
    soalEssay.forEach((soal) => {
      const jawabanSiswa = jawaban[soal.id]
      const skorEssay = koreksiEssay(jawabanSiswa, soal.kunci_essay)
      totalSkorEssay += skorEssay
      detailEssay.push({
        soal_id: soal.id,
        pertanyaan: soal.pertanyaan,
        jawaban_siswa: jawabanSiswa,
        kunci_essay: soal.kunci_essay,
        skor: skorEssay,
      })
    })

    const totalSoal = soalList.length
    let skorFinal = 0

    if (totalSoal > 0) {
      const nilaiPerSoal = 100 / totalSoal
      const skorPG = benarPG * nilaiPerSoal
      let skorEssayFinal = 0
      if (soalEssay.length > 0) {
        const rataEssay = totalSkorEssay / soalEssay.length
        skorEssayFinal = (rataEssay / 100) * (soalEssay.length * nilaiPerSoal)
      }
      skorFinal = Math.round(skorPG + skorEssayFinal)
    }

    const jawabanLengkap = {
      pg: detailPG,
      essay: detailEssay,
      total_pg: soalPG.length,
      total_essay: soalEssay.length,
      benar_pg: benarPG,
    }

    const { error } = await supabase.from("nilai").insert([{
      siswa_id: user.id,
      materi_id: selectedMateri.id,
      skor: skorFinal,
      jawaban_essay: JSON.stringify(jawabanLengkap),
    }])

    if (error) {
      console.log("Error simpan nilai:", error)
      alert("Gagal simpan nilai: " + error.message)
      setSubmitting(false)
      return
    }

    setHasil({
      skor: skorFinal,
      total_pg: soalPG.length,
      total_essay: soalEssay.length,
      benar_pg: benarPG,
      salah_pg: soalPG.length - benarPG,
      rata_essay: soalEssay.length > 0 ? Math.round(totalSkorEssay / soalEssay.length) : 0,
      detail_pg: detailPG,
      detail_essay: detailEssay,
    })

    setMode("hasil")
    setSubmitting(false)
    await loadData()
  }

  function getGrade(skor) {
    if (skor >= 90) return { grade: "A", label: "Sangat Baik", color: "#16a34a", emoji: "🎉" }
    if (skor >= 80) return { grade: "B+", label: "Baik Sekali", color: "#059669", emoji: "😊" }
    if (skor >= 70) return { grade: "B", label: "Baik", color: "#0891b2", emoji: "👍" }
    if (skor >= 60) return { grade: "C", label: "Cukup", color: "#ca8a04", emoji: "💪" }
    if (skor >= 50) return { grade: "D", label: "Kurang", color: "#ea580c", emoji: "📚" }
    return { grade: "E", label: "Perlu Belajar Lagi", color: "#dc2626", emoji: "🔥" }
  }

  if (loading) {
    return (<div style={s.center}><div style={s.spinner}></div><p style={{ marginTop: "16px", color: "#666" }}>Loading...</p></div>)
  }

  if (!tingkatSiswa) {
    return (
      <div style={s.container}>
        <div style={s.header}>
          <button onClick={() => router.push("/dashboard")} style={s.backBtn}>← Kembali</button>
          <h1 style={s.title}>✍️ Bank Soal</h1>
        </div>
        <div style={s.empty}>
          <p style={{ fontSize: "48px", margin: 0 }}>⚠️</p>
          <h3 style={{ color: "#dc2626", margin: "12px 0" }}>Kelas Belum Terdaftar</h3>
          <p style={{ color: "#666" }}>Kamu belum memiliki kelas. Hubungi guru untuk mendaftarkan kelasmu.</p>
        </div>
      </div>
    )
  }

  if (mode === "pilih") {
    return (
      <div style={s.container}>
        <div style={s.header}>
          <button onClick={() => router.push("/dashboard")} style={s.backBtn}>← Kembali</button>
          <h1 style={s.title}>📚 Bank Soal</h1>
        </div>

        <div style={s.kelasInfo}>
          <span style={{ fontSize: "24px" }}>🎓</span>
          <div>
            <p style={{ margin: 0, fontSize: "12px", opacity: 0.9 }}>Kelas Kamu:</p>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>{namaKelas} (Tingkat {tingkatSiswa})</p>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: "12px", opacity: 0.9 }}>Total Bank Soal:</p>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>{bankSoal.length} materi</p>
          </div>
        </div>

        <div style={s.infoCard}>
          <p style={{ margin: 0, fontSize: "14px" }}>
            💡 <strong>Bank Soal per Materi</strong> - Klik salah satu materi di bawah untuk mengerjakan soalnya. Kamu hanya bisa mengakses soal untuk kelas <strong>{tingkatSiswa}</strong>.
          </p>
        </div>

        {bankSoal.length === 0 ? (
          <div style={s.empty}>
            <p style={{ fontSize: "48px", margin: 0 }}>📭</p>
            <p style={{ color: "#666", marginTop: "12px" }}>Belum ada bank soal untuk kelas {tingkatSiswa}.</p>
            <p style={{ color: "#9ca3af", fontSize: "13px", marginTop: "8px" }}>Guru belum membuat soal untuk kelas kamu.</p>
          </div>
        ) : (
          <div style={s.grid}>
            {bankSoal.map((item) => (
              <div key={item.id} style={s.bankCard}>
                {item.sudah_dikerjakan && (
                  <div style={s.badgeSudah}>
                    ✅ Sudah dikerjakan ({item.jumlah_dikerjakan}x)
                  </div>
                )}

                <div style={s.bankIcon}>
                  <span style={{ fontSize: "36px" }}>📝</span>
                </div>

                <div style={s.bankTags}>
                  <span style={s.tingkatBadge}>🏫 Kelas {item.tingkat}</span>
                  <span style={s.pertemuanBadge}>Pertemuan {item.pertemuan_ke}</span>
                </div>

                <h3 style={s.bankJudul}>{item.judul}</h3>
                <p style={s.bankMapel}>📚 {item.mata_pelajaran || "Umum"}</p>

                <div style={s.guruWrap}>
                  {item.guru_foto ? (
                    <img src={item.guru_foto} alt={item.guru_nama} style={s.guruFoto} />
                  ) : (
                    <div style={s.guruFotoPlaceholder}>{item.guru_nama.charAt(0)}</div>
                  )}
                  <span style={s.guruNama}>{item.guru_nama}</span>
                </div>

                <div style={s.statsBar}>
                  <div style={s.statItem}>
                    <span style={s.statIcon}>❓</span>
                    <span style={s.statNum}>{item.jumlah_soal}</span>
                    <span style={s.statLbl}>Soal</span>
                  </div>
                  {item.total_pg > 0 && (
                    <div style={s.statItem}>
                      <span style={s.statIcon}>📝</span>
                      <span style={s.statNum}>{item.total_pg}</span>
                      <span style={s.statLbl}>PG</span>
                    </div>
                  )}
                  {item.total_essay > 0 && (
                    <div style={s.statItem}>
                      <span style={s.statIcon}>✍️</span>
                      <span style={s.statNum}>{item.total_essay}</span>
                      <span style={s.statLbl}>Essay</span>
                    </div>
                  )}
                </div>

                {item.sudah_dikerjakan && (
                  <div style={s.skorTerakhir}>
                    <span>Nilai Terakhir:</span>
                    <strong style={{ fontSize: "18px", color: item.skor_terakhir >= 70 ? "#16a34a" : "#dc2626" }}>
                      {item.skor_terakhir}
                    </strong>
                  </div>
                )}

                <button onClick={() => mulaiKuis(item)} style={s.mulaiBtn}>
                  {item.sudah_dikerjakan ? "🔄 Kerjakan Lagi" : "🚀 Mulai Kerjakan"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (mode === "kerjakan") {
    return (
      <div style={s.container}>
        <div style={s.header}>
          <button
            onClick={() => {
              if (confirm("Yakin mau keluar? Jawaban tidak akan disimpan.")) setMode("pilih")
            }}
            style={s.backBtn}
          >← Kembali</button>
          <h1 style={s.title}>📝 {selectedMateri.judul}</h1>
        </div>

        <div style={s.progressCard}>
          <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
            Dijawab: <strong>{Object.keys(jawaban).length}</strong> / {soalList.length} soal
          </p>
          <div style={s.progressBar}>
            <div style={{ ...s.progressFill, width: `${(Object.keys(jawaban).length / soalList.length) * 100}%` }}></div>
          </div>
        </div>

        <div style={s.listWrap}>
          {soalList.map((soal, index) => {
            const isEssay = (soal.jenis_soal || "pg") === "essay"
            const pilihanObj = getPilihanObject(soal.pilihan)

            return (
              <div key={soal.id} style={s.soalCard}>
                <div style={s.soalHeader}>
                  <div style={s.nomor}>{index + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: "6px" }}>
                      <span style={{
                        padding: "2px 10px",
                        background: isEssay ? "#fef3c7" : "#dbeafe",
                        color: isEssay ? "#92400e" : "#1e40af",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "700",
                      }}>
                        {isEssay ? "✍️ Essay" : "📝 Pilihan Ganda"}
                      </span>
                    </div>
                    <p style={s.soalText}>{soal.pertanyaan}</p>
                  </div>
                </div>

                {!isEssay && (
                  <div style={s.pilihanWrap}>
                    {Object.entries(pilihanObj).map(([key, value]) => {
                      const selected = jawaban[soal.id] === key
                      return (
                        <div
                          key={key}
                          onClick={() => pilihJawaban(soal.id, key)}
                          style={{
                            ...s.pilihanBtn,
                            background: selected ? "#eef2ff" : "white",
                            borderWidth: "2px",
                            borderStyle: "solid",
                            borderColor: selected ? "#667eea" : "#e5e7eb",
                          }}
                        >
                          <span style={{ ...s.pilihanKey, background: selected ? "#667eea" : "#9ca3af" }}>
                            {key}
                          </span>
                          <span style={{ fontSize: "14px", color: selected ? "#1a1a1a" : "#4b5563", fontWeight: selected ? "600" : "400" }}>
                            {value}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {isEssay && (
                  <div>
                    <textarea
                      value={jawaban[soal.id] || ""}
                      onChange={(e) => pilihJawaban(soal.id, e.target.value)}
                      placeholder="Tulis jawaban kamu di sini..."
                      style={s.essayInput}
                      rows={5}
                    />
                    <p style={s.essayHint}>💡 Jawab dengan jelas dan lengkap</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1, marginTop: "24px" }}
        >
          {submitting ? "⏳ Mengirim..." : "📤 Submit Jawaban"}
        </button>
      </div>
    )
  }

  if (mode === "hasil") {
    const grade = getGrade(hasil.skor)

    return (
      <div style={s.container}>
        <div style={s.hasilCard}>
          <p style={{ fontSize: "64px", margin: 0 }}>{grade.emoji}</p>
          <h1 style={s.hasilTitle}>{grade.label}</h1>

          <div style={{ ...s.skorCircle, background: `linear-gradient(135deg, ${grade.color}, ${grade.color}dd)` }}>
            <p style={s.skorNumber}>{hasil.skor}</p>
            <p style={s.skorLabel}>Nilai • {grade.grade}</p>
          </div>

          <div style={s.hasilDetail}>
            {hasil.total_pg > 0 && (
              <div style={s.hasilItem}>
                <p style={s.hasilItemLabel}>PG Benar</p>
                <p style={{ ...s.hasilItemValue, color: "#16a34a" }}>{hasil.benar_pg}/{hasil.total_pg}</p>
              </div>
            )}
            {hasil.total_essay > 0 && (
              <div style={s.hasilItem}>
                <p style={s.hasilItemLabel}>Essay</p>
                <p style={{ ...s.hasilItemValue, color: "#0891b2" }}>{hasil.rata_essay}</p>
              </div>
            )}
            <div style={s.hasilItem}>
              <p style={s.hasilItemLabel}>Total Soal</p>
              <p style={s.hasilItemValue}>{hasil.total_pg + hasil.total_essay}</p>
            </div>
          </div>

          {hasil.total_essay > 0 && (
            <div style={s.warningBox}>
              💡 Nilai essay adalah estimasi otomatis. Guru dapat mengoreksi ulang.
            </div>
          )}

          <div style={s.reviewWrap}>
            <h3 style={s.reviewTitle}>📋 Detail Jawaban</h3>

            {hasil.detail_pg.map((d, i) => (
              <div key={"pg-" + i} style={s.reviewCard}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ padding: "2px 8px", background: "#dbeafe", color: "#1e40af", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>📝 PG</span>
                  <span style={{
                    padding: "2px 8px",
                    background: d.benar ? "#dcfce7" : "#fee2e2",
                    color: d.benar ? "#166534" : "#991b1b",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "700",
                  }}>
                    {d.benar ? "✅ Benar" : "❌ Salah"}
                  </span>
                </div>
                <p style={s.reviewQ}><strong>{i + 1}.</strong> {d.pertanyaan}</p>
                <p style={{ margin: "8px 0 4px 0", fontSize: "13px", color: "#6b7280" }}>Jawaban Kamu: <strong style={{ color: d.benar ? "#16a34a" : "#dc2626" }}>{d.jawaban_siswa}</strong></p>
                {!d.benar && (
                  <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Jawaban Benar: <strong style={{ color: "#16a34a" }}>{d.jawaban_benar}</strong></p>
                )}
              </div>
            ))}

            {hasil.detail_essay.map((d, i) => (
              <div key={"essay-" + i} style={s.reviewCard}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>✍️ Essay</span>
                  <span style={{ padding: "2px 8px", background: "#e0e7ff", color: "#4338ca", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>Skor: {d.skor}</span>
                </div>
                <p style={s.reviewQ}><strong>{hasil.detail_pg.length + i + 1}.</strong> {d.pertanyaan}</p>
                <div style={s.essayReviewBox}>
                  <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#667eea", fontWeight: "700" }}>📝 Jawaban Kamu:</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#374151" }}>{d.jawaban_siswa}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={s.hasilBtnWrap}>
            <button onClick={() => setMode("pilih")} style={s.hasilBtn}>📝 Bank Soal Lain</button>
            <button onClick={() => router.push("/dashboard")} style={s.hasilBtnPrimary}>🏠 Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

const s = {
  container: { minHeight: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%)", padding: "24px", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  center: { minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" },
  spinner: { width: "40px", height: "40px", borderWidth: "4px", borderStyle: "solid", borderColor: "#e0e0e0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" },
  header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", flexWrap: "wrap" },
  backBtn: { padding: "10px 18px", background: "white", borderWidth: "2px", borderStyle: "solid", borderColor: "#e5e7eb", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#374151" },
  title: { flex: 1, margin: 0, fontSize: "24px", color: "#1a1a1a" },
  kelasInfo: { display: "flex", alignItems: "center", gap: "14px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", padding: "16px 24px", borderRadius: "16px", marginBottom: "16px", boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)" },
  infoCard: { background: "white", padding: "16px 20px", borderRadius: "12px", marginBottom: "24px", borderLeftWidth: "4px", borderLeftStyle: "solid", borderLeftColor: "#667eea", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  empty: { textAlign: "center", background: "white", padding: "48px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" },
  bankCard: { background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", position: "relative", overflow: "hidden", transition: "all 0.3s" },
  badgeSudah: { position: "absolute", top: "12px", right: "12px", padding: "4px 10px", background: "#dcfce7", color: "#166534", borderRadius: "8px", fontSize: "11px", fontWeight: "700" },
  bankIcon: { width: "60px", height: "60px", background: "linear-gradient(135deg, #eef2ff, #e0e7ff)", borderRadius: "16px", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "14px" },
  bankTags: { display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" },
  tingkatBadge: { padding: "3px 10px", background: "#fef3c7", color: "#92400e", borderRadius: "16px", fontSize: "11px", fontWeight: "700" },
  pertemuanBadge: { padding: "3px 10px", background: "#dbeafe", color: "#1e40af", borderRadius: "16px", fontSize: "11px", fontWeight: "700" },
  bankJudul: { margin: "0 0 6px 0", fontSize: "17px", color: "#1a1a1a", fontWeight: "700", lineHeight: "1.3" },
  bankMapel: { margin: "0 0 12px 0", fontSize: "13px", color: "#667eea", fontWeight: "600" },
  guruWrap: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#f9fafb", borderRadius: "10px", marginBottom: "12px" },
  guruFoto: { width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" },
  guruFotoPlaceholder: { width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", fontSize: "12px" },
  guruNama: { fontSize: "13px", color: "#374151", fontWeight: "600" },
  statsBar: { display: "flex", justifyContent: "space-around", padding: "12px", background: "#f9fafb", borderRadius: "10px", marginBottom: "12px" },
  statItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" },
  statIcon: { fontSize: "18px" },
  statNum: { fontSize: "18px", fontWeight: "700", color: "#1a1a1a" },
  statLbl: { fontSize: "10px", color: "#6b7280", fontWeight: "600" },
  skorTerakhir: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f0fdf4", borderRadius: "10px", marginBottom: "12px", fontSize: "13px", color: "#166534", fontWeight: "600" },
  mulaiBtn: { width: "100%", padding: "12px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px" },
  progressCard: { background: "white", padding: "16px 24px", borderRadius: "16px", marginBottom: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  progressBar: { width: "100%", height: "8px", background: "#e5e7eb", borderRadius: "4px", marginTop: "10px", overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(135deg, #667eea, #764ba2)", borderRadius: "4px", transition: "width 0.3s ease" },
  listWrap: { display: "flex", flexDirection: "column", gap: "16px" },
  soalCard: { background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  soalHeader: { display: "flex", gap: "14px", marginBottom: "16px" },
  nomor: { width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", flexShrink: 0 },
  soalText: { margin: 0, fontSize: "16px", fontWeight: "600", color: "#1a1a1a", lineHeight: "1.5" },
  pilihanWrap: { display: "flex", flexDirection: "column", gap: "10px" },
  pilihanBtn: { display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "10px", cursor: "pointer", transition: "all 0.2s" },
  pilihanKey: { width: "32px", height: "32px", borderRadius: "8px", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", fontSize: "14px", flexShrink: 0 },
  essayInput: { width: "100%", padding: "14px", borderWidth: "2px", borderStyle: "solid", borderColor: "#e5e7eb", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: "1.6" },
  essayHint: { margin: "6px 0 0 0", fontSize: "12px", color: "#6b7280", fontStyle: "italic" },
  submitBtn: { width: "100%", padding: "16px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontSize: "18px", fontWeight: "700" },
  hasilCard: { background: "white", padding: "48px 32px", borderRadius: "24px", textAlign: "center", maxWidth: "700px", margin: "0 auto", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" },
  hasilTitle: { margin: "16px 0 24px 0", fontSize: "28px", color: "#1a1a1a" },
  skorCircle: { width: "140px", height: "140px", borderRadius: "50%", color: "white", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", margin: "0 auto 24px auto" },
  skorNumber: { margin: 0, fontSize: "42px", fontWeight: "700" },
  skorLabel: { margin: "4px 0 0 0", fontSize: "13px", opacity: 0.9, fontWeight: "600" },
  hasilDetail: { display: "flex", justifyContent: "center", gap: "24px", marginBottom: "24px", flexWrap: "wrap" },
  hasilItem: { textAlign: "center", padding: "12px 20px", background: "#f9fafb", borderRadius: "10px", minWidth: "100px" },
  hasilItemLabel: { margin: "0 0 4px 0", fontSize: "13px", color: "#6b7280" },
  hasilItemValue: { margin: 0, fontSize: "24px", fontWeight: "700", color: "#1a1a1a" },
  warningBox: { padding: "12px 20px", background: "#fef3c7", color: "#92400e", borderRadius: "10px", fontSize: "13px", marginBottom: "24px", borderWidth: "1px", borderStyle: "solid", borderColor: "#fde68a" },
  reviewWrap: { marginTop: "24px", textAlign: "left", borderTopWidth: "2px", borderTopStyle: "solid", borderTopColor: "#e5e7eb", paddingTop: "24px" },
  reviewTitle: { margin: "0 0 16px 0", fontSize: "18px", color: "#1a1a1a" },
  reviewCard: { padding: "16px", background: "#f9fafb", borderRadius: "10px", marginBottom: "12px", borderWidth: "1px", borderStyle: "solid", borderColor: "#e5e7eb", textAlign: "left" },
  reviewQ: { margin: "0 0 8px 0", fontSize: "14px", color: "#1a1a1a", lineHeight: "1.5" },
  essayReviewBox: { padding: "10px 14px", background: "white", borderRadius: "8px", marginTop: "8px", borderWidth: "1px", borderStyle: "solid", borderColor: "#e5e7eb" },
  hasilBtnWrap: { display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "24px" },
  hasilBtn: { padding: "12px 24px", background: "white", borderWidth: "2px", borderStyle: "solid", borderColor: "#e5e7eb", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  hasilBtnPrimary: { padding: "12px 24px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
}