import { ArrowLeft, Download, Printer, X } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function IndependentReceiptModal({ onClose }) {
  const { t } = useTranslation()
  const currentDate = new Intl.DateTimeFormat("es-AR").format(new Date())
  const [hasDuplicate, setHasDuplicate] = useState(false)
  const [copies, setCopies] = useState("1")
  const [currency, setCurrency] = useState("")
  const [date, setDate] = useState(currentDate)
  const [payerName, setPayerName] = useState("")
  const [receivedAmount, setReceivedAmount] = useState("")
  const [concept, setConcept] = useState("")
  const [pdfUrl, setPdfUrl] = useState(null)
  const [receiptNumber, setReceiptNumber] = useState(getNextReceiptNumber())
  const effectiveCurrency = currency || "pesos"
  const amountInWords = numberToSpanishWords(receivedAmount, effectiveCurrency)

  function handleCopiesChange(event) {
    const numericCopies = Number(event.target.value)

    if (!event.target.value) {
      setCopies("")
      return
    }

    if (Number.isFinite(numericCopies)) {
      setCopies(String(Math.min(Math.max(numericCopies, 1), 3)))
    }
  }

  function handlePrint() {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
    }

    const pdfBlob = createIndependentReceiptPdf({
      amount: receivedAmount,
      amountInWords,
      concept,
      copies,
      date,
      hasDuplicate,
      payerName,
      receiptNumber,
    })

    setPdfUrl(URL.createObjectURL(pdfBlob))
    setReceiptNumber(advanceReceiptNumber(receiptNumber))
  }

  function closePdf() {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
    }

    setPdfUrl(null)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="flex max-h-[88vh] w-full max-w-6xl flex-col">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-medium">
            {t("independentReceipt.title")}
          </CardTitle>
          <CardAction>
            <Button
              aria-label={t("actions.close")}
              onClick={onClose}
              size="icon-sm"
              variant="ghost"
            >
              <X />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 space-y-8 overflow-y-auto pt-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(420px,0.9fr)_minmax(360px,0.8fr)_260px] lg:items-end">
            <fieldset className="rounded-md border p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <CheckField
                  checked={hasDuplicate}
                  label={t("independentReceipt.fields.duplicate")}
                  onChange={(event) => setHasDuplicate(event.target.checked)}
                />
                <div className="space-y-1">
                  <Label>{t("independentReceipt.fields.copies")}</Label>
                  <Input
                    inputMode="numeric"
                    max="3"
                    min="1"
                    onChange={handleCopiesChange}
                    type="number"
                    value={copies}
                  />
                </div>
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center justify-center gap-12 pb-3">
              <CheckField
                checked={currency === "pesos"}
                label={t("independentReceipt.fields.arePesos")}
                onChange={() =>
                  setCurrency((currentCurrency) =>
                    currentCurrency === "pesos" ? "" : "pesos",
                  )
                }
              />
              <CheckField
                checked={currency === "dolares"}
                label={t("independentReceipt.fields.areDollars")}
                onChange={() =>
                  setCurrency((currentCurrency) =>
                    currentCurrency === "dolares" ? "" : "dolares",
                  )
                }
              />
            </div>

            <div className="space-y-4 text-right">
              <Button className="w-full" onClick={handlePrint} type="button">
                <Printer />
                {t("independentReceipt.actions.print")}
              </Button>
              <div className="text-lg font-semibold">
                RECIBO N° {receiptNumber}
              </div>
              <Field
                className="ml-auto w-full max-w-xs text-left"
                label={t("independentReceipt.fields.date")}
                onChange={(event) => setDate(event.target.value)}
                value={date}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[120px_180px_36px_1fr] md:items-center">
            <div className="text-2xl italic text-muted-foreground">
              {t("independentReceipt.fields.received")}
            </div>
            <Input
              inputMode="numeric"
              onChange={(event) => setReceivedAmount(event.target.value)}
              value={receivedAmount}
            />
            <div className="text-2xl italic text-muted-foreground">
              {t("independentReceipt.fields.from")}
            </div>
            <Input
              onChange={(event) => setPayerName(event.target.value)}
              value={payerName}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[230px_1fr] md:items-center">
            <div className="text-2xl italic text-muted-foreground">
              {t("independentReceipt.fields.amount")}
            </div>
            <Input readOnly value={amountInWords} />
          </div>

          <div className="grid gap-4 md:grid-cols-[230px_1fr] md:items-end">
            <div className="pb-2 text-2xl italic text-muted-foreground">
              {t("independentReceipt.fields.concept")}
            </div>
            <Input
              onChange={(event) => setConcept(event.target.value)}
              value={concept}
            />
          </div>

          <div className="grid gap-8 pt-16 md:grid-cols-[360px_1fr] md:items-end">
            <div className="grid gap-4 md:grid-cols-[100px_1fr] md:items-center">
              <div className="text-3xl font-semibold italic">
                {t("independentReceipt.fields.inWords")}
              </div>
              <Input readOnly value={receivedAmount} />
            </div>
            <div className="mx-auto w-full max-w-lg border-t pt-3 text-center text-xl italic text-muted-foreground">
              {t("independentReceipt.fields.signature")}
            </div>
          </div>
        </CardContent>
      </Card>

      {pdfUrl ? (
        <IndependentReceiptPdfModal onClose={closePdf} pdfUrl={pdfUrl} />
      ) : null}
    </div>
  )
}

