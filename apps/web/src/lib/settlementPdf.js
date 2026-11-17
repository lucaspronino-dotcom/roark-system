export function createSettlementPdf({
  adjustmentNotice,
  balance,
  balanceLabel,
  contract,
  date,
  documentTitle,
  items,
  notes,
  paidAmount,
  receiptNumber,
  total,
  variant = "settlement",
  historical = null,
  appendixLines = [],
}) {
  let lines = []
  const pages = [lines]

  function addPage() {
    lines = []
    pages.push(lines)
  }

  function addText(x, y, size, text, options = {}) {
    lines.push("BT")
    lines.push(`/${options.bold ? "F2" : "F1"} ${size} Tf`)
    lines.push(`${x} ${y} Td`)
    lines.push(`(${escapePdfText(text)}) Tj`)
    lines.push("ET")
  }

  function addTextRight(x, y, size, text, options = {}) {
    const textWidth = getApproximateTextWidth(text, size, options.bold)

    addText(x - textWidth, y, size, text, options)
  }

  function addTextCentered(x, y, size, text, options = {}) {
    const textWidth = getApproximateTextWidth(text, size, options.bold)

    addText(x - textWidth / 2, y, size, text, options)
  }

  function addLine(x1, y1, x2, y2) {
    lines.push(`${x1} ${y1} m`)
    lines.push(`${x2} ${y2} l`)
    lines.push("S")
  }

  function addRect(x, y, width, height) {
    lines.push(`${x} ${y} ${width} ${height} re`)
    lines.push("S")
  }

  function addWrappedText(x, y, size, text, maxLength, lineHeight = 12) {
    let nextY = y

    splitPdfText(text, maxLength).forEach((line) => {
      addText(x, nextY, size, line)
      nextY -= lineHeight
    })

    return nextY
  }

  if (variant === "receipt") {
    drawTenantReceiptPdf({
      addLine,
      addRect,
      addText,
      addTextCentered,
      addTextRight,
	      addWrappedText,
	      addPage,
      adjustmentNotice,
      balance,
      contract,
      date,
      items,
      notes,
      paidAmount,
      receiptNumber,
      total,
      historical,
    })
  } else {
  addText(50, 800, 18, documentTitle)
  addLine(50, 790, 545, 790)
  addText(50, 765, 10, `Propiedad: ${contract.address}`)
  addText(50, 748, 10, `Inquilino: ${contract.tenant}`)
  addText(50, 731, 10, `Fecha: ${date}`)

  addText(50, 700, 10, "Vence")
  addText(115, 700, 10, "Descripcion")
  addText(365, 700, 10, "Monto")
  addText(425, 700, 10, "Punitorios")
  addText(505, 700, 10, "Total")
  addLine(50, 692, 545, 692)

  let y = 675
  items
    .filter((item) => item.apply)
    .forEach((item) => {
      addText(50, y, 9, item.dueDate)
      addText(115, y, 9, truncatePdfText(item.description, 42))
      addText(365, y, 9, formatCurrency(item.edit))
      addText(425, y, 9, formatCurrency(item.penaltyAmount))
      addText(505, y, 9, formatCurrency(item.totalAmount))
      y -= 17
    })

  addLine(50, y - 4, 545, y - 4)
  y -= 26
  addText(350, y, 10, "Total")
  addText(445, y, 10, formatCurrency(total))
  y -= 18
  addText(350, y, 10, "Total abonado")
  addText(445, y, 10, formatCurrency(paidAmount))
  y -= 18
  addText(350, y, 10, balanceLabel)
  addText(445, y, 10, formatCurrency(balance))

  if (notes.length > 0) {
    y -= 40
    addText(50, y, 10, "Nota al pie del recibo")
    y -= 18
    notes.forEach((note) => {
      splitPdfText(note, 88).forEach((line) => {
        addText(50, y, 9, line)
        y -= 14
      })
    })
  }
  }

  if (appendixLines.length) {
    const wrapped = appendixLines.flatMap(line => String(line).split(/\r?\n/)
      .flatMap(part => part.match(/.{1,100}/gu) ?? [""]))
    for (let index = 0; index < wrapped.length; index += 48) {
      addPage()
      addText(30, 810, 12, "Detalle del registro historico", { bold: true })
      wrapped.slice(index, index + 48).forEach((line, row) => addText(30, 785 - row * 15, 8, line))
    }
  }

  const objects = createPdfObjectsFromPages(pages, true)

  let pdf = "%PDF-1.4\n"
  const offsets = [0]

  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += "0000000000 65535 f \n"
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: "application/pdf" })
}

