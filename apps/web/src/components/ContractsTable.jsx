import { ContractFiltersDrawer } from "@/components/ContractFiltersDrawer"
import { filterContracts } from "@/lib/contractFilters"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  Coins,
  Folder,
  Home,
  Search,
  User,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { ContractStatusBadge } from "@/components/ContractStatusBadge"
import { IndependentReceiptModal } from "@/components/IndependentReceiptModal"
import { Input } from "@/components/ui/input"
import { InteractiveCell } from "@/components/ui/interactive-cell"
import { NewPropertyModal } from "@/components/NewPropertyModal"
import { OwnerAccountModal } from "@/components/OwnerAccountModal"
import { PaymentDetailsModal } from "@/components/PaymentDetailsModal"
import { ResponsiveContractCard } from "@/components/ResponsiveContractCard"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { contractSortColumns, nextContractSort, sortContracts } from "@/lib/contractSorting"

const columnIcons = { folder: Folder, endDate: CalendarDays, address: Home, status: CircleHelp, tenant: User, owner: User }

function ContractsTable({
  contracts = [],
  sort: controlledSort,
  onSortChange,
  sortingMode = "client",
  error,
  isLoading = false,
  onContractsChanged,
  onOpenContract,
  onOpenProperty,
  onOpenRentSettlement,
}) {
  const { t } = useTranslation()
  const [isNewPropertyOpen, setIsNewPropertyOpen] = useState(false)
  const [isFinanceOpen, setIsFinanceOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [showExpired, setShowExpired] = useState(true)
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState(null)
  const [localSort, setLocalSort] = useState({ field: "folder", direction: "asc" })
  const sort = controlledSort === undefined ? localSort : controlledSort
  function changeSort(field) {
    const next = nextContractSort(sort, field)
    if (controlledSort === undefined) setLocalSort(next)
    onSortChange?.(next)
  }
  const sortedContracts = useMemo(() => sortContracts(contracts, sort, sortingMode), [contracts, sort, sortingMode])
  const visibleContracts = filterContracts(sortedContracts, { search, showExpired })

  return (
    <section className="w-full space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(260px,1fr)_minmax(260px,1fr)] lg:items-end">
        <div className="flex flex-wrap gap-2">
          <MainActionButton
            icon={ClipboardList}
            onClick={() =>
              onOpenContract?.({
                address: "",
                end: "",
                folder: "",
                owner: "",
                status: "Alquiler",
                tenant: "",
              })
            }
          >
            {t("mainActions.newContract")}
          </MainActionButton>
          <MainActionButton
            icon={Home}
            onClick={() => setIsNewPropertyOpen(true)}
          >
            {t("mainActions.newProperty")}
          </MainActionButton>
          <MainActionButton icon={Coins} onClick={() => setIsFinanceOpen(true)}>
            {t("mainActions.finance")}
          </MainActionButton>
        </div>
        <div className="flex justify-center lg:col-start-2">
        <div className="relative w-full max-w-sm">
          <Input
            className="pr-9"
            aria-label={t("table.search")}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("table.search")}
            value={search}
          />
          <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        </div>
        <div className="flex justify-end lg:col-start-3">
          <ContractFiltersDrawer showExpired={showExpired} onShowExpiredChange={setShowExpired} />
        </div>
      </div>

      <div className="hidden rounded-md border bg-card lg:block">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[88px]" />
            <col className="w-[112px]" />
            <col className="w-[250px]" />
            <col className="w-[112px]" />
            <col className="w-[320px]" />
            <col className="w-[260px]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              {contractSortColumns.map(column => (
                <HeaderCell
                  key={column.field}
                  icon={columnIcons[column.field]}
                  direction={sort?.field === column.field ? sort.direction : null}
                  onClick={() => changeSort(column.field)}
                  label={t("table.sortBy", { column: t(column.label), direction: t(sort?.field === column.field && sort.direction === "asc" ? "table.descending" : "table.ascending") })}
                >
                  {t(column.label)}
                </HeaderCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={6}>
                  {t("table.loading")}
                </TableCell>
              </TableRow>
            ) : null}
            {error ? (
              <TableRow>
                <TableCell className="text-destructive" colSpan={6}>
                  {t("table.loadError")}
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading && !error && visibleContracts.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={6}>
                  {t("table.empty")}
                </TableCell>
              </TableRow>
            ) : null}
            {visibleContracts.map((contract, index) => (
              <ContractRow
                contract={contract}
                key={contract.id ?? `${contract.folder}-${contract.end}-${index}`}
                onOpenContract={onOpenContract}
                onOpenProperty={onOpenProperty}
                onOpenRentSettlement={onOpenRentSettlement}
                onOpenOwnerAccount={setSelectedOwner}
                onOpenPaymentDetails={setSelectedPaymentDetails}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-2 lg:hidden">
        <label htmlFor="contract-sort" className="text-sm">{t("table.sortLabel")}</label>
        <select
          id="contract-sort"
          className="min-w-0 rounded-md border bg-background px-2 py-2 text-sm"
          value={sort?.field ?? ""}
          onChange={event => changeSort(event.target.value)}
        >
          <option value="" disabled>{t("table.sortLabel")}</option>
          {contractSortColumns.map(column => <option key={column.field} value={column.field}>{t(column.label)}</option>)}
        </select>
        <Button type="button" variant="outline" disabled={!sort} onClick={() => changeSort(sort.field)}
          aria-label={t("table.sortBy", { column: t(contractSortColumns.find(column => column.field === sort?.field)?.label ?? "table.sortLabel"), direction: t(sort?.direction === "asc" ? "table.descending" : "table.ascending") })}>
          {sort?.direction === "desc" ? <ArrowDown aria-hidden="true" className="size-4" /> : <ArrowUp aria-hidden="true" className="size-4" />}
          {t(sort?.direction === "desc" ? "table.descending" : "table.ascending")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:hidden">
        {isLoading ? (
          <ResponsiveMessage>{t("table.loading")}</ResponsiveMessage>
        ) : null}
        {error ? (
          <ResponsiveMessage className="text-destructive">
            {t("table.loadError")}
          </ResponsiveMessage>
        ) : null}
        {!isLoading && !error && visibleContracts.length === 0 ? (
          <ResponsiveMessage>{t("table.empty")}</ResponsiveMessage>
        ) : null}
        {visibleContracts.map((contract, index) => (
          <ResponsiveContractCard
            actions={createContractActions(contract, {
              onOpenContract,
              onOpenOwnerAccount: setSelectedOwner,
              onOpenPaymentDetails: setSelectedPaymentDetails,
              onOpenProperty,
              onOpenRentSettlement,
            })}
            contract={contract}
            key={contract.id ?? `${contract.folder}-${contract.end}-${index}`}
          />
        ))}
      </div>

      {selectedOwner ? (
        <OwnerAccountModal
          contract={selectedOwner}
          onClose={() => setSelectedOwner(null)}
        />
      ) : null}
      {selectedPaymentDetails ? (
        <PaymentDetailsModal
          contract={selectedPaymentDetails.contract}
          contractId={selectedPaymentDetails.contractId}
          onClose={() => setSelectedPaymentDetails(null)}
          kind={selectedPaymentDetails.kind}
          personName={selectedPaymentDetails.personName}
        />
      ) : null}
      {isNewPropertyOpen ? (
        <NewPropertyModal
          onClose={() => setIsNewPropertyOpen(false)}
          onSaved={onContractsChanged}
        />
      ) : null}
      {isFinanceOpen ? (
        <IndependentReceiptModal onClose={() => setIsFinanceOpen(false)} />
      ) : null}
    </section>
  )
}

function MainActionButton({ children, icon: Icon, onClick }) {
  return (
    <Button
      className="h-20 w-24 flex-col gap-1 whitespace-normal px-2 text-center text-xs"
      onClick={onClick}
      type="button"
      variant="outline"
    >
      <Icon className="size-6" />
      <span className="leading-tight">{children}</span>
    </Button>
  )
}

function ResponsiveMessage({ children, className = "text-muted-foreground" }) {
  return (
    <div className={`rounded-lg border bg-card p-4 text-xs md:col-span-2 ${className}`}>
      {children}
    </div>
  )
}

function HeaderCell({ children, icon: Icon, direction, onClick, label }) {
  const SortIcon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown
  return (
    <TableHead scope="col" aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"}>
      <button type="button" onClick={onClick} aria-label={label} title={label}
        className="flex min-h-10 w-full items-center gap-1 rounded-sm text-left hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
        <Icon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
        <span>{children}</span>
        <SortIcon aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
      </button>
    </TableHead>
  )
}

function ContractRow({
  contract,
  onOpenContract,
  onOpenProperty,
  onOpenOwnerAccount,
  onOpenPaymentDetails,
  onOpenRentSettlement,
}) {
  const expired = contract.status === "Vencido"
  const actions = createContractActions(contract, {
    onOpenContract,
    onOpenOwnerAccount,
    onOpenPaymentDetails,
    onOpenProperty,
    onOpenRentSettlement,
  })

  return (
    <TableRow>
      <TableCell>
        <InteractiveCell
          className="w-full"
          label={`#${String(contract.folder).replace(/^#/, "")}`}
          onClick={actions.openContract}
        />
      </TableCell>
      <TableCell className={expired ? "text-destructive" : undefined}>
        {contract.end}
      </TableCell>
      <TableCell>
        <InteractiveCell
          className="w-full"
          label={contract.address}
          onClick={actions.openProperty}
        />
      </TableCell>
      <TableCell>
        <ContractStatusBadge expired={expired} />
      </TableCell>
      <PersonCell
        name={contract.tenant}
        onOpen={actions.openRentSettlement}
        onOpenBook={actions.openTenantPaymentDetails}
      />
      <PersonCell
        name={contract.owner}
        onOpen={actions.openOwnerAccount}
        onOpenBook={actions.openOwnerPaymentDetails}
      />
    </TableRow>
  )
}

function createContractActions(contract, handlers) {
  return {
    openContract: () => handlers.onOpenContract?.(contract),
    openOwnerAccount: () => handlers.onOpenOwnerAccount?.(contract),
    openOwnerPaymentDetails: () =>
      handlers.onOpenPaymentDetails?.({
        contract,
        contractId: contract.id,
        kind: "OWNER_SETTLEMENT",
        personName: contract.owner,
      }),
    openProperty: () => handlers.onOpenProperty?.(contract),
    openRentSettlement: () => handlers.onOpenRentSettlement?.(contract),
    openTenantPaymentDetails: () =>
      handlers.onOpenPaymentDetails?.({
        contract,
        contractId: contract.id,
        kind: "TENANT_SETTLEMENT",
        personName: contract.tenant,
      }),
  }
}

function PersonCell({ name, onOpen, onOpenBook }) {
  const { t } = useTranslation()

  return (
    <TableCell>
      <InteractiveCell
        className="w-full"
        icon={BookOpen}
        iconLabel={t("actions.openRecord")}
        label={name}
        onClick={onOpen}
        onIconClick={onOpenBook}
      />
    </TableCell>
  )
}

export { ContractsTable }
