"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [kicked, setKicked] = useState(false)
  const [kickMessage, setKickMessage] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [namaApp, setNamaApp] = useState("App Pembelajaran")
  const [showUploadLogo, setShowUploadLogo] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showEditFoto, setShowEditFoto] = useState(false)
  const router = useRouter()

  useEffect(function () {
    loadUser()
    loadSettings()

    var heartbeat = setInterval(function () { sendHeartbeat() }, 10000)
    var sessionCheck = setInterval(function () { checkSession() }, 3000)

    function handlePageHide() { markOffline() }
    function handleVisibility() {
      if (document.visibilityState === "visible") { sendHeartbeat(); checkSession() }
    }

    window.addEventListener("pagehide", handlePageHide)
    document.addEventListener("visibilitychange", handleVisibility)

    return function () {
      clearInterval(heartbeat)
      clearInterval(sessionCheck)
      window.removeEventListener("pagehide", handlePageHide)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [])

  async function loadSettings() {
    try {
      var logoResult = await supabase.from("app_settings").select("setting_value").eq("setting_key", "logo_url").single()
      if (logoResult.data && logoResult.data.setting_value) setLogoUrl(logoResult.data.setting_value)

      var namaResult = await supabase.from("app_settings").select("setting_value").eq("setting_key", "nama_aplikasi").single()
      if (namaResult.data && namaResult.data.setting_value) setNamaApp(namaResult.data.setting_value)
    } catch (err) {
      console.log("loadSettings error:", err)
    }
  }

  async function loadUser() {
    try {
      var sessionResult = await supabase.auth.getSession()
      var session = sessionResult.data.session

      if (!session || !session.user) {
        router.push("/login")
        return
      }

      var tabSessionId = sessionStorage.getItem("app_session_id")
      if (!tabSessionId) {
        router.push("/login")
        return
      }

      // Ambil data user TANPA join
      var userResult = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (userResult.error || !userResult.data) {
        console.log("User error:", userResult.error)
        router.push("/login")
        return
      }

      var userData = userResult.data

      // Ambil data kelas TERPISAH (lebih aman)
      if (userData.kelas_id) {
        try {
          var kelasResult = await supabase
            .from("kelas")
            .select("nama_kelas, tingkat, jenjang")
            .eq("id", userData.kelas_id)
            .single()

          if (kelasResult.data) {
            userData.kelas = kelasResult.data
          } else {
            userData.kelas = null
          }
        } catch (err) {
          console.log("Kelas error:", err)
          userData.kelas = null
        }
      } else {
        userData.kelas = null
      }

      // Cek status siswa
      if (userData.role === "siswa" && userData.status === "pending") {
        await supabase.auth.signOut()
        sessionStorage.removeItem("app_session_id")
        sessionStorage.removeItem("app_user_id")
        router.push("/login")
        return
      }

      // Cek anti dobel tab
      if (userData.session_id && userData.session_id !== tabSessionId) {
        await forceLogout("Akun ini dibuka di tab/window lain.")
        setLoading(false)
        return
      }

      setUser(userData)
      setLoading(false)
      await sendHeartbeat()
    } catch (err) {
      console.log("loadUser error:", err)
      setLoading(false)
    }
  }

  async function sendHeartbeat() {
    try {
      var userId = sessionStorage.getItem("app_user_id")
      var tabSessionId = sessionStorage.getItem("app_session_id")
      if (!userId || !tabSessionId) return
      await supabase
        .from("users")
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq("id", userId)
        .eq("session_id", tabSessionId)
    } catch (err) {
      console.log("heartbeat error:", err)
    }
  }

  async function checkSession() {
    try {
      var userId = sessionStorage.getItem("app_user_id")
      var tabSessionId = sessionStorage.getItem("app_session_id")
      if (!userId || !tabSessionId) return
      var result = await supabase
        .from("users")
        .select("session_id")
        .eq("id", userId)
        .single()
      if (result.data && result.data.session_id !== tabSessionId) {
        await forceLogout("Akun login di tab/window lain. Sesi ini ditutup.")
      }
    } catch (err) {
      console.log("checkSession error:", err)
    }
  }

  async function markOffline() {
    try {
      var userId = sessionStorage.getItem("app_user_id")
      var tabSessionId = sessionStorage.getItem("app_session_id")
      if (!userId) return
      await supabase
        .from("users")
        .update({ is_online: false, last_seen: new Date().toISOString(), session_id: null })
        .eq("id", userId)
        .eq("session_id", tabSessionId)
    } catch (err) {
      console.log("markOffline error:", err)
    }
  }

  async function forceLogout(msg) {
    setKickMessage(msg || "Sesi berakhir")
    setKicked(true)
    sessionStorage.removeItem("app_session_id")
    sessionStorage.removeItem("app_user_id")
    try { await supabase.auth.signOut() } catch (err) {}
  }

  async function handleLogout() {
    await markOffline()
    sessionStorage.removeItem("app_session_id")
    sessionStorage.removeItem("app_user_id")
    await supabase.auth.signOut()
    router.push("/login")
  }

  async function handleUploadLogo(e) {
    var file = e.target.files[0]
    if (!file) return
    setUploading(true)
    var fileName = "logo_" + Date.now() + "_" + file.name
    var uploadResult = await supabase.storage.from("profile-photos").upload(fileName, file)
    if (uploadResult.error) {
      alert("Gagal upload: " + uploadResult.error.message)
      setUploading(false)
      return
    }
    var url = supabase.storage.from("profile-photos").getPublicUrl(fileName).data.publicUrl
    await supabase.from("app_settings").update({ setting_value: url }).eq("setting_key", "logo_url")
    setLogoUrl(url)
    setShowUploadLogo(false)
    setUploading(false)
  }

  async function handleUploadFoto(e) {
    var file = e.target.files[0]
    if (!file) return
    setUploading(true)
    var fileName = "foto_" + user.id + "_" + Date.now() + "_" + file.name
    var uploadResult = await supabase.storage.from("profile-photos").upload(fileName, file)
    if (uploadResult.error) {
      alert("Gagal upload: " + uploadResult.error.message)
      setUploading(false)
      return
    }
    var url = supabase.storage.from("profile-photos").getPublicUrl(fileName).data.publicUrl
    await supabase.from("users").update({ foto_url: url }).eq("id", user.id)
    setUser({ ...user, foto_url: url })
    setShowEditFoto(false)
    setUploading(false)
  }

  // === RENDER ===

  if (kicked) {
    return (
      <div style={st.loadingContainer}>
        <p style={{ fontSize: "64px", margin: 0 }}>⚠️</p>
        <h2 style={{ color: "#dc2626", marginTop: "16px" }}>Sesi Ditutup</h2>
        <p style={{ color: "#666", textAlign: "center", maxWidth: "400px" }}>
          {kickMessage || "Akun kamu sudah login di perangkat atau window lain."}
        </p>
        <button onClick={function () { router.push("/login") }} style={st.loginAgainBtn}>
          🔑 Login Ulang
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={st.loadingContainer}>
        <div style={st.spinner}></div>
        <p style={{ marginTop: "20px", color: "#666" }}>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={st.loadingContainer}>
        <p>User tidak ditemukan</p>
      </div>
    )
  }

  var menuGuru = [
    { emoji: "📝", title: "Upload Materi", desc: "Tambah materi per kelas", link: "/guru/materi", color: "#3b82f6" },
    { emoji: "❓", title: "Buat Soal", desc: "Buat kuis dengan AI", link: "/guru/soal", color: "#10b981" },
    { emoji: "📊", title: "Nilai Siswa", desc: "Lihat hasil kuis", link: "/guru/nilai", color: "#f59e0b" },
    { emoji: "✅", title: "Absensi", desc: "Kelola kehadiran", link: "/guru/absensi", color: "#8b5cf6" },
    { emoji: "👥", title: "Daftar Siswa", desc: "Kelola per kelas", link: "/guru/siswa", color: "#ec4899" },
  ]

  var menuSiswa = [
    { emoji: "📖", title: "Materi", desc: "Belajar materi", link: "/siswa/materi", color: "#3b82f6" },
    { emoji: "✍️", title: "Kerjakan Kuis", desc: "Latihan soal", link: "/siswa/kuis", color: "#10b981" },
    { emoji: "🏆", title: "Nilai Saya", desc: "Lihat hasil", link: "/siswa/nilai", color: "#f59e0b" },
    { emoji: "📅", title: "Absensi", desc: "Riwayat kehadiran", link: "/siswa/absensi", color: "#8b5cf6" },
  ]

  var menu = user.role === "guru" ? menuGuru : menuSiswa

  return (
    <div style={st.container}>
      {/* Header */}
      <div style={st.header}>
        <div style={st.headerLeft}>
          {/* Logo */}
          <div style={st.logoWrap} onClick={function () { if (user.role === "guru") setShowUploadLogo(!showUploadLogo) }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={st.logoImg} />
            ) : (
              <div style={st.logoPlaceholder}>📚</div>
            )}
          </div>

          {/* Avatar */}
          <div style={st.avatarWrap}>
            <div style={st.avatarContainer} onClick={function () { if (user.role === "guru") setShowEditFoto(!showEditFoto) }}>
              {user.foto_url ? (
                <img src={user.foto_url} alt="Foto" style={st.avatarImg} />
              ) : (
                <div style={st.avatar}>{user.nama.charAt(0).toUpperCase()}</div>
              )}
              {user.role === "guru" && <div style={st.editBadge}>📷</div>}
            </div>
          </div>

          <div>
            <p style={st.greeting}>{getGreeting()}, 👋</p>
            <h1 style={st.name}>{user.nama}</h1>
            <div style={st.badgeRow}>
              <span style={{
                ...st.badge,
                background: user.role === "guru" ? "#dbeafe" : "#dcfce7",
                color: user.role === "guru" ? "#1e40af" : "#166534"
              }}>
                {user.role === "guru" ? "👨‍🏫 Guru" : "🎓 Siswa"}
              </span>
              {user.kelas && (
                <span style={st.kelasBadge}>🏫 {user.kelas.nama_kelas}</span>
              )}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} style={st.logoutBtn}>Logout</button>
      </div>

      {/* Upload Logo */}
      {showUploadLogo && user.role === "guru" && (
        <div style={st.uploadCard}>
          <p style={{ margin: "0 0 10px 0", fontWeight: "600" }}>📷 Upload Logo Sekolah</p>
          <input type="file" accept=".jpg,.jpeg,.png" onChange={handleUploadLogo} disabled={uploading} />
          {uploading && <p style={{ margin: "8px 0 0 0", color: "#6b7280" }}>Uploading...</p>}
        </div>
      )}

      {/* Upload Foto Profil */}
      {showEditFoto && user.role === "guru" && (
        <div style={st.uploadCard}>
          <p style={{ margin: "0 0 10px 0", fontWeight: "600" }}>📷 Upload Foto Profil</p>
          <input type="file" accept=".jpg,.jpeg,.png" onChange={handleUploadFoto} disabled={uploading} />
          {uploading && <p style={{ margin: "8px 0 0 0", color: "#6b7280" }}>Uploading...</p>}
        </div>
      )}

      {/* Welcome */}
      <div style={st.welcomeCard}>
        <h2 style={{ margin: 0, fontSize: "24px" }}>
          {user.role === "guru" ? "Selamat mengajar! 📚" : "Semangat belajar! 🎯"}
        </h2>
        <p style={{ margin: "8px 0 0 0", opacity: 0.9 }}>
          {user.role === "guru"
            ? "Kelola pembelajaran dengan mudah dan efisien."
            : "Yuk, tingkatkan prestasi belajarmu!"}
        </p>
      </div>

      {/* Menu */}
      <div style={st.menuTitle}><h2 style={{ margin: 0 }}>Menu</h2></div>
      <div style={st.grid}>
        {menu.map(function (item, i) {
          return (
            <MenuCard
              key={i}
              emoji={item.emoji}
              title={item.title}
              desc={item.desc}
              link={item.link}
              color={item.color}
              router={router}
            />
          )
        })}
      </div>

      <div style={st.footer}>
        <p style={{ margin: 0, color: "#999", fontSize: "14px" }}>© 2025 {namaApp}</p>
      </div>
    </div>
  )
}

