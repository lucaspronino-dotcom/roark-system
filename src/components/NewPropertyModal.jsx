import { Save, Trash2, User, X } from "lucide-react"
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
import { NewOwnerModal } from "@/components/NewOwnerModal"

function NewPropertyModal({ onClose }) {
  const { t } = useTranslation()
  const [isNewOwnerOpen, setIsNewOwnerOpen] = useState(false)

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="flex max-h-[85vh] w-full max-w-5xl flex-col">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-medium">
            {t("newProperty.title")}
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

        <CardContent className="flex min-h-0 flex-1 flex-col pt-4">
          <div className="border-b">
            <Button size="sm" variant="secondary">
              {t("propertyDetail.tabs.mainData")}
            </Button>
          </div>

          <div className="grid flex-1 items-start gap-8 overflow-y-auto p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <section className="space-y-5">
              <SectionTitle>{t("propertyDetail.sections.mainData")}</SectionTitle>
              <div className="max-w-xs space-y-3">
                <Field label={t("propertyDetail.fields.folder")} />
                <SelectField
                  defaultValue={t("newProperty.values.house")}
                  label={t("propertyDetail.fields.type")}
                  required
                />
                <SelectField
                  defaultValue={t("newProperty.values.empty")}
                  label={t("propertyDetail.fields.status")}
                />
                <Field label={t("propertyDetail.fields.address")} required />
                <SelectField label={t("propertyDetail.fields.city")} />
              </div>
            </section>

            <section className="space-y-5">
              <SectionTitle>{t("propertyDetail.sections.owners")}</SectionTitle>
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[max-content_auto_minmax(220px,340px)] md:items-end">
                  <Button
                    onClick={() => setIsNewOwnerOpen(true)}
                    size="sm"
                    variant="outline"
                  >
                    <User />
                    {t("propertyDetail.actions.addOwner")}
                  </Button>
                  <span className="pb-1 text-sm font-medium text-muted-foreground">
                    {t("propertyDetail.fields.orSelect")}:
                  </span>
                  <SelectField />
                </div>

                <div className="grid gap-3 text-sm font-semibold md:grid-cols-[80px_minmax(220px,1fr)_140px_150px]">
                  <span>{t("propertyDetail.fields.primaryOwner")}</span>
                  <span>{t("propertyDetail.fields.owner")}</span>
                  <span>{t("propertyDetail.fields.participation")}</span>
                  <span>{t("propertyDetail.fields.administration")}</span>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-auto flex justify-end gap-3 border-t bg-muted/40 p-3">
            <Button onClick={onClose} variant="outline">
              <Trash2 />
              {t("actions.delete")}
            </Button>
            <Button onClick={onClose}>
              <Save />
              {t("actions.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isNewOwnerOpen ? (
        <NewOwnerModal onClose={() => setIsNewOwnerOpen(false)} />
      ) : null}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 className="border-b border-primary/40 pb-1 text-2xl font-semibold text-primary">
      {children}
    </h2>
  )
}

function Field({ label, required }) {
  return (
    <div className="space-y-1">
      <Label>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <Input />
    </div>
  )
}

function SelectField({ defaultValue = "", label, required }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-1">
      {label ? (
        <Label>
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

export { NewPropertyModal }
