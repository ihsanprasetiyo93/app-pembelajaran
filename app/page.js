"use client"

import { useEffect } from "react"
import { supabase } from "../lib/supabaseClient"

export default function Home() {

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase
        .from('test')
        .select('*')

      console.log("DATA:", data)
      console.log("ERROR:", error)
    }

    testConnection()
  }, [])

  return (
    <div>
      <h1>Test Supabase</h1>
      <p>Cek console browser</p>
    </div>
  )
}