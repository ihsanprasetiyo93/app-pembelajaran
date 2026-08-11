import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  VerticalAlign, HeightRule,
} from "docx"
import { saveAs } from "file-saver"

const NAVY = "1F3A5F"
const NAVY_LIGHT = "E7EFF9"
const CREAM = "FFF9E6"
const GREEN = "1B5E4F"
const GREEN_LIGHT = "D4F1E8"
const RED = "8B2635"
const RED_LIGHT = "F5D5D0"
const PURPLE_LIGHT = "E8DAEF"
const YELLOW_LIGHT = "FFF9E0"
const BLUE_LIGHT = "DAE7F5"
const PINK_LIGHT = "F5D5D5"
const WHITE = "FFFFFF"
const BLACK = "000000"
const GRAY_TEXT = "595959"
const BORDER_GRAY = "BFBFBF"

const FONT = "Arial"

function txt(text, opts = {}) {
  return new TextRun({
    text: text || "",
    bold: opts.bold || false,
    italics: opts.italics || false,
    size: opts.size || 20,
    color: opts.color || BLACK,
    font: opts.font || FONT,
  })
}

function para(text, opts = {}) {
  return new Paragraph({
    children: Array.isArray(text) ? text : [txt(text, opts)],
    spacing: { after: opts.after !== undefined ? opts.after : 60, before: opts.before || 0, line: opts.line || 276 },
    alignment: opts.align || AlignmentType.LEFT,
    indent: opts.indent || undefined,
  })
}

function emptyPara() {
  return new Paragraph({ children: [txt("")], spacing: { after: 100 } })
}

function multiLinePara(text, opts = {}) {
  if (!text) return [para("")]
  const lines = String(text).split("\n")
  return lines.map(line => {
    if (!line.trim()) return para("")
    const numberedMatch = line.match(/^(\d+\.\s*)(.+)/)
    const letterMatch = line.match(/^([a-z]\.\s*)(.+)/i)
    const bulletMatch = line.match(/^[•·]\s*(.+)/)

    if (numberedMatch) {
      return new Paragraph({
        children: [txt(numberedMatch[1], { bold: true, size: 20 }), txt(numberedMatch[2], { size: 20 })],
        spacing: { after: 60, line: 276 },
        indent: { left: 300 },
      })
    } else if (letterMatch) {
      return new Paragraph({
        children: [txt(letterMatch[1], { bold: true, size: 20 }), txt(letterMatch[2], { size: 20 })],
        spacing: { after: 60, line: 276 },
        indent: { left: 300 },
      })
    } else if (bulletMatch) {
      return new Paragraph({
        children: [txt("• ", { bold: true, size: 20 }), txt(bulletMatch[1], { size: 20 })],
        spacing: { after: 60, line: 276 },
        indent: { left: 300 },
      })
    }
    return para(line, opts)
  })
}

function noBorder() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  }
}

function thinBorder() {
  return {
    top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
    left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
    right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
  }
}

function colorBorder(color) {
  return {
    top: { style: BorderStyle.SINGLE, size: 4, color: color },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: color },
    left: { style: BorderStyle.SINGLE, size: 4, color: color },
    right: { style: BorderStyle.SINGLE, size: 4, color: color },
  }
}