function Field({ className = "", defaultValue, label, onChange, value }) {
  return (
    <div className={["space-y-1", className].join(" ")}>
      <Label>{label}</Label>
      <Input defaultValue={value === undefined ? defaultValue : undefined} onChange={onChange} value={value} />
    </div>
  )
}

function IndependentReceiptPdfModal({ onClose, pdfUrl }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/80 p-6 backdrop-blur-sm">
      <Card className="h-[90vh] w-full max-w-5xl overflow-hidden shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle>PDF recibo independiente</CardTitle>
          <div className="flex gap-2">
            <Button onClick={onClose} size="sm" variant="outline">
              <ArrowLeft />
              Volver
            </Button>
            <Button asChild size="sm" variant="outline">
              <a download="recibo-independiente.pdf" href={pdfUrl}>
                <Download />
                Descargar
              </a>
            </Button>
            <Button onClick={onClose} size="icon-sm" variant="ghost">
              <X />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="h-[calc(90vh-73px)] p-0">
          <iframe
            className="h-full w-full bg-white"
            src={pdfUrl}
            title="PDF recibo independiente"
          />
        </CardContent>
      </Card>
    </div>
  )
}

function CheckField({ checked, defaultChecked = false, label, onChange }) {
  const controlProps =
    checked === undefined ? { defaultChecked } : { checked, onChange }

  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <input className="size-4 accent-primary" type="checkbox" {...controlProps} />
      {label}
    </label>
  )
}

