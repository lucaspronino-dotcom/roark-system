import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Save,
  Trash2,
} from "lucide-react"
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

function ExtraConcepts({
  concepts,
  onAddToAccount,
  onConceptsChange,
  onRemoveFromAccount,
}) {
  const { t } = useTranslation()
  const currentDate = new Intl.DateTimeFormat("es-AR").format(new Date())
  const [localConcepts, setLocalConcepts] = useState([])
  const [date, setDate] = useState(currentDate)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [tenantEffect, setTenantEffect] = useState("none")
  const [error, setError] = useState("")
  const [selectedConcept, setSelectedConcept] = useState(null)
  const [isNewRegularConceptOpen, setIsNewRegularConceptOpen] = useState(false)
  const visibleConcepts = concepts ?? localConcepts
  const setConcepts = onConceptsChange ?? setLocalConcepts

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
    const conceptToRemove = visibleConcepts[index]

    setConcepts((currentConcepts) =>
      currentConcepts.filter((_, conceptIndex) => conceptIndex !== index),
    )
    onRemoveFromAccount?.(
      conceptToRemove?.accountDescription ?? conceptToRemove?.detail,
    )
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
              {visibleConcepts.map((concept, index) => (
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
            <Button
              onClick={() => setIsNewRegularConceptOpen(true)}
              variant="outline"
            >
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
            const conceptIndex = visibleConcepts.findIndex(
              (concept) => concept.detail === selectedConcept.detail,
            )

            if (conceptIndex >= 0) {
              removeConcept(conceptIndex)
            }

            setSelectedConcept(null)
          }}
        />
      ) : null}

      {isNewRegularConceptOpen ? (
        <RegularConceptModal
          onClose={() => setIsNewRegularConceptOpen(false)}
          onSave={(concept, accountItem) => {
            setConcepts((currentConcepts) => [...currentConcepts, concept])

            if (accountItem) {
              onAddToAccount?.(accountItem)
            }

            setIsNewRegularConceptOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

function RegularConceptModal({ concept, onClose, onDelete, onSave }) {
  const { t } = useTranslation()
  const isEditing = Boolean(concept)
  const currentDate = new Intl.DateTimeFormat("es-AR").format(new Date())
  const [conceptName, setConceptName] = useState(concept?.detail ?? "")
  const [conceptAmount, setConceptAmount] = useState(concept?.amount ?? "")
  const [tenantEffect, setTenantEffect] = useState("addToPayment")
  const [ownerEffect, setOwnerEffect] = useState("addToOwner")
  const [startDate, setStartDate] = useState(currentDate)
  const [endDate, setEndDate] = useState("4/12/2026")
  const [monthMode, setMonthMode] = useState("all")
  const [selectedMonths, setSelectedMonths] = useState(months)
  const [error, setError] = useState("")

  function toggleMonth(month) {
    setSelectedMonths((currentMonths) => {
      const nextMonths = currentMonths.includes(month)
        ? currentMonths.filter((currentMonth) => currentMonth !== month)
        : [...currentMonths, month]

      setMonthMode(nextMonths.length === months.length ? "all" : "custom")

      return nextMonths
    })
  }

  function selectAllMonths() {
    setMonthMode("all")
    setSelectedMonths(months)
  }

  function handleSave() {
    const cleanConceptName = conceptName.trim()
    const numericAmount = getNumericAmount(conceptAmount)

    if (!cleanConceptName) {
      setError(t("extraConcepts.validation.descriptionRequired"))
      return
    }

    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setError(t("extraConcepts.validation.amountRequired"))
      return
    }

    const accountItem =
      tenantEffect === "addToPayment" || tenantEffect === "discountPayment"
        ? {
            apply: true,
            detail: cleanConceptName,
            dueDate: startDate,
            edit:
              tenantEffect === "discountPayment"
                ? -numericAmount
                : numericAmount,
            isRegularConcept: true,
            penalty: "$ 0,00",
          }
        : null

    onSave?.({
      amount: formatCurrency(numericAmount),
      detail: cleanConceptName,
      numericAmount:
        tenantEffect === "discountPayment" ? -numericAmount : numericAmount,
    }, accountItem)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-sm">
      <Card className="max-h-[90vh] w-full max-w-4xl overflow-auto shadow-lg">
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

          <div className="grid max-w-lg gap-4">
            <Field label={t("extraConcepts.regularModal.concept")}>
              <Input
                onChange={(event) => setConceptName(event.target.value)}
                value={conceptName}
              />
            </Field>

            <Field label={t("extraConcepts.regularModal.amount")}>
              <Input
                inputMode="numeric"
                onChange={(event) =>
                  setConceptAmount(formatMoneyInput(event.target.value))
                }
                value={conceptAmount}
              />
            </Field>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <EffectPanel title={t("extraConcepts.tenant.title")}>
              <RadioOption
                checked={tenantEffect === "none"}
                label={t("extraConcepts.effects.noEffect")}
                name="regular-tenant-effect"
                onChange={() => setTenantEffect("none")}
              />
              <RadioOption
                checked={tenantEffect === "addToPayment"}
                label={t("extraConcepts.effects.addToPayment")}
                name="regular-tenant-effect"
                onChange={() => setTenantEffect("addToPayment")}
              />
              <RadioOption
                checked={tenantEffect === "discountPayment"}
                label={t("extraConcepts.effects.discountPayment")}
                name="regular-tenant-effect"
                onChange={() => setTenantEffect("discountPayment")}
              />
            </EffectPanel>

            <EffectPanel title={t("extraConcepts.owner.title")}>
              <RadioOption
                checked={ownerEffect === "none"}
                label={t("extraConcepts.effects.noEffect")}
                name="regular-owner-effect"
                onChange={() => setOwnerEffect("none")}
              />
              <RadioOption
                checked={ownerEffect === "addToOwner"}
                label={t("extraConcepts.effects.addToOwner")}
                name="regular-owner-effect"
                onChange={() => setOwnerEffect("addToOwner")}
              />
              <RadioOption
                checked={ownerEffect === "discountOwner"}
                label={t("extraConcepts.effects.discountOwner")}
                name="regular-owner-effect"
                onChange={() => setOwnerEffect("discountOwner")}
              />
            </EffectPanel>
          </div>

          <fieldset className="rounded-md border p-4">
            <legend className="px-1 text-sm font-semibold">
              {t("extraConcepts.regularModal.applicationPeriod")}
            </legend>
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-[180px_180px]">
                <DatePickerField
                  label={t("extraConcepts.regularModal.startDate")}
                  onChange={setStartDate}
                  value={startDate}
                />
                <Field label={t("extraConcepts.regularModal.endDate")}>
                  <Input
                    onChange={(event) => setEndDate(event.target.value)}
                    value={endDate}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-start gap-5">
                <RadioOption
                  checked={monthMode === "all"}
                  label={t("extraConcepts.owner.all")}
                  name="month-mode"
                  onChange={selectAllMonths}
                />
                <div className="grid flex-1 grid-cols-6 gap-4 md:grid-cols-12">
                  {months.map((month) => (
                    <label
                      className="flex flex-col items-center gap-2 text-xs"
                      key={month}
                    >
                      <span>{month}</span>
                      <input
                        checked={selectedMonths.includes(month)}
                        onChange={() => toggleMonth(month)}
                        type="checkbox"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </fieldset>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t pt-4">
            {isEditing ? (
              <Button onClick={onDelete} variant="outline">
                <Trash2 />
                {t("actions.delete")}
              </Button>
            ) : null}
            <Button onClick={isEditing ? onClose : handleSave}>
              <Save />
              {isEditing
                ? t("extraConcepts.regularModal.saveAndExit")
                : t("extraConcepts.regularModal.loadConcept")}
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
  const controlProps =
    checked === undefined ? { defaultChecked } : { checked, onChange }

  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        name={name}
        type="radio"
        {...controlProps}
      />
      {label}
    </label>
  )
}

function DatePickerField({ label, onChange, value }) {
  const { t } = useTranslation()
  const selectedDate = parseDateValue(value) ?? new Date()
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  )

  function selectDate(date) {
    onChange(formatDateValue(date))
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    setIsOpen(false)
  }

  function moveMonth(amount) {
    setVisibleMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + amount, 1),
    )
  }

  return (
    <div className="relative space-y-1">
      <Label>{label}</Label>
      <div className="flex">
        <Input
          className="border-primary/30 bg-primary/10"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
        <Button
          aria-label={t("contractRecord.calendar.open")}
          className="border-l-0"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          size="icon"
          type="button"
          variant="outline"
        >
          <CalendarDays />
        </Button>
      </div>

      {isOpen ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 border bg-popover p-3 text-popover-foreground shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <Button
              aria-label={t("contractRecord.calendar.previousMonth")}
              onClick={() => moveMonth(-1)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <ArrowLeft />
            </Button>
            <div className="text-sm font-semibold capitalize">
              {visibleMonth.toLocaleDateString("es-AR", {
                month: "long",
                year: "numeric",
              })}
            </div>
            <Button
              aria-label={t("contractRecord.calendar.nextMonth")}
              onClick={() => moveMonth(1)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <ArrowLeft className="rotate-180" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {["do", "lu", "ma", "mi", "ju", "vi", "sa"].map((dayName) => (
              <span key={dayName}>{dayName}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {getCalendarDays(visibleMonth).map((date) => {
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()
              const isSelected = isSameDay(date, selectedDate)

              return (
                <button
                  className={[
                    "h-8 text-sm transition-colors hover:bg-muted",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
                    isSelected
                      ? "bg-primary text-primary-foreground hover:bg-primary"
                      : "",
                  ].join(" ")}
                  key={date.toISOString()}
                  onClick={() => selectDate(date)}
                  type="button"
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex justify-center border-t pt-3">
            <Button onClick={() => selectDate(new Date())} size="sm" type="button">
              {t("contractRecord.calendar.today")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function getNumericAmount(value) {
  const normalizedValue = String(value)
    .replaceAll("$", "")
    .replaceAll(" ", "")
    .replaceAll(".", "")
    .replace(",", ".")

  return Number(normalizedValue) || 0
}

function formatMoneyInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "")

  if (!digits) {
    return ""
  }

  return formatCurrency(Number(digits))
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    currency: "ARS",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(Number(value || 0))
}

function parseDateValue(value) {
  const [day, month, year] = String(value).split("/").map(Number)
  const date = new Date(year, month - 1, day)

  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateValue(date) {
  return new Intl.DateTimeFormat("es-AR").format(date)
}

function getCalendarDays(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  const days = []

  startDate.setDate(firstDay.getDate() - firstDay.getDay())

  for (let dayIndex = 0; dayIndex < 42; dayIndex += 1) {
    const date = new Date(startDate)

    date.setDate(startDate.getDate() + dayIndex)
    days.push(date)
  }

  return days
}

function isSameDay(firstDate, secondDate) {
  return (
    firstDate.getDate() === secondDate.getDate() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getFullYear() === secondDate.getFullYear()
  )
}

export { ExtraConcepts }
