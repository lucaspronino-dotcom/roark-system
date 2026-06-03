import { Save, X } from "lucide-react"
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
import { createOwner } from "@/services/ownersService"

const initialForm = {
  firstName: "",
  lastName: "",
  dni: "",
  address: "",
  city: "",
  phone: "",
  email: "",
  transferAliasOrCbu: "",
}

function NewOwnerModal({ onClose, onSaved }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  function updateField(name, value) {
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setIsSaving(true)

    try {
      const owner = await createOwner({
        ...form,
        email: form.email || undefined,
        transferAliasOrCbu: form.transferAliasOrCbu || undefined,
      })

      onSaved?.(owner)
      onClose()
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="flex max-h-[86vh] w-full max-w-2xl flex-col">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-medium">
            {t("newOwner.title")}
          </CardTitle>
          <CardAction>
            <Button
              aria-label={t("actions.close")}
              onClick={onClose}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col pt-4">
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="border-b">
              <Button size="sm" type="button" variant="secondary">
                {t("propertyDetail.tabs.mainData")}
              </Button>
            </div>

            <div className="overflow-y-auto p-6">
              <section className="mx-auto max-w-md space-y-5">
                <h2 className="border-b border-primary/40 pb-1 text-2xl font-semibold text-primary">
                  {t("newOwner.sections.personalData")}
                </h2>
                <div className="space-y-3">
                  <Field
                    autoFocus
                    label={t("newOwner.fields.name")}
                    name="firstName"
                    onChange={updateField}
                    required
                    value={form.firstName}
                  />
                  <Field
                    label={t("newOwner.fields.lastName")}
                    name="lastName"
                    onChange={updateField}
                    required
                    value={form.lastName}
                  />
                  <Field
                    label={t("newTenant.fields.dni")}
                    name="dni"
                    onChange={updateField}
                    required
                    value={form.dni}
                  />
                  <Field
                    label={t("newOwner.fields.address")}
                    name="address"
                    onChange={updateField}
                    required
                    value={form.address}
                  />
                  <Field
                    label={t("newOwner.fields.city")}
                    name="city"
                    onChange={updateField}
                    required
                    value={form.city}
                  />
                  <Field
                    label={t("newOwner.fields.phone")}
                    name="phone"
                    onChange={updateField}
                    required
                    short
                    value={form.phone}
                  />
                  <Field
                    label={t("newOwner.fields.email")}
                    name="email"
                    onChange={updateField}
                    type="email"
                    value={form.email}
                  />
                  <Field
                    label={t("newOwner.fields.transferAliasOrCbu")}
                    name="transferAliasOrCbu"
                    onChange={updateField}
                    value={form.transferAliasOrCbu}
                  />
                </div>
              </section>
            </div>

            {error ? (
              <div className="border-t px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="mt-auto flex justify-end gap-3 border-t bg-muted/40 p-3">
              <Button onClick={onClose} type="button" variant="outline">
                {t("actions.cancel")}
              </Button>
              <Button disabled={isSaving} type="submit">
                <Save />
                {t("actions.saveAndExit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  autoFocus = false,
  label,
  name,
  onChange,
  required = false,
  short = false,
  type = "text",
  value,
}) {
  return (
    <div className={short ? "max-w-xs space-y-1" : "space-y-1"}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        autoFocus={autoFocus}
        id={name}
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </div>
  )
}

export { NewOwnerModal }
