"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { useEffect } from "react"

export default function RichEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          style: "max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          style: "color: #3b82f6; text-decoration: underline;",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
    ],
    content: value || "",
    onUpdate: function ({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        style: "min-height: 300px; padding: 16px; outline: none;",
      },
      handlePaste: function (view, event) {
        var items = event.clipboardData?.items
        if (!items) return false

        for (var i = 0; i < items.length; i++) {
          var item = items[i]
          if (item.type.indexOf("image") === 0) {
            event.preventDefault()
            var file = item.getAsFile()
            if (file) {
              var reader = new FileReader()
              reader.onload = function (e) {
                var base64 = e.target.result
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: base64 })
                  )
                )
              }
              reader.readAsDataURL(file)
              return true
            }
          }
        }
        return false
      },
    },
    immediatelyRender: false,
  })

  useEffect(function () {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "")
    }
  }, [value, editor])

  if (!editor) return null

  function addImage() {
    var input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = function (e) {
      var file = e.target.files[0]
      if (file) {
        var reader = new FileReader()
        reader.onload = function (event) {
          editor.chain().focus().setImage({ src: event.target.result }).run()
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  function addLink() {
    var url = prompt("Masukkan URL:")
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.toolbar}>
        <button type="button" onClick={function () { editor.chain().focus().toggleBold().run() }} style={{ ...styles.btn, ...(editor.isActive("bold") ? styles.btnActive : {}) }} title="Bold">
          <b>B</b>
        </button>
        <button type="button" onClick={function () { editor.chain().focus().toggleItalic().run() }} style={{ ...styles.btn, ...(editor.isActive("italic") ? styles.btnActive : {}) }} title="Italic">
          <i>I</i>
        </button>
        <button type="button" onClick={function () { editor.chain().focus().toggleUnderline().run() }} style={{ ...styles.btn, ...(editor.isActive("underline") ? styles.btnActive : {}) }} title="Underline">
          <u>U</u>
        </button>
        <button type="button" onClick={function () { editor.chain().focus().toggleStrike().run() }} style={{ ...styles.btn, ...(editor.isActive("strike") ? styles.btnActive : {}) }} title="Strikethrough">
          <s>S</s>
        </button>

        <span style={styles.divider}></span>

        <button type="button" onClick={function () { editor.chain().focus().toggleHeading({ level: 1 }).run() }} style={{ ...styles.btn, ...(editor.isActive("heading", { level: 1 }) ? styles.btnActive : {}) }} title="Heading 1">
          H1
        </button>
        <button type="button" onClick={function () { editor.chain().focus().toggleHeading({ level: 2 }).run() }} style={{ ...styles.btn, ...(editor.isActive("heading", { level: 2 }) ? styles.btnActive : {}) }} title="Heading 2">
          H2
        </button>
        <button type="button" onClick={function () { editor.chain().focus().toggleHeading({ level: 3 }).run() }} style={{ ...styles.btn, ...(editor.isActive("heading", { level: 3 }) ? styles.btnActive : {}) }} title="Heading 3">
          H3
        </button>

        <span style={styles.divider}></span>

        <button type="button" onClick={function () { editor.chain().focus().toggleBulletList().run() }} style={{ ...styles.btn, ...(editor.isActive("bulletList") ? styles.btnActive : {}) }} title="Bullet List">
          • List
        </button>
        <button type="button" onClick={function () { editor.chain().focus().toggleOrderedList().run() }} style={{ ...styles.btn, ...(editor.isActive("orderedList") ? styles.btnActive : {}) }} title="Numbered List">
          1. List
        </button>

        <span style={styles.divider}></span>

        <button type="button" onClick={function () { editor.chain().focus().setTextAlign("left").run() }} style={{ ...styles.btn, ...(editor.isActive({ textAlign: "left" }) ? styles.btnActive : {}) }} title="Align Left">
          ⬅
        </button>
        <button type="button" onClick={function () { editor.chain().focus().setTextAlign("center").run() }} style={{ ...styles.btn, ...(editor.isActive({ textAlign: "center" }) ? styles.btnActive : {}) }} title="Align Center">
          ⬆
        </button>
        <button type="button" onClick={function () { editor.chain().focus().setTextAlign("right").run() }} style={{ ...styles.btn, ...(editor.isActive({ textAlign: "right" }) ? styles.btnActive : {}) }} title="Align Right">
          ➡
        </button>

        <span style={styles.divider}></span>

        <button type="button" onClick={addImage} style={styles.btn} title="Insert Image">
          🖼️ Gambar
        </button>
        <button type="button" onClick={addLink} style={styles.btn} title="Insert Link">
          🔗 Link
        </button>
        <button type="button" onClick={function () { editor.chain().focus().toggleBlockquote().run() }} style={{ ...styles.btn, ...(editor.isActive("blockquote") ? styles.btnActive : {}) }} title="Quote">
          ❝ Quote
        </button>

        <span style={styles.divider}></span>

        <button type="button" onClick={function () { editor.chain().focus().undo().run() }} style={styles.btn} title="Undo">
          ↶ Undo
        </button>
        <button type="button" onClick={function () { editor.chain().focus().redo().run() }} style={styles.btn} title="Redo">
          ↷ Redo
        </button>
      </div>

      <div style={styles.editorArea}>
        <EditorContent editor={editor} />
      </div>

      <div style={styles.hint}>
        💡 <strong>Tips:</strong> Copy gambar dari mana saja (screenshot, Word, browser) lalu tekan <kbd style={styles.kbd}>Ctrl+V</kbd> untuk menempelkan langsung!
      </div>
    </div>
  )
}

var styles = {
  wrapper: { border: "2px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", background: "white" },
  toolbar: { display: "flex", gap: "4px", padding: "10px", background: "#f9fafb", borderBottom: "2px solid #e5e7eb", flexWrap: "wrap", alignItems: "center" },
  btn: { padding: "6px 12px", background: "white", border: "1px solid #e5e7eb", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#374151", minWidth: "34px" },
  btnActive: { background: "#667eea", color: "white", borderColor: "#667eea" },
  divider: { width: "1px", height: "24px", background: "#d1d5db", margin: "0 4px" },
  editorArea: { background: "white", maxHeight: "500px", overflowY: "auto" },
  hint: { padding: "10px 16px", background: "#eff6ff", fontSize: "12px", color: "#1e40af", borderTop: "1px solid #e5e7eb" },
  kbd: { padding: "2px 6px", background: "#1e40af", color: "white", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace" },
}