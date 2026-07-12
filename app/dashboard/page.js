"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [kicked, setKicked] = useState(false)
  const [kickMessage, setKickMessage] = useState("")
  const router = useRouter()

  useEffect(function () {
    loadUser()

    var heartbeatInterval = setInterval(function () {
      sendHeartbeat()
    }, 10000)

    var sessionInterval = setInterval(function () {
      checkSession()
    }, 3000)

    function handlePageHide() {
      markOffline()
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        sendHeartbeat()
        checkSession()
      }
    }

    window.addEventListener("pagehide", handlePageHide)
    document.addEventListener("visibilitychange", handleVisibility)

    return function () {
      clearInterval(heartbeatInterval)
      clearInterval(sessionInterval)
      window.removeEventListener("pagehide", handlePageHide)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [])

  async function loadUser() {
    try {
      var sessionResult = await supabase.auth.getSession()
      var session = sessionResult.data.session

      if (!session || !session.user) {
        router.push("/login")
        return
      }

      var userId = session.user.id
      var tabSessionId = sessionStorage.getItem("app_session_id")

      if (!tabSessionId) {
        router.push("/login")
        return
      }

      var userResult = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single()

      if (userResult.error || !userResult.data) {
        router.push("/login")
        return
      }

      var userData = userResult.data

      if (userData.role === "siswa" && userData.status === "pending") {
        await supabase.auth.signOut()
        sessionStorage.removeItem("app_session_id")
        sessionStorage.removeItem("app_user_id")
        router.push("/login")
        return
      }

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
        .update({
          is_online: true,
          last_seen: new Date().toISOString(),
        })
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

      if (result.error || !result.data) return

      if (result.data.session_id !== tabSessionId) {
        await forceLogout("Akun kamu login di tab/window lain. Sesi ini ditutup.")
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
        .update({
          is_online: false,
          last_seen: new Date().toISOString(),
          session_id: null,
        })
        .eq("id", userId)
        .eq("session_id", tabSessionId)
    } catch (err) {
      console.log("markOffline error:", err)
    }
  }

  async function forceLogout(message) {
    setKickMessage(message || "Sesi berakhir")
    setKicked(true)
    sessionStorage.removeItem("app_session_id")
    sessionStorage.removeItem("app_user_id")
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.log("forceLogout error:", err)
    }
  }

  async function handleLogout() {
    await markOffline()
    sessionStorage.removeItem("app_session_id")
    sessionStorage.removeItem("app_user_id")
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (kicked) {
    return (
      <div style={styles.loadingContainer}>
        <p style={{ fontSize: "64px", margin: 0 }}>⚠️</p>
        <h2 style={{ color: "#dc2626", marginTop: "16px" }}>Sesi Ditutup</h2>
        <p style={{ color: "#666", textAlign: "center", maxWidth: "400px" }}>
          {kickMessage || "Akun kamu sudah login di perangkat atau window lain."}
        </p>
        <button
          onClick={function () { router.push("/login") }}
          style={styles.loginAgainBtn}
        >
          🔑 Login Ulang
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: "20px", color: "#666" }}>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={styles.loadingContainer}>
        <p>User tidak ditemukan</p>
      </div>
    )
  }

  var menuGuru = [
    { emoji: "📝", title: "Upload Materi", desc: "Tambah materi pembelajaran baru", link: "/guru/materi", color: "#3b82f6" },
    { emoji: "❓", title: "Buat Soal", desc: "Buat kuis untuk siswa", link: "/guru/soal", color: "#10b981" },
    { emoji: "📊", title: "Nilai Siswa", desc: "Lihat hasil kuis siswa", link: "/guru/nilai", color: "#f59e0b" },
    { emoji: "✅", title: "Absensi", desc: "Kelola kehadiran siswa", link: "/guru/absensi", color: "#8b5cf6" },
    { emoji: "👥", title: "Daftar Siswa", desc: "Kelola & approve siswa", link: "/guru/siswa", color: "#ec4899" },
  ]

  var menuSiswa = [
    { emoji: "📖", title: "Materi", desc: "Belajar materi pelajaran", link: "/siswa/materi", color: "#3b82f6" },
    { emoji: "✍️", title: "Kerjakan Kuis", desc: "Kerjakan latihan soal", link: "/siswa/kuis", color: "#10b981" },
    { emoji: "🏆", title: "Nilai Saya", desc: "Lihat hasil kuis kamu", link: "/siswa/nilai", color: "#f59e0b" },
    { emoji: "📅", title: "Absensi", desc: "Lihat riwayat kehadiran", link: "/siswa/absensi", color: "#8b5cf6" },
  ]

  var menu = user.role === "guru" ? menuGuru : menuSiswa

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.avatar}>
            {user.nama.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={styles.greeting}>{getGreeting()}, 👋</p>
            <h1 style={styles.name}>{user.nama}</h1>
            <span style={{
              ...styles.badge,
              background: user.role === "guru" ? "#dbeafe" : "#dcfce7",
              color: user.role === "guru" ? "#1e40af" : "#166534"
            }}>
              {user.role === "guru" ? "👨‍🏫 Guru" : "🎓 Siswa"}
            </span>
          </div>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>

      <div style={styles.welcomeCard}>
        <h2 style={{ margin: 0, fontSize: "24px" }}>
          {user.role === "guru" ? "Selamat mengajar! 📚" : "Semangat belajar! 🎯"}
        </h2>
        <p style={{ margin: "8px 0 0 0", opacity: 0.9 }}>
          {user.role === "guru"
            ? "Kelola pembelajaran dengan mudah dan efisien."
            : "Yuk, terus tingkatkan prestasi belajarmu hari ini!"}
        </p>
      </div>

      <div style={styles.menuTitle}>
        <h2 style={{ margin: 0 }}>Menu</h2>
      </div>

      <div style={styles.grid}>
        {menu.map(function (item, i) {
          return <MenuCard key={i} emoji={item.emoji} title={item.title} desc={item.desc} link={item.link} color={item.color} router={router} />
        })}
      </div>

      <div style={styles.footer}>
        <p style={{ margin: 0, color: "#999", fontSize: "14px" }}>
          © 2025 App Pembelajaran
        </p>
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
        ...styles.card,
        transform: hover ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hover ? "0 10px 25px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ ...styles.cardIcon, background: props.color + "15" }}>
        <span style={{ fontSize: "28px" }}>{props.emoji}</span>
      </div>
      <h3 style={styles.cardTitle}>{props.title}</h3>
      <p style={styles.cardDesc}>{props.desc}</p>
      <div style={{ ...styles.cardArrow, color: props.color }}>Buka →</div>
    </div>
  )
}

function getGreeting() {
  var hour = new Date().getHours()
  if (hour < 11) return "Selamat pagi"
  if (hour < 15) return "Selamat siang"
  if (hour < 18) return "Selamat sore"
  return "Selamat malam"
}

var styles = {
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
  headerContent: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
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
  greeting: { margin: 0, fontSize: "14px", color: "#666" },
  name: { margin: "4px 0", fontSize: "22px", color: "#1a1a1a" },
  badge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
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
  welcomeCard: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: "28px",
    borderRadius: "16px",
    marginBottom: "24px",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
  },
  menuTitle: { marginBottom: "16px" },
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
  cardTitle: { margin: "0 0 6px 0", fontSize: "18px", color: "#1a1a1a" },
  cardDesc: { margin: "0 0 16px 0", fontSize: "13px", color: "#666", lineHeight: "1.5" },
  cardArrow: { fontSize: "14px", fontWeight: "600" },
  footer: { textAlign: "center", padding: "20px" },
}