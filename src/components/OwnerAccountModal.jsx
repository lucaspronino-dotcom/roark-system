import { Printer, Save, X } from "lucide-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function OwnerAccountModal({ ownerName, onClose }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("mainData")
  const today = new Intl.DateTimeFormat("es-AR").format(new Date())

  return (
    <div className="fixed inset-0 z-50 bg-background/80 p-4 backdrop-blur-sm">
      <Card className="mx-auto flex h-full max-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-medium text-muted-foreground">
            {t("ownerAccount.windowTitle", { owner: ownerName })}
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

        <CardContent className="flex min-h-0 flex-1 flex-col gap-5 pt-5">
          <div className="min-w-0 border-b pb-2 pr-20">
            <h2 className="truncate text-2xl font-semibold text-primary">
              {ownerName}
            </h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col border">
            <div className="flex border-b bg-muted/20">
              <button
                className={
                  activeTab === "mainData"
                    ? "border-r bg-background px-3 py-2 text-sm font-medium"
                    : "border-r px-3 py-2 text-sm text-muted-foreground"
                }
                onClick={() => setActiveTab("mainData")}
                type="button"
              >
                {t("ownerAccount.tabs.mainData")}
              </button>
              <button
                className={
                  activeTab === "extraConcept"
                    ? "border-r bg-background px-3 py-2 text-sm font-medium"
                    : "border-r px-3 py-2 text-sm text-muted-foreground"
                }
                onClick={() => setActiveTab("extraConcept")}
                type="button"
              >
                {t("ownerAccount.tabs.extraConcept")}
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
              {activeTab === "mainData" ? <MainDataTab /> : null}
              {activeTab === "extraConcept" ? (
                <ExtraordinaryConceptTab today={today} />
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button>
              <Printer />
              {t("ownerAccount.actions.confirmAndPrint")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MainDataTab() {
  const { t } = useTranslation()

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("ownerAccount.columns.date")}</TableHead>
            <TableHead>{t("ownerAccount.columns.description")}</TableHead>
            <TableHead className="text-right">
              {t("ownerAccount.columns.amount")}
            </TableHead>
            <TableHead className="text-right">
              {t("ownerAccount.columns.penalties")}
            </TableHead>
            <TableHead className="text-right">
              {t("ownerAccount.columns.administration")}
            </TableHead>
            <TableHead className="text-right">
              {t("ownerAccount.columns.total")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6}>
              <div className="h-72" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div className="mt-auto space-y-6 border-t border-dashed pt-4">
        <div className="ml-auto grid max-w-xl gap-3 text-sm font-semibold md:grid-cols-[auto_160px_auto_170px] md:items-center">
          <span className="text-right">{t("ownerAccount.totals.fees")}:</span>
          <Input defaultValue="$ 0,00" readOnly />
          <span className="text-right">{t("ownerAccount.totals.total")}:</span>
          <Input readOnly />
        </div>

        <div className="grid gap-3 md:grid-cols-[80px_minmax(0,1fr)]">
          <Label className="pt-2 font-semibold underline">
            {t("ownerAccount.fields.notes")}:
          </Label>
          <textarea className="min-h-24 border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50" />
        </div>
      </div>
    </>
  )
}

function ExtraordinaryConceptTab({ today }) {
  const { t } = useTranslation()

  return (
    <div className="max-w-2xl space-y-5">
      <div className="grid items-center gap-3 md:grid-cols-[120px_180px]">
        <Label className="text-right">{t("ownerAccount.extra.date")}</Label>
        <Input defaultValue={today} />
      </div>

      <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
        <Label className="pt-2 text-right">{t("ownerAccount.extra.detail")}</Label>
        <textarea className="min-h-24 border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50" />
      </div>

      <div className="grid items-center gap-3 md:grid-cols-[120px_180px]">
        <Label className="text-right">{t("ownerAccount.extra.amount")}</Label>
        <Input inputMode="numeric" />
      </div>

      <div className="grid gap-4 md:grid-cols-[335px_auto] md:items-center">
        <div className="space-y-3 border p-4">
          <RadioField
            label={t("ownerAccount.extra.addToOwner")}
            name="owner-extra-effect"
          />
          <RadioField
            label={t("ownerAccount.extra.discountOwner")}
            name="owner-extra-effect"
          />
        </div>
        <Button className="w-fit">
          <Save />
          {t("ownerAccount.extra.confirm")}
        </Button>
      </div>
    </div>
  )
}

function RadioField({ label, name }) {
  return (
    <label className="flex items-center justify-end gap-3 text-sm font-medium">
      <span>{label}</span>
      <input className="size-4 accent-primary" name={name} type="radio" />
    </label>
  )
}

export { OwnerAccountModal }
