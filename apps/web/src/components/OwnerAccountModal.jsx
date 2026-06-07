import { ArrowLeft, Download, Printer, Save, Trash2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createReceipt,
  getNextReceiptNumber,
  getReceipts,
} from "@/services/receiptsService"

function OwnerAccountModal({ contract, onClose }) {
  const { t } = useTranslation()
  const ownerName = contract.owner
  const [activeTab, setActiveTab] = useState("mainData")
  const [items, setItems] = useState(() => loadOwnerAccountDraft(contract.id))
  const [notes, setNotes] = useState("")
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfTitle, setPdfTitle] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const today = new Intl.DateTimeFormat("es-AR").format(new Date())
  const fees = items.reduce((sum, item) => sum + Number(item.administration || 0), 0)
  const total = items.reduce((sum, item) => sum + item.total, 0)

  useEffect(() => {
    let ignore = false

    async function loadMonthlyReceipt() {
      const receipts = await getReceipts({
        contractId: contract.id,
        kind: "OWNER_SETTLEMENT",
        personName: ownerName,
      })

      if (!ignore && hasReceiptForCurrentMonth(receipts, today)) {
        setItems((currentItems) => (currentItems.length > 0 ? currentItems : []))
      }
    }

    loadMonthlyReceipt()

    return () => {
      ignore = true
    }
  }, [contract.id, ownerName, today])

  function addExtraConcept(concept) {
    setItems((currentItems) => {
      const nextItems = [concept, ...currentItems]

      saveOwnerAccountDraft(contract.id, nextItems)

      return nextItems
    })
    setActiveTab("mainData")
  }

  function removeItem(itemId) {
    setItems((currentItems) => {
      const nextItems = currentItems.filter((item) => item.id !== itemId)

      saveOwnerAccountDraft(contract.id, nextItems)

      return nextItems
    })
  }

  function closePdf() {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
    }

    setPdfUrl(null)
  }

  async function confirmAndPrint() {
    setIsSaving(true)

    try {
      const { number } = await getNextReceiptNumber()
      const documentTitle = `RECIBO N° ${number}`
      const pdfBlob = createOwnerAccountPdf({
        contract,
        date: today,
        documentTitle,
        fees,
        items,
        notes,
        ownerName,
        total,
      })
      const pdfBase64 = await blobToBase64(pdfBlob)

      await createReceipt({
        balance: 0,
        contractId: contract.id,
        date: today,
        items: items.map((item) => ({
          administration: item.administration,
          amount: item.amount,
          description: item.description,
          dueDate: item.date,
          penalties: item.penalties,
          total: item.total,
        })),
        kind: "OWNER_SETTLEMENT",
        number,
        paid: total,
        pdfBase64,
        personName: ownerName,
        total,
      })

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }

      setPdfTitle(`PDF recibo N° ${number}`)
      setPdfUrl(URL.createObjectURL(pdfBlob))
      setItems([])
      clearOwnerAccountDraft(contract.id)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 p-4 backdrop-blur-sm">
      <Card className="mx-auto flex h-full max-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-medium text-muted-foreground">
            {t("ownerAccount.windowTitle", { owner: ownerName })}
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

        <CardContent className="flex min-h-0 flex-1 flex-col gap-5 pt-5">
          <div className="min-w-0 border-b pb-2 pr-20">
            <h2 className="truncate text-2xl font-semibold text-primary">
              {ownerName}
            </h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col border">
            <div className="flex border-b bg-muted/20">
              <button
                className={
                  activeTab === "mainData"
                    ? "border-r bg-background px-3 py-2 text-sm font-medium"
                    : "border-r px-3 py-2 text-sm text-muted-foreground"
                }
                onClick={() => setActiveTab("mainData")}
                type="button"
              >
                {t("ownerAccount.tabs.mainData")}
              </button>
              <button
                className={
                  activeTab === "extraConcept"
                    ? "border-r bg-background px-3 py-2 text-sm font-medium"
                    : "border-r px-3 py-2 text-sm text-muted-foreground"
                }
                onClick={() => setActiveTab("extraConcept")}
                type="button"
              >
                {t("ownerAccount.tabs.extraConcept")}
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
              {activeTab === "mainData" ? (
                <MainDataTab
                  fees={fees}
                  items={items}
                  notes={notes}
                  onRemoveItem={removeItem}
                  onNotesChange={setNotes}
                  total={total}
                />
              ) : null}
              {activeTab === "extraConcept" ? (
                <ExtraordinaryConceptTab onAdd={addExtraConcept} today={today} />
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button disabled={isSaving} onClick={confirmAndPrint}>
              <Printer />
              {t("ownerAccount.actions.confirmAndPrint")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {pdfUrl ? (
        <OwnerAccountPdfModal
          onClose={closePdf}
          pdfUrl={pdfUrl}
          title={pdfTitle}
        />
      ) : null}
    </div>
  )
}

function MainDataTab({
  fees,
  items,
  notes,
  onNotesChange,
  onRemoveItem,
  total,
}) {
  const { t } = useTranslation()
  const notesInputRef = useRef(null)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="min-h-[330px] flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>{t("ownerAccount.columns.date")}</TableHead>
              <TableHead>{t("ownerAccount.columns.description")}</TableHead>
              <TableHead className="text-right">
                {t("ownerAccount.columns.amount")}
              </TableHead>
              <TableHead className="text-right">
                {t("ownerAccount.columns.penalties")}
              </TableHead>
              <TableHead className="text-right">
                {t("ownerAccount.columns.administration")}
              </TableHead>
              <TableHead className="text-right">
                {t("ownerAccount.columns.total")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={7}>
                  {t("table.empty")}
                </TableCell>
              </TableRow>
            ) : null}
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Button
                    aria-label={t("actions.delete")}
                    onClick={() => onRemoveItem(item.id)}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
                <TableCell>{item.date}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.amount)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.penalties)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.administration)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 border-t border-dashed pt-3">
        <div className="ml-auto grid max-w-xl gap-3 text-sm font-semibold md:grid-cols-[auto_160px_auto_170px] md:items-center">
          <span className="text-right">{t("ownerAccount.totals.fees")}:</span>
          <Input readOnly value={formatCurrency(fees)} />
          <span className="text-right">{t("ownerAccount.totals.total")}:</span>
          <Input readOnly value={formatCurrency(total)} />
        </div>

        <div
          className="relative z-10 grid max-w-3xl gap-2 md:grid-cols-[70px_minmax(0,1fr)]"
          onMouseDown={() => notesInputRef.current?.focus()}
        >
          <Label
            className="pt-1 text-xs font-semibold underline"
            htmlFor="owner-account-notes"
          >
            {t("ownerAccount.fields.notes")}:
          </Label>
          <textarea
            className="relative z-10 block min-h-14 w-full cursor-text resize-none border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            id="owner-account-notes"
            name="owner-account-notes"
            onChange={(event) => onNotesChange(event.target.value)}
            onInput={(event) => onNotesChange(event.currentTarget.value)}
            ref={notesInputRef}
            value={notes}
          />
        </div>
      </div>
    </div>
  )
}

