import { Filter, X } from "lucide-react"
import { Dialog, Switch } from "radix-ui"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

function ContractFiltersDrawer({ showExpired, onShowExpiredChange }) {
  const { t } = useTranslation()
  const active = !showExpired

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant={active ? "default" : "outline"}
          size="icon"
          className="relative"
          aria-label={t(active ? "table.filters.active" : "table.filters.open")}
          title={t("table.filters.open")}
        >
          <Filter aria-hidden="true" />
          {active ? <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full border border-background bg-primary text-[10px] text-primary-foreground">1</span> : null}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 motion-reduce:animate-none" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-sm flex-col border-l bg-background shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right motion-reduce:animate-none">
          <div className="flex items-start justify-between gap-4 border-b p-5">
            <div className="space-y-1">
              <Dialog.Title className="text-lg font-semibold">{t("table.filters.title")}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">{t("table.filters.description")}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t("actions.close")}><X aria-hidden="true" /></Button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-4 rounded-md border p-4">
              <div className="space-y-1">
                <label htmlFor="show-expired-contracts" className="cursor-pointer text-sm font-medium">{t("table.filters.showExpired")}</label>
                <p id="show-expired-description" className="text-xs text-muted-foreground">{t("table.filters.expiredDescription")}</p>
              </div>
              <Switch.Root
                id="show-expired-contracts"
                aria-describedby="show-expired-description"
                checked={showExpired}
                onCheckedChange={onShowExpiredChange}
                className="inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-input p-0.5 transition-colors data-[state=checked]:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Switch.Thumb className="block size-5 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-5 motion-reduce:transition-none" />
              </Switch.Root>
            </div>
          </div>
          <div className="flex justify-between gap-3 border-t p-5">
            <Button type="button" variant="outline" disabled={!active} onClick={() => onShowExpiredChange(true)}>{t("table.filters.reset")}</Button>
            <Dialog.Close asChild><Button type="button">{t("table.filters.done")}</Button></Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export { ContractFiltersDrawer }
