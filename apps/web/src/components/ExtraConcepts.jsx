import { BookOpen, Save, Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Card,
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

const regularConcepts = [
  { accountDescription: "junio/2026 luz -", detail: "luz", amount: "$ 11.122,00" },
  { accountDescription: "junio/2026 agua -", detail: "agua", amount: "$ 1.870,00" },
  { accountDescription: "junio/2026 gas -", detail: "gas", amount: "$ 8.414,00" },
  { accountDescription: "junio/2026 internet -", detail: "internet", amount: "$ 12.329,00" },
  {
    accountDescription: "Alquiler Cuota:4 junio-2026",
    detail: "honorarios inmobiliaria",
    amount: "$ 260.000,00",
  },
]

const months = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sept",
  "Oct",
  "Nov",
  "Dic",
]

function ExtraConcepts({ onAddToAccount, onRemoveFromAccount }) {
  const { t } = useTranslation()
  const currentDate = new Intl.DateTimeFormat("es-AR").format(new Date())
  const [concepts, setConcepts] = useState(regularConcepts)
  const [date, setDate] = useState(currentDate)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [tenantEffect, setTenantEffect] = useState("none")
  const [error, setError] = useState("")
  const [selectedConcept, setSelectedConcept] = useState(null)

  function handleConfirm() {
    const cleanDescription = description.trim()
    const numericAmount = Number(amount)

    if (!cleanDescription) {
      setError(t("extraConcepts.validation.descriptionRequired"))
      return
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError(t("extraConcepts.validation.amountRequired"))
      return
    }

    if (tenantEffect === "addToPayment" || tenantEffect === "discountPayment") {
      onAddToAccount?.({
        apply: true,
        description: cleanDescription,
        dueDate: date,
        edit: tenantEffect === "discountPayment" ? -numericAmount : numericAmount,
        penalty: "$ 0,00",
      })
    }

    setAmount("")
    setDescription("")
    setError("")
    setTenantEffect("none")
  }

  function removeConcept(index) {
    const conceptToRemove = concepts[index]

    setConcepts((currentConcepts) =>
      currentConcepts.filter((_, conceptIndex) => conceptIndex !== index),
    )
    onRemoveFromAccount?.(conceptToRemove.accountDescription)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{t("extraConcepts.regularList.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>{t("extraConcepts.regularList.detail")}</TableHead>
                <TableHead className="text-right">
                  {t("extraConcepts.regularList.amount")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {concepts.map((concept, index) => (
                <TableRow key={concept.detail}>
                  <TableCell>
                    <Button
                      aria-label={t("actions.delete")}
                      onClick={() => removeConcept(index)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      className="h-auto justify-start px-0 underline"
                      onClick={() => setSelectedConcept(concept)}
                      size="xs"
                      variant="link"
                    >
                      {concept.detail}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">{concept.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("extraConcepts.regular.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline">
              <BookOpen />
              {t("extraConcepts.regular.add")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("extraConcepts.single.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[160px_1fr_140px] md:items-end">
              <Field
                label={t("extraConcepts.single.date")}
                onChange={(event) => setDate(event.target.value)}
                value={date}
              />
              <Field
                label={t("extraConcepts.single.description")}
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
              <Field
                inputMode="numeric"
                label={t("extraConcepts.single.amount")}
                min="0"
                onChange={(event) => setAmount(event.target.value)}
                step="1"
                type="number"
                value={amount}
              />
            </div>

            <EffectPanel title={t("extraConcepts.tenant.title")}>
              <RadioOption
                checked={tenantEffect === "none"}
                label={t("extraConcepts.effects.noEffect")}
                name="tenant-effect"
                onChange={() => setTenantEffect("none")}
              />
              <RadioOption
                checked={tenantEffect === "addToPayment"}
                label={t("extraConcepts.effects.addToPayment")}
                name="tenant-effect"
                onChange={() => setTenantEffect("addToPayment")}
              />
              <RadioOption
                checked={tenantEffect === "discountPayment"}
                label={t("extraConcepts.effects.discountPayment")}
                name="tenant-effect"
                onChange={() => setTenantEffect("discountPayment")}
              />
            </EffectPanel>

            <EffectPanel title={t("extraConcepts.owner.title")}>
              <RadioOption defaultChecked label={t("extraConcepts.effects.noEffect")} name="owner-effect" />
              <RadioOption label={t("extraConcepts.effects.addToOwner")} name="owner-effect" />
              <RadioOption label={t("extraConcepts.effects.discountOwner")} name="owner-effect" />
            </EffectPanel>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button onClick={handleConfirm}>
              <Save />
              {t("extraConcepts.single.confirm")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {selectedConcept ? (
        <RegularConceptModal
          concept={selectedConcept}
          onClose={() => setSelectedConcept(null)}
          onDelete={() => {
            const conceptIndex = concepts.findIndex(
              (concept) => concept.detail === selectedConcept.detail,
            )

            if (conceptIndex >= 0) {
              removeConcept(conceptIndex)
            }

            setSelectedConcept(null)
          }}
        />
      ) : null}
    </div>
  )
}

function RegularConceptModal({ concept, onClose, onDelete }) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-sm">
      <Card className="max-h-[90vh] w-full max-w-5xl overflow-auto shadow-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-4">
            <CardTitle>{t("extraConcepts.regularModal.windowTitle")}</CardTitle>
            <Button onClick={onClose} size="sm" variant="ghost">
              {t("actions.close")}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <h2 className="text-2xl font-semibold text-primary">
            {t("extraConcepts.regular.title")}
          </h2>

          <div className="grid gap-6 lg:grid-cols-[minmax(320px,0.8fr)_minmax(420px,1.2fr)]">
            <div className="space-y-4">
              <Field label={t("extraConcepts.regularModal.concept")}>
                <select
                  className="h-8 w-full border border-input bg-background px-2 text-sm"
                  defaultValue={concept.detail}
                >
                  {regularConcepts.map((regularConcept) => (
                    <option key={regularConcept.detail} value={regularConcept.detail}>
                      {regularConcept.detail}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t("extraConcepts.regularModal.amount")}>
                <Input defaultValue={concept.amount} />
              </Field>

              <Field label={t("extraConcepts.regularModal.rentPercentage")}>
                <Input defaultValue="0,00%" />
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" />
                {t("extraConcepts.regularModal.onlyReceipt")}
              </label>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input defaultChecked type="checkbox" />
                {t("extraConcepts.single.clear")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" />
                {t("extraConcepts.regularModal.rememberPayment")}
              </label>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <EffectPanel title={t("extraConcepts.tenant.title")}>
              <RadioOption label={t("extraConcepts.effects.noEffect")} name="regular-tenant-effect" />
              <RadioOption defaultChecked label={t("extraConcepts.effects.addToPayment")} name="regular-tenant-effect" />
              <RadioOption label={t("extraConcepts.effects.discountPayment")} name="regular-tenant-effect" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" />
                {t("extraConcepts.tenant.appliesPenalties")}
              </label>
            </EffectPanel>

            <EffectPanel title={t("extraConcepts.owner.title")}>
              <RadioOption label={t("extraConcepts.effects.noEffect")} name="regular-owner-effect" />
              <RadioOption defaultChecked label={t("extraConcepts.effects.addToOwner")} name="regular-owner-effect" />
              <RadioOption label={t("extraConcepts.effects.discountOwner")} name="regular-owner-effect" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" />
                {t("extraConcepts.owner.appliesAdministration")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input defaultChecked type="checkbox" />
                {t("extraConcepts.owner.all")}
              </label>
              <Field label={t("extraConcepts.owner.owner")}>
                <select className="h-8 w-full border border-input bg-background px-2 text-sm">
                  <option>{t("actions.choose")}</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" />
                {t("extraConcepts.regularModal.deliverReceipt")}
              </label>
            </EffectPanel>
          </div>

          <fieldset className="rounded-md border p-4">
            <legend className="px-1 text-sm font-semibold">
              {t("extraConcepts.regularModal.applicationPeriod")}
            </legend>
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-[180px_180px]">
                <Field label={t("extraConcepts.regularModal.startDate")}>
                  <Input defaultValue="1/3/2026" />
                </Field>
                <Field label={t("extraConcepts.regularModal.endDate")}>
                  <Input defaultValue="29/2/2028" />
                </Field>
              </div>

              <div className="grid gap-3 lg:grid-cols-[160px_1fr]">
                <div className="space-y-2">
                  <RadioOption label={t("extraConcepts.owner.all")} name="month-mode" />
                  <RadioOption label={t("extraConcepts.regularModal.evenMonths")} name="month-mode" />
                  <RadioOption label={t("extraConcepts.regularModal.oddMonths")} name="month-mode" />
                </div>
                <div className="grid grid-cols-6 gap-3 md:grid-cols-12">
                  {months.map((month) => (
                    <label
                      className="flex flex-col items-center gap-2 text-xs"
                      key={month}
                    >
                      <span>{month}</span>
                      <input defaultChecked type="checkbox" />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button onClick={onDelete} variant="outline">
              <Trash2 />
              {t("actions.delete")}
            </Button>
            <Button onClick={onClose}>
              <Save />
              {t("extraConcepts.regularModal.saveAndExit")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ defaultValue, label, ...props }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {"children" in props ? props.children : <Input defaultValue={defaultValue} {...props} />}
    </div>
  )
}

function EffectPanel({ children, title }) {
  return (
    <fieldset className="rounded-md border p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <div className="grid gap-3 md:grid-cols-3">{children}</div>
    </fieldset>
  )
}

function RadioOption({ checked, defaultChecked = false, label, name, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        checked={checked}
        defaultChecked={defaultChecked}
        name={name}
        onChange={onChange}
        type="radio"
      />
      {label}
    </label>
  )
}

export { ExtraConcepts }