function ExtraordinaryConceptTab({ onAdd, today }) {
  const { t } = useTranslation()
  const [date, setDate] = useState(today)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [effect, setEffect] = useState("add")

  function confirmAndAdd() {
    const numericAmount = Number(amount || 0)
    const cleanDescription = description.trim()

    if (!cleanDescription || numericAmount <= 0) {
      return
    }

    const signedAmount = effect === "discount" ? -numericAmount : numericAmount

    onAdd(
      createOwnerAccountItem({
        amount: signedAmount,
        date,
        description: cleanDescription,
        id: crypto.randomUUID(),
      }),
    )

    setDescription("")
    setAmount("")
    setEffect("add")
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="grid items-center gap-3 md:grid-cols-[120px_180px]">
        <Label className="text-right">{t("ownerAccount.extra.date")}</Label>
        <Input onChange={(event) => setDate(event.target.value)} value={date} />
      </div>

      <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
        <Label className="pt-2 text-right">{t("ownerAccount.extra.detail")}</Label>
        <textarea
          className="min-h-24 border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </div>

      <div className="grid items-center gap-3 md:grid-cols-[120px_180px]">
        <Label className="text-right">{t("ownerAccount.extra.amount")}</Label>
        <Input
          inputMode="numeric"
          min="0"
          onChange={(event) => setAmount(event.target.value)}
          type="number"
          value={amount}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[335px_auto] md:items-center">
        <div className="space-y-3 border p-4">
          <RadioField
            checked={effect === "add"}
            label={t("ownerAccount.extra.addToOwner")}
            name="owner-extra-effect"
            onChange={() => setEffect("add")}
          />
          <RadioField
            checked={effect === "discount"}
            label={t("ownerAccount.extra.discountOwner")}
            name="owner-extra-effect"
            onChange={() => setEffect("discount")}
          />
        </div>
        <Button className="w-fit" onClick={confirmAndAdd}>
          <Save />
          {t("ownerAccount.extra.confirm")}
        </Button>
      </div>
    </div>
  )
}

function RadioField({ checked, label, name, onChange }) {
  return (
    <label className="flex items-center justify-end gap-3 text-sm font-medium">
      <span>{label}</span>
      <input
        checked={checked}
        className="size-4 accent-primary"
        name={name}
        onChange={onChange}
        type="radio"
      />
    </label>
  )
}

