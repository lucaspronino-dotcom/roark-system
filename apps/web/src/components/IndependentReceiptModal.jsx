import { Printer, X } from "lucide-react"
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
  const [copies, setCopies] = useState("1")
  const [currency, setCurrency] = useState("")
  const [receivedAmount, setReceivedAmount] = useState("")
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
                <CheckField label={t("independentReceipt.fields.duplicate")} />
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
              <Button className="w-full" type="button">
                <Printer />
                {t("independentReceipt.actions.print")}
              </Button>
              <div className="text-lg font-semibold">
                {t("independentReceipt.receiptNumber")}
              </div>
              <Field
                className="ml-auto w-full max-w-xs text-left"
                defaultValue={currentDate}
                label={t("independentReceipt.fields.date")}
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
            <Input />
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
            <Input />
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
    </div>
  )
}

function Field({ className = "", defaultValue, label }) {
  return (
    <div className={["space-y-1", className].join(" ")}>
      <Label>{label}</Label>
      <Input defaultValue={defaultValue} />
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

export { IndependentReceiptModal }
