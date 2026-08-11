"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { useRouter } from "next/navigation"
import { generateRPPWord } from "../../../lib/rppWordGenerator"

const DPL_LIST = [
  { key: "dpl1", label: "DPL 1 - Keimanan & Ketakwaan kepada Tuhan YME" },
  { key: "dpl2", label: "DPL 2 - Kewargaan" },
  { key: "dpl3", label: "DPL 3 - Penalaran Kritis" },
  { key: "dpl4", label: "DPL 4 - Kreativitas" },
  { key: "dpl5", label: "DPL 5 - Kolaborasi" },
  { key: "dpl6", label: "DPL 6 - Kemandirian" },
  { key: "dpl7", label: "DPL 7 - Kesehatan" },
  { key: "dpl8", label: "DPL 8 - Komunikasi" },
]

const KBC_LIST = [
  { key: "kbc1", label: "TOPIK 1 - Cinta Allah dan Rasul-Nya" },
  { key: "kbc2", label: "TOPIK 2 - Cinta Ilmu" },
  { key: "kbc3", label: "TOPIK 3 - Cinta Lingkungan" },
  { key: "kbc4", label: "TOPIK 4 - Cinta Diri dan Sesama Manusia" },
  { key: "kbc5", label: "TOPIK 5 - Cinta Tanah Air" },
]

const DEFAULT_KEGIATAN_INTI = [
  {
    tahap: "MEMAHAMI",
    tahapColor: "1B5E4F",
    langkah: "a. Orientasi\n(Mengenalkan Topik & Memicu Rasa Ingin Tahu)",
    faseCld: [
      { label: "PENGETAHUAN", color: "1F3A5F" },
      { label: "KOLABORASI", color: "1B5E4F" },
    ],
    aktivitas: "1) \n2) ",
  },
  {
    tahap: "",
    tahapColor: "",
    langkah: "b. Merumuskan Pertanyaan / Hipotesis",
    faseCld: [
      { label: "PENGETAHUAN", color: "1F3A5F" },
      { label: "PEMECAHAN MASALAH", color: "D4761F" },
    ],
    aktivitas: "1) \n2) ",
  },
  {
    tahap: "MENGAPLIKASI",
    tahapColor: "F4E4B1",
    langkah: "c. Mengumpulkan Data (Investigasi / Eksplorasi)",
    faseCld: [
      { label: "KOLABORASI", color: "1B5E4F" },
      { label: "ICT", color: "17A2B8" },
      { label: "PEMECAHAN MASALAH", color: "D4761F" },
    ],
    aktivitas: "1) \n2) ",
  },
  {
    tahap: "",
    tahapColor: "",
    langkah: "d. Menganalisis Data & Menarik Kesimpulan",
    faseCld: [
      { label: "PENGETAHUAN", color: "1F3A5F" },
      { label: "PEMECAHAN MASALAH", color: "D4761F" },
      { label: "ICT", color: "17A2B8" },
    ],
    aktivitas: "1) \n2) ",
  },
  {
    tahap: "MEREFLEKSI",
    tahapColor: "8B2635",
    langkah: "e. Mempresentasikan Hasil & Refleksi",
    faseCld: [
      { label: "KOMUNIKASI", color: "6B2A6B" },
      { label: "PENGATURAN DIRI", color: "8B2635" },
      { label: "KOLABORASI", color: "1B5E4F" },
    ],
    aktivitas: "1) \n2) \n3) ",
  },
]

