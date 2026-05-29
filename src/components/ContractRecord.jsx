import {
  ArrowLeft,
  CalendarDays,
  Download,
  Home,
  RotateCcw,
  Save,
  Trash2,
  User,
} from "lucide-react"
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

const tabKeys = [
  "contractRecord.tabs.mainData",
  "contractRecord.tabs.owners",
  "contractRecord.tabs.guarantors",
  "contractRecord.tabs.notes",
  "contractRecord.tabs.specialSettings",
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
            size="sm"
            variant={index === 0 ? "secondary" : "ghost"}
          >
            {t(tabKey)}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-2xl font-semibold text-primary">
            {t("contractRecord.sections.mainData")}
          </CardTitle>
          <CardAction>
            <Field
              className="border-primary/30 bg-primary/10"
              defaultValue="1/1/2026"
              label={t("contractRecord.fields.startDate")}
              name="createdAt"
            />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 rounded-none border bg-secondary/40 p-3">
            <EntityPicker
              icon={Home}
              label={t("entities.property")}
              name="property"
              value={contract.address}
            />
            <EntityPicker
              icon={User}
              label={t("entities.tenant")}
              name="tenant"
              value={contract.tenant}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title={t("contractRecord.sections.periods")}>
              <div className="grid gap-3 md:grid-cols-3">
                <Field defaultValue="1/1/2026" label={t("contractRecord.fields.start")} />
                <Field defaultValue="24" label={t("contractRecord.fields.installments")} />
                <Field defaultValue={contract.end} label={t("contractRecord.fields.end")} />
              </div>

              {periodKeys.map((periodKey, index) => (
                <div className="grid gap-3 md:grid-cols-3" key={periodKey}>
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
                <div className="grid gap-3 md:grid-cols-2">
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
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label={t("contractRecord.fields.date")} />
                  <Field label={t("contractRecord.fields.termination")} />
                </div>
              </Section>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border bg-muted/40 p-2">
        <ToolbarButton icon={Trash2}>{t("actions.delete")}</ToolbarButton>
        <ToolbarButton icon={RotateCcw}>{t("actions.renew")}</ToolbarButton>
        <ToolbarButton icon={Download}>{t("actions.download")}</ToolbarButton>
        <ToolbarButton icon={CalendarDays}>{t("contractRecord.tabs.notes")}</ToolbarButton>
        <ToolbarButton icon={Save}>{t("actions.resetAndExit")}</ToolbarButton>
      </div>
    </section>
  )
}

function EntityPicker({ icon: Icon, label, name, value }) {
  const { t } = useTranslation()

  return (
    <div className="grid items-end gap-2 md:grid-cols-[160px_120px_80px_1fr_120px]">
      <Button size="sm" variant="outline">
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
      <Button size="sm" variant="outline">
        <Home />
        {t("actions.viewData")}
      </Button>
    </div>
  )
}

function Section({ children, title }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="border-b border-primary/40 pb-1 text-xl font-semibold text-primary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  )
}

function Field({ ariaLabel, className, defaultValue = "", label, name }) {
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
        defaultValue={defaultValue}
        id={name ?? label}
        name={name}
      />
    </div>
  )
}

function ToolbarButton({ children, icon: Icon }) {
  return (
    <Button size="sm" variant="secondary">
      <Icon />
      {children}
    </Button>
  )
}

export { ContractRecord }
