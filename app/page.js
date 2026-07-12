"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(function () {
    router.push("/login")
  }, [])

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <p style={{ color: "white", fontSize: "18px" }}>Loading...</p>
    </div>
  )
}