import { BookOpen, CalendarDays, Folder, MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ContractStatusBadge } from "@/components/ContractStatusBadge"
import { InteractiveCell } from "@/components/ui/interactive-cell"
import { cn } from "@/lib/utils"

function ResponsiveContractCard({ actions, contract }) {
  const { t } = useTranslation()
  const expired = contract.status === "Vencido"
  const folderLabel = `#${String(contract.folder).replace(/^#/, "")}`

  return (
    <article className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 min-[360px]:flex-nowrap">
        <InteractiveCell
          className="w-28"
          icon={Folder}
          label={folderLabel}
          onClick={actions.openContract}
        />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <ContractStatusBadge expired={expired} />
          <EndDateBadge date={contract.end} expired={expired} />
        </div>
      </div>

      <div className="mt-4">
        <InteractiveCell
          className="w-full"
          icon={MapPin}
          label={contract.address}
          onClick={actions.openProperty}
        />
      </div>

      <div className="my-4 border-t border-border/60" />

      <div className="grid gap-4 md:grid-cols-2">
        <RelationshipAction
          label={t("table.columns.collections")}
          name={contract.tenant}
          onOpen={actions.openRentSettlement}
          onOpenBook={actions.openTenantPaymentDetails}
        />
        <RelationshipAction
          label={t("table.columns.settlement")}
          name={contract.owner}
          onOpen={actions.openOwnerAccount}
          onOpenBook={actions.openOwnerPaymentDetails}
        />
      </div>
    </article>
  )
}

function EndDateBadge({ date, expired }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md border border-border/70 bg-muted/55 px-2 text-xs font-medium text-muted-foreground",
        expired && "border-destructive/25 bg-destructive/10 text-destructive",
      )}
    >
      <CalendarDays aria-hidden="true" className="size-3.5" />
      <span>{date}</span>
    </span>
  )
}

function RelationshipAction({ label, name, onOpen, onOpenBook }) {
  const { t } = useTranslation()

  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <InteractiveCell
        className="w-full"
        icon={BookOpen}
        iconLabel={t("actions.openRecord")}
        label={name}
        onClick={onOpen}
        onIconClick={onOpenBook}
      />
    </div>
  )
}

export { EndDateBadge, ResponsiveContractCard }
