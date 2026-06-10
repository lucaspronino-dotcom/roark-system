import { ArrowLeft, Download, Printer, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ExtraConcepts } from "@/components/ExtraConcepts"
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

const settlementItems = [
  {
    dueDate: "1/6/2026",
    description: "Alquiler Cuota:4 junio-2026",
    edit: 260000,
    penalty: "$ 0,00",
    apply: true,
  },
]

function RentSettlement({ contract, onBack }) {
  const { t } = useTranslation()
  const todayDate = useMemo(() => new Date(), [])
  const contractStartDate = useMemo(
    () => parseEsDate(contract.startDate),
    [contract.startDate],
  )
  const initialPeriodDate = useMemo(
    () => getCurrentPeriodDate(contractStartDate, todayDate),
    [contractStartDate, todayDate],
  )
  const initialRegularConcepts = useMemo(
    () => loadRegularConcepts(contract.id),
    [contract.id],
  )
  const [activeTab, setActiveTab] = useState("account")
  const [periodDate, setPeriodDate] = useState(() => initialPeriodDate)
  const [items, setItems] = useState(() =>
    createPeriodItems(
      initialPeriodDate,
      [],
      contractStartDate,
      initialRegularConcepts,
      contract,
    ),
  )
  const [regularConcepts, setRegularConcepts] = useState(initialRegularConcepts)
  const [noteText, setNoteText] = useState("")
  const [notes, setNotes] = useState([])
  const [paidAmount, setPaidAmount] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [settlementPdfUrl, setSettlementPdfUrl] = useState(null)
  const [settlementPdfTitle, setSettlementPdfTitle] = useState("")
  const [isSavingReceipt, setIsSavingReceipt] = useState(false)
  const currentDate = new Intl.DateTimeFormat("es-AR").format(todayDate)
  const surchargeSettings = getContractSurchargeSettings(contract.id)
  const isPeriodLocked = hasReceiptForPeriod(receipts, periodDate)
  const visibleItems = isPeriodLocked ? [] : items
  const total = visibleItems.reduce(
    (sum, item) =>
      item.apply ? sum + getItemTotal(item, surchargeSettings, todayDate) : sum,
    0,
  )
  const effectivePaidAmount = paidAmount ?? total
  const balance = total - effectivePaidAmount
  const balanceLabel =
    balance > 0
      ? t("rentSettlement.totals.debitBalance")
      : balance < 0
        ? t("rentSettlement.totals.creditBalance")
        : t("rentSettlement.totals.balance")

  useEffect(() => {
    let ignore = false

    async function loadMonthlyReceipt() {
      const receipts = await getReceipts({
        contractId: contract.id,
        kind: "TENANT_SETTLEMENT",
        personName: contract.tenant,
      })

      if (!ignore) {
        setReceipts(receipts)
        setItems(
          createPeriodItems(
            periodDate,
            receipts,
            contractStartDate,
            regularConcepts,
            contract,
          ),
        )
      }
    }

    loadMonthlyReceipt()

    return () => {
      ignore = true
    }
  }, [
    contract,
    contract.id,
    contract.tenant,
    contractStartDate,
    periodDate,
    regularConcepts,
  ])

  useEffect(() => {
    saveRegularConcepts(contract.id, regularConcepts)
  }, [contract.id, regularConcepts])

  function updateItem(index, nextValues) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...nextValues } : item,
      ),
    )
  }

  function addItemToAccount(item) {
    const nextItem = item.isRegularConcept
      ? createRegularConceptItem(item, periodDate)
      : item

    setItems((currentItems) => [
      ...currentItems.filter(
        (currentItem) => currentItem.description !== nextItem.description,
      ),
      nextItem,
    ])
    setActiveTab("account")
  }

  function removeItem(index) {
    setItems((currentItems) =>
      currentItems.filter((_, itemIndex) => itemIndex !== index),
    )
  }

  function removeItemByDescription(description) {
    setItems((currentItems) =>
      currentItems.filter(
        (item) =>
          item.description !== description &&
          getConceptName(item.description) !== description,
      ),
    )
  }

  function focusSiblingEditInput(event, index) {
    if (event.key !== "Tab") {
      return
    }

    const nextIndex = event.shiftKey ? index - 1 : index + 1

    if (nextIndex < 0 || nextIndex >= visibleItems.length) {
      return
    }

    event.preventDefault()
    document
      .querySelector(`[data-settlement-edit-index="${nextIndex}"]`)
      ?.focus()
  }

  function leaveNote() {
    const nextNote = noteText.trim()

    if (!nextNote) {
      return
    }

    setNotes((currentNotes) => [nextNote, ...currentNotes])
    setNoteText("")
  }

  function closeSettlementPdf() {
    if (settlementPdfUrl) {
      URL.revokeObjectURL(settlementPdfUrl)
    }

    setSettlementPdfUrl(null)
  }

  function printSettlement() {
    if (settlementPdfUrl) {
      URL.revokeObjectURL(settlementPdfUrl)
    }

    const printableItems = getPrintableItems(visibleItems, surchargeSettings, todayDate)
    const pdfBlob = createSettlementPdf({
      balance,
      balanceLabel,
      contract,
      date: currentDate,
      documentTitle: "LIQUIDACION ALQUILER",
      items: printableItems,
      notes,
      paidAmount: effectivePaidAmount,
      total,
    })

    setSettlementPdfTitle("PDF liquidacion alquiler")
    setSettlementPdfUrl(URL.createObjectURL(pdfBlob))
  }

  async function confirmAndPrintReceipt() {
    setIsSavingReceipt(true)

    try {
      const { number } = await getNextReceiptNumber()
      const documentTitle = `RECIBO N° ${number}`
      const printableItems = getPrintableItems(visibleItems, surchargeSettings, todayDate)
      const appliedItems = printableItems.filter((item) => item.apply)
      const pdfBlob = createSettlementPdf({
        balance,
        balanceLabel,
        contract,
        date: currentDate,
        documentTitle,
        items: printableItems,
        notes,
        paidAmount: effectivePaidAmount,
        total,
      })
      const pdfBase64 = await blobToBase64(pdfBlob)

      const receipt = await createReceipt({
        balance,
        contractId: contract.id,
        date: currentDate,
        items: appliedItems.map((item) => ({
          amount: Number(item.edit || 0),
          description: item.description,
          dueDate: item.dueDate,
          penalties: item.penaltyAmount,
          total: item.totalAmount,
        })),
        kind: "TENANT_SETTLEMENT",
        number,
        paid: effectivePaidAmount,
        pdfBase64,
        personName: contract.tenant,
        total,
      })
      saveOwnerAccountDraft(contract.id, appliedItems, receipt.id)
      setReceipts((currentReceipts) => [receipt, ...currentReceipts])

      if (settlementPdfUrl) {
        URL.revokeObjectURL(settlementPdfUrl)
      }

      setSettlementPdfTitle(`PDF recibo N° ${number}`)
      setSettlementPdfUrl(URL.createObjectURL(pdfBlob))
    } finally {
      setIsSavingReceipt(false)
    }
  }

  function payNextPeriod() {
    const nextPeriodDate = addMonths(periodDate, 1)

    setPeriodDate(nextPeriodDate)
    setItems(
      createPeriodItems(
        nextPeriodDate,
        receipts,
        contractStartDate,
        regularConcepts,
        contract,
      ),
    )
    setPaidAmount(null)
    setActiveTab("account")
  }

  return (
    <section className="space-y-4 text-sm text-foreground">
      <Card className="border-l-4 border-l-primary shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg font-semibold text-primary">
            {t("rentSettlement.title")}
          </CardTitle>
          <CardAction>
            <Button onClick={onBack} size="sm" variant="outline">
              <ArrowLeft />
              {t("actions.back")}
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <p className="text-sm text-muted-foreground">
            {t("rentSettlement.property")}: {contract.address} -{" "}
            {t("rentSettlement.tenant")}: {contract.tenant}
          </p>
          <CardTitle className="text-2xl font-semibold text-primary">
            {contract.tenant}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="grid gap-4 md:grid-cols-[160px_220px_1fr_180px] md:items-end">
            <Field
              defaultValue={surchargeSettings.graceDays}
              label={t("rentSettlement.fields.graceDays")}
            />
            <Field
              defaultValue={surchargeSettings.chargeFromDay}
              label={t("rentSettlement.fields.penaltyFromDay")}
            />
            <div />
            <Field
              defaultValue={currentDate}
              label={t("rentSettlement.fields.createdAt")}
            />
          </div>

          <div className="border-b">
            <div className="flex flex-wrap gap-1">
              <Button
                onClick={() => setActiveTab("account")}
                size="sm"
                variant={activeTab === "account" ? "secondary" : "ghost"}
              >
                {t("rentSettlement.tabs.account")}
              </Button>
              <Button
                onClick={() => setActiveTab("extraConcepts")}
                size="sm"
                variant={activeTab === "extraConcepts" ? "secondary" : "ghost"}
              >
                {t("rentSettlement.tabs.extraConcepts")}
              </Button>
              <Button
                onClick={() => setActiveTab("notes")}
                size="sm"
                variant={activeTab === "notes" ? "secondary" : "ghost"}
              >
                {t("rentSettlement.tabs.notes")}
              </Button>
            </div>
          </div>

          {activeTab === "account" ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>{t("rentSettlement.columns.dueDate")}</TableHead>
                      <TableHead>{t("rentSettlement.columns.description")}</TableHead>
                      <TableHead className="w-28 text-center italic">
                        {t("rentSettlement.columns.edit")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("rentSettlement.columns.amount")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("rentSettlement.columns.penalties")}
                      </TableHead>
                      <TableHead className="w-12 text-center" />
                      <TableHead className="text-right">
                        {t("rentSettlement.columns.total")}
                      </TableHead>
                      <TableHead className="w-20 text-center italic">
                        {t("rentSettlement.columns.apply")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isPeriodLocked ? (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <div className="flex min-h-48 flex-col items-center justify-center gap-8 text-center">
                            <p className="text-2xl font-semibold text-destructive">
                              ¡El recibo del mes {getMonthName(periodDate)} ya ha sido generado!
                            </p>
                            <Button onClick={payNextPeriod} size="lg">
                              Pagar el proximo periodo
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {!isPeriodLocked && visibleItems.map((item, index) => (
                      <TableRow key={item.description}>
                        <TableCell>
                          <Button
                            aria-label={t("actions.delete")}
                            onClick={() => removeItem(index)}
                            size="icon-sm"
                            variant="ghost"
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                        <TableCell>{item.dueDate}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="w-28 text-center">
                          <Input
                            aria-label={`${t("rentSettlement.columns.edit")} ${item.description}`}
                            className="w-28 text-right"
                            data-settlement-edit-index={index}
                            onKeyDown={(event) =>
                              focusSiblingEditInput(event, index)
                            }
                            onChange={(event) =>
                              updateItem(index, {
                                edit: parseNumber(event.target.value),
                              })
                            }
                            value={formatMoneyInput(item.edit)}
                            inputMode="numeric"
                            type="text"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.edit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(
                            getItemPenaltyAmount(item, surchargeSettings, todayDate),
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <input
                            checked={item.penaltyApplied ?? false}
                            onChange={(event) =>
                              updateItem(index, {
                                penaltyApplied: event.target.checked,
                              })
                            }
                            type="checkbox"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(
                            item.apply
                              ? getItemTotal(item, surchargeSettings, todayDate)
                              : 0,
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <input
                            checked={item.apply}
                            onChange={(event) =>
                              updateItem(index, { apply: event.target.checked })
                            }
                            type="checkbox"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end border-t pt-4">
                <div className="w-full max-w-sm space-y-3">
                  <TotalBox
                    label={t("rentSettlement.totals.total")}
                    value={formatCurrency(total)}
                  />
                  <TotalBox
                    editable
                    emphasized
                    label={t("rentSettlement.totals.paid")}
                    onChange={(event) =>
                      setPaidAmount(parseNumber(event.target.value))
                    }
                    rawValue={effectivePaidAmount}
                  />
                  <TotalBox
                    danger
                    label={balanceLabel}
                    value={formatCurrency(balance)}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      className="order-1 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      onClick={printSettlement}
                    >
                      <Printer />
                      {t("rentSettlement.actions.printSettlement")}
                    </Button>
                    <Button
                      className="order-2"
                      disabled={isSavingReceipt}
                      onClick={confirmAndPrintReceipt}
                    >
                      <Printer />
                      {t("rentSettlement.actions.confirmAndPrint")}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "extraConcepts" ? (
            <ExtraConcepts
              concepts={regularConcepts}
              onAddToAccount={addItemToAccount}
              onConceptsChange={setRegularConcepts}
              onRemoveFromAccount={removeItemByDescription}
            />
          ) : null}

          {activeTab === "notes" ? (
            <Card>
              <CardContent className="space-y-4 pt-4">
                {notes.length > 0 ? (
                  <div className="space-y-2">
                    {notes.map((note, index) => (
                      <div
                        className="border bg-muted/30 px-3 py-2 text-sm"
                        key={`${note}-${index}`}
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="rent-settlement-note">
                    {t("rentSettlement.notes.label")}
                  </Label>
                  <textarea
                    className="min-h-32 w-full border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                    id="rent-settlement-note"
                    onChange={(event) => setNoteText(event.target.value)}
                    value={noteText}
                  />
                </div>

                <Button onClick={leaveNote} type="button">
                  {t("rentSettlement.notes.leave")}
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </CardContent>
      </Card>

      {settlementPdfUrl ? (
        <SettlementPdfModal
          onClose={closeSettlementPdf}
          pdfUrl={settlementPdfUrl}
          title={settlementPdfTitle}
        />
      ) : null}
    </section>
  )
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    currency: "ARS",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(Number(value || 0))
}

function getPrintableItems(items, surchargeSettings, todayDate) {
  return items.map((item) => {
    const penaltyAmount = getItemPenaltyAmount(item, surchargeSettings, todayDate)

    return {
      ...item,
      penaltyAmount,
      totalAmount: Number(item.edit || 0) + penaltyAmount,
    }
  })
}

function getItemTotal(item, surchargeSettings, todayDate) {
  return Number(item.edit || 0) + getItemPenaltyAmount(item, surchargeSettings, todayDate)
}

function getItemPenaltyAmount(item, surchargeSettings, todayDate) {
  if (!item.penaltyApplied) {
    return 0
  }

  const dueDate = parseEsDate(item.dueDate)
  const graceDays = parseNumber(surchargeSettings.graceDays)
  const chargeFromDay = parseNumber(surchargeSettings.chargeFromDay)
  const dailyRate = parsePercentage(surchargeSettings.dailyPercentagePoints)
  const daysOverdue = getDaysOverdue(dueDate, todayDate, graceDays, chargeFromDay)

  if (daysOverdue <= 0 || dailyRate <= 0) {
    return 0
  }

  return Math.round(Number(item.edit || 0) * dailyRate * daysOverdue)
}

function getDaysOverdue(dueDate, todayDate, graceDays, chargeFromDay) {
  if (Number.isNaN(dueDate.getTime())) {
    return 0
  }

  const firstPenaltyDate = new Date(dueDate)
  const safeGraceDays = Math.max(0, Math.floor(graceDays || 0))
  const safeChargeFromDay = Math.max(1, Math.floor(chargeFromDay || 1))

  firstPenaltyDate.setDate(
    firstPenaltyDate.getDate() + safeGraceDays + safeChargeFromDay - 1,
  )

  const normalizedToday = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate(),
  )
  const normalizedFirstPenaltyDate = new Date(
    firstPenaltyDate.getFullYear(),
    firstPenaltyDate.getMonth(),
    firstPenaltyDate.getDate(),
  )
  const millisecondsPerDay = 1000 * 60 * 60 * 24

  return Math.max(
    0,
    Math.floor(
      (normalizedToday.getTime() - normalizedFirstPenaltyDate.getTime()) /
        millisecondsPerDay,
    ) + 1,
  )
}

function parsePercentage(value) {
  return parseNumber(value) / 100
}

function parseNumber(value) {
  const normalizedValue = String(value ?? "")
    .replace(/\$/g, "")
    .replace(/%/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim()
  const parsedValue = Number(normalizedValue)

  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function getContractSurchargeSettings(contractId) {
  return {
    chargeFromDay: loadContractSetting(contractId, "chargeFromDay", "1"),
    dailyPercentagePoints: loadContractSetting(
      contractId,
      "dailyPercentagePoints",
      "1,00%",
    ),
    graceDays: loadContractSetting(contractId, "graceDays", "10"),
  }
}

function loadContractSetting(contractId, key, fallbackValue) {
  if (!contractId || typeof window === "undefined") {
    return fallbackValue
  }

  return (
    window.localStorage.getItem(`contract-record:${contractId}:${key}`) ??
    fallbackValue
  )
}

function Field({ defaultValue, label }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input defaultValue={defaultValue} />
    </div>
  )
}

function TotalBox({
  danger = false,
  editable = false,
  emphasized = false,
  label,
  onChange,
  rawValue,
  value,
}) {
  return (
    <div className="grid gap-1">
      <Label className="font-semibold">{label}</Label>
      <Input
        className={[
          "text-right font-semibold",
          emphasized ? "bg-primary/15" : "",
          danger ? "text-destructive" : "",
        ].join(" ")}
        inputMode={editable ? "numeric" : undefined}
        onChange={onChange}
        readOnly={!editable}
        type="text"
        value={editable ? formatMoneyInput(rawValue) : value}
      />
    </div>
  )
}

function SettlementPdfModal({ onClose, pdfUrl, title }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-sm">
      <Card className="h-[90vh] w-full max-w-5xl overflow-hidden shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle>{title}</CardTitle>
          <div className="flex gap-2">
            <Button onClick={onClose} size="sm" variant="outline">
              <ArrowLeft />
              Volver
            </Button>
            <Button asChild size="sm" variant="outline">
              <a download="liquidacion-alquiler.pdf" href={pdfUrl}>
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
            title="PDF liquidacion alquiler"
          />
        </CardContent>
      </Card>
    </div>
  )
}

function createSettlementPdf({
  balance,
  balanceLabel,
  contract,
  date,
  documentTitle,
  items,
  notes,
  paidAmount,
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

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener("error", () => reject(reader.error))
    reader.addEventListener("load", () => {
      const result = String(reader.result ?? "")
      resolve(result.split(",")[1] ?? "")
    })
    reader.readAsDataURL(blob)
  })
}

function saveOwnerAccountDraft(contractId, appliedItems, sourceReceiptId) {
  if (!contractId || typeof window === "undefined") {
    return
  }

  const key = `owner-account-draft:${contractId}`
  const currentItems = readOwnerAccountDraft(key)
  const createdAt = Date.now()
  const ownerItems = appliedItems.map((item, index) =>
    createOwnerAccountItem({
        amount: Number(item.edit || 0),
        date: item.dueDate,
        description: item.description,
        id: `${createdAt}-${index}`,
        sourceReceiptId,
      }),
  )

  window.localStorage.setItem(key, JSON.stringify([...ownerItems, ...currentItems]))
}

function createOwnerAccountItem({ amount, date, description, id, sourceReceiptId }) {
  const administration = isRentInstallment(description) ? amount * 0.05 : 0

  return {
    administration,
    amount,
    date,
    description,
    id,
    penalties: 0,
    sourceReceiptId,
    total: amount - administration,
  }
}

function isRentInstallment(description) {
  return /alquiler\s+cuota/i.test(description)
}

function readOwnerAccountDraft(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]")
  } catch {
    return []
  }
}

function createPeriodItems(
  periodDate,
  receipts = [],
  contractStartDate,
  regularConcepts = [],
  contract,
) {
  const installmentNumber = getInstallmentNumber(contractStartDate, periodDate)
  const rentAmount = getRentAmountForInstallment(contract, installmentNumber)
  const monthName = getMonthName(periodDate)
  const year = periodDate.getFullYear()
  const dueDate = formatEsDate(periodDate)

  const items = settlementItems.map((item) => {
    const isRent = isRentInstallment(item.description)
    const conceptName = getConceptName(item.description)

    return {
      ...item,
      apply: true,
      dueDate,
      description: isRent
        ? `Alquiler Cuota:${installmentNumber} ${monthName}-${year}`
        : `${monthName}/${year} ${conceptName} -`,
      edit: isRent ? rentAmount : item.edit,
    }
  })
  const regularConceptItems = regularConcepts.map((concept) =>
    createRegularConceptItem(concept, periodDate),
  )

  const carryoverItem = createCarryoverBalanceItem(receipts, periodDate, dueDate)

  const periodItems = [...regularConceptItems, ...items]

  return carryoverItem ? [carryoverItem, ...periodItems] : periodItems
}

function createRegularConceptItem(concept, periodDate) {
  const monthName = getMonthName(periodDate)
  const year = periodDate.getFullYear()
  const detail = concept.detail ?? getConceptName(concept.description)
  const amount = concept.edit ?? concept.numericAmount ?? parseNumber(concept.amount)

  return {
    apply: true,
    dueDate: formatEsDate(periodDate),
    description: `${monthName}/${year} ${detail} -`,
    edit: amount,
    penalty: "$ 0,00",
  }
}

function hasReceiptForPeriod(receipts, periodDate) {
  const periodMonth = getMonthKeyFromDate(periodDate)

  return receipts.some((receipt) => {
    const firstItemDueDate = receipt.snapshot?.items?.[0]?.dueDate

    return getMonthKey(firstItemDueDate ?? receipt.receiptDate) === periodMonth
  })
}

function getMonthKey(dateText) {
  const [, month, year] = String(dateText).split("/").map(Number)

  return `${year}-${month}`
}

function getMonthKeyFromDate(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`
}

function createCarryoverBalanceItem(receipts, periodDate, dueDate) {
  const previousPeriodDate = addMonths(periodDate, -1)
  const previousPeriodKey = getMonthKeyFromDate(previousPeriodDate)
  const previousReceipt = receipts.find((receipt) => {
    const firstItemDueDate = receipt.snapshot?.items?.[0]?.dueDate

    return getMonthKey(firstItemDueDate ?? receipt.receiptDate) === previousPeriodKey
  })
  const previousBalance = Number(previousReceipt?.balance ?? 0)

  if (previousBalance <= 0) {
    return null
  }

  return {
    apply: true,
    dueDate,
    description: `saldo del mes ${getMonthName(previousPeriodDate)}/${previousPeriodDate.getFullYear()}`,
    edit: previousBalance,
    penalty: "$ 0,00",
  }
}

function parseEsDate(dateText) {
  const [day, month, year] = String(dateText).split("/").map(Number)

  return new Date(year, month - 1, day)
}

function getCurrentPeriodDate(contractStartDate, todayDate) {
  if (Number.isNaN(contractStartDate.getTime())) {
    return parseEsDate(settlementItems[0].dueDate)
  }

  const normalizedToday = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate(),
  )
  const currentMonthDueDate = createDateWithContractDay(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    contractStartDate.getDate(),
  )

  if (normalizedToday < contractStartDate) {
    return new Date(contractStartDate)
  }

  if (normalizedToday < currentMonthDueDate) {
    return createDateWithContractDay(
      todayDate.getFullYear(),
      todayDate.getMonth() - 1,
      contractStartDate.getDate(),
    )
  }

  return currentMonthDueDate
}

function createDateWithContractDay(year, monthIndex, day) {
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate()

  return new Date(year, monthIndex, Math.min(day, lastDayOfMonth))
}

function formatEsDate(date) {
  return new Intl.DateTimeFormat("es-AR").format(date)
}

function getMonthName(date) {
  return new Intl.DateTimeFormat("es-AR", { month: "long" }).format(date)
}

function getMonthDifference(startDate, endDate) {
  return (
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    endDate.getMonth() -
    startDate.getMonth()
  )
}

function getInstallmentNumber(contractStartDate, periodDate) {
  if (
    Number.isNaN(contractStartDate.getTime()) ||
    Number.isNaN(periodDate.getTime())
  ) {
    return 1
  }

  return Math.max(1, getMonthDifference(contractStartDate, periodDate) + 1)
}

function getRentAmountForInstallment(contract, installmentNumber) {
  const periodRows = contract?.settings?.periods?.rows

  if (!Array.isArray(periodRows) || periodRows.length === 0) {
    return 0
  }

  const selectedPeriod =
    periodRows.find(
      (period) => Number(period.untilInstallment) >= installmentNumber,
    ) ?? periodRows.at(-1)

  return parseNumber(selectedPeriod?.rent)
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, date.getDate())
}

function getConceptName(description) {
  const concept = description
    .replace(/^[^ ]+\/\d{4}\s+/i, "")
    .replace(/\s+-$/, "")
    .trim()

  return concept || description
}

function formatMoneyInput(value) {
  const amount = parseNumber(value)

  if (!amount) {
    return ""
  }

  return formatCurrency(amount)
}

function getRegularConceptsKey(contractId) {
  return `rent-settlement:${contractId}:regular-concepts`
}

function loadRegularConcepts(contractId) {
  if (!contractId || typeof window === "undefined") {
    return []
  }

  try {
    const concepts = JSON.parse(
      window.localStorage.getItem(getRegularConceptsKey(contractId)) ?? "[]",
    )

    return Array.isArray(concepts) ? concepts : []
  } catch {
    return []
  }
}

function saveRegularConcepts(contractId, concepts) {
  if (!contractId || typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(
    getRegularConceptsKey(contractId),
    JSON.stringify(concepts),
  )
}

export { RentSettlement }