// SECTION HEADER (A, B, C, D, E, LAMPIRAN)
function sectionHeader(letter, title, bgColor) {
  const text = letter ? letter + ".  " + title : title
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder(),
    rows: [
      new TableRow({
        height: { value: 500, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: bgColor, fill: bgColor },
            borders: colorBorder(bgColor),
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [txt(text, { bold: true, size: 24, color: WHITE })],
                spacing: { before: 60, after: 60 },
                indent: { left: 200 },
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

// SUB HEADER (B1, B2, C1, dst)
function subHeader(code, title, bgColor, textColor) {
  const bg = bgColor || NAVY_LIGHT
  const clr = textColor || BLACK
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder(),
    rows: [
      new TableRow({
        height: { value: 350, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: bg, fill: bg },
            borders: thinBorder(),
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [
                  txt(code + " | ", { bold: true, size: 20, color: clr }),
                  txt(title, { bold: true, size: 20, color: clr }),
                ],
                spacing: { before: 40, after: 40 },
                indent: { left: 150 },
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

// SPESIFIKASI ROW (A1, A2, dst)
function specRow(code, label, value) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 8, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: NAVY_LIGHT, fill: NAVY_LIGHT },
        borders: thinBorder(),
        verticalAlign: VerticalAlign.CENTER,
        children: [para(code, { bold: true, align: AlignmentType.CENTER, size: 20 })],
      }),
      new TableCell({
        width: { size: 27, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: NAVY_LIGHT, fill: NAVY_LIGHT },
        borders: thinBorder(),
        verticalAlign: VerticalAlign.CENTER,
        children: [para(label, { bold: true, size: 20 })],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        borders: thinBorder(),
        verticalAlign: VerticalAlign.CENTER,
        children: [para(value || "", { size: 20 })],
      }),
    ],
  })
}

// LABEL VALUE ROW
function labelValueRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        borders: thinBorder(),
        verticalAlign: VerticalAlign.CENTER,
        children: [para(label, { size: 20 })],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        borders: thinBorder(),
        verticalAlign: VerticalAlign.CENTER,
        children: [para(value || "", { size: 20 })],
      }),
    ],
  })
}

// CHECKBOX ROW (DPL, KBC)
function checkboxRow(items) {
  const rows = []
  for (let i = 0; i < items.length; i += 2) {
    const left = items[i]
    const right = items[i + 1] || { label: "", checked: false }
    rows.push(new TableRow({
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: thinBorder(),
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              children: [
                txt(left.checked ? "[ ✓ ]  " : "[   ]  ", { size: 20 }),
                txt(left.label, { size: 20 }),
              ],
              spacing: { before: 40, after: 40 },
              indent: { left: 100 },
            }),
          ],
        }),
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: thinBorder(),
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              children: right.label ? [
                txt(right.checked ? "[ ✓ ]  " : "[   ]  ", { size: 20 }),
                txt(right.label, { size: 20 }),
              ] : [txt("", { size: 20 })],
              spacing: { before: 40, after: 40 },
              indent: { left: 100 },
            }),
          ],
        }),
      ],
    }))
  }
  return rows
}

// TEXT AREA (untuk isi panjang)
function textAreaCell(text, bgColor) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [new TableCell({
          borders: thinBorder(),
          shading: bgColor ? { type: ShadingType.SOLID, color: bgColor, fill: bgColor } : undefined,
          children: [
            ...multiLinePara(text || ""),
            para(""),
            para(""),
          ],
        })],
      }),
    ],
  })
}

// TAHAP CELL (untuk tabel D2)
function tahapCell(text, bgColor) {
  const textColor = (bgColor === YELLOW_LIGHT || bgColor === PURPLE_LIGHT) ? BLACK : BLACK
  return new TableCell({
    width: { size: 15, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.SOLID, color: bgColor, fill: bgColor },
    borders: thinBorder(),
    verticalAlign: VerticalAlign.CENTER,
    children: [para(text, { bold: true, size: 20, color: textColor, align: AlignmentType.CENTER })],
  })
}

// FASE CLD COLORED BOX
function faseCldCell(items) {
  return new TableCell({
    width: { size: 20, type: WidthType.PERCENTAGE },
    borders: thinBorder(),
    verticalAlign: VerticalAlign.TOP,
    children: items.map(item => new Paragraph({
      children: [txt(item.label, { size: 14, color: WHITE, bold: true })],
      shading: { type: ShadingType.SOLID, color: item.color, fill: item.color },
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40, line: 240 },
      indent: { left: 60, right: 60 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 2, color: item.color },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: item.color },
        left: { style: BorderStyle.SINGLE, size: 2, color: item.color },
        right: { style: BorderStyle.SINGLE, size: 2, color: item.color },
      },
    })),
  })
}

