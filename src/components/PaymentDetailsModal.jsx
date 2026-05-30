import { Trash2, X } from "lucide-react"
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

const paymentRows = [
  {
    paid: "$ 712.000,00",
    receipt: "4521",
    receiptDate: "28/5/2026",
    total: "$ 712.000,00",
  },
  {
    paid: "$ 312.000,00",
    receipt: "4018",
    receiptDate: "25/2/2026",
    total: "$ 312.000,00",
  },
  {
    paid: "$ 312.000,00",
    receipt: "3713",
    receiptDate: "7/1/2026",
    total: "$ 312.000,00",
  },
]

function PaymentDetailsModal({ onClose, personName }) {
  const { t } = useTranslation()

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
                {paymentRows.map((payment) => (
                  <TableRow key={payment.receipt}>
                    <TableCell>{payment.receiptDate}</TableCell>
                    <TableCell>
                      <button className="font-medium underline">
                        {payment.receipt}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">{payment.total}</TableCell>
                    <TableCell className="text-right">{payment.paid}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      $ 0,00
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        aria-label={t("actions.delete")}
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
    </div>
  )
}

export { PaymentDetailsModal }
