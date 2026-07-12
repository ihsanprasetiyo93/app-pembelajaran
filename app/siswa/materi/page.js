"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabaseClient"
import { generateContohKongkrit } from "../../../lib/gemini"
import { useRouter } from "next/navigation"

export default function SiswaMateriPage() {
  const [user, setUser] = useState(null)
  const [materiList, setMateriList] = useState([])
  const [loading, setLoading] = useState(true)
  const [openMateri, setOpenMateri] = useState(null)
  const [aiPopup, setAiPopup] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState("")
  const [selectedText, setSelectedText] = useState("")
  const [selectedMateriIsi, setSelectedMateriIsi] = useState("")
  const router = useRouter()

  useEffect(function () {
    loadData()
  }, [])

  async function loadData() {
    var authResult = await supabase.auth.getUser()
    var authUser = authResult.data.user

    if (!authUser) {
      router.push("/login")
      return
    }

    var userResult = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single()

    if (!userResult.data || userResult.data.role !== "siswa") {
      router.push("/dashboard")
      return
    }

    setUser(userResult.data)

    var materiResult = await supabase
      .from("materi")
      .select("*")
      .order("pertemuan_ke", { ascending: true })

    var materiDenganGuru = await Promise.all(
      (materiResult.data || []).map(async function (item) {
        var guruResult = await supabase
          .from("users")
          .select("nama")
          .eq("id", item.guru_id)
          .single()

        return {
          ...item,
          guru_nama: guruResult.data ? guruResult.data.nama : "Guru",
        }
      })
    )

    setMateriList(materiDenganGuru)
    setLoading(false)
  }

  function handleTextSelect(materiIsi) {
    var selection = window.getSelection()
    var text = selection ? selection.toString().trim() : ""

    if (text.length < 3) {
      setAiPopup(null)
      return
    }

    setSelectedText(text)
    setSelectedMateriIsi(materiIsi)
    setAiResult("")
    setAiPopup("menu")
  }

  async function handleAskAI() {
    if (!selectedText) return
    setAiPopup("result")
    setAiLoading(true)
    setAiResult("")

    var result = await generateContohKongkrit(selectedText, selectedMateriIsi)

    if (result.success) {
      setAiResult(result.data)
    } else {
      setAiResult("Ihsan AI gagal merespons. Coba lagi ya!")
    }

    setAiLoading(false)
  }

  function closePopup() {
    setAiPopup(null)
    setAiResult("")
    setSelectedText("")
    if (window.getSelection) {
      window.getSelection().removeAllRanges()
    }
  }

  if (loading) {
    return (
      <div style={s.center}>
        <div style={s.spinner}></div>
        <p style={{ marginTop: "16px", color: "#666" }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button onClick={function () { router.push("/dashboard") }} style={s.backBtn}>
          ← Kembali
        </button>
        <h1 style={s.title}>📖 Materi Pelajaran</h1>
      </div>

      <div style={s.aiInfoCard}>
        <p style={{ margin: 0, fontSize: "14px" }}>
          ✨ <strong>Ihsan AI</strong> siap membantu! Seleksi teks di materi untuk mendapat contoh konkrit.
        </p>
      </div>

      {materiList.length === 0 ? (
        <div style={s.empty}>
          <p style={{ fontSize: "48px", margin: 0 }}>📭</p>
          <p style={{ color: "#666", marginTop: "12px" }}>Belum ada materi dari guru.</p>
        </div>
      ) : (
        <div style={s.listWrap}>
          {materiList.map(function (item) {
            return (
              <div key={item.id} style={s.materiCard}>
                <div
                  onClick={function () {
                    setOpenMateri(openMateri === item.id ? null : item.id)
                    setAiPopup(null)
                  }}
                  style={s.materiHeader}
                >
                  <div style={s.pertemuanBadge}>Pertemuan {item.pertemuan_ke}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={s.materiJudul}>{item.judul}</h3>
                    <p style={s.materiMeta}>
                      👨‍🏫 {item.guru_nama} • 🗓️ {new Date(item.created_at).toLocaleDateString("id-ID", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  </div>
                  <div style={s.expandIcon}>{openMateri === item.id ? "▲" : "▼"}</div>
                </div>

                {openMateri === item.id && (
                  <div style={s.materiBody}>
                    <div style={s.aiHint}>
                      💡 Seleksi teks di bawah untuk tanya <strong>Ihsan AI</strong>
                    </div>

                    <div
                      style={s.materiIsi}
                      onMouseUp={function () { handleTextSelect(item.isi) }}
                    >
                      {item.isi.split("\n").map(function (p, i) {
                        return (
                          <p key={i} style={{ margin: "0 0 10px 0", lineHeight: "1.8" }}>{p}</p>
                        )
                      })}
                    </div>

                    {item.file_url && (
                      <a href={item.file_url} target="_blank" rel="noopener noreferrer" style={s.downloadBtn}>
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

      {aiPopup === "menu" && (
        <div style={s.floatingBtn}>
          <button onClick={handleAskAI} style={s.aiMenuBtn}>
            ✨ Ihsan AI - Beri Contoh Konkrit
          </button>
          <button onClick={closePopup} style={s.aiCancelBtn}>✕</button>
        </div>
      )}

      {aiPopup === "result" && (
        <div style={s.aiOverlay}>
          <div style={s.aiModal}>
            <div style={s.aiModalHeader}>
              <div style={s.aiLogo}>
                <span style={{ fontSize: "20px" }}>✨</span>
                <span style={{ fontWeight: "700", fontSize: "16px" }}>Ihsan AI</span>
              </div>
              <button onClick={closePopup} style={s.closeBtn}>✕</button>
            </div>

            <div style={s.aiSelectedText}>
              <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                Teks yang dipilih:
              </p>
              <p style={{ margin: 0, fontSize: "14px", fontStyle: "italic", color: "#374151" }}>
                "{selectedText.length > 100 ? selectedText.substring(0, 100) + "..." : selectedText}"
              </p>
            </div>

            <div style={s.aiContent}>
              {aiLoading ? (
                <div style={s.aiLoadingWrap}>
                  <div style={s.aiSpinner}></div>
                  <p style={{ margin: "12px 0 0 0", color: "#6b7280", fontSize: "14px" }}>
                    Ihsan AI sedang berpikir...
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: "700", color: "#667eea" }}>
                    💡 Contoh Konkrit:
                  </p>
                  <p style={{ margin: 0, fontSize: "14px", color: "#374151", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
                    {aiResult}
                  </p>
                </div>
              )}
            </div>

            {!aiLoading && (
              <div style={s.aiModalFooter}>
                <button onClick={handleAskAI} style={s.retryBtn}>🔄 Tanya Lagi</button>
                <button onClick={closePopup} style={s.closeModalBtn}>Tutup</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

var s = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%)",
    padding: "24px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  center: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e0e0e0",
    borderTop: "4px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  backBtn: {
    padding: "10px 18px",
    background: "white",
    border: "2px solid #e5e7eb",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
  },
  title: {
    flex: 1,
    margin: 0,
    fontSize: "28px",
    color: "#1a1a1a",
  },
  aiInfoCard: {
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    padding: "16px 20px",
    borderRadius: "12px",
    marginBottom: "20px",
  },
  empty: {
    textAlign: "center",
    background: "white",
    padding: "48px",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  listWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  materiCard: {
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  materiHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "20px 24px",
    cursor: "pointer",
    flexWrap: "wrap",
  },
  pertemuanBadge: {
    padding: "4px 12px",
    background: "#dbeafe",
    color: "#1e40af",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
    flexShrink: 0,
  },
  materiJudul: {
    margin: "0 0 4px 0",
    fontSize: "17px",
    color: "#1a1a1a",
    fontWeight: "700",
  },
  materiMeta: {
    margin: 0,
    fontSize: "12px",
    color: "#6b7280",
  },
  expandIcon: {
    fontSize: "14px",
    color: "#9ca3af",
    flexShrink: 0,
  },
  materiBody: {
    padding: "0 24px 24px 24px",
    borderTop: "1px solid #e5e7eb",
  },
  aiHint: {
    padding: "10px 14px",
    background: "#f0f4ff",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#4b5563",
    marginTop: "16px",
    marginBottom: "16px",
    border: "1px solid #e0e7ff",
  },
  materiIsi: {
    fontSize: "15px",
    color: "#374151",
    lineHeight: "1.8",
    cursor: "text",
    marginBottom: "16px",
  },
  downloadBtn: {
    display: "inline-block",
    padding: "12px 20px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "14px",
  },
  floatingBtn: {
    position: "fixed",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "8px",
    zIndex: 9999,
    background: "white",
    padding: "8px",
    borderRadius: "14px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  },
  aiMenuBtn: {
    padding: "12px 20px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  aiCancelBtn: {
    padding: "12px 16px",
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "700",
  },
  aiOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: "24px",
  },
  aiModal: {
    background: "white",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "500px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
    overflow: "hidden",
  },
  aiModalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
  },
  aiLogo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    color: "white",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  aiSelectedText: {
    padding: "16px 24px",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
  },
  aiContent: {
    padding: "20px 24px",
    minHeight: "120px",
  },
  aiLoadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 0",
  },
  aiSpinner: {
    width: "36px",
    height: "36px",
    border: "3px solid #e5e7eb",
    borderTop: "3px solid #667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  aiModalFooter: {
    display: "flex",
    gap: "10px",
    padding: "16px 24px",
    borderTop: "1px solid #e5e7eb",
    justifyContent: "flex-end",
  },
  retryBtn: {
    padding: "10px 18px",
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },
  closeModalBtn: {
    padding: "10px 18px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },
}