function kegiatanIntiTable(kegiatanIntiTabel) {
  const rows = kegiatanIntiTabel && Array.isArray(kegiatanIntiTabel) && kegiatanIntiTabel.length > 0
    ? kegiatanIntiTabel
    : []

  // Warna tahap
  const tahapColors = {
    MEMAHAMI: GREEN_LIGHT,
    MENGAPLIKASI: YELLOW_LIGHT,
    MEREFLEKSI: PINK_LIGHT,
  }

  // Warna sub-row
  const subRowColors = [null, BLUE_LIGHT, null, PURPLE_LIGHT, null]

  const tableRows = [
    // Header
    new TableRow({
      tableHeader: true,
      height: { value: 400, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({
          shading: { type: ShadingType.SOLID, color: GREEN, fill: GREEN },
          borders: colorBorder(GREEN),
          verticalAlign: VerticalAlign.CENTER,
          children: [para("Tahap Inquiry", { bold: true, color: WHITE, size: 20, align: AlignmentType.CENTER })],
        }),
        new TableCell({
          shading: { type: ShadingType.SOLID, color: GREEN, fill: GREEN },
          borders: colorBorder(GREEN),
          verticalAlign: VerticalAlign.CENTER,
          children: [para("Langkah", { bold: true, color: WHITE, size: 20, align: AlignmentType.CENTER })],
        }),
        new TableCell({
          shading: { type: ShadingType.SOLID, color: GREEN, fill: GREEN },
          borders: colorBorder(GREEN),
          verticalAlign: VerticalAlign.CENTER,
          children: [para("Fase 21 CLD (Aktif)", { bold: true, color: WHITE, size: 20, align: AlignmentType.CENTER })],
        }),
        new TableCell({
          shading: { type: ShadingType.SOLID, color: GREEN, fill: GREEN },
          borders: colorBorder(GREEN),
          verticalAlign: VerticalAlign.CENTER,
          children: [para("Aktivitas Pembelajaran (isi sesuai materi)", { bold: true, color: WHITE, size: 20, align: AlignmentType.CENTER })],
        }),
      ],
    }),
  ]

  rows.forEach((row, idx) => {
    const bgColor = row.tahap ? tahapColors[row.tahap] : subRowColors[idx] || null
    tableRows.push(new TableRow({
      children: [
        row.tahap ? tahapCell(row.tahap, tahapColors[row.tahap] || GREEN_LIGHT) : new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: bgColor ? { type: ShadingType.SOLID, color: bgColor, fill: bgColor } : undefined,
          borders: thinBorder(),
          children: [para("")],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: bgColor ? { type: ShadingType.SOLID, color: bgColor, fill: bgColor } : undefined,
          borders: thinBorder(),
          verticalAlign: VerticalAlign.TOP,
          children: multiLinePara(row.langkah || ""),
        }),
        faseCldCell(row.faseCld || []),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          borders: thinBorder(),
          verticalAlign: VerticalAlign.TOP,
          children: multiLinePara(row.aktivitas || "1) \n2) "),
        }),
      ],
    }))
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  })
}

// SIKLUS 21 CLD BAR (bar warna warni horizontal)
function siklus21CldBar() {
  const items = [
    { text: "1 KOLABORASI", color: GREEN },
    { text: "2 PENGETAHUAN", color: NAVY },
    { text: "3 PEMANFAATAN ICT", color: "008B8B" },
    { text: "4 PEMECAHAN MASALAH & INOVASI", color: "B8860B" },
    { text: "5 KOMUNIKASI TERPADU", color: "6A0DAD" },
    { text: "6 PENGATURAN DIRI", color: RED },
  ]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        height: { value: 400, rule: HeightRule.ATLEAST },
        children: items.map(item => new TableCell({
          shading: { type: ShadingType.SOLID, color: item.color, fill: item.color },
          borders: colorBorder(item.color),
          verticalAlign: VerticalAlign.CENTER,
          children: [para(item.text, { bold: true, size: 16, color: WHITE, align: AlignmentType.CENTER })],
        })),
      }),
    ],
  })
}

// LEGEND CLD (di bawah tabel D2)
function legend21Cld() {
  const items = [
    { text: "KOLABORASI", color: GREEN },
    { text: "PENGETAHUAN", color: NAVY },
    { text: "ICT", color: "008B8B" },
    { text: "PEMECAHAN MASALAH", color: "B8860B" },
    { text: "KOMUNIKASI", color: "6A0DAD" },
    { text: "PENGATURAN DIRI", color: RED },
  ]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        height: { value: 350, rule: HeightRule.ATLEAST },
        children: items.map(item => new TableCell({
          shading: { type: ShadingType.SOLID, color: item.color, fill: item.color },
          borders: colorBorder(item.color),
          verticalAlign: VerticalAlign.CENTER,
          children: [para(item.text, { bold: true, size: 16, color: WHITE, align: AlignmentType.CENTER })],
        })),
      }),
    ],
  })
}

