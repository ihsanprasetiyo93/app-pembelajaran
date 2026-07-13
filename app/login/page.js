"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [pesan, setPesan] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [namaApp, setNamaApp] = useState("App Pembelajaran")
  const router = useRouter()

  useEffect(function () {
    loadSettings()
  }, [])

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

  async function handleLogin(e) {
    e.preventDefault()

    if (!email || !password) {
      setPesan("❌ Email dan password wajib diisi!")
      return
    }

    setLoading(true)
    setPesan("")

    var authResult = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (authResult.error) {
      setPesan("❌ Login gagal: " + authResult.error.message)
      setLoading(false)
      return
    }

    var userResult = await supabase
      .from("users")
      .select("*")
      .eq("id", authResult.data.user.id)
      .single()

    if (userResult.error || !userResult.data) {
      setPesan("❌ Data user tidak ditemukan")
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    var userData = userResult.data

    if (userData.role === "siswa" && userData.status === "pending") {
      setPesan("⏳ Akun kamu belum disetujui guru.")
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (userData.role === "siswa" && userData.status === "rejected") {
      setPesan("❌ Akun kamu ditolak oleh guru.")
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    var sessionId = Date.now().toString() + Math.random().toString(36).substring(2)

    var updateResult = await supabase
      .from("users")
      .update({
        is_online: true,
        last_seen: new Date().toISOString(),
        session_id: sessionId,
      })
      .eq("id", userData.id)

    if (updateResult.error) {
      setPesan("❌ Gagal update session: " + updateResult.error.message)
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    sessionStorage.setItem("app_session_id", sessionId)
    sessionStorage.setItem("app_user_id", userData.id)

    setPesan("✅ Login berhasil!")

    setTimeout(function () {
      router.push("/dashboard")
    }, 500)
  }

  return (
    <div style={st.container}>
      <div style={st.card}>
        <div style={st.headerWrap}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={st.logoImg} />
          ) : (
            <p style={{ fontSize: "48px", margin: 0 }}>📚</p>
          )}
          <h1 style={st.title}>Login</h1>
          <p style={st.subtitle}>{namaApp}</p>
        </div>

        {pesan && (
          <div style={{
            ...st.pesan,
            background: pesan.startsWith("✅") ? "#dcfce7"
              : pesan.startsWith("⏳") ? "#fef3c7"
              : "#fee2e2",
            color: pesan.startsWith("✅") ? "#166534"
              : pesan.startsWith("⏳") ? "#92400e"
              : "#dc2626",
          }}>
            {pesan}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={st.formGroup}>
            <label style={st.label}>Email</label>
            <input
              type="email"
              placeholder="Masukkan email"
              value={email}
              onChange={function (e) { setEmail(e.target.value) }}
              style={st.input}
            />
          </div>

          <div style={st.formGroup}>
            <label style={st.label}>Password</label>
            <input
              type="password"
              placeholder="Masukkan password"
              value={password}
              onChange={function (e) { setPassword(e.target.value) }}
              style={st.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...st.submitBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "⏳ Masuk..." : "🔑 Login"}
          </button>
        </form>

        <div style={st.linkWrap}>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
            Belum punya akun?{" "}
            <span onClick={function () { router.push("/register") }} style={st.link}>
              Daftar di sini
            </span>
          </p>
        </div>
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
    margin: 0,
    fontSize: "15px",
    color: "#667eea",
    fontWeight: "600",
  },
  pesan: {
    padding: "12px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontWeight: "600",
    fontSize: "14px",
    textAlign: "center",
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