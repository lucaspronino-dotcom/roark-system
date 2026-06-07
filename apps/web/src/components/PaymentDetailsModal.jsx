import { AlertCircle, ArrowLeft, Download, Trash2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { deleteReceipt, getReceipts } from "@/services/receiptsService"

function PaymentDetailsModal({ contractId, kind, onClose, personName }) {
  const { t } = useTranslation()
  const [payments, setPayments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    let ignore = false

    async function loadReceipts() {
      setIsLoading(true)

      try {
        const receipts = await getReceipts({ contractId, kind, personName })

        if (!ignore) {
          setPayments(receipts)
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    loadReceipts()

    return () => {
      ignore = true
    }
  }, [contractId, kind, personName])

  async function removeReceipt(payment) {
    setMessage("")

    try {
      await deleteReceipt(payment.id)

      if (kind === "OWNER_SETTLEMENT") {
        restoreOwnerAccountDraft(contractId, payment)
      }

      if (kind === "TENANT_SETTLEMENT") {
        removeOwnerAccountDraftItemsForTenantReceipt(contractId, payment)
      }

      setPayments((currentPayments) =>
        currentPayments.filter((currentPayment) => currentPayment.id !== payment.id),
      )
    } catch {
      setMessage("¡no puede eliminar un recibo que ya se ha liquidado al propietario!")
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-5xl">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-medium">
            {t("paymentDetails.title", { person: personName })}
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
        <CardContent className="pt-4">
          <div className="min-h-[420px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("paymentDetails.columns.receiptDate")}</TableHead>
                  <TableHead>{t("paymentDetails.columns.receipt")}</TableHead>
                  <TableHead className="text-right">
                    {t("paymentDetails.columns.total")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("paymentDetails.columns.paid")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("paymentDetails.columns.balance")}
                  </TableHead>
                  <TableHead className="w-14" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={6}>
                      {t("table.loading")}
                    </TableCell>
                  </TableRow>
                ) : null}
                {!isLoading && payments.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={6}>
                      {t("table.empty")}
                    </TableCell>
                  </TableRow>
                ) : null}
                {payments.map((payment) => (
                  <TableRow key={payment.receipt}>
                    <TableCell>{payment.receiptDate}</TableCell>
                    <TableCell>
                      <button
                        className="font-medium underline"
                        onClick={() => setSelectedReceipt(payment)}
                        type="button"
                      >
                        {payment.receipt}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payment.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payment.paid)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      {formatCurrency(payment.balance)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          aria-label={t("actions.delete")}
                          onClick={() => removeReceipt(payment)}
                          size="icon-sm"
                          title={
                            payment.isDeleteBlocked
                              ? "No se puede eliminar porque ya fue liquidado al propietario"
                              : t("actions.delete")
                          }
                          variant="ghost"
                        >
                          <Trash2 />
                        </Button>
                        {payment.isDeleteBlocked ? (
                          <AlertCircle
                            aria-label="Recibo bloqueado"
                            className="size-4 text-destructive"
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedReceipt ? (
        <ReceiptPdfModal
          onClose={() => setSelectedReceipt(null)}
          receipt={selectedReceipt}
        />
      ) : null}
      {message ? (
        <SmallAlertModal message={message} onClose={() => setMessage("")} />
      ) : null}
    </div>
  )
}

function SmallAlertModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="text-base">Aviso</CardTitle>
          <Button
            aria-label="Cerrar"
            onClick={onClose}
            size="icon-sm"
            variant="ghost"
          >
            <X />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <p className="text-sm font-medium text-destructive">{message}</p>
          <div className="flex justify-end">
            <Button onClick={onClose} size="sm">
              Aceptar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ReceiptPdfModal({ onClose, receipt }) {
  const pdfUrl = `data:application/pdf;base64,${receipt.pdfBase64}`

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/80 p-6 backdrop-blur-sm">
      <Card className="h-[90vh] w-full max-w-5xl overflow-hidden shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle>PDF recibo N° {receipt.receipt}</CardTitle>
          <div className="flex gap-2">
            <Button onClick={onClose} size="sm" variant="outline">
              <ArrowLeft />
              Volver
            </Button>
            <Button asChild size="sm" variant="outline">
              <a download={`recibo-${receipt.receipt}.pdf`} href={pdfUrl}>
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
            title={`PDF recibo N° ${receipt.receipt}`}
          />
        </CardContent>
      </Card>
    </div>
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

function restoreOwnerAccountDraft(contractId, receipt) {
  if (!contractId || typeof window === "undefined") {
    return
  }

  const restoredItems = getReceiptSnapshotItems(receipt).map((item, index) =>
    createOwnerDraftItemFromSnapshot(item, `${receipt.id}-${index}`),
  )

  if (restoredItems.length === 0) {
    return
  }

  const storageKey = `owner-account-draft:${contractId}`
  const currentItems = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]")

  window.localStorage.setItem(
    storageKey,
    JSON.stringify([...restoredItems, ...currentItems]),
  )
}

function removeOwnerAccountDraftItemsForTenantReceipt(contractId, receipt) {
  if (!contractId || typeof window === "undefined") {
    return
  }

  const storageKey = `owner-account-draft:${contractId}`
  const currentItems = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]")
  const receiptItems = getReceiptSnapshotItems(receipt)
  const nextItems = currentItems.filter(
    (item) =>
      item.sourceReceiptId !== receipt.id &&
      !isSameReceiptDraftItem(item, receiptItems),
  )

  window.localStorage.setItem(storageKey, JSON.stringify(nextItems))
}

function isSameReceiptDraftItem(draftItem, receiptItems) {
  return receiptItems.some(
    (receiptItem) =>
      draftItem.date === receiptItem.dueDate &&
      draftItem.description === receiptItem.description &&
      Number(draftItem.amount || 0) === Number(receiptItem.amount || 0),
  )
}

function getReceiptSnapshotItems(receipt) {
  return Array.isArray(receipt.snapshot?.items) ? receipt.snapshot.items : []
}

function createOwnerDraftItemFromSnapshot(item, fallbackId) {
  const amount = Number(item.amount || 0)
  const penalties = Number(item.penalties || 0)
  const isLegacySnapshot =
    item.administration === undefined && item.penalties === undefined && item.total === undefined
  const administration = isLegacySnapshot
    ? 0
    : item.administration === undefined
      ? getDefaultAdministration(item.description, amount)
      : Number(item.administration || 0)
  const total = item.total === undefined ? amount + penalties - administration : Number(item.total || 0)

  return {
    administration,
    amount,
    date: item.dueDate,
    description: item.description,
    id: `restored-${fallbackId}`,
    penalties,
    total,
  }
}

function getDefaultAdministration(description, amount) {
  return /alquiler\s+cuota/i.test(description) ? amount * 0.05 : 0
}

export { PaymentDetailsModal }