// ASSESSMENT TABLE (E1, E2)
function assessmentTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        height: { value: 400, rule: HeightRule.ATLEAST },
        children: ["Jenis", "Fungsi", "Contoh Instrumen"].map(t => new TableCell({
          shading: { type: ShadingType.SOLID, color: RED, fill: RED },
          borders: colorBorder(RED),
          verticalAlign: VerticalAlign.CENTER,
          children: [para(t, { bold: true, size: 20, color: WHITE, align: AlignmentType.CENTER })],
        })),
      }),
      ...rows.map(r => new TableRow({
        children: [
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            borders: thinBorder(),
            shading: { type: ShadingType.SOLID, color: RED_LIGHT, fill: RED_LIGHT },
            verticalAlign: VerticalAlign.TOP,
            children: [para(r.jenis, { bold: true, size: 20 })],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: thinBorder(),
            verticalAlign: VerticalAlign.TOP,
            children: multiLinePara(r.fungsi),
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: thinBorder(),
            verticalAlign: VerticalAlign.TOP,
            children: multiLinePara(r.instrumen),
          }),
        ],
      })),
    ],
  })
}

// LAMPIRAN ROW
function lampiranRow(code, title, content) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: NAVY_LIGHT, fill: NAVY_LIGHT },
            borders: thinBorder(),
            verticalAlign: VerticalAlign.CENTER,
            children: [para(code, { bold: true, size: 20, align: AlignmentType.CENTER })],
          }),
          new TableCell({
            width: { size: 92, type: WidthType.PERCENTAGE },
            borders: thinBorder(),
            verticalAlign: VerticalAlign.TOP,
            children: [
              para(title, { bold: true, size: 20 }),
              ...(content ? multiLinePara(content) : [para("")]),
            ],
          }),
        ],
      }),
    ],
  })
}

// TITLE BLOCK (bagian atas dokumen)
function titleBlock() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder(),
    rows: [
      new TableRow({
        height: { value: 700, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
            borders: colorBorder(NAVY),
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [txt("RENCANA PELAKSANAAN PEMBELAJARAN (RPP)", { bold: true, size: 28, color: WHITE })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 200 },
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        height: { value: 300, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: NAVY_LIGHT, fill: NAVY_LIGHT },
            borders: thinBorder(),
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [txt("Model Inquiry Learning  |  Deep Learning  |  DPL  |  KBC  |  21st Century Learning Design", { size: 18, color: BLACK })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 80 },
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

// TANDA TANGAN
function tandaTanganTable(rpp) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: thinBorder(),
            verticalAlign: VerticalAlign.CENTER,
            children: [para("", { size: 20 })],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: thinBorder(),
            verticalAlign: VerticalAlign.CENTER,
            children: [para(rpp.tempat_tanggal || "..............., ...................... " + new Date().getFullYear(), { align: AlignmentType.CENTER, size: 20 })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: thinBorder(),
            verticalAlign: VerticalAlign.CENTER,
            children: [
              para("Mengetahui,", { align: AlignmentType.CENTER, size: 20 }),
              para("Kepala Madrasah", { bold: true, align: AlignmentType.CENTER, size: 20 }),
            ],
          }),
          new TableCell({
            borders: thinBorder(),
            verticalAlign: VerticalAlign.CENTER,
            children: [
              para("", { size: 20 }),
              para("Guru Mata Pelajaran", { bold: true, align: AlignmentType.CENTER, size: 20 }),
            ],
          }),
        ],
      }),
      new TableRow({
        height: { value: 1500, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({ borders: thinBorder(), children: [para("")] }),
          new TableCell({ borders: thinBorder(), children: [para("")] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: thinBorder(),
            verticalAlign: VerticalAlign.CENTER,
            children: [para(rpp.kepala_madrasah || "..............................", { align: AlignmentType.CENTER, size: 20 })],
          }),
          new TableCell({
            borders: thinBorder(),
            verticalAlign: VerticalAlign.CENTER,
            children: [para(rpp.guru_mapel || "..............................", { align: AlignmentType.CENTER, size: 20 })],
          }),
        ],
      }),
    ],
  })
}

