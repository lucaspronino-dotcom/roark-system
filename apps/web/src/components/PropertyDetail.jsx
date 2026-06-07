import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react"
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
import {
  getProperties,
  getProperty,
  updateProperty,
} from "@/services/propertiesService"

const emptyForm = {
  folder: "",
  type: "",
  status: "",
  address: "",
  city: "",
  ownerId: "",
  isPrimary: true,
  participation: "100",
  administration: "0",
  commission: "0",
}

function PropertyDetail({ onBack, onSaved, property }) {
  const { t } = useTranslation()
  const propertyId = property.propertyId ?? property.id
  const [form, setForm] = useState(emptyForm)
  const [owners, setOwners] = useState([])
  const [properties, setProperties] = useState([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false)
  const [isFolderWarningOpen, setIsFolderWarningOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let ignore = false

    loadProperty()

    async function loadProperty() {
      try {
        const [apiProperty, apiOwners, apiProperties] = await Promise.all([
          getProperty(propertyId),
          getOwners(),
          getProperties(),
        ])
        const primaryOwner =
          apiProperty.owners.find((propertyOwner) => propertyOwner.isPrimary) ??
          apiProperty.owners[0]

        if (!ignore) {
          setOwners(apiOwners)
          setProperties(apiProperties)
          setForm({
            folder: apiProperty.folder,
            type: apiProperty.type,
            status: apiProperty.status,
            address: apiProperty.address,
            city: apiProperty.city,
            ownerId: primaryOwner?.ownerId ?? "",
            isPrimary: primaryOwner?.isPrimary ?? true,
            participation: String(primaryOwner?.participation ?? 100),
            administration: String(primaryOwner?.administration ?? 0),
            commission: String(primaryOwner?.commission ?? 0),
          })
          setError("")
        }
      } catch (apiError) {
        if (!ignore) {
          setError(apiError.message)
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    return () => {
      ignore = true
    }
  }, [propertyId])

  function updateField(name, value) {
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function handleOwnerSaved(owner) {
    setOwners((currentOwners) => [owner, ...currentOwners])
    updateField("ownerId", owner.id)
  }

  async function handleSave() {
    if (hasDuplicatedFolder()) {
      setIsFolderWarningOpen(true)
      return
    }

    saveProperty()
  }

  function hasDuplicatedFolder() {
    const nextFolder = String(form.folder).trim()

    if (!nextFolder) {
      return false
    }

    return properties.some(
      (currentProperty) =>
        currentProperty.id !== propertyId &&
        String(currentProperty.folder).trim() === nextFolder,
    )
  }

  async function saveProperty() {
    setError("")
    setIsSaving(true)

    try {
      await updateProperty(propertyId, {
        folder: form.folder,
        type: form.type,
        status: form.status,
        address: form.address,
        city: form.city,
        owners: [
          {
            ownerId: form.ownerId,
            isPrimary: form.isPrimary,
            participation: Number(form.participation || 0),
            administration: Number(form.administration || 0),
            commission: Number(form.commission || 0),
          },
        ],
      })

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

      {error ? (
        <div className="border bg-muted/50 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="pt-4 text-muted-foreground">
            {t("table.loading")}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <Section title={t("propertyDetail.sections.mainData")}>
              <Field
                label={t("propertyDetail.fields.folder")}
                name="folder"
                onChange={updateField}
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
                value={form.city}
              />
            </Section>

            <Section title={t("propertyDetail.sections.owners")}>
              <div className="grid gap-3 md:grid-cols-[max-content_auto_minmax(220px,1fr)] md:items-end">
                <Button
                  onClick={() => setIsOwnerModalOpen(true)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus />
                  {t("propertyDetail.actions.addOwner")}
                </Button>
                <span className="pb-1 text-sm font-medium text-muted-foreground">
                  {t("propertyDetail.fields.orSelect")}:
                </span>
                <OwnerSelect
                  name="ownerId"
                  onChange={updateField}
                  owners={owners}
                  value={form.ownerId}
                />
              </div>

              <div className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[76px_minmax(180px,1fr)_104px] lg:grid-cols-[76px_minmax(180px,1fr)_112px_112px_88px_36px] md:items-end">
                <CheckboxField
                  checked={form.isPrimary}
                  label={t("propertyDetail.fields.primaryOwner")}
                  onChange={(value) => updateField("isPrimary", value)}
                />
                <OwnerSelect
                  label={t("propertyDetail.fields.owner")}
                  name="ownerId"
                  onChange={updateField}
                  owners={owners}
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
                <Button
                  aria-label={t("actions.delete")}
                  disabled
                  size="icon-sm"
                  type="button"
                  variant="outline"
                >
                  <Trash2 />
                </Button>
              </div>
            </Section>
          </div>

          <div className="flex justify-end gap-2 border bg-muted/40 p-2">
            <Button disabled={isSaving} onClick={handleSave} type="button">
              <Save />
              {t("actions.save")}
            </Button>
          </div>
        </>
      )}

      {isOwnerModalOpen ? (
        <NewOwnerModal
          onClose={() => setIsOwnerModalOpen(false)}
          onSaved={handleOwnerSaved}
        />
      ) : null}
      {isFolderWarningOpen ? (
        <FolderWarningModal
          onAccept={() => {
            setIsFolderWarningOpen(false)
            saveProperty()
          }}
        />
      ) : null}
    </section>
  )
}

function FolderWarningModal({ onAccept }) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold text-primary">
            {t("propertyDetail.folderWarning.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <p className="text-sm text-foreground">
            {t("propertyDetail.folderWarning.message")}
          </p>
          <div className="flex justify-end">
            <Button onClick={onAccept} type="button">
              {t("actions.accept")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
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
      {label ? (
        <Label className="font-medium text-foreground" htmlFor={name}>
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
      ) : null}
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
      <Label className="font-medium text-foreground" htmlFor={name}>
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

function OwnerSelect({ label, name, onChange, owners, value }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-1">
      {label ? (
        <Label className="font-medium text-foreground" htmlFor={name}>
          {label}
        </Label>
      ) : null}
      <select
        className="h-8 w-full border border-input bg-background px-2 text-sm text-foreground"
        id={name}
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        required
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

function CheckboxField({ checked, label, onChange }) {
  return (
    <label className="flex items-center gap-2 pb-2 text-sm font-medium text-foreground">
      <input
        checked={checked}
        className="size-4 accent-primary"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  )
}

function formatOwnerName(owner) {
  return `${owner.person.lastName}, ${owner.person.firstName}`.toLowerCase()
}

export { PropertyDetail }
