"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [kelasId, setKelasId] = useState("")
  const [kelasList, setKelasList] = useState([])
  const [loading, setLoading] = useState(false)
  const [pesan, setPesan] = useState("")
  const [berhasil, setBerhasil] = useState(false)
  const [logoUrl, setLogoUrl] = useState("")
  const [namaApp, setNamaApp] = useState("App Pembelajaran")
  const router = useRouter()

  useEffect(function () {
    loadKelas()
    loadSettings()
  }, [])

  async function loadKelas() {
    var result = await supabase
      .from("kelas")
      .select("*")
      .order("jenjang", { ascending: true })
      .order("tingkat", { ascending: true })
      .order("rombel", { ascending: true })

    setKelasList(result.data || [])
  }

  async function loadSettings() {
    var logoResult = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "logo_url")
      .single()

    if (logoResult.data && logoResult.data.setting_value) {
      setLogoUrl(logoResult.data.setting_value)
    }

    var namaResult = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "nama_aplikasi")
      .single()

    if (namaResult.data && namaResult.data.setting_value) {
      setNamaApp(namaResult.data.setting_value)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()

    if (!nama || !email || !password || !kelasId) {
      setPesan("❌ Semua field wajib diisi termasuk kelas!")
      return
    }

    if (password.length < 6) {
      setPesan("❌ Password minimal 6 karakter!")
      return
    }

    setLoading(true)
    setPesan("")

    var authResult = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (authResult.error) {
      setPesan("❌ Gagal daftar: " + authResult.error.message)
      setLoading(false)
      return
    }

    if (!authResult.data.user) {
      setPesan("❌ User gagal dibuat")
      setLoading(false)
      return
    }

    var insertResult = await supabase.from("users").insert({
      id: authResult.data.user.id,
      nama: nama,
      email: email,
      username: email.split("@")[0],
      role: "siswa",
      status: "pending",
      is_online: false,
      kelas_id: Number(kelasId),
    })

    if (insertResult.error) {
      setPesan("❌ Gagal simpan data: " + insertResult.error.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    setBerhasil(true)
    setPesan("✅ Pendaftaran berhasil! Menunggu persetujuan guru.")
    setLoading(false)
  }

  var kelasByJenjang = {}
  kelasList.forEach(function (k) {
    var j = k.jenjang || "Lainnya"
    if (!kelasByJenjang[j]) kelasByJenjang[j] = []
    kelasByJenjang[j].push(k)
  })

  return (
    <div style={st.container}>
      <div style={st.card}>
        <div style={st.headerWrap}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={st.logoImg} />
          ) : (
            <p style={{ fontSize: "48px", margin: 0 }}>🎓</p>
          )}
          <h1 style={st.title}>Daftar Akun Siswa</h1>
          <p style={st.subtitle}>{namaApp}</p>
          <p style={st.subtitleSmall}>Setelah daftar, tunggu guru menyetujui akun kamu</p>
        </div>

        {pesan && (
          <div style={{
            ...st.pesan,
            background: pesan.startsWith("✅") ? "#dcfce7" : "#fee2e2",
            color: pesan.startsWith("✅") ? "#166534" : "#dc2626",
          }}>
            {pesan}
          </div>
        )}

        {berhasil ? (
          <div style={st.successWrap}>
            <p style={{ fontSize: "64px", margin: 0 }}>⏳</p>
            <h2 style={{ margin: "16px 0 8px 0", color: "#1a1a1a" }}>Menunggu Persetujuan</h2>
            <p style={{ color: "#6b7280", fontSize: "14px", lineHeight: "1.6" }}>
              Akun kamu sudah terdaftar. Silakan hubungi guru untuk menyetujui pendaftaran.
            </p>
            <button onClick={function () { router.push("/login") }} style={st.submitBtn}>
              Kembali ke Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleRegister}>
            <div style={st.formGroup}>
              <label style={st.label}>Nama Lengkap *</label>
              <input
                type="text"
                placeholder="Contoh: Budi Santoso"
                value={nama}
                onChange={function (e) { setNama(e.target.value) }}
                style={st.input}
              />
            </div>

            <div style={st.formGroup}>
              <label style={st.label}>Email *</label>
              <input
                type="email"
                placeholder="Contoh: budi@gmail.com"
                value={email}
                onChange={function (e) { setEmail(e.target.value) }}
                style={st.input}
              />
            </div>

            <div style={st.formGroup}>
              <label style={st.label}>Password *</label>
              <input
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={function (e) { setPassword(e.target.value) }}
                style={st.input}
              />
            </div>

            <div style={st.formGroup}>
              <label style={st.label}>Pilih Kelas *</label>
              <select
                value={kelasId}
                onChange={function (e) { setKelasId(e.target.value) }}
                style={st.select}
              >
                <option value="">-- Pilih Kelas --</option>
                {Object.entries(kelasByJenjang).map(function (entry) {
                  var jenjang = entry[0]
                  var kelasArr = entry[1]
                  return (
                    <optgroup key={jenjang} label={jenjang}>
                      {kelasArr.map(function (k) {
                        return <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                      })}
                    </optgroup>
                  )
                })}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ ...st.submitBtn, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "⏳ Mendaftar..." : "🚀 Daftar Sekarang"}
            </button>
          </form>
        )}

        {!berhasil && (
          <div style={st.linkWrap}>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
              Sudah punya akun?{" "}
              <span onClick={function () { router.push("/login") }} style={st.link}>
                Login di sini
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

var st = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: "white",
    padding: "40px 36px",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
  },
  headerWrap: {
    textAlign: "center",
    marginBottom: "28px",
  },
  logoImg: {
    width: "72px",
    height: "72px",
    borderRadius: "16px",
    objectFit: "cover",
    marginBottom: "8px",
  },
  title: {
    margin: "12px 0 4px 0",
    fontSize: "26px",
    color: "#1a1a1a",
  },
  subtitle: {
    margin: "0 0 4px 0",
    fontSize: "15px",
    color: "#667eea",
    fontWeight: "600",
  },
  subtitleSmall: {
    margin: 0,
    fontSize: "13px",
    color: "#6b7280",
  },
  pesan: {
    padding: "12px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontWeight: "600",
    fontSize: "14px",
    textAlign: "center",
  },
  successWrap: {
    textAlign: "center",
    padding: "20px 0",
  },
  formGroup: {
    marginBottom: "18px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    fontSize: "14px",
    color: "#374151",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    border: "2px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "12px 16px",
    border: "2px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    background: "white",
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
    marginTop: "8px",
  },
  linkWrap: {
    textAlign: "center",
    marginTop: "20px",
  },
  link: {
    color: "#667eea",
    fontWeight: "700",
    cursor: "pointer",
    textDecoration: "underline",
  },
}