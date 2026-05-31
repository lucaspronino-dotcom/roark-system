import { Plus, Save, Trash2, X } from "lucide-react"
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

function NewTenantModal({ onClose }) {
  const { t } = useTranslation()
  const [tenantForms, setTenantForms] = useState([1])

  function addTenantForm() {
    setTenantForms((currentForms) => [...currentForms, currentForms.length + 1])
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="flex max-h-[88vh] w-full max-w-2xl flex-col">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-medium">
            {t("newTenant.title")}
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

          <div className="flex-1 overflow-y-auto p-6">
            <PersonFormsColumn
              addLabel={t("newTenant.actions.addAnother")}
              forms={tenantForms}
              onAdd={addTenantForm}
              title={t("newTenant.sections.personalData")}
            />
          </div>

          <div className="mt-auto flex justify-end gap-3 border-t bg-muted/40 p-3">
            <Button onClick={onClose} variant="outline">
              <Trash2 />
              {t("actions.delete")}
            </Button>
            <Button onClick={onClose}>
              <Save />
              {t("actions.saveAndExit")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PersonFormsColumn({ addLabel, forms, onAdd, title }) {
  return (
    <section className="space-y-6">
      {forms.map((formNumber) => (
        <PersonForm
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

function PersonForm({ formNumber, title }) {
  const { t } = useTranslation()
  const renderedTitle = formNumber > 1 ? `${title} ${formNumber}` : title

  return (
    <div className="space-y-5">
      <h2 className="border-b border-primary/40 pb-1 text-2xl font-semibold text-primary">
        {renderedTitle}
      </h2>
      <div className="mx-auto max-w-md space-y-3">
        <Field autoFocus={formNumber === 1} label={t("newTenant.fields.name")} />
        <Field label={t("newTenant.fields.lastName")} />
        <Field label={t("newTenant.fields.dni")} />
        <Field label={t("newTenant.fields.address")} />
        <Field label={t("newTenant.fields.phone")} short />
        <Field label={t("newTenant.fields.email")} />
      </div>
    </div>
  )
}

function Field({ autoFocus = false, label, short = false }) {
  return (
    <div className={short ? "max-w-xs space-y-1" : "space-y-1"}>
      <Label>{label}</Label>
      <Input autoFocus={autoFocus} />
    </div>
  )
}

export { NewTenantModal }