function OwnerAccountPdfModal({ onClose, pdfUrl, title }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/80 p-6 backdrop-blur-sm">
      <Card className="h-[90vh] w-full max-w-5xl overflow-hidden shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle>{title}</CardTitle>
          <div className="flex gap-2">
            <Button onClick={onClose} size="sm" variant="outline">
              <ArrowLeft />
              Volver
            </Button>
            <Button asChild size="sm" variant="outline">
              <a download="recibo-locador.pdf" href={pdfUrl}>
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
            title={title}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function createOwnerAccountPdf({
  contract,
  date,
  documentTitle,
  fees,
  items,
  notes,
  ownerName,
  total,
}) {
  const lines = []

  function addText(x, y, size, text) {
    lines.push("BT")
    lines.push(`/F1 ${size} Tf`)
    lines.push(`${x} ${y} Td`)
    lines.push(`(${escapePdfText(text)}) Tj`)
    lines.push("ET")
  }

  function addLine(x1, y1, x2, y2) {
    lines.push(`${x1} ${y1} m`)
    lines.push(`${x2} ${y2} l`)
    lines.push("S")
  }

  addText(50, 800, 18, documentTitle)
  addLine(50, 790, 545, 790)
  addText(50, 765, 10, `Estado de cuenta de: ${ownerName}`)
  addText(50, 748, 10, `Propiedad: ${contract.address}`)
  addText(50, 731, 10, `Fecha: ${date}`)

  addText(50, 700, 10, "Fecha")
  addText(120, 700, 10, "Descripcion")
  addText(350, 700, 10, "Monto")
  addText(430, 700, 10, "Admin.")
  addText(490, 700, 10, "Total")
  addLine(50, 692, 545, 692)

  let y = 675

  items.forEach((item) => {
    addText(50, y, 9, item.date)
    addText(120, y, 9, truncatePdfText(item.description, 36))
    addText(350, y, 9, formatCurrency(item.amount))
    addText(430, y, 9, formatCurrency(item.administration))
    addText(490, y, 9, formatCurrency(item.total))
    y -= 17
  })

  addLine(50, y - 4, 545, y - 4)
  y -= 26
  addText(365, y, 10, "Honorarios")
  addText(490, y, 10, formatCurrency(fees))
  y -= 18
  addText(365, y, 10, "TOTAL")
  addText(490, y, 10, formatCurrency(total))

  if (notes.trim()) {
    y = 115
    addLine(50, y + 18, 545, y + 18)
    addText(50, y, 10, "Notas")
    y -= 18
    splitPdfText(notes, 88).forEach((line) => {
      addText(50, y, 9, line)
      y -= 14
    })
  }

  const stream = lines.join("\n")
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
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

function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    currency: "ARS",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(Number(value || 0))
}

function escapePdfText(value) {
  return stripPdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

function stripPdfText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
}

function truncatePdfText(value, maxLength) {
  const text = stripPdfText(value)

  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text
}

function splitPdfText(value, maxLength) {
  const text = stripPdfText(value)
  const lines = []

  for (let index = 0; index < text.length; index += maxLength) {
    lines.push(text.slice(index, index + maxLength))
  }

  return lines
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      resolve(String(reader.result).split(",")[1] ?? "")
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function loadOwnerAccountDraft(contractId) {
  if (!contractId || typeof window === "undefined") {
    return []
  }

  try {
    const items = JSON.parse(
      window.localStorage.getItem(`owner-account-draft:${contractId}`) ?? "[]",
    )

    return items.map((item) =>
      createOwnerAccountItem({
        amount: Number(item.amount || 0),
        date: item.date,
        description: item.description,
        id: item.id,
        penalties: Number(item.penalties || 0),
        sourceReceiptId: item.sourceReceiptId,
      }),
    )
  } catch {
    return []
  }
}

function saveOwnerAccountDraft(contractId, items) {
  if (!contractId || typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(
    `owner-account-draft:${contractId}`,
    JSON.stringify(items),
  )
}

function clearOwnerAccountDraft(contractId) {
  if (!contractId || typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(`owner-account-draft:${contractId}`)
}

function createOwnerAccountItem({
  amount,
  date,
  description,
  id,
  penalties = 0,
  sourceReceiptId,
}) {
  const administration = isRentInstallment(description) ? amount * 0.05 : 0

  return {
    administration,
    amount,
    date,
    description,
    id,
    penalties,
    sourceReceiptId,
    total: amount + penalties - administration,
  }
}

function isRentInstallment(description) {
  return /alquiler\s+cuota/i.test(description)
}

function hasReceiptForCurrentMonth(receipts, currentDate) {
  const currentMonth = getMonthKey(currentDate)

  return receipts.some((receipt) => getMonthKey(receipt.receiptDate) === currentMonth)
}

function getMonthKey(dateText) {
  const [, month, year] = String(dateText).split("/").map(Number)

  return `${year}-${month}`
}

export { OwnerAccountModal }
