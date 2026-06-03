import { Save, User, X } from "lucide-react"
import { useEffect, useState } from "react"
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
import { getOwners } from "@/services/ownersService"
import { createProperty } from "@/services/propertiesService"

const initialForm = {
  folder: "",
  type: "Vivienda",
  status: "En alquiler 24M",
  address: "",
  city: "",
  ownerId: "",
  participation: "100",
  administration: "0",
  commission: "0",
}

function NewPropertyModal({ onClose, onSaved }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(initialForm)
  const [owners, setOwners] = useState([])
  const [error, setError] = useState("")
  const [isLoadingOwners, setIsLoadingOwners] = useState(true)
  const [isNewOwnerOpen, setIsNewOwnerOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let ignore = false

    loadOwners()

    async function loadOwners() {
      try {
        const apiOwners = await getOwners()

        if (!ignore) {
          setOwners(apiOwners)
          setError("")
        }
      } catch (apiError) {
        if (!ignore) {
          setError(apiError.message)
        }
      } finally {
        if (!ignore) {
          setIsLoadingOwners(false)
        }
      }
    }

    return () => {
      ignore = true
    }
  }, [])

  function updateField(name, value) {
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function handleOwnerSaved(owner) {
    setOwners((currentOwners) => [owner, ...currentOwners])
    updateField("ownerId", owner.id)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setIsSaving(true)

    try {
      const property = await createProperty({
        folder: form.folder,
        type: form.type,
        status: form.status,
        address: form.address,
        city: form.city,
        owners: [
          {
            ownerId: form.ownerId,
            isPrimary: true,
            participation: Number(form.participation || 0),
            administration: Number(form.administration || 0),
            commission: Number(form.commission || 0),
          },
        ],
      })

      onSaved?.(property)
      onClose()
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setIsSaving(false)
    }
  }

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

            <div className="grid flex-1 items-start gap-8 overflow-y-auto p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <section className="space-y-5">
                <SectionTitle>{t("propertyDetail.sections.mainData")}</SectionTitle>
                <div className="max-w-xs space-y-3">
                  <Field
                    label={t("propertyDetail.fields.folder")}
                    name="folder"
                    onChange={updateField}
                    required
                    value={form.folder}
                  />
                  <SelectField
                    label={t("propertyDetail.fields.type")}
                    name="type"
                    onChange={updateField}
                    options={["Vivienda", "Lote", "Local"]}
                    required
                    value={form.type}
                  />
                  <SelectField
                    label={t("propertyDetail.fields.status")}
                    name="status"
                    onChange={updateField}
                    options={["En alquiler 24M", "Administrada", "Disponible"]}
                    value={form.status}
                  />
                  <Field
                    label={t("propertyDetail.fields.address")}
                    name="address"
                    onChange={updateField}
                    required
                    value={form.address}
                  />
                  <Field
                    label={t("propertyDetail.fields.city")}
                    name="city"
                    onChange={updateField}
                    required
                    value={form.city}
                  />
                </div>
              </section>

              <section className="space-y-5">
                <SectionTitle>{t("propertyDetail.sections.owners")}</SectionTitle>
                <div className="space-y-6">
                  <div className="grid gap-3 md:grid-cols-[max-content_auto_minmax(220px,340px)] md:items-end">
                    <Button
                      onClick={() => setIsNewOwnerOpen(true)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <User />
                      {t("propertyDetail.actions.addOwner")}
                    </Button>
                    <span className="pb-1 text-sm font-medium text-muted-foreground">
                      {t("propertyDetail.fields.orSelect")}:
                    </span>
                    <OwnerSelect
                      isLoading={isLoadingOwners}
                      name="ownerId"
                      onChange={updateField}
                      owners={owners}
                      required
                      value={form.ownerId}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_140px_150px_130px]">
                    <OwnerSelect
                      label={t("propertyDetail.fields.owner")}
                      name="ownerId"
                      onChange={updateField}
                      owners={owners}
                      required
                      value={form.ownerId}
                    />
                    <Field
                      label={t("propertyDetail.fields.participation")}
                      name="participation"
                      onChange={updateField}
                      type="number"
                      value={form.participation}
                    />
                    <Field
                      label={t("propertyDetail.fields.administration")}
                      name="administration"
                      onChange={updateField}
                      type="number"
                      value={form.administration}
                    />
                    <Field
                      label={t("propertyDetail.fields.commission")}
                      name="commission"
                      onChange={updateField}
                      type="number"
                      value={form.commission}
                    />
                  </div>
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
              <Button disabled={isSaving || isLoadingOwners} type="submit">
                <Save />
                {t("actions.save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isNewOwnerOpen ? (
        <NewOwnerModal
          onClose={() => setIsNewOwnerOpen(false)}
          onSaved={handleOwnerSaved}
        />
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

function Field({
  label,
  name,
  onChange,
  required = false,
  type = "text",
  value,
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <Input
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

function SelectField({ label, name, onChange, options, required, value }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <select
        className="h-8 w-full border border-input bg-background px-2 text-sm text-foreground"
        id={name}
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        required={required}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

function OwnerSelect({
  isLoading = false,
  label,
  name,
  onChange,
  owners,
  required = false,
  value,
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-1">
      {label ? (
        <Label htmlFor={name}>
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
      ) : null}
      <select
        className="h-8 w-full border border-input bg-background px-2 text-sm text-foreground"
        disabled={isLoading}
        id={name}
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        required={required}
        value={value}
      >
        <option value="">{t("actions.choose")}</option>
        {owners.map((owner) => (
          <option key={owner.id} value={owner.id}>
            {formatOwnerName(owner)}
          </option>
        ))}
      </select>
    </div>
  )
}

function formatOwnerName(owner) {
  return `${owner.person.lastName}, ${owner.person.firstName}`.toLowerCase()
}

export { NewPropertyModal }