function MenuCard(props) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onClick={function () { props.router.push(props.link) }}
      onMouseEnter={function () { setHover(true) }}
      onMouseLeave={function () { setHover(false) }}
      style={{
        ...st.card,
        transform: hover ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hover ? "0 10px 25px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ ...st.cardIcon, background: props.color + "15" }}>
        <span style={{ fontSize: "28px" }}>{props.emoji}</span>
      </div>
      <h3 style={st.cardTitle}>{props.title}</h3>
      <p style={st.cardDesc}>{props.desc}</p>
      <div style={{ ...st.cardArrow, color: props.color }}>Buka →</div>
    </div>
  )
}

function getGreeting() {
  var h = new Date().getHours()
  if (h < 11) return "Selamat pagi"
  if (h < 15) return "Selamat siang"
  if (h < 18) return "Selamat sore"
  return "Selamat malam"
}

var st = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%)",
    padding: "24px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f7fa",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e0e0e0",
    borderTop: "4px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loginAgainBtn: {
    marginTop: "20px",
    padding: "12px 28px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "15px",
  },
  header: {
    background: "white",
    padding: "24px 28px",
    borderRadius: "16px",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  logoWrap: {
    cursor: "pointer",
    flexShrink: 0,
  },
  logoImg: {
    width: "50px",
    height: "50px",
    borderRadius: "12px",
    objectFit: "cover",
  },
  logoPlaceholder: {
    width: "50px",
    height: "50px",
    borderRadius: "12px",
    background: "#f3f4f6",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "28px",
  },
  avatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  avatarContainer: {
    cursor: "pointer",
    position: "relative",
  },
  avatarImg: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid #667eea",
  },
  avatar: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "24px",
    fontWeight: "bold",
  },
  editBadge: {
    position: "absolute",
    bottom: "-2px",
    right: "-2px",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    background: "#667eea",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "12px",
    border: "2px solid white",
  },
  greeting: {
    margin: 0,
    fontSize: "14px",
    color: "#666",
  },
  name: {
    margin: "4px 0",
    fontSize: "22px",
    color: "#1a1a1a",
  },
  badgeRow: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },
  kelasBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    background: "#fef3c7",
    color: "#92400e",
  },
  logoutBtn: {
    padding: "10px 20px",
    background: "white",
    color: "#dc2626",
    border: "2px solid #fecaca",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },
  uploadCard: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  welcomeCard: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: "28px",
    borderRadius: "16px",
    marginBottom: "24px",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
  },
  menuTitle: {
    marginBottom: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    marginBottom: "40px",
  },
  card: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  cardIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "14px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "16px",
  },
  cardTitle: {
    margin: "0 0 6px 0",
    fontSize: "18px",
    color: "#1a1a1a",
  },
  cardDesc: {
    margin: "0 0 16px 0",
    fontSize: "13px",
    color: "#666",
    lineHeight: "1.5",
  },
  cardArrow: {
    fontSize: "14px",
    fontWeight: "600",
  },
  footer: {
    textAlign: "center",
    padding: "20px",
  },
}