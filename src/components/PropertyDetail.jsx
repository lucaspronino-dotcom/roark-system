import { ArrowLeft, Plus, Trash2, User } from "lucide-react"
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

function PropertyDetail({ onBack }) {
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

      <div className="grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Section title={t("propertyDetail.sections.mainData")}>
          <Field defaultValue="71" label={t("propertyDetail.fields.folder")} />
          <SelectField
            defaultValue="Casa"
            label={t("propertyDetail.fields.type")}
            required
          />
          <SelectField
            defaultValue="Administrada"
            label={t("propertyDetail.fields.status")}
          />
          <Field
            defaultValue="vicente lopez 3775"
            label={t("propertyDetail.fields.address")}
            required
          />
        </Section>

        <Section title={t("propertyDetail.sections.owners")}>
          <div className="grid gap-3 md:grid-cols-[max-content_auto_minmax(220px,1fr)] md:items-end">
            <Button size="sm" variant="outline">
              <Plus />
              {t("propertyDetail.actions.addOwner")}
            </Button>
            <span className="pb-1 text-sm font-medium text-muted-foreground">
              {t("propertyDetail.fields.orSelect")}:
            </span>
            <SelectField />
          </div>

          <div className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[76px_minmax(180px,1fr)_104px] lg:grid-cols-[76px_minmax(180px,1fr)_104px_112px_112px_88px_36px] md:items-end">
            <CheckboxField label={t("propertyDetail.fields.primaryOwner")} />
            <SelectField
              defaultValue="molina"
              label={t("propertyDetail.fields.owner")}
            />
            <Button size="sm" variant="outline">
              <User />
              {t("propertyDetail.actions.data")}
            </Button>
            <Field
              defaultValue="100,00%"
              label={t("propertyDetail.fields.participation")}
            />
            <Field
              defaultValue="$0,00"
              label={t("propertyDetail.fields.administration")}
            />
            <Field
              defaultValue="5,00%"
              label={t("propertyDetail.fields.commission")}
            />
            <Button aria-label={t("actions.delete")} size="icon-sm" variant="outline">
              <Trash2 />
            </Button>
          </div>
        </Section>
      </div>
    </section>
  )
}

function Section({ children, title }) {
  return (
    <Card className="self-start">
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
      {label ? (
        <Label className="font-medium text-foreground">
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
      ) : null}
      <Input defaultValue={defaultValue} />
    </div>
  )
}

function SelectField({ defaultValue = "", label, required }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-1">
      {label ? (
        <Label className="font-medium text-foreground">
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
      ) : null}
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
    <label className="flex items-center gap-2 pb-2 text-sm font-medium text-foreground">
      <input className="size-4 accent-primary" defaultChecked type="checkbox" />
      {label}
    </label>
  )
}

export { PropertyDetail }
