import {
  BookOpen,
  CalendarDays,
  CircleHelp,
  Folder,
  Home,
  Search,
  User,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { defaultContracts } from "@/data/contracts"

function ContractsTable({
  contracts = defaultContracts,
  onOpenContract,
  onOpenProperty,
}) {
  const { t } = useTranslation()

  return (
    <section className="w-full space-y-4">
      <div className="flex justify-center">
        <div className="relative w-full max-w-sm">
          <Input
            className="pr-9"
            aria-label={t("table.search")}
            placeholder={t("table.search")}
          />
          <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[120px]" />
            <col className="w-[250px]" />
            <col className="w-[120px]" />
            <col className="w-[320px]" />
            <col className="w-[260px]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <HeaderCell icon={Folder}>{t("table.columns.folder")}</HeaderCell>
              <HeaderCell icon={CalendarDays}>{t("table.columns.end")}</HeaderCell>
              <HeaderCell icon={Home}>{t("table.columns.address")}</HeaderCell>
              <HeaderCell icon={CircleHelp}>{t("table.columns.status")}</HeaderCell>
              <HeaderCell icon={User}>{t("table.columns.collections")}</HeaderCell>
              <HeaderCell icon={User}>{t("table.columns.settlement")}</HeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract, index) => (
              <ContractRow
                contract={contract}
                key={`${contract.folder}-${contract.end}-${index}`}
                onOpenContract={onOpenContract}
                onOpenProperty={onOpenProperty}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

function HeaderCell({ children, icon: Icon }) {
  return (
    <TableHead>
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <span>{children}</span>
      </div>
    </TableHead>
  )
}

function ContractRow({ contract, onOpenContract, onOpenProperty }) {
  const expired = contract.status === "Vencido"
  const { t } = useTranslation()

  return (
    <TableRow>
      <TableCell>
        <Button
          className="h-auto min-w-7 justify-start px-1 font-semibold text-primary"
          onClick={() => onOpenContract?.(contract)}
          size="xs"
          variant="ghost"
        >
          {contract.folder}
        </Button>
      </TableCell>
      <TableCell className={expired ? "text-destructive" : undefined}>
        {contract.end}
      </TableCell>
      <TableCell>
        <Button
          className="h-auto max-w-full justify-start px-1 font-semibold text-primary"
          onClick={() => onOpenProperty?.(contract)}
          size="xs"
          variant="ghost"
        >
          <span className="truncate">{contract.address}</span>
        </Button>
      </TableCell>
      <TableCell>
        <Badge variant={expired ? "destructive" : "secondary"}>
          {expired ? t("status.expired") : t("status.activeRent")}
        </Badge>
      </TableCell>
      <PersonCell name={contract.tenant} />
      <PersonCell name={contract.owner} />
    </TableRow>
  )
}

function PersonCell({ name }) {
  const { t } = useTranslation()

  return (
    <TableCell>
      <div className="flex min-w-0 items-center gap-2">
        <Button aria-label={t("actions.searchPerson")} size="icon-sm" variant="ghost">
          <Search />
        </Button>
        <Button aria-label={t("actions.openRecord")} size="icon-sm" variant="ghost">
          <BookOpen />
        </Button>
        <span className="truncate">{name}</span>
      </div>
    </TableCell>
  )
}

export { ContractsTable }
