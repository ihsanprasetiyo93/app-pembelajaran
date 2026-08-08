"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"

const MAHFUDZOT = [
  { arab: "مَنْ جَدَّ وَجَدَ", arti: "Barang siapa yang bersungguh-sungguh, maka dia akan berhasil" },
  { arab: "مَنْ سَارَ عَلَى الدَّرْبِ وَصَلَ", arti: "Barang siapa berjalan pada jalannya, maka dia akan sampai" },
  { arab: "مَنْ صَبَرَ ظَفِرَ", arti: "Barang siapa yang bersabar, maka dia akan beruntung" },
  { arab: "مَنْ قَلَّ صِدْقُهُ قَلَّ صَدِيْقُهُ", arti: "Barang siapa sedikit kejujurannya, sedikit pula temannya" },
  { arab: "جَالِسْ أَهْلَ الصِّدْقِ وَالْوَفَاءِ", arti: "Bergaullah dengan orang yang jujur dan menepati janji" },
  { arab: "مَوَدَّةُ الصَّدِيْقِ تَظْهَرُ وَقْتَ الضِّيْقِ", arti: "Kasih sayang teman itu akan tampak pada waktu kesempitan" },
  { arab: "وَمَا اللَّذَّةُ إِلَّا بَعْدَ التَّعَبِ", arti: "Tidak ada kenikmatan kecuali setelah kepayahan" },
  { arab: "الصَّبْرُ يُعِيْنُ عَلَى كُلِّ عَمَلٍ", arti: "Kesabaran itu menolong segala pekerjaan" },
  { arab: "جَرِّبْ وَلَاحِظْ تَكُنْ عَارِفًا", arti: "Cobalah dan perhatikanlah, niscaya kamu akan menjadi orang yang mengerti" },
  { arab: "اُطْلُبِ الْعِلْمَ مِنَ الْمَهْدِ إِلَى اللَّحْدِ", arti: "Tuntutlah ilmu dari buaian hingga liang lahat" },
  { arab: "بَيْضَةُ الْيَوْمِ خَيْرٌ مِنْ دَجَاجَةِ الْغَدِ", arti: "Telur hari ini lebih baik daripada ayam esok hari" },
  { arab: "الْوَقْتُ أَثْمَنُ مِنَ الذَّهَبِ", arti: "Waktu itu lebih berharga daripada emas" },
  { arab: "الْعَقْلُ السَّلِيْمُ فِي الْجِسْمِ السَّلِيْمِ", arti: "Akal yang sehat terdapat pada badan yang sehat" },
  { arab: "خَيْرُ جَلِيْسٍ فِي الزَّمَانِ كِتَابٌ", arti: "Sebaik-baik teman duduk di setiap waktu adalah buku" },
  { arab: "مَنْ يَزْرَعْ يَحْصُدْ", arti: "Barang siapa menanam, dia akan menuai" },
  { arab: "خَيْرُ النَّاسِ أَنْفَعُهُمْ لِلنَّاسِ", arti: "Sebaik-baik manusia adalah yang paling bermanfaat bagi orang lain" },
  { arab: "لَنْ تَرْجِعَ الْأَيَّامُ الَّتِي مَضَتْ", arti: "Tidak akan kembali hari-hari yang telah berlalu" },
  { arab: "تَعَلَّمْ فَلَيْسَ الْمَرْءُ يُوْلَدُ عَالِمًا", arti: "Belajarlah, karena tidak ada orang yang dilahirkan pandai" },
  { arab: "الْعِلْمُ فِي الصِّغَرِ كَالنَّقْشِ عَلَى الْحَجَرِ", arti: "Ilmu di waktu kecil bagaikan ukiran di atas batu" },
  { arab: "مَنْ حَفَرَ حُفْرَةً وَقَعَ فِيْهَا", arti: "Barang siapa menggali lubang, dia akan terperosok ke dalamnya" },
  { arab: "الِاتِّحَادُ أَسَاسُ النَّجَاحِ", arti: "Persatuan adalah pangkal keberhasilan" },
  { arab: "لَا تَحْتَقِرْ مِسْكِيْنًا وَكُنْ لَهُ مُعِيْنًا", arti: "Jangan menghina orang miskin, jadilah penolong baginya" },
  { arab: "الشَّرَفُ بِالْأَدَبِ لَا بِالنَّسَبِ", arti: "Kemuliaan itu dengan adab bukan dengan keturunan" },
  { arab: "سَلَامَةُ الْإِنْسَانِ فِي حِفْظِ اللِّسَانِ", arti: "Keselamatan manusia terletak pada menjaga lisannya" },
  { arab: "آفَةُ الْعِلْمِ النِّسْيَانُ", arti: "Bencananya ilmu adalah lupa" },
  { arab: "إِذَا كَبُرَ الْمَطْلُوْبُ قَلَّ الْمُسَاعِدُ", arti: "Apabila besar yang diminta, sedikit penolongnya" },
  { arab: "لَوْلَا الْعِلْمُ لَكَانَ النَّاسُ كَالْبَهَائِمِ", arti: "Seandainya tidak ada ilmu, niscaya manusia seperti binatang" },
  { arab: "الْعِلْمُ بِلَا عَمَلٍ كَالشَّجَرِ بِلَا ثَمَرٍ", arti: "Ilmu tanpa amal bagaikan pohon tanpa buah" },
  { arab: "الْجَاهِلُ صَغِيْرٌ وَإِنْ كَانَ شَيْخًا", arti: "Orang bodoh itu kecil, meskipun sudah tua" },
  { arab: "الْأَدَبُ فَوْقَ الْعِلْمِ", arti: "Adab itu di atas ilmu" },
]