export default function GuruRPPPage() {
  const [user, setUser] = useState(null)
  const [rppList, setRppList] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState("list")
  const [editingId, setEditingId] = useState(null)
  const [pesan, setPesan] = useState("")
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    return {
      satuan_pendidikan: "MTs/MA Darul Amanah",
      mata_pelajaran: "IPS",
      kelas_semester: "VIII / 1 (Ganjil)",
      topik_pembelajaran: "",
      alokasi_waktu: "2 x 40 Menit",
      capaian_pembelajaran: "",
      alur_tujuan_pembelajaran: "",
      dasar_naqli_surah: "",
      dasar_naqli_arab: "",
      dasar_naqli_terjemah: "",
      dasar_naqli_keterkaitan: "",
      asesmen_awal: "",
      dpl_dipilih: {},
      kbc_dipilih: {},
      materi_integrasi_kbc: "",
      tujuan_pembelajaran: "",
      model_pembelajaran: "Inquiry Learning",
      metode: "Curah pendapat, tanya jawab, diskusi, presentasi, penugasan",
      kemitraan: "",
      lingkungan_fisik: "Ruang kelas seting kelompok dengan perangkat audio visual",
      ruang_virtual: "Video dan laman web",
      budaya_belajar: "Kolaboratif dan interaktif",
      pemanfaatan_digital: "Laman, video, dan media sosial",
      kegiatan_awal: "a. Mengucapkan salam dan mengajak berdoa.\nb. Mengkondisikan murid siap belajar (ice breaking / permainan jika diperlukan).\nc. Presensi dan apresiasi kehadiran.\nd. Apersepsi dan motivasi: menanyakan materi sebelumnya + pertanyaan pemantik.\ne. Menyampaikan tujuan pembelajaran, alur kegiatan, dan teknik penilaian.",
      kegiatan_inti_tabel: DEFAULT_KEGIATAN_INTI,
      kegiatan_penutup: "1. Peserta didik menyimpulkan kegiatan bersama guru.\n2. Guru menyampaikan informasi kegiatan yang akan datang.\n3. Guru menutup dengan mengajak bersyukur dan mengucapkan salam.",
      asesmen_formatif: "Penilaian sejawat, penilaian diri, observasi, jurnal, pertanyaan diagnostik, umpan balik formatif.",
      asesmen_sumatif: "Penilaian proyek, produk, portofolio, penilaian kinerja, tes tertulis, tes lisan.",
      catatan_asesmen: "",
      tempat_tanggal: "..............., ...................... " + new Date().getFullYear(),
      kepala_madrasah: "",
      guru_mapel: "",
      lkpd: "",
      bahan_ajar: "",
      soal_hots: "",
      media_pembelajaran: "",
      referensi: "",
    }
  }

  useEffect(function () { loadData() }, [])

  async function loadData() {
    var authResult = await supabase.auth.getUser()
    var authUser = authResult.data.user
    if (!authUser) { router.push("/login"); return }

    var userResult = await supabase.from("users").select("*").eq("id", authUser.id).single()
    if (!userResult.data || userResult.data.role !== "guru") { router.push("/dashboard"); return }

    setUser(userResult.data)
    setForm(function (prev) { return { ...prev, guru_mapel: userResult.data.nama } })
    await loadRPP(authUser.id)
    setLoading(false)
  }

  async function loadRPP(guruId) {
    var result = await supabase.from("rpp").select("*").eq("guru_id", guruId).order("created_at", { ascending: false })
    setRppList(result.data || [])
  }

  function openNew() {
    var defForm = defaultForm()
    defForm.guru_mapel = user.nama
    setForm(defForm)
    setEditingId(null)
    setMode("form")
    setPesan("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function openEdit(rpp) {
    var newForm = {
      satuan_pendidikan: rpp.satuan_pendidikan || "",
      mata_pelajaran: rpp.mata_pelajaran || "",
      kelas_semester: rpp.kelas_semester || "",
      topik_pembelajaran: rpp.topik_pembelajaran || "",
      alokasi_waktu: rpp.alokasi_waktu || "",
      capaian_pembelajaran: rpp.capaian_pembelajaran || "",
      alur_tujuan_pembelajaran: rpp.alur_tujuan_pembelajaran || "",
      dasar_naqli_surah: rpp.dasar_naqli_surah || "",
      dasar_naqli_arab: rpp.dasar_naqli_arab || "",
      dasar_naqli_terjemah: rpp.dasar_naqli_terjemah || "",
      dasar_naqli_keterkaitan: rpp.dasar_naqli_keterkaitan || "",
      asesmen_awal: rpp.asesmen_awal || "",
      dpl_dipilih: rpp.dpl_dipilih || {},
      kbc_dipilih: rpp.kbc_dipilih || {},
      materi_integrasi_kbc: rpp.materi_integrasi_kbc || "",
      tujuan_pembelajaran: rpp.tujuan_pembelajaran || "",
      model_pembelajaran: rpp.model_pembelajaran || "",
      metode: rpp.metode || "",
      kemitraan: rpp.kemitraan || "",
      lingkungan_fisik: rpp.lingkungan_fisik || "",
      ruang_virtual: rpp.ruang_virtual || "",
      budaya_belajar: rpp.budaya_belajar || "",
      pemanfaatan_digital: rpp.pemanfaatan_digital || "",
      kegiatan_awal: rpp.kegiatan_awal || "",
      kegiatan_inti_tabel: rpp.kegiatan_inti_tabel || DEFAULT_KEGIATAN_INTI,
      kegiatan_penutup: rpp.kegiatan_penutup || "",
      asesmen_formatif: rpp.asesmen_formatif || "",
      asesmen_sumatif: rpp.asesmen_sumatif || "",
      catatan_asesmen: rpp.catatan_asesmen || "",
      tempat_tanggal: rpp.tempat_tanggal || "",
      kepala_madrasah: rpp.kepala_madrasah || "",
      guru_mapel: rpp.guru_mapel || "",
      lkpd: rpp.lkpd || "",
      bahan_ajar: rpp.bahan_ajar || "",
      soal_hots: rpp.soal_hots || "",
      media_pembelajaran: rpp.media_pembelajaran || "",
      referensi: rpp.referensi || "",
    }
    setForm(newForm)
    setEditingId(rpp.id)
    setMode("form")
    setPesan("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function toggleDPL(key) {
    setForm(function (prev) {
      var newDPL = { ...prev.dpl_dipilih }
      newDPL[key] = !newDPL[key]
      return { ...prev, dpl_dipilih: newDPL }
    })
  }

  function toggleKBC(key) {
    setForm(function (prev) {
      var newKBC = { ...prev.kbc_dipilih }
      newKBC[key] = !newKBC[key]
      return { ...prev, kbc_dipilih: newKBC }
    })
  }

  function updateField(field, value) {
    setForm(function (prev) { return { ...prev, [field]: value } })
  }

  function updateAktivitas(idx, value) {
    setForm(function (prev) {
      var newTabel = [...(prev.kegiatan_inti_tabel || DEFAULT_KEGIATAN_INTI)]
      newTabel[idx] = { ...newTabel[idx], aktivitas: value }
      return { ...prev, kegiatan_inti_tabel: newTabel }
    })
  }

  async function handleSimpan() {
    if (!form.topik_pembelajaran) { setPesan("❌ Topik pembelajaran wajib diisi!"); return }

    setSaving(true)
    setPesan("")

    var data = { guru_id: user.id, ...form }

    var result
    if (editingId) {
      result = await supabase.from("rpp").update(data).eq("id", editingId)
    } else {
      result = await supabase.from("rpp").insert(data)
    }

    if (result.error) {
      setPesan("❌ Gagal simpan: " + result.error.message)
    } else {
      setPesan("🎉 RPP berhasil disimpan!")
      await loadRPP(user.id)
      setTimeout(function () {
        setMode("list")
        setPesan("")
      }, 1000)
    }
    setSaving(false)
  }

  async function handleHapus(id) {
    if (!confirm("Yakin hapus RPP ini?")) return
    await supabase.from("rpp").delete().eq("id", id)
    await loadRPP(user.id)
    setPesan("🗑️ RPP berhasil dihapus!")
  }

  async function downloadWord(rpp) {
    setGenerating(true)
    try {
      await generateRPPWord(rpp, DPL_LIST, KBC_LIST)
    } catch (err) {
      alert("Gagal generate Word: " + err.message)
    }
    setGenerating(false)
  }

  if (loading) {
    return (<div style={st.center}><div style={st.spinner}></div><p style={{ marginTop: "16px", color: "#666" }}>Loading...</p></div>)
  }

  return (
    <div style={st.container}>
      <div style={st.header}>
        <button onClick={function () {
          if (mode === "form") { setMode("list"); setPesan("") }
          else { router.push("/dashboard") }
        }} style={st.backBtn}>← Kembali</button>
        <h1 style={st.title}>
          {mode === "list" ? "📋 Bank RPP" : editingId ? "✏️ Edit RPP" : "➕ Buat RPP Baru"}
        </h1>
        {mode === "list" && (<button onClick={openNew} style={st.addBtn}>+ Buat RPP Baru</button>)}
      </div>

      {pesan && (
        <div style={{ ...st.pesan, background: pesan.startsWith("✅") || pesan.startsWith("🎉") || pesan.startsWith("🗑️") ? "#dcfce7" : "#fee2e2", color: pesan.startsWith("✅") || pesan.startsWith("🎉") || pesan.startsWith("🗑️") ? "#166534" : "#dc2626" }}>
          {pesan}
        </div>
      )}

      {mode === "list" && (
        <div>
          <div style={st.infoCard}>
            <p style={{ margin: 0, fontSize: "14px" }}>
              📄 <strong>Bank RPP</strong> - Template lengkap dengan Dasar Naqli (Al-Qur'an/Hadits), DPL, KBC, dan 21 CLD. Download langsung ke format Word (.docx).
            </p>
          </div>

          {rppList.length === 0 ? (
            <div style={st.empty}>
              <p style={{ fontSize: "48px", margin: 0 }}>📭</p>
              <p style={{ color: "#666", marginTop: "12px" }}>Belum ada RPP. Klik "+ Buat RPP Baru" untuk mulai.</p>
              <button onClick={openNew} style={{ ...st.submitBtn, maxWidth: "300px", marginTop: "20px" }}>+ Buat RPP Pertama</button>
            </div>
          ) : (
            <div style={st.grid}>
              {rppList.map(function (rpp) {
                return (
                  <div key={rpp.id} style={st.card}>
                    <div style={st.cardIcon}>📄</div>
                    <div style={st.cardTags}>
                      <span style={st.mapelBadge}>📚 {rpp.mata_pelajaran || "-"}</span>
                      <span style={st.kelasBadge}>{rpp.kelas_semester || "-"}</span>
                    </div>
                    <h3 style={st.cardJudul}>{rpp.topik_pembelajaran || "Tanpa Judul"}</h3>
                    <p style={st.cardMeta}>🏫 {rpp.satuan_pendidikan || "-"}</p>
                    <p style={st.cardMeta}>⏰ {rpp.alokasi_waktu || "-"}</p>
                    {rpp.dasar_naqli_surah && <p style={st.cardMeta}>📖 {rpp.dasar_naqli_surah}</p>}
                    <p style={st.cardDate}>Dibuat: {new Date(rpp.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>

                    <div style={st.actionRow}>
                      <button onClick={function () { downloadWord(rpp) }} disabled={generating} style={{ ...st.downloadBtn, opacity: generating ? 0.6 : 1 }}>
                        {generating ? "⏳ Generating..." : "⬇️ Download Word"}
                      </button>
                    </div>
                    <div style={st.actionRow}>
                      <button onClick={function () { openEdit(rpp) }} style={st.editBtn}>✏️ Edit</button>
                      <button onClick={function () { handleHapus(rpp.id) }} style={st.hapusBtn}>🗑️ Hapus</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {mode === "form" && (
        <div style={st.formCard}>
          <p style={st.sectionLabel}>A. SPESIFIKASI</p>
          <div style={st.row2}>
            <div style={st.inputGroup}>
              <label style={st.label}>A1 - Satuan Pendidikan</label>
              <input type="text" value={form.satuan_pendidikan} onChange={function (e) { updateField("satuan_pendidikan", e.target.value) }} style={st.input} />
            </div>
            <div style={st.inputGroup}>
              <label style={st.label}>A2 - Mata Pelajaran</label>
              <input type="text" value={form.mata_pelajaran} onChange={function (e) { updateField("mata_pelajaran", e.target.value) }} style={st.input} />
            </div>
          </div>
          <div style={st.row2}>
            <div style={st.inputGroup}>
              <label style={st.label}>A3 - Kelas / Semester</label>
              <input type="text" value={form.kelas_semester} onChange={function (e) { updateField("kelas_semester", e.target.value) }} style={st.input} placeholder="VIII / 1 (Ganjil)" />
            </div>
            <div style={st.inputGroup}>
              <label style={st.label}>A5 - Alokasi Waktu</label>
              <input type="text" value={form.alokasi_waktu} onChange={function (e) { updateField("alokasi_waktu", e.target.value) }} style={st.input} placeholder="2 x 40 Menit" />
            </div>
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>A4 - Topik Pembelajaran *</label>
            <input type="text" value={form.topik_pembelajaran} onChange={function (e) { updateField("topik_pembelajaran", e.target.value) }} style={st.input} placeholder="Contoh: Kondisi Geografis Indonesia" />
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>A6 - Capaian Pembelajaran</label>
            <textarea value={form.capaian_pembelajaran} onChange={function (e) { updateField("capaian_pembelajaran", e.target.value) }} style={st.textarea} rows={3} placeholder="Tuliskan capaian pembelajaran yang harus dikuasai siswa..." />
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>A7 - Alur Tujuan Pembelajaran</label>
            <textarea value={form.alur_tujuan_pembelajaran} onChange={function (e) { updateField("alur_tujuan_pembelajaran", e.target.value) }} style={st.textarea} rows={3} placeholder="Tuliskan alur tujuan pembelajaran secara berurutan..." />
          </div>

          <p style={st.sectionLabel}>B. IDENTIFIKASI</p>

          <div style={st.subSection}>
            <p style={st.subLabel}>B1 - Dasar Naqli (Al-Qur'an / Hadits) *</p>
            <p style={st.hint}>💡 Wajib diisi setiap modul. Cantumkan ayat Al-Qur'an dan/atau hadits landasan materi.</p>

            <div style={st.inputGroup}>
              <label style={st.label}>Surah / Ayat / Hadits</label>
              <input type="text" value={form.dasar_naqli_surah} onChange={function (e) { updateField("dasar_naqli_surah", e.target.value) }} style={st.input} placeholder="Contoh: QS. Ar-Rum: 41 / HR. Bukhari" />
            </div>
            <div style={st.inputGroup}>
              <label style={st.label}>Lafal Arab</label>
              <textarea value={form.dasar_naqli_arab} onChange={function (e) { updateField("dasar_naqli_arab", e.target.value) }} style={{ ...st.textarea, textAlign: "right", fontSize: "22px", fontFamily: "'Traditional Arabic', serif" }} rows={3} placeholder="Ketik lafal arab di sini..." />
            </div>
            <div style={st.inputGroup}>
              <label style={st.label}>Terjemahan</label>
              <textarea value={form.dasar_naqli_terjemah} onChange={function (e) { updateField("dasar_naqli_terjemah", e.target.value) }} style={st.textarea} rows={3} placeholder="Terjemahan bahasa Indonesia..." />
            </div>
            <div style={st.inputGroup}>
              <label style={st.label}>Keterkaitan dengan Materi Pembelajaran</label>
              <textarea value={form.dasar_naqli_keterkaitan} onChange={function (e) { updateField("dasar_naqli_keterkaitan", e.target.value) }} style={st.textarea} rows={4} placeholder="Jelaskan hubungan ayat/hadits dengan materi..." />
            </div>
          </div>

          <div style={st.inputGroup}>
            <label style={st.label}>B2 - Asesmen pada Awal Pembelajaran (opsional)</label>
            <textarea value={form.asesmen_awal} onChange={function (e) { updateField("asesmen_awal", e.target.value) }} style={st.textarea} rows={5} placeholder="Tuliskan strategi penilaian awal dan tindak lanjut..." />
          </div>

          <div style={st.inputGroup}>
            <label style={st.label}>B2 - Dimensi Profil Lulusan (DPL) - Pilih yang ingin dicapai</label>
            <div style={st.checkGrid}>
              {DPL_LIST.map(function (d) {
                return (
                  <label key={d.key} style={{ ...st.checkItem, background: form.dpl_dipilih[d.key] ? "#eef2ff" : "white" }}>
                    <input type="checkbox" checked={form.dpl_dipilih[d.key] || false} onChange={function () { toggleDPL(d.key) }} />
                    <span style={{ fontSize: "13px" }}>{d.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div style={st.inputGroup}>
            <label style={st.label}>B3 - Topik Panca Cinta (KBC) - Pilih yang sesuai</label>
            <div style={st.checkGrid}>
              {KBC_LIST.map(function (k) {
                return (
                  <label key={k.key} style={{ ...st.checkItem, background: form.kbc_dipilih[k.key] ? "#fff9e6" : "white" }}>
                    <input type="checkbox" checked={form.kbc_dipilih[k.key] || false} onChange={function () { toggleKBC(k.key) }} />
                    <span style={{ fontSize: "13px" }}>{k.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div style={st.inputGroup}>
            <label style={st.label}>B4 - Materi Integrasi KBC</label>
            <textarea value={form.materi_integrasi_kbc} onChange={function (e) { updateField("materi_integrasi_kbc", e.target.value) }} style={st.textarea} rows={5} placeholder="Jelaskan integrasi nilai-nilai KBC dalam materi..." />
          </div>

          <p style={st.sectionLabel}>C. DESAIN PEMBELAJARAN</p>
          <div style={st.inputGroup}>
            <label style={st.label}>C1 - Tujuan Pembelajaran</label>
            <textarea value={form.tujuan_pembelajaran} onChange={function (e) { updateField("tujuan_pembelajaran", e.target.value) }} style={st.textarea} rows={6} placeholder="Tuliskan tujuan pembelajaran dengan kata kerja operasional..." />
          </div>

          <p style={{ ...st.sectionLabel, fontSize: "14px", marginTop: "16px" }}>C2 - Kerangka Pembelajaran</p>
          <div style={st.inputGroup}>
            <label style={st.label}>a. Model Pembelajaran</label>
            <input type="text" value={form.model_pembelajaran} onChange={function (e) { updateField("model_pembelajaran", e.target.value) }} style={st.input} />
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>b. Metode</label>
            <textarea value={form.metode} onChange={function (e) { updateField("metode", e.target.value) }} style={st.textarea} rows={2} />
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>c. Kemitraan (opsional)</label>
            <input type="text" value={form.kemitraan} onChange={function (e) { updateField("kemitraan", e.target.value) }} style={st.input} />
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>d. Lingkungan Fisik</label>
            <input type="text" value={form.lingkungan_fisik} onChange={function (e) { updateField("lingkungan_fisik", e.target.value) }} style={st.input} />
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>e. Ruang Virtual</label>
            <input type="text" value={form.ruang_virtual} onChange={function (e) { updateField("ruang_virtual", e.target.value) }} style={st.input} />
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>f. Budaya Belajar</label>
            <input type="text" value={form.budaya_belajar} onChange={function (e) { updateField("budaya_belajar", e.target.value) }} style={st.input} />
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>g. Pemanfaatan Digital (opsional)</label>
            <input type="text" value={form.pemanfaatan_digital} onChange={function (e) { updateField("pemanfaatan_digital", e.target.value) }} style={st.input} />
          </div>

          <p style={st.sectionLabel}>D. PENGALAMAN BELAJAR</p>
          <div style={st.inputGroup}>
            <label style={st.label}>D1 - Kegiatan Awal</label>
            <textarea value={form.kegiatan_awal} onChange={function (e) { updateField("kegiatan_awal", e.target.value) }} style={st.textarea} rows={6} />
          </div>

          <div style={st.inputGroup}>
            <label style={st.label}>D2 - Kegiatan Inti (Tabel Inquiry + 21 CLD)</label>
            <p style={st.hint}>💡 Isi aktivitas pembelajaran untuk setiap tahap. Tabel akan otomatis muncul di Word.</p>

            {(form.kegiatan_inti_tabel || DEFAULT_KEGIATAN_INTI).map(function (row, idx) {
              return (
                <div key={idx} style={st.tabelRow}>
                  <div style={st.tabelHeader}>
                    {row.tahap && <span style={{ ...st.tahapBadge, background: "#" + row.tahapColor }}>{row.tahap}</span>}
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>{row.langkah.split("\n")[0]}</span>
                  </div>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "8px", flexWrap: "wrap" }}>
                    {row.faseCld.map(function (f, i) {
                      return <span key={i} style={{ padding: "2px 8px", background: "#" + f.color, color: "white", borderRadius: "6px", fontSize: "10px", fontWeight: "700" }}>{f.label}</span>
                    })}
                  </div>
                  <textarea
                    value={row.aktivitas || ""}
                    onChange={function (e) { updateAktivitas(idx, e.target.value) }}
                    style={{ ...st.textarea, fontSize: "13px" }}
                    rows={3}
                    placeholder="Tulis aktivitas pembelajaran..."
                  />
                </div>
              )
            })}
          </div>

          <div style={st.inputGroup}>
            <label style={st.label}>D3 - Kegiatan Penutup</label>
            <textarea value={form.kegiatan_penutup} onChange={function (e) { updateField("kegiatan_penutup", e.target.value) }} style={st.textarea} rows={4} />
          </div>

          <p style={st.sectionLabel}>E. ASESMEN PEMBELAJARAN</p>
          <div style={st.inputGroup}>
            <label style={st.label}>E1 - Asesmen Proses (Formatif)</label>
            <textarea value={form.asesmen_formatif} onChange={function (e) { updateField("asesmen_formatif", e.target.value) }} style={st.textarea} rows={3} />
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>E2 - Asesmen Akhir (Sumatif)</label>
            <textarea value={form.asesmen_sumatif} onChange={function (e) { updateField("asesmen_sumatif", e.target.value) }} style={st.textarea} rows={3} />
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>Catatan Asesmen Tambahan</label>
            <textarea value={form.catatan_asesmen} onChange={function (e) { updateField("catatan_asesmen", e.target.value) }} style={st.textarea} rows={2} />
          </div>

          <p style={st.sectionLabel}>FOOTER - Tanda Tangan</p>
          <div style={st.inputGroup}>
            <label style={st.label}>Tempat, Tanggal</label>
            <input type="text" value={form.tempat_tanggal} onChange={function (e) { updateField("tempat_tanggal", e.target.value) }} style={st.input} />
          </div>
          <div style={st.row2}>
            <div style={st.inputGroup}>
              <label style={st.label}>Kepala Madrasah</label>
              <input type="text" value={form.kepala_madrasah} onChange={function (e) { updateField("kepala_madrasah", e.target.value) }} style={st.input} />
            </div>
            <div style={st.inputGroup}>
              <label style={st.label}>Guru Mata Pelajaran</label>
              <input type="text" value={form.guru_mapel} onChange={function (e) { updateField("guru_mapel", e.target.value) }} style={st.input} />
            </div>
          </div>

          <p style={st.sectionLabel}>LAMPIRAN</p>
          <div style={st.inputGroup}>
            <label style={st.label}>L1 - Lembar Kerja Peserta Didik (LKPD)</label>
            <textarea value={form.lkpd} onChange={function (e) { updateField("lkpd", e.target.value) }} style={st.textarea} rows={6} />
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>L2 - Bahan Ajar / Materi Bacaan</label>
            <textarea value={form.bahan_ajar} onChange={function (e) { updateField("bahan_ajar", e.target.value) }} style={st.textarea} rows={4} />
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>L4 - Instrumen Asesmen Akhir (soal / rubrik proyek)</label>
            <textarea value={form.soal_hots} onChange={function (e) { updateField("soal_hots", e.target.value) }} style={st.textarea} rows={5} />
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>L5 - Media Pembelajaran (tautan video, laman, dll.)</label>
            <textarea value={form.media_pembelajaran} onChange={function (e) { updateField("media_pembelajaran", e.target.value) }} style={st.textarea} rows={4} />
          </div>
          <div style={st.inputGroup}>
            <label style={st.label}>L6 - Referensi / Sumber Belajar</label>
            <textarea value={form.referensi} onChange={function (e) { updateField("referensi", e.target.value) }} style={st.textarea} rows={4} />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
            <button type="button" onClick={function () { setMode("list"); setPesan("") }} style={st.cancelBtn}>
              ✕ Batal
            </button>
            <button onClick={handleSimpan} disabled={saving} style={{ ...st.submitBtn, opacity: saving ? 0.7 : 1 }}>
              {saving ? "⏳ Menyimpan..." : editingId ? "💾 Update RPP" : "💾 Simpan RPP"}
            </button>
          </div>
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
  title: { flex: 1, margin: 0, fontSize: "26px", color: "#1a1a1a" },
  addBtn: { padding: "10px 20px", background: "linear-gradient(135deg, #f97316, #ea580c)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600" },
  pesan: { padding: "14px 20px", borderRadius: "10px", marginBottom: "20px", fontWeight: "600" },
  infoCard: { background: "linear-gradient(135deg, #f97316, #ea580c)", color: "white", padding: "16px 20px", borderRadius: "12px", marginBottom: "20px" },
  empty: { textAlign: "center", background: "white", padding: "48px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "18px" },
  card: { background: "white", padding: "22px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" },
  cardIcon: { fontSize: "40px", marginBottom: "10px" },
  cardTags: { display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" },
  mapelBadge: { padding: "3px 10px", background: "#dbeafe", color: "#1e40af", borderRadius: "12px", fontSize: "11px", fontWeight: "700" },
  kelasBadge: { padding: "3px 10px", background: "#fef3c7", color: "#92400e", borderRadius: "12px", fontSize: "11px", fontWeight: "700" },
  cardJudul: { margin: "0 0 8px 0", fontSize: "16px", color: "#1a1a1a", fontWeight: "700", lineHeight: "1.3" },
  cardMeta: { margin: "0 0 4px 0", fontSize: "12px", color: "#6b7280" },
  cardDate: { margin: "8px 0 12px 0", fontSize: "11px", color: "#9ca3af" },
  actionRow: { display: "flex", gap: "8px", marginBottom: "8px" },
  downloadBtn: { flex: 1, padding: "12px", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "13px" },
  editBtn: { flex: 1, padding: "8px", background: "#dbeafe", color: "#1e40af", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  hapusBtn: { flex: 1, padding: "8px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },

  formCard: { background: "white", padding: "28px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" },
  sectionLabel: { margin: "24px 0 12px 0", fontSize: "16px", fontWeight: "700", color: "#f97316", borderBottomWidth: "2px", borderBottomStyle: "solid", borderBottomColor: "#ffedd5", paddingBottom: "8px" },
  subSection: { padding: "16px", background: "#eff6ff", borderRadius: "10px", marginBottom: "16px", borderLeftWidth: "4px", borderLeftStyle: "solid", borderLeftColor: "#1e40af" },
  subLabel: { margin: "0 0 4px 0", fontSize: "15px", fontWeight: "700", color: "#1e40af" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  inputGroup: { marginBottom: "14px" },
  label: { display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "13px", color: "#374151" },
  input: { width: "100%", padding: "10px 14px", borderWidth: "2px", borderStyle: "solid", borderColor: "#e5e7eb", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 14px", borderWidth: "2px", borderStyle: "solid", borderColor: "#e5e7eb", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: "1.5" },
  hint: { margin: "4px 0 12px 0", fontSize: "12px", color: "#6b7280", fontStyle: "italic" },
  checkGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px" },
  checkItem: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderWidth: "1px", borderStyle: "solid", borderColor: "#e5e7eb", borderRadius: "8px", cursor: "pointer" },
  tabelRow: { padding: "14px", background: "#f9fafb", borderRadius: "10px", marginBottom: "10px", borderWidth: "1px", borderStyle: "solid", borderColor: "#e5e7eb" },
  tabelHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" },
  tahapBadge: { padding: "4px 12px", color: "white", borderRadius: "8px", fontSize: "11px", fontWeight: "700" },
  submitBtn: { flex: 1, padding: "14px", background: "linear-gradient(135deg, #f97316, #ea580c)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "16px", fontWeight: "700" },
  cancelBtn: { padding: "14px 24px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600" },
}