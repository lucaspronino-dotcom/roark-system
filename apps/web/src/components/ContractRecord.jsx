import {
  ArrowLeft,
  CalendarDays,
  Download,
  Home,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  User,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { NewPropertyModal } from "@/components/NewPropertyModal"
import { NewTenantModal } from "@/components/NewTenantModal"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const tabKeys = [
  "contractRecord.tabs.mainData",
  "contractRecord.tabs.owners",
  "contractRecord.tabs.tenantAndGuarantors",
]

const periodKeys = [
  "contractRecord.periods.first",
  "contractRecord.periods.second",
  "contractRecord.periods.third",
  "contractRecord.periods.fourth",
  "contractRecord.periods.fifth",
  "contractRecord.periods.sixth",
]

function ContractRecord({ contract, onBack }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("mainData")
  const [createdAt, setCreatedAt] = useState("1/1/2026")
  const [endDate, setEndDate] = useState(contract.end)
  const [terminationDate, setTerminationDate] = useState("")
  const [message, setMessage] = useState("")
  const [isNewPropertyOpen, setIsNewPropertyOpen] = useState(false)
  const [isNewTenantOpen, setIsNewTenantOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)

  function handleDelete() {
    if (!pendingDelete) {
      setPendingDelete(true)
      setMessage(t("contractRecord.messages.confirmDelete"))
      return
    }

    setMessage(t("contractRecord.messages.deleted"))
    setPendingDelete(false)
  }

  function handleRenew() {
    const renewedEndDate = addMonths(endDate, 24)
    setEndDate(renewedEndDate)
    setMessage(t("contractRecord.messages.renewed", { date: renewedEndDate }))
  }

  function handleDownload() {
    const content = [
      t("contractRecord.title"),
      `${t("entities.property")}: ${contract.address}`,
      `${t("entities.tenant")}: ${contract.tenant}`,
      `${t("contractRecord.fields.end")}: ${endDate}`,
    ].join("\n")
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = `contrato-${contract.folder}.txt`
    link.click()
    URL.revokeObjectURL(url)
    setMessage(t("contractRecord.messages.downloaded"))
  }

  function handleResetAndExit() {
    setMessage("")
    setPendingDelete(false)
    onBack()
  }

  return (
    <section className="space-y-4 text-sm text-foreground">
      <Card className="border-l-4 border-l-primary bg-card shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg font-semibold text-primary">
            {t("contractRecord.title")}
          </CardTitle>
          <CardAction>
            <Button onClick={onBack} size="sm" variant="outline">
              <ArrowLeft />
              {t("actions.back")}
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-1 border-b bg-card px-2 pt-2 text-sm">
        {tabKeys.map((tabKey, index) => (
          <Button
            key={tabKey}
            onClick={() =>
              setActiveTab(
                index === 0
                  ? "mainData"
                  : index === 1
                    ? "owners"
                    : "tenantAndGuarantors",
              )
            }
            size="sm"
            variant={
              (index === 0 && activeTab === "mainData") ||
              (index === 1 && activeTab === "owners") ||
              (index === 2 && activeTab === "tenantAndGuarantors")
                ? "secondary"
                : "ghost"
            }
          >
            {t(tabKey)}
          </Button>
        ))}
      </div>

      {message ? (
        <div className="border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      {activeTab === "mainData" ? (
      <Card className="overflow-visible">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-2xl font-semibold text-primary">
            {t("contractRecord.sections.mainData")}
          </CardTitle>
          <CardAction>
            <DatePickerField
              label={t("contractRecord.fields.startDate")}
              onChange={setCreatedAt}
              value={createdAt}
            />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 rounded-none border bg-secondary/40 p-3">
            <EntityPicker
              icon={Home}
              label={t("entities.property")}
              name="property"
              onNew={() => setIsNewPropertyOpen(true)}
              onViewData={() => setActiveTab("owners")}
              value={contract.address}
            />
            <EntityPicker
              icon={User}
              label={t("entities.tenant")}
              name="tenant"
              onNew={() => setIsNewTenantOpen(true)}
              onViewData={() => setActiveTab("tenantAndGuarantors")}
              value={contract.tenant}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title={t("contractRecord.sections.periods")}>
              <div className="grid gap-3 md:grid-cols-[180px_90px_180px]">
                <Field defaultValue="1/1/2026" label={t("contractRecord.fields.start")} />
                <Field defaultValue="24" label={t("contractRecord.fields.installments")} />
                <Field
                  label={t("contractRecord.fields.end")}
                  onChange={(event) => setEndDate(event.target.value)}
                  value={endDate}
                />
              </div>

              {periodKeys.map((periodKey, index) => (
                <div
                  className="grid gap-3 md:grid-cols-[220px_120px_180px]"
                  key={periodKey}
                >
                  <Field
                    defaultValue={index === 0 ? "$ 350.000,00" : ""}
                    label={t("contractRecord.fields.rentPeriod", {
                      period: t(periodKey),
                    })}
                  />
                  <Field
                    defaultValue={`${12 + index * 4}`}
                    label={t("contractRecord.fields.untilInstallment")}
                  />
                  <Field defaultValue="$ 0,00" label={t("contractRecord.fields.extras")} />
                </div>
              ))}
            </Section>

            <div className="space-y-6">
              <Section title={t("contractRecord.sections.surcharges")}>
                <div className="max-w-[170px] space-y-3">
                  <Field
                    defaultValue="1/1/2026"
                    label={t("contractRecord.fields.firstPaymentDate")}
                  />
                  <Field defaultValue="10" label={t("contractRecord.fields.graceDays")} />
                  <Field defaultValue="1" label={t("contractRecord.fields.chargeFromDay")} />
                  <Field defaultValue="10" label={t("contractRecord.fields.finalPayment")} />
                  <Field
                    defaultValue="1,00%"
                    label={t("contractRecord.fields.dailyPercentagePoints")}
                  />
                  <Field
                    defaultValue="$0,00"
                    label={t("contractRecord.fields.fixedDailyPoints")}
                  />
                </div>
              </Section>

              <Section title={t("contractRecord.sections.terminate")}>
                <div className="grid max-w-sm gap-3 md:grid-cols-[220px_100px] md:items-end">
                  <DatePickerField
                    label={t("contractRecord.fields.date")}
                    onChange={setTerminationDate}
                    placement="top"
                    value={terminationDate}
                  />
                  <label className="flex items-center gap-2 pb-2 text-sm font-medium">
                    <input className="size-4 accent-primary" type="checkbox" />
                    {t("contractRecord.fields.termination")}
                  </label>
                </div>
              </Section>
            </div>
          </div>
        </CardContent>
      </Card>
      ) : null}

      {activeTab === "owners" ? (
        <ContractOwnersPanel
          contract={contract}
          onBack={() => setActiveTab("mainData")}
        />
      ) : null}

      {activeTab === "tenantAndGuarantors" ? (
        <TenantAndGuarantorsPanel
          contract={contract}
          onBack={() => setActiveTab("mainData")}
        />
      ) : null}

      {activeTab === "mainData" ? (
        <div className="flex flex-wrap gap-2 border bg-muted/40 p-2">
          <ToolbarButton
            icon={Trash2}
            onClick={handleDelete}
            variant={pendingDelete ? "destructive" : "secondary"}
          >
            {pendingDelete ? t("actions.confirm") : t("actions.delete")}
          </ToolbarButton>
          {pendingDelete ? (
          <ToolbarButton
            icon={ArrowLeft}
            onClick={() => {
              setPendingDelete(false)
              setMessage("")
            }}
            variant="outline"
          >
            {t("actions.cancel")}
          </ToolbarButton>
          ) : null}
          <ToolbarButton icon={RotateCcw} onClick={handleRenew}>
            {t("actions.renew")}
          </ToolbarButton>
          <ToolbarButton icon={Download} onClick={handleDownload}>
            {t("actions.download")}
          </ToolbarButton>
          <ToolbarButton icon={Save} onClick={handleResetAndExit}>
            {t("actions.resetAndExit")}
          </ToolbarButton>
        </div>
      ) : null}

      {isNewPropertyOpen ? (
        <NewPropertyModal onClose={() => setIsNewPropertyOpen(false)} />
      ) : null}
      {isNewTenantOpen ? (
        <NewTenantModal onClose={() => setIsNewTenantOpen(false)} />
      ) : null}
    </section>
  )
}

function TenantAndGuarantorsPanel({ contract, onBack }) {
  const { t } = useTranslation()
  const [tenantForms, setTenantForms] = useState([1])
  const [guarantorForms, setGuarantorForms] = useState([1])

  function addTenantForm() {
    setTenantForms((currentForms) => [...currentForms, currentForms.length + 1])
  }

  function addGuarantorForm() {
    setGuarantorForms((currentForms) => [
      ...currentForms,
      currentForms.length + 1,
    ])
  }

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <PersonDataColumn
            addLabel={t("newTenant.actions.addAnother")}
            defaultName={contract.tenant}
            forms={tenantForms}
            onAdd={addTenantForm}
            title={t("contractRecord.sections.tenant")}
          />
          <PersonDataColumn
            addLabel={t("newTenant.actions.addAnother")}
            forms={guarantorForms}
            onAdd={addGuarantorForm}
            title={t("contractRecord.sections.guarantors")}
          />
        </div>
        <div className="flex justify-end border-t pt-4">
          <Button onClick={onBack} variant="outline">
            <ArrowLeft />
            {t("actions.back")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PersonDataColumn({ addLabel, defaultName = "", forms, onAdd, title }) {
  return (
    <section className="space-y-6">
      {forms.map((formNumber) => (
        <PersonDataSection
          defaultName={formNumber === 1 ? defaultName : ""}
          formNumber={formNumber}
          key={formNumber}
          title={title}
        />
      ))}
      <Button onClick={onAdd} variant="outline">
        <Plus />
        {addLabel}
      </Button>
    </section>
  )
}

function PersonDataSection({ defaultName = "", formNumber = 1, title }) {
  const { t } = useTranslation()
  const renderedTitle = formNumber > 1 ? `${title} ${formNumber}` : title

  return (
    <section className="space-y-4">
      <PanelTitle>{renderedTitle}</PanelTitle>
      <div className="space-y-3">
        <Field defaultValue={defaultName} label={t("newTenant.fields.name")} />
        <Field label={t("newTenant.fields.lastName")} />
        <Field label={t("newTenant.fields.dni")} />
        <Field label={t("newTenant.fields.address")} />
        <Field label={t("newTenant.fields.phone")} />
        <Field label={t("newTenant.fields.email")} />
      </div>
    </section>
  )
}

function ContractOwnersPanel({ contract, onBack }) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardContent className="space-y-8 overflow-x-auto pt-6">
        <div className="grid min-w-[900px] gap-8 lg:grid-cols-[minmax(360px,1fr)_minmax(520px,1.7fr)]">
          <section className="space-y-4">
            <PanelTitle>{t("contractOwners.sections.mainData")}</PanelTitle>
            <Field defaultValue={contract.folder} label={t("propertyDetail.fields.folder")} />
            <Field
              defaultValue={contract.address}
              label={t("propertyDetail.fields.address")}
            />
            <div className="space-y-1">
              <Label>
                {t("contractOwners.fields.description")}:
              </Label>
              <Input />
            </div>
          </section>

          <section className="space-y-4">
            <PanelTitle>{t("contractOwners.sections.owners")}</PanelTitle>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[minmax(260px,1fr)_120px_130px]">
                <Field
                  defaultValue={contract.owner}
                  label={t("propertyDetail.fields.owner")}
                />
                <Field label={t("propertyDetail.fields.participation")} />
                <Field label={t("propertyDetail.fields.administration")} />
              </div>
              <Field label={t("contractOwners.fields.bankAccountCbu")} />
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button onClick={onBack} variant="outline">
            <ArrowLeft />
            {t("actions.back")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PanelTitle({ children }) {
  return (
    <h2 className="border-b border-primary/40 pb-1 text-2xl font-semibold text-primary">
      {children}
    </h2>
  )
}

function EntityPicker({ icon: Icon, label, name, onNew, onViewData, value }) {
  const { t } = useTranslation()

  return (
    <div className="grid items-end gap-2 md:grid-cols-[160px_120px_80px_1fr_120px]">
      <Button onClick={onNew} size="sm" variant="outline">
        <Icon />
        {t("actions.newEntity", { entity: label })}
      </Button>
      <select
        aria-label={t("actions.selectEntity", { entity: label })}
        className="h-8 border border-input bg-background px-2 text-sm text-foreground"
        defaultValue=""
      >
        <option value="">{t("actions.choose")}</option>
      </select>
      <Label className="pb-1 font-medium text-foreground" htmlFor={name}>
        {label}
      </Label>
      <Input aria-label={label} defaultValue={value} id={name} name={name} />
      <Button onClick={onViewData} size="sm" variant="outline">
        <Home />
        {t("actions.viewData")}
      </Button>
    </div>
  )
}

function Section({ children, title }) {
  return (
    <Card className="overflow-visible" size="sm">
      <CardHeader>
        <CardTitle className="border-b border-primary/40 pb-1 text-xl font-semibold text-primary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  )
}

function Field({
  ariaLabel,
  className,
  defaultValue = "",
  label,
  name,
  onChange,
  value,
}) {
  return (
    <div className="space-y-1">
      {label ? (
        <Label className="font-medium text-foreground" htmlFor={name ?? label}>
          {label}
        </Label>
      ) : null}
      <Input
        aria-label={ariaLabel}
        className={className ?? "border-border bg-background text-foreground"}
        defaultValue={value === undefined ? defaultValue : undefined}
        id={name ?? label}
        name={name}
        onChange={onChange}
        value={value}
      />
    </div>
  )
}

function DatePickerField({ label, onChange, placement = "bottom", value }) {
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
        <div
          className={[
            "absolute right-0 z-50 w-72 border bg-popover p-3 text-popover-foreground shadow-lg",
            placement === "top"
              ? "bottom-0 left-full right-auto ml-3"
              : "top-full mt-2",
          ].join(" ")}
        >
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
                    isSelected ? "bg-primary text-primary-foreground hover:bg-primary" : "",
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

function ToolbarButton({ children, icon: Icon, onClick, variant = "secondary" }) {
  return (
    <Button onClick={onClick} size="sm" variant={variant}>
      <Icon />
      {children}
    </Button>
  )
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

function parseDateValue(value) {
  const [day, month, year] = value.split("/").map(Number)
  const date = new Date(year, month - 1, day)

  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateValue(date) {
  return new Intl.DateTimeFormat("es-AR").format(date)
}

function addMonths(dateValue, amount) {
  const [day, month, year] = dateValue.split("/").map(Number)
  const date = new Date(year, month - 1, day)

  if (Number.isNaN(date.getTime())) {
    return dateValue
  }

  date.setMonth(date.getMonth() + amount)

  return new Intl.DateTimeFormat("es-AR").format(date)
}

export { ContractRecord }