const APP_NAME = "Ilmu Pengetahuan Sosial"
const APP_TAGLINE = "Belajar IPS jadi seru & bermakna"

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [logoUrl, setLogoUrl] = useState(null)
  const [greetingBgUrl, setGreetingBgUrl] = useState(null)
  const [stats, setStats] = useState({ materi: 0, soal: 0, siswa: 0, nilai: 0, rata: 0 })
  const [mahfudzotIdx, setMahfudzotIdx] = useState(0)
  const [fade, setFade] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadingBg, setUploadingBg] = useState(false)
  const router = useRouter()

  useEffect(function () {
    loadData()
    var randomStart = Math.floor(Math.random() * MAHFUDZOT.length)
    setMahfudzotIdx(randomStart)
  }, [])

  useEffect(function () {
    var interval = setInterval(function () {
      setFade(false)
      setTimeout(function () {
        setMahfudzotIdx(function (prev) { return (prev + 1) % MAHFUDZOT.length })
        setFade(true)
      }, 400)
    }, 5000)
    return function () { clearInterval(interval) }
  }, [])

  async function loadData() {
    var authResult = await supabase.auth.getUser()
    var authUser = authResult.data.user
    if (!authUser) { router.push("/login"); return }

    var userResult = await supabase.from("users").select("*").eq("id", authUser.id).single()
    if (!userResult.data) { router.push("/login"); return }

    setUser(userResult.data)

    var settingsResult = await supabase.from("app_settings").select("*")
    if (settingsResult.data) {
      settingsResult.data.forEach(function (s) {
        if (s.setting_key === "logo_url") setLogoUrl(s.setting_value)
        if (s.setting_key === "greeting_bg_url") setGreetingBgUrl(s.setting_value)
      })
    }

    if (userResult.data.role === "guru") {
      var materiCount = await supabase.from("materi").select("*", { count: "exact", head: true }).eq("guru_id", authUser.id)
      var materiIds = []
      var materiData = await supabase.from("materi").select("id").eq("guru_id", authUser.id)
      if (materiData.data) materiIds = materiData.data.map(function (m) { return m.id })

      var soalCount = { count: 0 }
      var nilaiCount = { count: 0 }
      if (materiIds.length > 0) {
        soalCount = await supabase.from("soal").select("*", { count: "exact", head: true }).in("materi_id", materiIds)
        nilaiCount = await supabase.from("nilai").select("*", { count: "exact", head: true }).in("materi_id", materiIds)
      }
      var siswaCount = await supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "siswa").eq("status", "approved")

      setStats({
        materi: materiCount.count || 0,
        soal: soalCount.count || 0,
        siswa: siswaCount.count || 0,
        nilai: nilaiCount.count || 0,
      })
    }

    if (userResult.data.role === "siswa") {
      var materiCount = await supabase.from("materi").select("*", { count: "exact", head: true }).eq("tingkat", userResult.data.kelas_id || "")
      var nilaiSiswa = await supabase.from("nilai").select("skor").eq("siswa_id", authUser.id)
      var rataSiswa = 0
      if (nilaiSiswa.data && nilaiSiswa.data.length > 0) {
        var total = nilaiSiswa.data.reduce(function (sum, n) { return sum + n.skor }, 0)
        rataSiswa = Math.round(total / nilaiSiswa.data.length)
      }
      setStats({
        materi: materiCount.count || 0,
        nilai: nilaiSiswa.data ? nilaiSiswa.data.length : 0,
        rata: rataSiswa,
        soal: 0,
      })
    }

    setLoading(false)
  }

  async function handleLogout() {
    if (!confirm("Yakin mau logout?")) return
    await supabase.from("users").update({ is_online: false, session_id: null }).eq("id", user.id)
    await supabase.auth.signOut()
    router.push("/login")
  }

  async function handleUploadFoto(e) {
    var file = e.target.files[0]
    if (!file) return
    setUploading(true)
    var fileName = "profile_" + user.id + "_" + Date.now() + "_" + file.name
    var uploadResult = await supabase.storage.from("profile-photos").upload(fileName, file, { upsert: true })
    if (uploadResult.error) { alert("Gagal upload: " + uploadResult.error.message); setUploading(false); return }
    var fotoUrl = supabase.storage.from("profile-photos").getPublicUrl(fileName).data.publicUrl
    await supabase.from("users").update({ foto_url: fotoUrl }).eq("id", user.id)
    setUser({ ...user, foto_url: fotoUrl })
    setUploading(false)
  }

  async function handleUploadLogo(e) {
    var file = e.target.files[0]
    if (!file) return
    setUploading(true)
    var fileName = "logo_" + Date.now() + "_" + file.name
    var uploadResult = await supabase.storage.from("profile-photos").upload(fileName, file, { upsert: true })
    if (uploadResult.error) { alert("Gagal upload: " + uploadResult.error.message); setUploading(false); return }
    var url = supabase.storage.from("profile-photos").getPublicUrl(fileName).data.publicUrl
    var existing = await supabase.from("app_settings").select("*").eq("setting_key", "logo_url").single()
    if (existing.data) {
      await supabase.from("app_settings").update({ setting_value: url }).eq("setting_key", "logo_url")
    } else {
      await supabase.from("app_settings").insert({ setting_key: "logo_url", setting_value: url })
    }
    setLogoUrl(url)
    setUploading(false)
  }

  async function handleUploadGreetingBg(e) {
    var file = e.target.files[0]
    if (!file) return
    setUploadingBg(true)
    var fileName = "greeting_bg_" + Date.now() + "_" + file.name
    var uploadResult = await supabase.storage.from("profile-photos").upload(fileName, file, { upsert: true })
    if (uploadResult.error) { alert("Gagal upload: " + uploadResult.error.message); setUploadingBg(false); return }
    var url = supabase.storage.from("profile-photos").getPublicUrl(fileName).data.publicUrl
    var existing = await supabase.from("app_settings").select("*").eq("setting_key", "greeting_bg_url").single()
    if (existing.data) {
      await supabase.from("app_settings").update({ setting_value: url }).eq("setting_key", "greeting_bg_url")
    } else {
      await supabase.from("app_settings").insert({ setting_key: "greeting_bg_url", setting_value: url })
    }
    setGreetingBgUrl(url)
    setUploadingBg(false)
  }

  async function handleHapusGreetingBg() {
    if (!confirm("Yakin hapus background greeting?")) return
    await supabase.from("app_settings").delete().eq("setting_key", "greeting_bg_url")
    setGreetingBgUrl(null)
  }

  function nextMahfudzot() {
    setFade(false)
    setTimeout(function () { setMahfudzotIdx(function (prev) { return (prev + 1) % MAHFUDZOT.length }); setFade(true) }, 300)
  }

  function prevMahfudzot() {
    setFade(false)
    setTimeout(function () { setMahfudzotIdx(function (prev) { return prev === 0 ? MAHFUDZOT.length - 1 : prev - 1 }); setFade(true) }, 300)
  }

  function getGreeting() {
    var jam = new Date().getHours()
    if (jam < 11) return { text: "Selamat Pagi", emoji: "🌅" }
    if (jam < 15) return { text: "Selamat Siang", emoji: "☀️" }
    if (jam < 18) return { text: "Selamat Sore", emoji: "🌤️" }
    return { text: "Selamat Malam", emoji: "🌙" }
  }

  if (loading) {
    return (
      <div style={st.center}>
        <div style={st.spinner}></div>
        <p style={{ marginTop: "16px", color: "#666" }}>Loading...</p>
      </div>
    )
  }

  var isGuru = user.role === "guru"
  var current = MAHFUDZOT[mahfudzotIdx]
  var greet = getGreeting()

  // Greeting card style dengan background image + gradient overlay
  var greetCardStyle = greetingBgUrl ? {
    ...st.greetCard,
    backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.85) 30%, rgba(255,255,255,0.3) 60%, rgba(255,255,255,0) 100%), url(" + greetingBgUrl + ")",
    backgroundSize: "cover",
    backgroundPosition: "right center",
    backgroundRepeat: "no-repeat",
  } : st.greetCard

  return (
    <div style={st.container}>
      <header style={st.topBar}>
        <div style={st.brandWrap}>
          {logoUrl ? (
            <div style={st.logoBox}>
              <img src={logoUrl} alt="Logo" style={st.logo} />
            </div>
          ) : (
            <div style={st.logoPlaceholder}>🎓</div>
          )}
          <div>
            <h1 style={st.brand}>{APP_NAME}</h1>
            <p style={st.brandSub}>{APP_TAGLINE}</p>
          </div>
        </div>

        <div style={st.profileWrap}>
          <div style={st.profileInfo}>
            <p style={st.userName}>{user.nama}</p>
            <div style={st.userBadge}>
              <span style={st.onlineDot}></span>
              <span>{isGuru ? "👨‍🏫 Guru" : "🎓 Siswa"}{user.kelas_id ? " • " + user.kelas_id : ""}</span>
            </div>
          </div>
          <label style={st.avatarWrap}>
            {user.foto_url ? (
              <img src={user.foto_url} alt="Avatar" style={st.avatar} />
            ) : (
              <div style={st.avatarPlaceholder}>{user.nama ? user.nama.charAt(0).toUpperCase() : "U"}</div>
            )}
            <input type="file" accept="image/*" onChange={handleUploadFoto} style={{ display: "none" }} disabled={uploading} />
            <span style={st.avatarEdit}>📷</span>
          </label>
          <button onClick={handleLogout} style={st.logoutBtn}>
            <span>🚪</span> Logout
          </button>
        </div>
      </header>

      <div style={st.heroGrid}>
        {/* MAHFUDZOT */}
        <div style={st.mahfudzotCard}>
          <div style={st.mahfudzotDeco1}></div>
          <div style={st.mahfudzotDeco2}></div>
          <div style={st.mahfudzotDeco3}></div>

          <div style={st.mahfudzotHeader}>
            <div style={st.mahfudzotBadge}>
              <span style={{ fontSize: "16px" }}>📿</span>
              <span>MAHFUDZOT</span>
            </div>
            <div style={st.mahfudzotCounter}>{mahfudzotIdx + 1}/{MAHFUDZOT.length}</div>
          </div>

          <div style={{ ...st.mahfudzotContent, opacity: fade ? 1 : 0, transform: fade ? "translateY(0) scale(1)" : "translateY(15px) scale(0.98)" }}>
            <div style={st.arabWrap}>
              <p style={st.arabText}>{current.arab}</p>
            </div>
            <div style={st.dividerWrap}>
              <span style={st.dividerDot}></span>
              <span style={st.dividerLine}></span>
              <span style={st.dividerDot}></span>
            </div>
            <p style={st.artiText}>"{current.arti}"</p>
          </div>

          <div style={st.mahfudzotFooter}>
            <button onClick={prevMahfudzot} style={st.navBtn}>‹</button>
            <div style={st.dotsWrap}>
              {[...Array(9)].map(function (_, i) {
                var offset = i - 4
                var actualIdx = mahfudzotIdx + offset
                if (actualIdx < 0 || actualIdx >= MAHFUDZOT.length) return null
                return <span key={actualIdx} style={{ ...st.dot, background: actualIdx === mahfudzotIdx ? "white" : "rgba(255,255,255,0.35)", width: actualIdx === mahfudzotIdx ? "24px" : "6px" }}></span>
              })}
            </div>
            <button onClick={nextMahfudzot} style={st.navBtn}>›</button>
          </div>
        </div>

        {/* GREETING CARD DENGAN BACKGROUND */}
        <div style={greetCardStyle}>
          {isGuru && (
            <div style={st.bgControls}>
              {greetingBgUrl && (
                <button onClick={handleHapusGreetingBg} style={st.bgRemoveBtn} title="Hapus background">
                  ✕
                </button>
              )}
              <label style={st.bgUploadBtn} title="Upload background">
                {uploadingBg ? "⏳" : "🖼️"}
                <input type="file" accept="image/*" onChange={handleUploadGreetingBg} style={{ display: "none" }} disabled={uploadingBg} />
              </label>
            </div>
          )}

          <div style={st.greetTop}>
            <div style={st.greetEmoji}>{greet.emoji}</div>
            <div style={st.greetDate}>
              <p style={st.dateDay}>{new Date().toLocaleDateString("id-ID", { weekday: "long" })}</p>
              <p style={st.dateNumber}>{new Date().getDate()}</p>
              <p style={st.dateMonth}>{new Date().toLocaleDateString("id-ID", { month: "short" })} {new Date().getFullYear()}</p>
            </div>
          </div>
          <h2 style={st.greetTitle}>{greet.text},</h2>
          <h3 style={st.greetName}>{user.nama}!</h3>
          <p style={st.greetDesc}>{isGuru ? "Siap membuat pembelajaran yang menginspirasi hari ini?" : "Siap menuntut ilmu dan meraih prestasi hari ini?"}</p>

          {!greetingBgUrl && isGuru && (
            <div style={st.bgHint}>
              💡 Klik icon 🖼️ untuk upload background
            </div>
          )}
        </div>
      </div>

      <h3 style={st.sectionTitle}>
        <span style={st.sectionEmoji}>📊</span>
        Statistik {isGuru ? "Mengajar" : "Belajar"} Anda
      </h3>
      <div style={st.statsGrid}>
        {isGuru ? (
          <>
            <StatCard emoji="📚" label="Total Materi" number={stats.materi} color1="#667eea" color2="#764ba2" />
            <StatCard emoji="❓" label="Total Soal" number={stats.soal} color1="#f093fb" color2="#f5576c" />
            <StatCard emoji="🎓" label="Siswa Aktif" number={stats.siswa} color1="#4facfe" color2="#00f2fe" />
            <StatCard emoji="📊" label="Nilai Masuk" number={stats.nilai} color1="#43e97b" color2="#38f9d7" />
          </>
        ) : (
          <>
            <StatCard emoji="📚" label="Materi Tersedia" number={stats.materi} color1="#667eea" color2="#764ba2" />
            <StatCard emoji="✍️" label="Kuis Dikerjakan" number={stats.nilai} color1="#4facfe" color2="#00f2fe" />
            <StatCard emoji="🏆" label="Rata-rata Nilai" number={stats.rata || 0} color1="#43e97b" color2="#38f9d7" />
          </>
        )}
      </div>

      <h3 style={st.sectionTitle}>
        <span style={st.sectionEmoji}>🎯</span>
        Menu Utama
      </h3>
      <div style={st.menuGrid}>
        {isGuru ? (
          <>
            <MenuCard emoji="📚" title="Materi" desc="Upload dan kelola materi pembelajaran" color1="#667eea" color2="#764ba2" onClick={function () { router.push("/guru/materi") }} />
            <MenuCard emoji="❓" title="Soal & Kuis" desc="Buat soal PG dan Essay" color1="#f093fb" color2="#f5576c" onClick={function () { router.push("/guru/soal") }} />
            <MenuCard emoji="📊" title="Nilai Siswa" desc="Lihat & koreksi nilai siswa" color1="#4facfe" color2="#00f2fe" onClick={function () { router.push("/guru/nilai") }} />
            <MenuCard emoji="🎓" title="Kelola Siswa" desc="Approve siswa & status online" color1="#43e97b" color2="#38f9d7" onClick={function () { router.push("/guru/siswa") }} />
            <MenuCard emoji="📅" title="Absensi" desc="Kelola absensi siswa" color1="#fa709a" color2="#fee140" onClick={function () { router.push("/guru/absensi") }} />
            <label style={{ cursor: "pointer" }}>
              <MenuCard emoji="🖼️" title="Logo Sekolah" desc={uploading ? "⏳ Mengupload..." : "Klik untuk upload logo"} color1="#a18cd1" color2="#fbc2eb" />
              <input type="file" accept="image/*" onChange={handleUploadLogo} style={{ display: "none" }} disabled={uploading} />
            </label>
          </>
        ) : (
          <>
            <MenuCard emoji="📚" title="Materi" desc="Baca materi pembelajaran" color1="#667eea" color2="#764ba2" onClick={function () { router.push("/siswa/materi") }} />
            <MenuCard emoji="✍️" title="Kerjakan Kuis" desc="PG & Essay dengan auto-koreksi" color1="#f093fb" color2="#f5576c" onClick={function () { router.push("/siswa/kuis") }} />
            <MenuCard emoji="🏆" title="Nilai Saya" desc="Lihat rekap nilai & statistik" color1="#4facfe" color2="#00f2fe" onClick={function () { router.push("/siswa/nilai") }} />
            <MenuCard emoji="📅" title="Absensi" desc="Riwayat kehadiran" color1="#43e97b" color2="#38f9d7" onClick={function () { router.push("/siswa/absensi") }} />
          </>
        )}
      </div>

      <footer style={st.footer}>
        <p style={{ margin: 0, color: "#9ca3af", fontSize: "13px" }}>
          © {new Date().getFullYear()} <strong style={{ color: "#667eea" }}>{APP_NAME}</strong> • Dibuat dengan ❤️ untuk pendidikan Indonesia
        </p>
      </footer>
    </div>
  )
}

