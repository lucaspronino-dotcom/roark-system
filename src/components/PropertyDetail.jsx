import { ArrowLeft, Plus, Save, Trash2, User } from "lucide-react"
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
  "propertyDetail.tabs.mainData",
  "propertyDetail.tabs.secondaryData",
  "propertyDetail.tabs.recordData",
  "propertyDetail.tabs.attachments",
  "propertyDetail.tabs.brochure",
  "propertyDetail.tabs.portals",
  "propertyDetail.tabs.providers",
]

function PropertyDetail({ property, onBack }) {
  const { t } = useTranslation()

  return (
    <section className="space-y-4 text-sm text-foreground">
      <Card className="border-l-4 border-l-primary shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg font-semibold text-primary">
            {t("propertyDetail.title")}
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

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Section title={t("propertyDetail.sections.mainData")}>
          <Field defaultValue={property.folder} label={t("propertyDetail.fields.folder")} />
          <SelectField
            defaultValue={t("propertyDetail.values.lot")}
            label={t("propertyDetail.fields.type")}
          />
          <SelectField
            defaultValue={t("propertyDetail.values.rented")}
            label={t("propertyDetail.fields.status")}
          />
          <Field
            defaultValue={property.address}
            label={t("propertyDetail.fields.address")}
            required
          />
          <Field label={t("propertyDetail.fields.betweenStreets")} />
          <SelectField
            defaultValue="Buenos Aires Interior"
            label={t("propertyDetail.fields.province")}
          />
          <SelectField defaultValue="Olavarria" label={t("propertyDetail.fields.city")} />
          <SelectField
            defaultValue="Olavarria"
            label={t("propertyDetail.fields.neighborhood")}
          />
          <Field defaultValue="7400" label={t("propertyDetail.fields.zipCode")} />
        </Section>

        <Section title={t("propertyDetail.sections.owners")}>
          <div className="grid gap-3 md:grid-cols-[180px_1fr]">
            <Button size="sm" variant="outline">
              <Plus />
              {t("propertyDetail.actions.addOwner")}
            </Button>
            <SelectField label={t("propertyDetail.fields.orSelect")} />
          </div>

          <div className="grid gap-3 rounded-none border bg-secondary/40 p-3 md:grid-cols-[70px_1fr_120px_120px_120px_44px]">
            <CheckboxField label={t("propertyDetail.fields.primaryOwner")} />
            <SelectField
              defaultValue={property.owner}
              label={t("propertyDetail.fields.owner")}
            />
            <Button className="self-end" size="sm" variant="outline">
              <User />
              {t("propertyDetail.actions.data")}
            </Button>
            <Field
              defaultValue="100,00%"
              label={t("propertyDetail.fields.participation")}
            />
            <Field
              defaultValue="$10.000,00"
              label={t("propertyDetail.fields.administration")}
            />
            <Button
              aria-label={t("actions.delete")}
              className="self-end"
              size="icon-sm"
              variant="outline"
            >
              <Trash2 />
            </Button>
          </div>
        </Section>
      </div>

      <div className="flex flex-wrap gap-2 border bg-muted/40 p-2">
        <Button size="sm" variant="secondary">
          <Save />
          {t("actions.resetAndExit")}
        </Button>
      </div>
    </section>
  )
}

function Section({ children, title }) {
  return (
    <Card>
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="text-2xl font-semibold text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">{children}</CardContent>
    </Card>
  )
}

function Field({ defaultValue = "", label, required }) {
  return (
    <div className="space-y-1">
      <Label className="font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <Input defaultValue={defaultValue} />
    </div>
  )
}

function SelectField({ defaultValue = "", label }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-1">
      {label ? <Label className="font-medium text-foreground">{label}</Label> : null}
      <select
        className="h-8 w-full border border-input bg-background px-2 text-sm text-foreground"
        defaultValue={defaultValue}
      >
        <option value="">{t("actions.choose")}</option>
        {defaultValue ? <option value={defaultValue}>{defaultValue}</option> : null}
      </select>
    </div>
  )
}

function CheckboxField({ label }) {
  return (
    <label className="flex items-end gap-2 text-sm font-medium text-foreground">
      <input className="mb-2 size-4 accent-primary" defaultChecked type="checkbox" />
      {label}
    </label>
  )
}

export { PropertyDetail }
