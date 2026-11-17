import { createSettlementPdf } from "@/lib/settlementPdf"
import { resolveRegularConcepts, createRegularConceptItem, getOwnerConceptAmount, mergeConceptDraft } from "@/lib/regularConcepts"
import { requiresSettlementReview } from "@/lib/legacyMigration"
import { ArrowLeft, Download, Printer, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { getPendingRentalDates, getOutstandingRentalBalances, isRentalItemInRange, getNextRentalPeriod } from "@/lib/rentalPeriods"

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
import { updateContract } from "@/services/contractsService"

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
    () => loadRegularConcepts(contract),
    [contract],
  )
  const [activeTab, setActiveTab] = useState("account")
  const [periodDate, setPeriodDate] = useState(() => initialPeriodDate)
  const [items, setItems] = useState(() =>
    createSettlementPeriodItems(
      contract,
      contractStartDate,
      [],
      initialRegularConcepts,
      todayDate,
      initialPeriodDate,
    ),
  )
  const [regularConcepts, setRegularConcepts] = useState(initialRegularConcepts)
  const [contractSettings, setContractSettings] = useState(contract.settings ?? {})
  const [noteText, setNoteText] = useState("")
  const [notes, setNotes] = useState([])
  const [paidAmount, setPaidAmount] = useState(null)
  const [deletedDraftItemKeys, setDeletedDraftItemKeys] = useState([])
  const [receipts, setReceipts] = useState([])
  const [settlementPdfUrl, setSettlementPdfUrl] = useState(null)
  const [settlementPdfTitle, setSettlementPdfTitle] = useState("")
  const [isSavingReceipt, setIsSavingReceipt] = useState(false)
  const [isAdjustmentWarningOpen, setIsAdjustmentWarningOpen] = useState(false)
  const [isRenewalReceiptWarningOpen, setIsRenewalReceiptWarningOpen] = useState(false)
  const [noticeMessage, setNoticeMessage] = useState("")
  const [isDraftLoaded, setIsDraftLoaded] = useState(false)
  const effectiveContract = useMemo(
    () => ({ ...contract, settings: contractSettings }),
    [contract, contractSettings],
  )
  const nextPeriodDate = getNextRentalPeriod(effectiveContract, periodDate)
  const currentDate = new Intl.DateTimeFormat("es-AR").format(todayDate)
  const surchargeSettings = getContractSurchargeSettings(effectiveContract)
  const installmentNumber = getInstallmentNumber(contractStartDate, periodDate)
  const adjustmentNotice = getAdjustmentNotice(effectiveContract, installmentNumber)
  const periodReceipt = findReceiptForPeriod(receipts, periodDate)
  const isRenewalReceiptAllowed =
    periodReceipt && isReceiptBeforeContractStart(periodReceipt, contractStartDate)
  const needsLegacyReview = requiresSettlementReview(effectiveContract)
  const isPeriodLocked = needsLegacyReview || (isDraftLoaded && items.length === 0)
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContractSettings(contract.settings ?? {})
  }, [contract.id, contract.settings])

  useEffect(() => {
    let ignore = false

    async function loadMonthlyReceipt() {
      setIsDraftLoaded(false)
      const receipts = await getReceipts({
        contractId: contract.id,
        kind: "TENANT_SETTLEMENT",
        personName: contract.tenant,
      })

      if (!ignore) {
        const baseItems = createSettlementPeriodItems(
          effectiveContract,
          contractStartDate,
          receipts,
          regularConcepts,
          todayDate,
          periodDate,
        )
        const draft = loadSettlementDraft(contract.id, periodDate)
        const processedItemKeys = getProcessedTenantItemKeys(
          effectiveContract,
          receipts,
        )
        const draftItems = draft
          ? mergeDraftItemsWithBaseItems(baseItems, draft, processedItemKeys)
          : baseItems
        const hasDraft = Boolean(draft)

        setReceipts(receipts)
        setItems(draftItems.filter((item) =>
          baseItems.some((baseItem) => getTenantItemKey(baseItem) === getTenantItemKey(item)) ||
          (!item.isRegularConcept && !isRentInstallment(item.description) &&
            !/^saldo /i.test(item.description) &&
            isRentalItemInRange(item, effectiveContract, todayDate, periodDate)),
        ))
        setNotes(hasDraft ? draft.notes : [])
        setNoteText(hasDraft ? draft.noteText : "")
        setPaidAmount(hasDraft ? draft.paidAmount : null)
        setDeletedDraftItemKeys(hasDraft ? draft.deletedItemKeys : [])
        setIsDraftLoaded(true)
      }
    }

    loadMonthlyReceipt()

    return () => {
      ignore = true
    }
  }, [
    todayDate,
    contract,
    contract.id,
    contract.tenant,
    contractStartDate,
    effectiveContract,
    periodDate,
    regularConcepts,
  ])

  useEffect(() => {
    saveRegularConcepts(contract.id, regularConcepts)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContractSettings((currentSettings) => {
      const nextSettings = {
        ...currentSettings,
        regularConcepts,
        legacyConceptsVersion: 1,
      }

      updateContract(contract.id, { settings: nextSettings }).catch(() => {
        setNoticeMessage("No se pudieron guardar los conceptos. Volvé a intentar antes de salir.")
      })

      return nextSettings
    })
  }, [contract.id, regularConcepts])

  useEffect(() => {
    if (!isDraftLoaded || isPeriodLocked) {
      return
    }

    if (items.length === 0 && deletedDraftItemKeys.length === 0) {
      clearSettlementDraft(contract.id, periodDate)
      return
    }

    saveSettlementDraft(contract.id, periodDate, {
      items,
      deletedItemKeys: deletedDraftItemKeys,
      noteText,
      notes,
      paidAmount,
    })
  }, [
    contract.id,
    isDraftLoaded,
    isPeriodLocked,
    items,
    deletedDraftItemKeys,
    noteText,
    notes,
    paidAmount,
    periodDate,
  ])

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

    if (!nextItem) return

    setDeletedDraftItemKeys((currentKeys) =>
      currentKeys.filter((key) => key !== getTenantItemKey(nextItem)),
    )
    setItems((currentItems) => [
      ...currentItems.filter(
        (currentItem) => currentItem.description !== nextItem.description,
      ),
      nextItem,
    ])
    setActiveTab("account")
  }

  function removeItem(index) {
    const itemToRemove = items[index]

    if (itemToRemove) {
      setDeletedDraftItemKeys((currentKeys) => [
        ...new Set([...currentKeys, getTenantItemKey(itemToRemove)]),
      ])
    }

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

  async function syncRentAmountToContractSettings(item, amount) {
    if (!isRentInstallment(item.description) || !contract.id) {
      return
    }

    if (
      !shouldSyncRentAmountToContractSettings(
        contractSettings,
        installmentNumber,
      )
    ) {
      return
    }

    const nextSettings = updateRentAmountInContractSettings(
      contractSettings,
      installmentNumber,
      amount,
    )

    setContractSettings(nextSettings)

    try {
      await updateContract(contract.id, { settings: nextSettings })
    } catch {
      setContractSettings(contractSettings)
    }
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
    if (isPeriodLocked) {
      return
    }

    if (settlementPdfUrl) {
      URL.revokeObjectURL(settlementPdfUrl)
    }

    const printableItems = getPrintableItems(visibleItems, surchargeSettings, todayDate)
    const appliedItems = printableItems.filter((item) => item.apply)

    if (appliedItems.length === 0) {
      setNoticeMessage("No hay conceptos para imprimir en esta liquidacion.")
      return
    }

    const pdfBlob = createSettlementPdf({
      adjustmentNotice,
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

  function confirmAndPrintReceipt() {
    if (isPeriodLocked) {
      return
    }

    if (isRenewalReceiptAllowed) {
      setIsRenewalReceiptWarningOpen(true)
      return
    }

    if (adjustmentNotice) {
      setIsAdjustmentWarningOpen(true)
      return
    }

    saveAndPrintReceipt()
  }

  async function saveAndPrintReceipt() {
    const printableItems = getPrintableItems(visibleItems, surchargeSettings, todayDate)
    const appliedItems = printableItems.filter((item) => item.apply)

    if (appliedItems.length === 0) {
      setNoticeMessage("No hay conceptos para generar el recibo.")
      return
    }

    setIsSavingReceipt(true)

    try {
      const { number } = await getNextReceiptNumber()
      const documentTitle = `RECIBO N° ${number}`
      const pdfBlob = createSettlementPdf({
        adjustmentNotice,
        balance,
        balanceLabel,
        contract,
        date: currentDate,
        documentTitle,
        items: printableItems,
        notes,
        paidAmount: effectivePaidAmount,
        receiptNumber: number,
        total,
        variant: "receipt",
      })
      const pdfBase64 = await blobToBase64(pdfBlob)

      const receipt = await createReceipt({
        balance,
        contractId: contract.id,
        date: currentDate,
        items: appliedItems.map((item) => ({
          amount: Number(item.edit || 0),
          ownerAmount: item.ownerAmount,
          conceptId: item.conceptId,
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
      const nextSettings = markTenantItemsProcessed(contractSettings, appliedItems)

      setContractSettings(nextSettings)
      updateContract(contract.id, { settings: nextSettings }).catch(() => {})
      saveOwnerAccountDraft(contract.id, appliedItems, receipt.id)
      clearSettlementDraftsForItems(contract.id, appliedItems, periodDate)
      setReceipts((currentReceipts) => [receipt, ...currentReceipts])
      removeProcessedItemsFromCurrentSettlement(appliedItems)
      notifyReceiptsChanged({
        contractId: contract.id,
        kind: "TENANT_SETTLEMENT",
        personName: contract.tenant,
      })

      if (settlementPdfUrl) {
        URL.revokeObjectURL(settlementPdfUrl)
      }

      setSettlementPdfTitle(`PDF recibo N° ${number}`)
      setSettlementPdfUrl(URL.createObjectURL(pdfBlob))
    } finally {
      setIsSavingReceipt(false)
    }
  }

  function removeProcessedItemsFromCurrentSettlement(appliedItems) {
    const processedItemKeys = new Set(appliedItems.map(getTenantItemKey))

    setItems((currentItems) =>
      currentItems.filter((item) => !processedItemKeys.has(getTenantItemKey(item))),
    )
    setDeletedDraftItemKeys((currentKeys) => [
      ...new Set([...currentKeys, ...processedItemKeys]),
    ])
  }

  function payNextPeriod() {
    if (!nextPeriodDate || !isDraftLoaded || isSavingReceipt) return
    setIsDraftLoaded(false)
    setPeriodDate(nextPeriodDate)
    setPaidAmount(null)
    setDeletedDraftItemKeys([])
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
                            <p className="text-lg font-medium text-muted-foreground">
                              {needsLegacyReview
                                ? "Contrato importado: revisá saldos, conceptos e inicio de administración en la ficha antes de liquidar."
                                : "No hay períodos pendientes de liquidación."}
                            </p>
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
                            onBlur={(event) =>
                              syncRentAmountToContractSettings(
                                item,
                                parseNumber(event.target.value),
                              )
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
                  <Button
                    disabled={!nextPeriodDate || !isDraftLoaded || isSavingReceipt}
                    onClick={payNextPeriod}
                    size="lg"
                    type="button"
                    variant={isPeriodLocked ? "default" : "outline"}
                  >
                    Pagar el próximo período
                  </Button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      className="order-1 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      disabled={!isDraftLoaded || isPeriodLocked}
                      onClick={printSettlement}
                    >
                      <Printer />
                      {t("rentSettlement.actions.printSettlement")}
                    </Button>
                    <Button
                      className="order-2"
                      disabled={!isDraftLoaded || isSavingReceipt || isPeriodLocked}
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
	      {isAdjustmentWarningOpen ? (
	        <AdjustmentWarningModal
	          message={adjustmentNotice}
	          onAccept={() => {
	            setIsAdjustmentWarningOpen(false)
	            saveAndPrintReceipt()
	          }}
	        />
	      ) : null}
	      {isRenewalReceiptWarningOpen ? (
	        <AdjustmentWarningModal
	          message="Ya existe un recibo de este mes, pero se permite generar uno nuevo porque el contrato fue renovado y empieza un nuevo ciclo desde la cuota 1."
	          onAccept={() => {
	            setIsRenewalReceiptWarningOpen(false)
	            if (adjustmentNotice) {
	              setIsAdjustmentWarningOpen(true)
	              return
	            }
	            saveAndPrintReceipt()
	          }}
	          title="Contrato renovado"
	        />
	      ) : null}
      {noticeMessage ? (
        <AdjustmentWarningModal
          message={noticeMessage}
          onAccept={() => setNoticeMessage("")}
          title="Aviso"
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

function getContractSurchargeSettings(contract) {
  const contractId = contract?.id
  const surcharges = contract?.settings?.surcharges ?? {}

  return {
    chargeFromDay:
      surcharges.chargeFromDay ??
      loadContractSetting(contractId, "chargeFromDay", "1"),
    dailyPercentagePoints:
      surcharges.dailyPercentagePoints ??
      loadContractSetting(
      contractId,
      "dailyPercentagePoints",
      "1,00%",
    ),
    graceDays:
      surcharges.graceDays ??
      loadContractSetting(contractId, "graceDays", "10"),
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

function AdjustmentWarningModal({ message, onAccept, title }) {
  const { t } = useTranslation()

  if (!message) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="border-b">
	          <CardTitle className="text-lg font-semibold text-primary">
	            {title ?? t("rentSettlement.adjustmentWarning.title")}
	          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <p className="text-sm text-foreground">{message}</p>
          <div className="flex justify-end">
            <Button onClick={onAccept}>{t("actions.accept")}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
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
  const ownerItems = appliedItems.filter(item => getOwnerConceptAmount(item) !== 0).map((item, index) =>
    createOwnerAccountItem({
        amount: getOwnerConceptAmount(item),
        date: item.dueDate,
        description: item.description,
        id: `${createdAt}-${index}`,
        sourceReceiptId,
      }),
  )

  window.localStorage.setItem(
    key,
    JSON.stringify(uniqueOwnerAccountDraftItems([...ownerItems, ...currentItems])),
  )
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

function uniqueOwnerAccountDraftItems(items) {
  const seenKeys = new Set()

  return items.filter((item) => {
    const key = [
      getMonthKey(item.date),
      normalizeTenantItemDescription(item.description),
      Number(item.amount || 0),
    ].join("|")

    if (seenKeys.has(key)) {
      return false
    }

    seenKeys.add(key)
    return true
  })
}

function createSettlementPeriodItems(
  contract,
  contractStartDate,
  receipts = [],
  regularConcepts = [],
  today = new Date(),
  throughDate = today,
) {
  if (requiresSettlementReview(contract)) return []
  const pendingItems = getPendingRentalDates(contract, receipts, today, throughDate).flatMap((date) =>
    createPeriodItems(date, receipts, contractStartDate, regularConcepts, contract),
  )
  return [...getOutstandingRentalBalances(receipts), ...pendingItems]
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
  ).filter(item => item && (!contract || (
    parseEsDate(item.dueDate) >= parseEsDate(contract.startDate) &&
    parseEsDate(item.dueDate) <= parseEsDate(contract.end)
  )))

  const processedItemKeys = getProcessedTenantItemKeys(contract, receipts)

  const periodItems = [...regularConceptItems, ...items].filter(
    (item) => !processedItemKeys.has(getTenantItemKey(item)),
  )

  return periodItems
}

function findReceiptForPeriod(receipts, periodDate) {
  const periodMonth = getMonthKeyFromDate(periodDate)

  return receipts.find((receipt) => {
    const receiptItemDates = Array.isArray(receipt.snapshot?.items)
      ? receipt.snapshot.items
          .map((item) => item.dueDate)
          .filter(Boolean)
      : []

    if (receiptItemDates.length === 0) {
      return getMonthKey(receipt.receiptDate) === periodMonth
    }

    return receiptItemDates.some((dueDate) => getMonthKey(dueDate) === periodMonth)
  })
}

function isReceiptBeforeContractStart(receipt, contractStartDate) {
  if (!receipt || !contractStartDate || Number.isNaN(contractStartDate.getTime())) {
    return false
  }

  const firstItemDueDate = receipt.snapshot?.items?.[0]?.dueDate
  const receiptDate = parseEsDate(firstItemDueDate ?? receipt.receiptDate)

  if (Number.isNaN(receiptDate.getTime())) {
    return false
  }

  return receiptDate < contractStartDate
}

function getMonthKey(dateText) {
  const [, month, year] = String(dateText).split("/").map(Number)

  return `${year}-${month}`
}

function getMonthKeyFromDate(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`
}

function parseEsDate(dateText) {
  const [day, month, year] = String(dateText).split("/").map(Number)

  return new Date(year, month - 1, day)
}

function getCurrentPeriodDate(contractStartDate, todayDate) {
  if (Number.isNaN(contractStartDate.getTime())) {
    return parseEsDate(settlementItems[0].dueDate)
  }

  const currentMonthDueDate = createDateWithContractDay(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    contractStartDate.getDate(),
  )

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

function updateRentAmountInContractSettings(settings, installmentNumber, amount) {
  const periods = settings?.periods ?? {}
  const currentRows = Array.isArray(periods.rows) ? periods.rows : []
  const formattedAmount = formatCurrency(amount)
  const targetIndex = currentRows.findIndex(
    (period) => Number(period.untilInstallment) >= installmentNumber,
  )
  const rows =
    targetIndex >= 0
      ? currentRows.map((period, index) =>
          index === targetIndex
            ? {
                ...period,
                rent: formattedAmount,
              }
            : period,
        )
      : [
          ...currentRows,
          {
            extras: "$ 0,00",
            rent: formattedAmount,
            untilInstallment: installmentNumber,
          },
        ]

  return {
    ...settings,
    periods: {
      ...periods,
      rows,
    },
  }
}

function shouldSyncRentAmountToContractSettings(settings, installmentNumber) {
  const periods = settings?.periods ?? {}
  const currentRows = Array.isArray(periods.rows) ? periods.rows : []
  const targetIndex = currentRows.findIndex(
    (period) => Number(period.untilInstallment) >= installmentNumber,
  )

  if (targetIndex < 0) {
    return true
  }

  const previousUntilInstallment = Number(
    currentRows[targetIndex - 1]?.untilInstallment ?? 0,
  )
  const isFirstInstallmentOfPeriod =
    installmentNumber === previousUntilInstallment + 1
  const currentRent = currentRows[targetIndex]?.rent

  return isFirstInstallmentOfPeriod && parseNumber(currentRent) === 0
}

function getAdjustmentNotice(contract, installmentNumber) {
  const periods = contract?.settings?.periods
  const periodRows = periods?.rows
  const totalInstallments = Number(periods?.installments ?? 0)
  const adjustmentInterval = Number(periods?.adjustmentInterval ?? 0)

  if (!Number.isFinite(totalInstallments)) {
    return ""
  }

  const hasAdjustmentNextPeriod =
    (Array.isArray(periodRows) &&
      periodRows.some(
        (period) => Number(period.untilInstallment) === installmentNumber,
      )) ||
    (adjustmentInterval > 0 && installmentNumber % adjustmentInterval === 0)

  if (!hasAdjustmentNextPeriod || installmentNumber >= totalInstallments) {
    return ""
  }

  return `El proximo periodo tiene ajuste a partir de la cuota ${installmentNumber + 1}.`
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

function loadRegularConcepts(contract) {
  let fallback = []
  try {
    if (contract?.id && typeof window !== "undefined") {
      const stored = JSON.parse(window.localStorage.getItem(getRegularConceptsKey(contract.id)) ?? "[]")
      if (Array.isArray(stored)) fallback = stored
    }
  } catch { /* Use persisted contract settings if the browser draft is invalid. */ }
  return resolveRegularConcepts(contract?.settings, fallback)
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

function mergeDraftItemsWithBaseItems(baseItems, draft, processedItemKeys = new Set()) {
  const deletedItemKeys = new Set(draft.deletedItemKeys)
  const draftItemsByKey = new Map(
    draft.items
      .filter((item) => !processedItemKeys.has(getTenantItemKey(item)))
      .map((item) => [getTenantItemKey(item), item]),
  )
  const mergedItems = baseItems
    .filter((item) => !deletedItemKeys.has(getTenantItemKey(item)))
    .map((item) => {
      const draftItem = draftItemsByKey.get(getTenantItemKey(item))
      return mergeConceptDraft(item, draftItem)
    })
  const baseItemKeys = new Set(baseItems.map(getTenantItemKey))
  const extraDraftItems = draft.items.filter((item) => {
    const itemKey = getTenantItemKey(item)

    return !baseItemKeys.has(itemKey) && !deletedItemKeys.has(itemKey)
      && !processedItemKeys.has(itemKey)
  })

  return [...mergedItems, ...extraDraftItems]
}

function markTenantItemsProcessed(settings, appliedItems) {
  const currentProcessedItems = Array.isArray(settings?.processedTenantItems)
    ? settings.processedTenantItems
    : []
  const processedItems = new Set(currentProcessedItems)

  appliedItems.forEach((item) => {
    processedItems.add(getTenantItemKey(item))
  })

  return {
    ...settings,
    processedTenantItems: [...processedItems],
  }
}

function getProcessedTenantItemKeys(contract, receipts = []) {
  const processedItems = new Set(
    Array.isArray(contract?.settings?.processedTenantItems)
      ? contract.settings.processedTenantItems
      : [],
  )

  receipts.forEach((receipt) => {
    if (!Array.isArray(receipt.snapshot?.items)) {
      return
    }

    receipt.snapshot.items.forEach((item) => {
      processedItems.add(getTenantItemKey(item))
    })
  })

  return processedItems
}

function getTenantItemKey(item) {
  return `${getMonthKey(item.dueDate)}|${item.conceptId ? `${item.conceptId}|` : ""}${normalizeTenantItemDescription(
    item.description,
  )}`
}

function normalizeTenantItemDescription(description) {
  return String(description ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function getSettlementDraftKey(contractId, periodDate) {
  return `rent-settlement:${contractId}:draft:${getMonthKeyFromDate(periodDate)}`
}

function loadSettlementDraft(contractId, periodDate) {
  if (!contractId || typeof window === "undefined") {
    return null
  }

  try {
    const draft = JSON.parse(
      window.localStorage.getItem(getSettlementDraftKey(contractId, periodDate)) ??
        "null",
    )

    if (!draft || !Array.isArray(draft.items)) {
      return null
    }

    return {
      deletedItemKeys: Array.isArray(draft.deletedItemKeys)
        ? draft.deletedItemKeys
        : [],
      items: draft.items,
      notes: Array.isArray(draft.notes) ? draft.notes : [],
      noteText: draft.noteText ?? "",
      paidAmount:
        draft.paidAmount === null || draft.paidAmount === undefined
          ? null
          : Number(draft.paidAmount),
    }
  } catch {
    return null
  }
}

function saveSettlementDraft(contractId, periodDate, draft) {
  if (!contractId || typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(
    getSettlementDraftKey(contractId, periodDate),
    JSON.stringify(draft),
  )
}

function clearSettlementDraft(contractId, periodDate) {
  if (!contractId || typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(getSettlementDraftKey(contractId, periodDate))
}

function clearSettlementDraftsForItems(contractId, appliedItems, fallbackPeriodDate) {
  if (!contractId || typeof window === "undefined") {
    return
  }

  const periodDates = new Map()

  appliedItems.forEach((item) => {
    const dueDate = parseEsDate(item.dueDate)

    if (!Number.isNaN(dueDate.getTime())) {
      periodDates.set(getMonthKeyFromDate(dueDate), dueDate)
    }
  })

  if (periodDates.size === 0 && fallbackPeriodDate) {
    periodDates.set(getMonthKeyFromDate(fallbackPeriodDate), fallbackPeriodDate)
  }

  periodDates.forEach((periodDate) => clearSettlementDraft(contractId, periodDate))
}

function notifyReceiptsChanged(detail) {
  if (typeof window === "undefined") {
    return
  }

  window.dispatchEvent(new CustomEvent("roark:receipts-changed", { detail }))
}

// eslint-disable-next-line react-refresh/only-export-components
export { createSettlementPdf, RentSettlement }