// FOOTER TEMPLATE
function templateFooter() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [new TableCell({
          borders: thinBorder(),
          shading: { type: ShadingType.SOLID, color: NAVY_LIGHT, fill: NAVY_LIGHT },
          children: [
            new Paragraph({
              children: [txt("Template ini mengintegrasikan: Pembelajaran Mendalam (Deep Learning)  ·  Delapan Dimensi Profil Lulusan (DPL)  ·  Kurikulum Berbasis Cinta (KBC)  ·  21st Century Learning Design (21 CLD)  |  Permendikdasmen No. 13 Tahun 2025  ·  KMA No. 1503/2025", { size: 16, italics: true, color: BLACK })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
            }),
          ],
        })],
      }),
    ],
  })
}

export async function generateRPPWord(rpp, DPL_LIST, KBC_LIST) {
  const dplRows = checkboxRow(DPL_LIST.map(d => ({
    label: d.label.replace("- ", ""),
    checked: !!(rpp.dpl_dipilih && rpp.dpl_dipilih[d.key]),
  })))

  const kbcRows = checkboxRow(KBC_LIST.map(k => ({
    label: k.label.replace("- ", ""),
    checked: !!(rpp.kbc_dipilih && rpp.kbc_dipilih[k.key]),
  })))

  const children = [
    // TITLE
    titleBlock(),
    emptyPara(),

    // A. SPESIFIKASI
    sectionHeader("A", "SPESIFIKASI", NAVY),
    emptyPara(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        specRow("A1", "Satuan Pendidikan", rpp.satuan_pendidikan),
        specRow("A2", "Mata Pelajaran", rpp.mata_pelajaran),
        specRow("A3", "Kelas / Semester", rpp.kelas_semester),
        specRow("A4", "Topik Pembelajaran", rpp.topik_pembelajaran),
        specRow("A5", "Alokasi Waktu", rpp.alokasi_waktu),
        specRow("A6", "Capaian Pembelajaran", rpp.capaian_pembelajaran),
        specRow("A7", "Alur Tujuan Pembelajaran", rpp.alur_tujuan_pembelajaran),
      ],
    }),
    emptyPara(),
    emptyPara(),

    // B. IDENTIFIKASI
    sectionHeader("B", "IDENTIFIKASI", NAVY),
    emptyPara(),

    // B1 - Dasar Naqli
    subHeader("B1", "Dasar Naqli (Al-Qur'an / Hadits)", NAVY_LIGHT),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [new TableCell({
            borders: thinBorder(),
            shading: { type: ShadingType.SOLID, color: NAVY_LIGHT, fill: NAVY_LIGHT },
            children: [
              new Paragraph({
                children: [txt("Wajib diisi setiap modul (arahan Kepala Madrasah). Cantumkan ayat Al-Qur'an dan/atau hadits yang menjadi landasan/ruh materi bab ini — wujud integrasi Topik 1 KBC: Cinta Allah dan Rasul-Nya.", { italics: true, size: 18 })],
                spacing: { before: 60, after: 60 },
                indent: { left: 100, right: 100 },
              }),
            ],
          })],
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: thinBorder(), verticalAlign: VerticalAlign.CENTER, children: [para("Surah / Ayat / Hadits", { size: 20 })] }),
            new TableCell({ width: { size: 75, type: WidthType.PERCENTAGE }, borders: thinBorder(), verticalAlign: VerticalAlign.CENTER, children: [para(rpp.dasar_naqli_surah || "", { size: 20 })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: thinBorder(), verticalAlign: VerticalAlign.CENTER, children: [para("Lafal Arab", { size: 20 })] }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              borders: thinBorder(),
              children: [
                new Paragraph({
                  children: [txt(rpp.dasar_naqli_arab || "", { size: 28, font: "Traditional Arabic" })],
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 80, after: 80, line: 400 },
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: thinBorder(), verticalAlign: VerticalAlign.CENTER, children: [para("Terjemahan", { size: 20 })] }),
            new TableCell({ width: { size: 75, type: WidthType.PERCENTAGE }, borders: thinBorder(), verticalAlign: VerticalAlign.CENTER, children: multiLinePara(rpp.dasar_naqli_terjemah || "") }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              colSpan: 2,
              borders: thinBorder(),
              verticalAlign: VerticalAlign.TOP,
              children: [
                para("Keterkaitan dengan Materi Pembelajaran:", { size: 20 }),
                ...multiLinePara(rpp.dasar_naqli_keterkaitan || ""),
                para(""),
              ],
            }),
          ],
        }),
      ],
    }),
    emptyPara(),

    // B2 - Asesmen Awal
    subHeader("B2", "Asesmen pada Awal Pembelajaran  (opsional)", NAVY_LIGHT),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [new TableCell({
            borders: thinBorder(),
            children: [
              para("Tuliskan strategi penilaian yang digunakan pada awal pembelajaran dan tindak lanjut hasil asesmen awal!", { italics: true, size: 18, color: GRAY_TEXT }),
              ...multiLinePara(rpp.asesmen_awal || ""),
              para(""),
              para(""),
            ],
          })],
        }),
      ],
    }),
    emptyPara(),

    // B2 (DPL)
    subHeader("B2", "Dimensi Profil Lulusan (DPL) — Pilih yang ingin dicapai", NAVY_LIGHT),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: dplRows }),
    emptyPara(),

    // B3 - KBC
    subHeader("B3", "Topik Panca Cinta (KBC) — Pilih yang sesuai dengan materi", CREAM),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: kbcRows }),
    emptyPara(),

    // B4 - Materi Integrasi KBC
    subHeader("B4", "Materi Integrasi KBC", CREAM),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [new TableCell({
            borders: thinBorder(),
            children: [
              para("Tuliskan materi integrasi KBC (Panca Cinta) yang relevan dengan materi pembelajaran. Diambil dari buku panduan KBC.", { italics: true, size: 18, color: GRAY_TEXT }),
              ...multiLinePara(rpp.materi_integrasi_kbc || ""),
              para(""),
              para(""),
            ],
          })],
        }),
      ],
    }),
    emptyPara(),
    emptyPara(),

    // C. DESAIN
    sectionHeader("C", "DESAIN PEMBELAJARAN", GREEN),
    emptyPara(),

    subHeader("C1", "Tujuan Pembelajaran", GREEN_LIGHT),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [new TableCell({
            borders: thinBorder(),
            children: [
              para("Tuliskan tujuan pembelajaran yang mencakup kompetensi dan konten pada ruang lingkup materi menggunakan kata kerja operasional yang relevan.", { italics: true, size: 18, color: GRAY_TEXT }),
              ...multiLinePara(rpp.tujuan_pembelajaran || ""),
              para(""),
              para(""),
            ],
          })],
        }),
      ],
    }),
    emptyPara(),

    subHeader("C2", "Kerangka Pembelajaran", GREEN_LIGHT),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          height: { value: 400, rule: HeightRule.ATLEAST },
          children: ["Aspek", "Keterangan"].map(t => new TableCell({
            width: { size: t === "Aspek" ? 30 : 70, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: GREEN, fill: GREEN },
            borders: colorBorder(GREEN),
            verticalAlign: VerticalAlign.CENTER,
            children: [para(t, { bold: true, size: 20, color: WHITE, align: AlignmentType.CENTER })],
          })),
        }),
        labelValueRow("a.  Model Pembelajaran", rpp.model_pembelajaran),
        labelValueRow("b.  Metode", rpp.metode),
        labelValueRow("c.  Kemitraan  (opsional)", rpp.kemitraan),
        labelValueRow("d.  Lingkungan Fisik", rpp.lingkungan_fisik),
        labelValueRow("e.  Ruang Virtual", rpp.ruang_virtual),
        labelValueRow("f.  Budaya Belajar", rpp.budaya_belajar),
        labelValueRow("g.  Pemanfaatan Digital  (opsional)", rpp.pemanfaatan_digital),
      ],
    }),
    emptyPara(),

    subHeader("C3", "Siklus Keterampilan Abad 21 (21st Century Learning Design / 21 CLD)", PURPLE_LIGHT),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [new TableCell({
            borders: thinBorder(),
            shading: { type: ShadingType.SOLID, color: PURPLE_LIGHT, fill: PURPLE_LIGHT },
            children: [
              new Paragraph({
                children: [txt("Siklus 21 CLD bersifat berkesinambungan dan dijalankan sepanjang proses pembelajaran — bukan checklist yang dipilih. Keenam fase di bawah ini menjadi kerangka keterampilan yang aktif selama Kegiatan Inti (lihat pemetaan di bagian D2).", { italics: true, size: 18 })],
                spacing: { before: 60, after: 60 },
                indent: { left: 100, right: 100 },
              }),
            ],
          })],
        }),
      ],
    }),
    emptyPara(),
    siklus21CldBar(),
    emptyPara(),
    new Paragraph({
      children: [txt("(*) Siklus bersifat iteratif: Pengaturan Diri di akhir memantik kembali Kolaborasi pada pertemuan berikutnya.", { size: 16, italics: true, color: GRAY_TEXT })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    emptyPara(),

    // D. PENGALAMAN
    sectionHeader("D", "PENGALAMAN BELAJAR", GREEN),
    emptyPara(),

    subHeader("D1", "Kegiatan Awal  (Pilih: berkesadaran / bermakna / menggembirakan)", GREEN_LIGHT),
    textAreaCell(rpp.kegiatan_awal),
    emptyPara(),

    subHeader("D2", "Kegiatan Inti  —  Model: Inquiry Learning  +  Siklus 21 CLD", GREEN_LIGHT),
    kegiatanIntiTable(rpp.kegiatan_inti_tabel),
    emptyPara(),
    legend21Cld(),
    emptyPara(),

    subHeader("D3", "Kegiatan Penutup  (berkesadaran / bermakna / menggembirakan)", GREEN_LIGHT),
    textAreaCell(rpp.kegiatan_penutup),
    emptyPara(),
    emptyPara(),

    // E. ASESMEN
    sectionHeader("E", "ASESMEN PEMBELAJARAN", RED),
    emptyPara(),
    assessmentTable([
      { jenis: "E1 | Asesmen Proses (Formatif)", fungsi: "Umpan balik untuk perbaikan proses belajar; membantu murid memahami progres; refleksi guru mengajar.", instrumen: rpp.asesmen_formatif },
      { jenis: "E2 | Asesmen Akhir (Sumatif)", fungsi: "Mengukur capaian pembelajaran pada akhir pembelajaran.", instrumen: rpp.asesmen_sumatif },
    ]),
    emptyPara(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [new TableCell({
            borders: thinBorder(),
            children: [para("Catatan asesmen tambahan: " + (rpp.catatan_asesmen || "................................................................................"), { size: 20 })],
          })],
        }),
      ],
    }),
    emptyPara(),
    emptyPara(),

    // TANDA TANGAN
    tandaTanganTable(rpp),
    emptyPara(),
    emptyPara(),

    // LAMPIRAN
    sectionHeader("", "LAMPIRAN", NAVY),
    emptyPara(),
    lampiranRow("L1.", "Lembar Kerja Peserta Didik (LKPD)", rpp.lkpd),
    emptyPara(),
    lampiranRow("L2.", "Bahan Ajar / Materi Bacaan", rpp.bahan_ajar),
    emptyPara(),
    lampiranRow("L3.", "Instrumen Asesmen Proses (rubrik / lembar observasi)", ""),
    emptyPara(),
    lampiranRow("L4.", "Instrumen Asesmen Akhir (soal / rubrik proyek)", rpp.soal_hots),
    emptyPara(),
    lampiranRow("L5.", "Media Pembelajaran (tautan video, laman, dll.)", rpp.media_pembelajaran),
    emptyPara(),
    lampiranRow("L6.", "Referensi / Sumber Belajar", rpp.referensi),
    emptyPara(),
    templateFooter(),
  ]

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 20 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children,
    }],
  })

  const blob = await Packer.toBlob(doc)
  const fileName = "RPP_" + (rpp.topik_pembelajaran || "Tanpa_Judul").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50) + ".docx"
  saveAs(blob, fileName)
}