function numberToSpanishWords(value, currency) {
  const numericValue = Number(
    String(value)
      .replaceAll(".", "")
      .replace(",", ".")
      .replace(/[^\d.]/g, ""),
  )

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return ""
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

function createIndependentReceiptPdf({
  amount,
  amountInWords,
  concept,
  copies,
  date,
  hasDuplicate,
  payerName,
  receiptNumber,
}) {
  const lines = []

  function addText(x, y, size, text, options = {}) {
    lines.push("BT")
    lines.push(`/F1 ${size} Tf`)
    if (options.italic) {
      lines.push(`/F2 ${size} Tf`)
    }
    if (options.bold) {
      lines.push(`/F3 ${size} Tf`)
    }
    lines.push(`${x} ${y} Td`)
    lines.push(`(${escapePdfText(text)}) Tj`)
    lines.push("ET")
  }

  function addLine(x1, y1, x2, y2) {
    lines.push(`${x1} ${y1} m`)
    lines.push(`${x2} ${y2} l`)
    lines.push("S")
  }

  function addBox(x, y, width, height) {
    lines.push(`${x} ${y} ${width} ${height} re`)
    lines.push("S")
  }

  const copyCount = hasDuplicate
    ? Math.min(Math.max(Number(copies) || 1, 1), 3)
    : 0
  const totalReceipts = copyCount + 1
  const receiptHeight = Math.min(345, Math.floor(760 / totalReceipts))
  const topY = 795

  for (let receiptIndex = 0; receiptIndex < totalReceipts; receiptIndex += 1) {
    drawReceipt(topY - receiptIndex * receiptHeight, receiptHeight)
  }

  function drawReceipt(yTop, height) {
    const compact = height < 300
    const titleY = yTop
    const lineY = yTop - 18
    const receiptY = yTop - 38
    const dateY = yTop - 63
    const firstRowY = yTop - (compact ? 104 : 115)
    const amountRowY = yTop - (compact ? 150 : 165)
    const amountSecondRowY = yTop - (compact ? 184 : 205)
    const conceptRowY = yTop - (compact ? 225 : 260)
    const footerY = yTop - (compact ? 275 : 315)

    addText(40, titleY, 16, "Recibo independiente", { bold: true })
    addLine(40, lineY, 555, lineY)

    addText(370, receiptY, 17, `RECIBO N ${receiptNumber}`, { bold: true })
    addText(390, dateY, 11, `Fecha  ${date}`)

    addText(45, firstRowY, 24, "Recibi", { italic: true })
    addBox(115, firstRowY - 9, 90, 24)
    addText(126, firstRowY - 1, 11, amount)
    addText(215, firstRowY, 24, "de", { italic: true })
    addBox(255, firstRowY - 9, 300, 24)
    addText(265, firstRowY - 1, 11, truncatePdfText(payerName, 58))

    addText(45, amountRowY, 23, "La cantidad de", { italic: true })
    addBox(205, amountRowY - 9, 350, 24)
    addText(215, amountRowY - 1, 10, truncatePdfText(amountInWords, 65))

    addBox(45, amountSecondRowY - 9, 510, 24)
    addText(55, amountSecondRowY - 1, 10, truncatePdfText(amountInWords, 92))

    addText(45, conceptRowY, 23, "En concepto de", { italic: true })
    addBox(205, conceptRowY - 9, 350, 24)
    addText(215, conceptRowY - 1, 10, truncatePdfText(concept, 65))

    addText(45, footerY, 28, "Son", { bold: true, italic: true })
    addBox(110, footerY - 10, 130, 26)
    addText(122, footerY - 1, 12, amount)

    addLine(335, footerY - 5, 535, footerY - 5)
    addText(390, footerY - 25, 15, "Firma y aclaracion", { italic: true })
  }

  const stream = lines.join("\n")
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]

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

function getNextReceiptNumber() {
  if (typeof window === "undefined") {
    return formatReceiptNumber(1)
  }

  const storedNumber = Number(
    window.localStorage.getItem("independent-receipt:next-number") ?? "1",
  )

  return formatReceiptNumber(
    Number.isFinite(storedNumber) && storedNumber > 0 ? storedNumber : 1,
  )
}

function advanceReceiptNumber(currentReceiptNumber) {
  const currentNumber = Number(String(currentReceiptNumber).split("-").at(-1))
  const nextNumber =
    Number.isFinite(currentNumber) && currentNumber > 0 ? currentNumber + 1 : 1

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      "independent-receipt:next-number",
      String(nextNumber),
    )
  }

  return formatReceiptNumber(nextNumber)
}

function formatReceiptNumber(number) {
  return `0-${String(number).padStart(5, "0")}`
}

export { IndependentReceiptModal }