function StatCard({ emoji, label, number, color1, color2 }) {
  return (
    <div style={{ ...st.statCard, background: "linear-gradient(135deg, " + color1 + ", " + color2 + ")" }}>
      <div style={st.statIconWrap}>
        <span style={st.statIcon}>{emoji}</span>
      </div>
      <div style={{ flex: 1 }}>
        <p style={st.statLabel}>{label}</p>
        <p style={st.statNumber}>{number}</p>
      </div>
    </div>
  )
}

function MenuCard({ emoji, title, desc, color1, color2, onClick }) {
  return (
    <div style={st.menuCard} onClick={onClick}>
      <div style={{ ...st.menuIcon, background: "linear-gradient(135deg, " + color1 + ", " + color2 + ")" }}>
        <span>{emoji}</span>
      </div>
      <h4 style={st.menuTitle}>{title}</h4>
      <p style={st.menuDesc}>{desc}</p>
      <div style={st.menuArrow}>→</div>
    </div>
  )
}

var st = {
  container: {
  minHeight: "100vh",
  background: `
    linear-gradient(135deg, rgba(240, 244, 255, 0.92) 0%, rgba(224, 231, 255, 0.90) 50%, rgba(252, 231, 243, 0.92) 100%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'><g fill='%23667eea' opacity='0.15'><path d='M85,285 Q95,275 110,278 L145,275 Q160,272 175,280 L195,285 Q210,290 220,295 L235,300 Q245,302 250,300 L245,308 Q240,315 235,315 L220,318 Q210,320 200,318 L180,315 Q160,312 145,308 L125,305 Q110,302 100,298 Z'/><path d='M280,290 Q300,275 340,278 L400,275 Q450,275 490,282 L530,290 Q555,295 560,305 Q555,315 540,318 L490,325 Q440,328 400,325 L350,320 Q315,315 295,308 Z'/><path d='M330,340 Q340,335 355,338 L370,342 Q380,345 385,352 Q380,360 370,362 L355,363 Q340,362 335,358 Z'/><path d='M600,320 Q620,310 655,315 L695,320 Q720,325 735,335 L745,345 Q748,355 735,362 L710,368 Q680,370 655,368 L625,363 Q605,358 598,350 Z'/><path d='M780,315 Q820,305 875,310 L935,315 Q980,320 1000,332 L1010,342 Q1005,355 985,362 L940,368 Q890,370 850,368 L810,363 Q788,358 780,350 Z'/><path d='M1050,340 Q1075,330 1100,335 L1120,340 Q1130,345 1128,353 L1122,362 Q1108,368 1090,368 L1070,365 Q1055,362 1048,355 Z'/><circle cx='260' cy='305' r='4'/><circle cx='265' cy='320' r='3'/><circle cx='255' cy='325' r='2.5'/><circle cx='575' cy='345' r='3'/><circle cx='770' cy='355' r='3.5'/><circle cx='1035' cy='370' r='3'/></g></svg>")
  `,
  backgroundSize: "cover, 100% auto",
  backgroundPosition: "center, center bottom",
  backgroundRepeat: "no-repeat, no-repeat",
  backgroundAttachment: "fixed, fixed",
  padding: "24px",
  fontFamily: "'Segoe UI', system-ui, sans-serif",
},
  center: { minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" },
  spinner: { width: "40px", height: "40px", borderWidth: "4px", borderStyle: "solid", borderColor: "#e0e0e0", borderTopColor: "#667eea", borderRadius: "50%", animation: "spin 1s linear infinite" },

  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", padding: "18px 28px", borderRadius: "20px", marginBottom: "24px", boxShadow: "0 8px 32px rgba(102, 126, 234, 0.15)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.5)", flexWrap: "wrap", gap: "16px" },
  brandWrap: { display: "flex", alignItems: "center", gap: "16px" },
  logoBox: { width: "56px", height: "56px", background: "white", borderRadius: "14px", padding: "6px", boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)" },
  logo: { width: "100%", height: "100%", objectFit: "contain" },
  logoPlaceholder: { width: "56px", height: "56px", background: "linear-gradient(135deg, #667eea, #764ba2)", borderRadius: "14px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "28px", boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)" },
  brand: { margin: 0, fontSize: "20px", background: "linear-gradient(135deg, #667eea, #764ba2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontWeight: "800", letterSpacing: "-0.5px" },
  brandSub: { margin: "2px 0 0 0", fontSize: "12px", color: "#6b7280", fontWeight: "500" },
  profileWrap: { display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" },
  profileInfo: { textAlign: "right" },
  userName: { margin: 0, fontSize: "15px", fontWeight: "700", color: "#1a1a1a" },
  userBadge: { display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "3px", padding: "3px 10px", background: "linear-gradient(135deg, #eef2ff, #e0e7ff)", borderRadius: "12px", fontSize: "11px", fontWeight: "600", color: "#4338ca" },
  onlineDot: { width: "6px", height: "6px", background: "#10b981", borderRadius: "50%", boxShadow: "0 0 6px #10b981" },
  avatarWrap: { position: "relative", cursor: "pointer" },
  avatar: { width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", borderWidth: "3px", borderStyle: "solid", borderColor: "white", boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)" },
  avatarPlaceholder: { width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "700", fontSize: "18px", borderWidth: "3px", borderStyle: "solid", borderColor: "white", boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)" },
  avatarEdit: { position: "absolute", bottom: "-2px", right: "-2px", background: "white", borderRadius: "50%", padding: "3px 5px", fontSize: "10px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" },
  logoutBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", background: "linear-gradient(135deg, #fee2e2, #fecaca)", color: "#dc2626", border: "none", borderRadius: "12px", cursor: "pointer", fontSize: "13px", fontWeight: "700", boxShadow: "0 2px 8px rgba(220, 38, 38, 0.15)" },

  heroGrid: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "28px" },

  mahfudzotCard: { position: "relative", background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)", borderRadius: "24px", padding: "32px 40px", boxShadow: "0 20px 50px rgba(102, 126, 234, 0.35)", overflow: "hidden", color: "white", minHeight: "320px", display: "flex", flexDirection: "column" },
  mahfudzotDeco1: { position: "absolute", top: "-80px", right: "-80px", width: "260px", height: "260px", borderRadius: "50%", background: "rgba(255,255,255,0.12)" },
  mahfudzotDeco2: { position: "absolute", bottom: "-100px", left: "-100px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(255,255,255,0.08)" },
  mahfudzotDeco3: { position: "absolute", top: "40%", right: "20%", width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.6)" },
  mahfudzotHeader: { position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", zIndex: 1 },
  mahfudzotBadge: { display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.25)", padding: "8px 16px", borderRadius: "20px", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" },
  mahfudzotCounter: { background: "rgba(255,255,255,0.25)", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" },
  mahfudzotContent: { position: "relative", textAlign: "center", padding: "10px 0", transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" },
  arabWrap: { padding: "10px 0" },
  arabText: { margin: 0, fontSize: "42px", fontWeight: "700", lineHeight: "1.7", fontFamily: "'Traditional Arabic', 'Amiri', 'Scheherazade', serif", direction: "rtl", textShadow: "0 4px 20px rgba(0,0,0,0.15)" },
  dividerWrap: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", margin: "16px 0" },
  dividerDot: { width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.6)" },
  dividerLine: { width: "80px", height: "2px", background: "rgba(255,255,255,0.4)", borderRadius: "2px" },
  artiText: { margin: 0, fontSize: "17px", lineHeight: "1.7", fontStyle: "italic", opacity: 0.98, fontWeight: "500", maxWidth: "600px", marginLeft: "auto", marginRight: "auto" },
  mahfudzotFooter: { position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", zIndex: 1 },
  navBtn: { width: "40px", height: "40px", background: "rgba(255,255,255,0.25)", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontSize: "22px", fontWeight: "700", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", transition: "all 0.2s", display: "flex", justifyContent: "center", alignItems: "center" },
  dotsWrap: { display: "flex", gap: "6px", alignItems: "center" },
  dot: { height: "6px", borderRadius: "3px", transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)" },

  // GREETING CARD (dengan support background image)
  greetCard: {
    position: "relative",
    background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
    borderRadius: "24px",
    padding: "28px",
    boxShadow: "0 8px 32px rgba(102, 126, 234, 0.12)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(102, 126, 234, 0.1)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "320px",
    overflow: "hidden",
  },
  bgControls: { position: "absolute", top: "12px", right: "12px", display: "flex", gap: "6px", zIndex: 10 },
  bgUploadBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", background: "rgba(255,255,255,0.95)", borderRadius: "8px", cursor: "pointer", fontSize: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(102, 126, 234, 0.2)" },
  bgRemoveBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", background: "rgba(254, 226, 226, 0.95)", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "700", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  bgHint: { marginTop: "12px", padding: "8px 12px", background: "rgba(239, 246, 255, 0.9)", borderRadius: "8px", fontSize: "11px", color: "#3b82f6", textAlign: "center", fontWeight: "600" },

  greetTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", position: "relative", zIndex: 2 },
  greetEmoji: { fontSize: "56px", lineHeight: "1", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" },
  greetDate: { textAlign: "center", padding: "10px 16px", background: "linear-gradient(135deg, #eef2ff, #e0e7ff)", borderRadius: "14px", boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)" },
  dateDay: { margin: 0, fontSize: "10px", color: "#667eea", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" },
  dateNumber: { margin: "2px 0", fontSize: "28px", fontWeight: "800", color: "#4338ca", lineHeight: "1" },
  dateMonth: { margin: 0, fontSize: "10px", color: "#667eea", fontWeight: "600" },
  greetTitle: { margin: "0", fontSize: "22px", color: "#4b5563", fontWeight: "600", position: "relative", zIndex: 2, textShadow: "0 1px 2px rgba(255,255,255,0.8)" },
  greetName: { margin: "4px 0 12px 0", fontSize: "26px", background: "linear-gradient(135deg, #667eea, #764ba2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontWeight: "800", letterSpacing: "-0.5px", position: "relative", zIndex: 2 },
  greetDesc: { margin: 0, fontSize: "14px", color: "#4b5563", lineHeight: "1.6", position: "relative", zIndex: 2, fontWeight: "500", textShadow: "0 1px 2px rgba(255,255,255,0.5)" },

  sectionTitle: { display: "flex", alignItems: "center", gap: "10px", margin: "0 0 18px 0", fontSize: "20px", color: "#1a1a1a", fontWeight: "800" },
  sectionEmoji: { fontSize: "24px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" },
  statCard: { padding: "24px", borderRadius: "20px", color: "white", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: "16px", transition: "all 0.3s ease" },
  statIconWrap: { width: "60px", height: "60px", borderRadius: "16px", background: "rgba(255,255,255,0.25)", display: "flex", justifyContent: "center", alignItems: "center", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" },
  statIcon: { fontSize: "32px" },
  statLabel: { margin: "0 0 6px 0", fontSize: "12px", opacity: 0.95, fontWeight: "600", letterSpacing: "0.5px" },
  statNumber: { margin: 0, fontSize: "32px", fontWeight: "800", lineHeight: "1" },

  menuGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "18px", marginBottom: "32px" },
  menuCard: { position: "relative", background: "white", padding: "24px", borderRadius: "20px", cursor: "pointer", boxShadow: "0 4px 16px rgba(102, 126, 234, 0.08)", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(102, 126, 234, 0.08)", overflow: "hidden" },
  menuIcon: { width: "60px", height: "60px", borderRadius: "16px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "30px", color: "white", marginBottom: "16px", boxShadow: "0 4px 14px rgba(102, 126, 234, 0.2)" },
  menuTitle: { margin: "0 0 6px 0", fontSize: "17px", color: "#1a1a1a", fontWeight: "800" },
  menuDesc: { margin: 0, fontSize: "13px", color: "#6b7280", lineHeight: "1.5" },
  menuArrow: { position: "absolute", top: "24px", right: "24px", fontSize: "22px", color: "#667eea", fontWeight: "700", opacity: 0.6 },

  footer: { textAlign: "center", padding: "20px 0", marginTop: "20px" },
}