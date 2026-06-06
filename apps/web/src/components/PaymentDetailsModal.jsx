import { ArrowLeft, Download, Trash2, X } from "lucide-react"
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

  async function removeReceipt(receiptId) {
    setMessage("")

    try {
      await deleteReceipt(receiptId)
      setPayments((currentPayments) =>
        currentPayments.filter((payment) => payment.id !== receiptId),
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
                      <Button
                        aria-label={t("actions.delete")}
                        onClick={() => removeReceipt(payment.id)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Trash2 />
                      </Button>
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

export { PaymentDetailsModal }
