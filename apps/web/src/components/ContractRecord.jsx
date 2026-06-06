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
import { useEffect, useState } from "react"
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
import {
  createContract,
  deleteContract,
  updateContract,
} from "@/services/contractsService"
import { getProperties } from "@/services/propertiesService"
import { getTenants } from "@/services/tenantsService"

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

function ContractRecord({ contract, onBack, onSaved }) {
  const { t } = useTranslation()
  const today = formatDateValue(new Date())
  const [activeTab, setActiveTab] = useState("mainData")
  const [form, setForm] = useState(() => ({
    folder: contract.folder ?? "",
    startDate: contract.startDate ?? today,
    endDate: contract.end ?? calculateEndDate(contract.startDate ?? today, "24"),
    status: contract.status === "Vencido" ? "EXPIRED" : "ACTIVE",
    propertyId: contract.propertyId ?? "",
    tenantId: contract.tenantId ?? "",
    ownerId: contract.ownerId ?? "",
  }))
  const [installments, setInstallments] = useState("24")
  const [adjustmentInterval, setAdjustmentInterval] = useState(() =>
    loadContractRecordSetting(contract.id, "adjustmentInterval", "4"),
  )
  const [adjustmentType, setAdjustmentType] = useState(() =>
    loadContractRecordSetting(contract.id, "adjustmentType", "ICL"),
  )
  const [properties, setProperties] = useState([])
  const [tenants, setTenants] = useState([])
  const [terminationDate, setTerminationDate] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isNewPropertyOpen, setIsNewPropertyOpen] = useState(false)
  const [isNewTenantOpen, setIsNewTenantOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const selectedProperty = properties.find((property) => property.id === form.propertyId)
  const selectedTenant = tenants.find((tenant) => tenant.id === form.tenantId)
  const propertyDisplayValue = selectedProperty?.address ?? contract.address ?? ""
  const tenantDisplayValue = selectedTenant
    ? formatPersonName(selectedTenant.person)
    : contract.tenant ?? ""
  const periodRows = getPeriodRows(Number(installments), Number(adjustmentInterval))

  useEffect(() => {
    let ignore = false

    loadOptions()

    async function loadOptions() {
      try {
        const [apiProperties, apiTenants] = await Promise.all([
          getProperties(),
          getTenants(),
        ])

        if (!ignore) {
          setProperties(apiProperties)
          setTenants(apiTenants)
        }
      } catch (apiError) {
        if (!ignore) {
          setError(apiError.message)
        }
      }
    }

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    saveContractRecordSetting(contract.id, "adjustmentInterval", adjustmentInterval)
  }, [adjustmentInterval, contract.id])

  useEffect(() => {
    saveContractRecordSetting(contract.id, "adjustmentType", adjustmentType)
  }, [adjustmentType, contract.id])

  function updateField(name, value) {
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function updateStartDate(value) {
    setForm((currentForm) => ({
      ...currentForm,
      endDate: calculateEndDate(value, installments),
      startDate: value,
    }))
  }

  function updateInstallments(value) {
    setInstallments(value)
    setForm((currentForm) => ({
      ...currentForm,
      endDate: calculateEndDate(currentForm.startDate, value),
    }))
  }

  function updateAdjustmentInterval(value) {
    const numericValue = Number(value)

    if (value === "" || Number.isNaN(numericValue)) {
      setAdjustmentInterval(value)
      return
    }

    setAdjustmentInterval(String(Math.min(12, Math.max(0, numericValue))))
  }

  function selectProperty(propertyId) {
    const nextProperty = properties.find((property) => property.id === propertyId)
    const nextOwnerId =
      nextProperty?.owners.find((propertyOwner) => propertyOwner.isPrimary)?.ownerId ??
      nextProperty?.owners[0]?.ownerId ??
      form.ownerId

    setForm((currentForm) => ({
      ...currentForm,
      propertyId,
      ownerId: nextOwnerId,
      folder: nextProperty?.folder ?? currentForm.folder,
    }))
  }

  function selectTenant(tenantId) {
    setForm((currentForm) => ({ ...currentForm, tenantId }))
  }

  function handleDelete() {
    if (!pendingDelete) {
      setPendingDelete(true)
      setMessage(t("contractRecord.messages.confirmDelete"))
      return
    }

    if (!contract.id) {
      onBack()
      return
    }

    deleteContract(contract.id)
      .then(() => {
        setMessage(t("contractRecord.messages.deleted"))
        setPendingDelete(false)
        onSaved?.()
        onBack()
      })
      .catch((apiError) => setError(apiError.message))
  }

  function handleRenew() {
    const renewedEndDate = addMonths(form.endDate, 24)
    updateField("endDate", renewedEndDate)
    updateField("status", "ACTIVE")
    setMessage(t("contractRecord.messages.renewed", { date: renewedEndDate }))
  }

  function handleDownload() {
    const content = [
      t("contractRecord.title"),
      `${t("entities.property")}: ${contract.address}`,
      `${t("entities.tenant")}: ${contract.tenant}`,
      `${t("contractRecord.fields.end")}: ${form.endDate}`,
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
    saveContract()
  }

  async function saveContract() {
    setError("")
    setIsSaving(true)

    try {
      const payload = {
        folder: form.folder,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        propertyId: form.propertyId,
        tenantId: form.tenantId,
        ownerId: form.ownerId,
      }

      if (contract.id) {
        await updateContract(contract.id, payload)
      } else {
        await createContract(payload)
      }

      setPendingDelete(false)
      onSaved?.()
      onBack()
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setIsSaving(false)
    }
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

      {message || error ? (
        <div className="border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          {error || message}
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
              onChange={(value) => updateField("startDate", value)}
              value={form.startDate}
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
              onSelect={selectProperty}
              options={properties.map((property) => ({
                label: `${property.folder} - ${property.address}`,
                value: property.id,
              }))}
              selectedId={form.propertyId}
              value={propertyDisplayValue}
            />
            <EntityPicker
              icon={User}
              label={t("entities.tenant")}
              name="tenant"
              onNew={() => setIsNewTenantOpen(true)}
              onViewData={() => setActiveTab("tenantAndGuarantors")}
              onSelect={selectTenant}
              options={tenants.map((tenant) => ({
                label: formatPersonName(tenant.person),
                value: tenant.id,
              }))}
              selectedId={form.tenantId}
              value={tenantDisplayValue}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title={t("contractRecord.sections.periods")}>
              <div className="grid gap-3 md:grid-cols-[160px_80px_150px_70px_120px]">
                <DatePickerField
                  label={t("contractRecord.fields.start")}
                  onChange={updateStartDate}
                  value={form.startDate}
                />
                <Field
                  label={t("contractRecord.fields.installments")}
                  onChange={(event) => updateInstallments(event.target.value)}
                  value={installments}
                />
                <Field
                  label={t("contractRecord.fields.end")}
                  onChange={(event) => updateField("endDate", event.target.value)}
                  value={form.endDate}
                />
                <Field
                  label="ajuste"
                  max="12"
                  min="0"
                  onChange={(event) => updateAdjustmentInterval(event.target.value)}
                  type="number"
                  value={adjustmentInterval}
                />
                <div className="space-y-1">
                  <Label className="font-medium text-foreground">Tipo</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {["ICL", "IPC", "OTRO"].map((option) => (
                      <label
                        className="flex h-9 items-center justify-center gap-1 border border-input bg-background px-2 text-xs font-medium"
                        key={option}
                      >
                        <input
                          checked={adjustmentType === option}
                          className="size-3 accent-primary"
                          onChange={() => setAdjustmentType(option)}
                          type="checkbox"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {periodRows.map((untilInstallment, index) => (
                <div
                  className="grid gap-3 md:grid-cols-[220px_120px_180px]"
                  key={untilInstallment}
                >
                  <Field
                    defaultValue={index === 0 ? "$ 350.000,00" : ""}
                    label={t("contractRecord.fields.rentPeriod", {
                      period: getPeriodLabel(index, t),
                    })}
                  />
                  <Field
                    label={t("contractRecord.fields.untilInstallment")}
                    value={`${untilInstallment}`}
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
          <ToolbarButton disabled={isSaving} icon={Save} onClick={handleResetAndExit}>
            {t("actions.resetAndExit")}
          </ToolbarButton>
        </div>
      ) : null}

      {isNewPropertyOpen ? (
        <NewPropertyModal
          onClose={() => setIsNewPropertyOpen(false)}
          onSaved={(property) => {
            setProperties((currentProperties) => [property, ...currentProperties])
            setForm((currentForm) => ({
              ...currentForm,
              folder: property.folder,
              ownerId:
                property.owners.find((propertyOwner) => propertyOwner.isPrimary)
                  ?.ownerId ??
                property.owners[0]?.ownerId ??
                currentForm.ownerId,
              propertyId: property.id,
            }))
          }}
        />
      ) : null}
      {isNewTenantOpen ? (
        <NewTenantModal
          onClose={() => setIsNewTenantOpen(false)}
          onSaved={(tenant) => {
            setTenants((currentTenants) => [tenant, ...currentTenants])
            selectTenant(tenant.id)
          }}
        />
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
  const [administrationMode, setAdministrationMode] = useState("percent")

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
              <div className="grid gap-4 md:grid-cols-[minmax(260px,1fr)_120px_220px]">
                <Field
                  defaultValue={contract.owner}
                  label={t("propertyDetail.fields.owner")}
                />
                <Field
                  defaultValue="100"
                  label={t("propertyDetail.fields.participation")}
                />
                <div className="space-y-1">
                  <Label className="font-medium text-foreground">
                    {t("propertyDetail.fields.administration")}
                  </Label>
                  <div className="grid grid-cols-[1fr_80px] gap-2">
                    <Input
                      aria-label={t("propertyDetail.fields.administration")}
                      defaultValue="5"
                      inputMode="decimal"
                    />
                    <select
                      aria-label="Tipo de administracion"
                      className="h-9 border border-input bg-background px-2 text-sm text-foreground"
                      onChange={(event) => setAdministrationMode(event.target.value)}
                      value={administrationMode}
                    >
                      <option value="percent">%</option>
                      <option value="fixed">$</option>
                    </select>
                  </div>
                </div>
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

function EntityPicker({
  icon: Icon,
  label,
  name,
  onNew,
  onSelect,
  onViewData,
  options,
  selectedId,
  value,
}) {
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
        onChange={(event) => onSelect(event.target.value)}
        value={selectedId}
      >
        <option value="">{t("actions.choose")}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Label className="pb-1 font-medium text-foreground" htmlFor={name}>
        {label}
      </Label>
      <Input aria-label={label} id={name} name={name} readOnly value={value} />
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
  max,
  min,
  name,
  onChange,
  type = "text",
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
        max={max}
        min={min}
        name={name}
        onChange={onChange}
        type={type}
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

function ToolbarButton({
  children,
  disabled = false,
  icon: Icon,
  onClick,
  variant = "secondary",
}) {
  return (
    <Button disabled={disabled} onClick={onClick} size="sm" variant={variant}>
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

function calculateEndDate(startDateValue, installmentsValue) {
  const startDate = parseDateValue(startDateValue)
  const installments = Number(installmentsValue)

  if (!startDate || !Number.isFinite(installments) || installments < 1) {
    return ""
  }

  const endDate = new Date(startDate)

  endDate.setMonth(endDate.getMonth() + installments - 1)
  endDate.setDate(endDate.getDate() - 1)

  return formatDateValue(endDate)
}

function getPeriodRows(installmentsValue, adjustmentValue) {
  const installments = Math.max(0, Math.floor(installmentsValue || 0))
  const rawAdjustment = Math.floor(adjustmentValue || 0)
  const adjustment = Math.min(12, Math.max(0, rawAdjustment))
  const rows = []

  if (adjustment === 0) {
    return installments > 0 ? [installments] : []
  }

  for (
    let untilInstallment = adjustment;
    untilInstallment <= installments;
    untilInstallment += adjustment
  ) {
    rows.push(untilInstallment)
  }

  if (installments > 0 && rows.at(-1) !== installments) {
    rows.push(installments)
  }

  return rows
}

function getPeriodLabel(index, translate) {
  return periodKeys[index] ? translate(periodKeys[index]) : `${index + 1}to.`
}

function loadContractRecordSetting(contractId, key, fallbackValue) {
  if (!contractId || typeof window === "undefined") {
    return fallbackValue
  }

  return (
    window.localStorage.getItem(`contract-record:${contractId}:${key}`) ??
    fallbackValue
  )
}

function saveContractRecordSetting(contractId, key, value) {
  if (!contractId || typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(`contract-record:${contractId}:${key}`, value)
}

function formatPersonName(person) {
  return `${person.lastName}, ${person.firstName}`.toLowerCase()
}

export { ContractRecord }
