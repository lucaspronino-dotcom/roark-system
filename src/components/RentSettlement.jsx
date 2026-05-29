import { ArrowLeft, Trash2 } from "lucide-react"
import { useState } from "react"
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

const settlementItems = [
  {
    dueDate: "1/6/2026",
    description: "junio/2026 internet -",
    edit: 12329,
    penalty: "$ 0,00",
    apply: true,
  },
  {
    dueDate: "1/6/2026",
    description: "junio/2026 gas -",
    edit: 8414,
    penalty: "$ 0,00",
    apply: true,
  },
  {
    dueDate: "1/6/2026",
    description: "junio/2026 agua -",
    edit: 1870,
    penalty: "$ 0,00",
    apply: true,
  },
  {
    dueDate: "1/6/2026",
    description: "junio/2026 luz -",
    edit: 11122,
    penalty: "$ 0,00",
    apply: true,
  },
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
  const [activeTab, setActiveTab] = useState("account")
  const [items, setItems] = useState(settlementItems)
  const [paidAmount, setPaidAmount] = useState(null)
  const currentDate = new Intl.DateTimeFormat("es-AR").format(new Date())
  const total = items.reduce(
    (sum, item) => (item.apply ? sum + Number(item.edit || 0) : sum),
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

  function updateItem(index, nextValues) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...nextValues } : item,
      ),
    )
  }

  function addItemToAccount(item) {
    setItems((currentItems) => [...currentItems, item])
    setActiveTab("account")
  }

  function removeItem(index) {
    setItems((currentItems) =>
      currentItems.filter((_, itemIndex) => itemIndex !== index),
    )
  }

  function removeItemByDescription(description) {
    setItems((currentItems) =>
      currentItems.filter((item) => item.description !== description),
    )
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
            <Field defaultValue="10" label={t("rentSettlement.fields.graceDays")} />
            <Field
              defaultValue="1"
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
                    {items.map((item, index) => (
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
                            onChange={(event) =>
                              updateItem(index, {
                                edit: Number(event.target.value),
                              })
                            }
                            value={item.edit}
                            inputMode="numeric"
                            min="0"
                            step="1"
                            type="number"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.edit)}
                        </TableCell>
                        <TableCell className="text-right">{item.penalty}</TableCell>
                        <TableCell className="text-center">
                          <input type="checkbox" />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.apply ? item.edit : 0)}
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
                      setPaidAmount(Number(event.target.value || 0))
                    }
                    rawValue={effectivePaidAmount}
                  />
                  <TotalBox
                    danger
                    label={balanceLabel}
                    value={formatCurrency(balance)}
                  />
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "extraConcepts" ? (
          <ExtraConcepts
              onAddToAccount={addItemToAccount}
              onRemoveFromAccount={removeItemByDescription}
            />
          ) : null}

          {activeTab === "notes" ? (
            <Card>
              <CardContent className="pt-4 text-muted-foreground">
                {t("rentSettlement.tabs.notes")}
              </CardContent>
            </Card>
          ) : null}
        </CardContent>
      </Card>
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
        step={editable ? "1" : undefined}
        type={editable ? "number" : "text"}
        value={editable ? rawValue : value}
      />
    </div>
  )
}

export { RentSettlement }