function createPdfObjectsFromPages(pages, includeBoldFont = false) {
  const pageCount = pages.length
  const fontRegularId = 3 + pageCount * 2
  const fontBoldId = includeBoldFont ? fontRegularId + 1 : fontRegularId
  const pageIds = pages.map((_, index) => 3 + index * 2)
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`,
  ]

  pages.forEach((pageLines, index) => {
    const pageId = 3 + index * 2
    const contentId = pageId + 1
    const stream = pageLines.join("\n")
    const fontResources = includeBoldFont
      ? `/F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R`
      : `/F1 ${fontRegularId} 0 R`

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << ${fontResources} >> >> /Contents ${contentId} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    )
  })

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

  if (includeBoldFont) {
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
  }

  return objects
}

function drawTenantReceiptPdf({
  addLine,
  addRect,
  addText,
  addTextCentered,
  addTextRight,
  addWrappedText,
  addPage,
  adjustmentNotice,
  balance,
  contract,
  date,
  items,
  notes,
  paidAmount,
  receiptNumber,
  total,
  historical,
}) {
  const formatAmount = historical ? value => value ?? "No informado" : formatCurrency
  const appliedItems = items.filter((item) => item.apply)
  const ownerName = contract.owner || ""
  const tenantName = contract.tenant || ""
  const address = contract.address || ""
  const receiptText = historical?.description ?? createReceiptConceptText({
    address,
    amount: total,
    ownerName,
    tenantName,
  })
  const canFitCopy = appliedItems.length <= 7

  drawOriginalReceipt(820, historical ? "HISTORICO" : "ORIGINAL")

  if (canFitCopy) {
    addLine(25, 418, 570, 418)
    addText(28, 402, 7, historical ? `COPIA HISTORICA - Recibo ${receiptNumber}${historical.cancelled ? " - ANULADO" : ""}` : "Es copia:")
    drawReceiptCopy(368)
  } else {
    addPage()
    drawOriginalReceipt(820, "COPIA")
  }

  function drawOriginalReceipt(topY, copyLabel) {
    const left = 18
    const width = 560
    const headerBottom = topY - 70

    addRect(left, headerBottom, width, 70)
    addLine(300, headerBottom, 300, topY)
    addRect(285, topY - 22, 30, 22)
    addTextCentered(300, topY - 17, 16, "X", { bold: true })
    addTextCentered(145, topY - 16, 21, "ROARK", { bold: true })
    addTextCentered(145, topY - 31, 10, "PROPIEDADES", { bold: true })
    addTextCentered(145, topY - 42, 7, "Inmobiliaria Roark")
    addTextCentered(145, topY - 51, 6.5, "Av. Sarmiento 3165 - Olavarria - buenos aires")
    addTextCentered(145, topY - 60, 6.5, "Patricia Maria Roark - Martillera publica")
    addTextCentered(145, topY - 68, 6.5, "nacional Mat. 1210 F 101 libro V")
    addText(318, topY - 16, 5.5, "DOCUMENTO NO VALIDO COMO FACTURA")
    addTextRight(565, topY - 17, 11, copyLabel, { bold: true })
    addText(438, topY - 39, 7, "Fecha:")
    addRect(488, topY - 45, 80, 13)
    addTextRight(562, topY - 41, 7, date)
    addText(438, topY - 55, 7, "Recibo:")
    addRect(488, topY - 61, 80, 13)
    addTextRight(562, topY - 57, 7, String(receiptNumber ?? ""))

    addRect(left, topY - 88, width, 15)
    addTextCentered(298, topY - 83, 10, historical ? `RECIBO HISTORICO${historical.cancelled ? " - ANULADO" : ""}` : "RECIBO POR CUENTA Y ORDEN DE TERCEROS", { bold: true })

    addRect(left, topY - 125, width, 30)
    addText(35, topY - 108, 6.5, "LOCADOR:", { bold: true })
    addText(80, topY - 108, 6.5, `${ownerName} - CUIT:`)
    addText(315, topY - 108, 6.5, "LOCATARIO:", { bold: true })
    addText(365, topY - 108, 6.5, tenantName)

    addRect(left, topY - 178, width, 45)
    addWrappedText(22, topY - 146, 6.8, receiptText.toUpperCase(), 124, 9)

    const tableTop = topY - 194
    drawReceiptTable(tableTop)

    let y = drawReceiptRows(tableTop - 18)

    addLine(22, y + 4, 555, y + 4)
    y -= 12
    addTextRight(430, y, 8, "Monto a Abonar:")
    addTextRight(555, y, 8, formatAmount(total))
    y -= 22
    addTextRight(445, y, 8.5, "TOTAL ABONADO:", { bold: true })
    addRect(462, y - 5, 112, 15)
    addTextRight(568, y, 8.5, formatAmount(paidAmount), { bold: true })
    y -= 19
    addTextRight(445, y, 8.5, "Saldo:", { bold: true })
    addRect(462, y - 5, 112, 15)
    addTextRight(568, y, 8.5, formatAmount(balance), { bold: true })

    if (adjustmentNotice) {
      y -= 18
      addText(240, y, 6.5, adjustmentNotice, { bold: true })
    }

    addText(25, historical ? 475 : 438, 6.5, "Notas")
    addLine(25, historical ? 472 : 435, 50, historical ? 472 : 435)

    let noteY = historical ? 462 : 425

    notes.forEach((note) => {
      splitPdfText(note, 115).forEach((line) => {
        addText(25, noteY, 6.5, line)
        noteY -= 9
      })
    })
  }

  function drawReceiptCopy(topY) {
    drawReceiptTable(topY)
    let y = drawReceiptRows(topY - 18)

    addLine(22, y + 4, 555, y + 4)
    y -= 12
    addTextRight(430, y, 8, "Monto a Abonar:")
    addTextRight(555, y, 8, formatAmount(total))
    y -= 22
    addTextRight(445, y, 8.5, "TOTAL ABONADO:", { bold: true })
    addRect(462, y - 5, 112, 15)
    addTextRight(568, y, 8.5, formatAmount(paidAmount), { bold: true })
    y -= 19
    addTextRight(445, y, 8.5, "Saldo:", { bold: true })
    addRect(462, y - 5, 112, 15)
    addTextRight(568, y, 8.5, formatAmount(balance), { bold: true })

    if (adjustmentNotice) {
      y -= 18
      addText(240, y, 6.5, adjustmentNotice, { bold: true })
    }

    addText(25, 90, 6.5, "Notas")
    addLine(25, 87, 50, 87)
    if (historical) addText(25, 75, 6.5, "Reproduccion de datos importados. No es el PDF original.")
  }

  function drawReceiptTable(tableTop) {
    addText(28, tableTop, 6.5, "Vence")
    addText(92, tableTop, 6.5, "Descripcion")
    addTextRight(410, tableTop, 6.5, "Monto")
    addTextRight(480, tableTop, 6.5, "Punit.")
    addTextRight(555, tableTop, 6.5, "Total")
    addLine(22, tableTop - 5, 575, tableTop - 5)
  }

  function drawReceiptRows(startY) {
    let y = startY

    appliedItems.forEach((item) => {
      addText(22, y, 6.5, item.dueDate)
      addText(92, y, 6.5, truncatePdfText(item.description, 62))
      addTextRight(410, y, 6.5, formatAmount(item.edit))
      addTextRight(480, y, 6.5, formatAmount(item.penaltyAmount))
      addTextRight(555, y, 6.5, formatAmount(item.totalAmount))
      y -= 12
    })

    return y
  }

}

function createReceiptConceptText({ address, amount, ownerName, tenantName }) {
  const amountWords = numberToSpanishWords(amount, "pesos")

  return [
    `Por mandato del locador ${ownerName || ""} recibi del locatario ${tenantName || ""}`,
    `la suma de ${amountWords}`,
    `por el alquiler de una propiedad que ocupa en la calle ${address || ""}.`,
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

function numberToSpanishWords(value, currency) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return `cero ${currency}`
  }

  return `${integerToSpanishWords(Math.trunc(numericValue))} ${currency}`
}

function integerToSpanishWords(value) {
  if (value === 0) {
    return "cero"
  }

  if (value < 0) {
    return `menos ${integerToSpanishWords(Math.abs(value))}`
  }

  if (value < 1000) {
    return hundredsToSpanishWords(value)
  }

  if (value < 1_000_000) {
    const thousands = Math.trunc(value / 1000)
    const remainder = value % 1000
    const thousandsText =
      thousands === 1 ? "mil" : `${hundredsToSpanishWords(thousands)} mil`

    return [thousandsText, remainder ? hundredsToSpanishWords(remainder) : ""]
      .filter(Boolean)
      .join(" ")
  }

  const millions = Math.trunc(value / 1_000_000)
  const remainder = value % 1_000_000
  const millionsText =
    millions === 1
      ? "un millon"
      : `${integerToSpanishWords(millions)} millones`

  return [millionsText, remainder ? integerToSpanishWords(remainder) : ""]
    .filter(Boolean)
    .join(" ")
}

function hundredsToSpanishWords(value) {
  const units = [
    "",
    "uno",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
    "diez",
    "once",
    "doce",
    "trece",
    "catorce",
    "quince",
    "dieciseis",
    "diecisiete",
    "dieciocho",
    "diecinueve",
    "veinte",
    "veintiuno",
    "veintidos",
    "veintitres",
    "veinticuatro",
    "veinticinco",
    "veintiseis",
    "veintisiete",
    "veintiocho",
    "veintinueve",
  ]
  const tens = {
    30: "treinta",
    40: "cuarenta",
    50: "cincuenta",
    60: "sesenta",
    70: "setenta",
    80: "ochenta",
    90: "noventa",
  }
  const hundreds = {
    100: "cien",
    200: "doscientos",
    300: "trescientos",
    400: "cuatrocientos",
    500: "quinientos",
    600: "seiscientos",
    700: "setecientos",
    800: "ochocientos",
    900: "novecientos",
  }

  if (value < 30) {
    return units[value]
  }

  if (value < 100) {
    const ten = Math.trunc(value / 10) * 10
    const unit = value % 10

    return unit ? `${tens[ten]} y ${units[unit]}` : tens[ten]
  }

  if (hundreds[value]) {
    return hundreds[value]
  }

  const hundred = Math.trunc(value / 100) * 100
  const remainder = value % 100
  const hundredText = hundred === 100 ? "ciento" : hundreds[hundred]

  return `${hundredText} ${hundredsToSpanishWords(remainder)}`
}

function getApproximateTextWidth(value, size, bold = false) {
  const factor = bold ? 0.58 : 0.52

  return stripPdfText(value).length * size * factor
}

function escapePdfText(value) {
  return stripPdfText(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
}

function stripPdfText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
}

function truncatePdfText(value, maxLength) {
  const text = stripPdfText(value)

  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text
}

function splitPdfText(value, maxLength) {
  const words = stripPdfText(value).split(/\s+/).filter(Boolean)
  const lines = []
  let currentLine = ""

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word

    if (nextLine.length > maxLength) {
      lines.push(currentLine)
      currentLine = word
      return
    }

    currentLine = nextLine
  })

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}


function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    currency: "ARS",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(Number(value || 0))
}
