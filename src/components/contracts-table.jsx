import {
  BookOpen,
  CalendarDays,
  CircleHelp,
  Folder,
  Home,
  Search,
  User,
} from "lucide-react"

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

const defaultContracts = [
  {
    folder: "0",
    end: "31/12/2027",
    address: "colon 2517",
    status: "Alquiler",
    tenant: "marinangeli, martin",
    owner: "ranni, abel ernesto",
  },
  {
    folder: "1",
    end: "31/8/2025",
    address: "rivadavia 4686",
    status: "Vencido",
    tenant: "llorente, emiliano carlos",
    owner: "ranni, abel ernesto",
  },
  {
    folder: "1",
    end: "31/1/2028",
    address: "rivadavia 4686",
    status: "Alquiler",
    tenant: "fuhr, juse luiz",
    owner: "ranni, abel ernesto",
  },
  {
    folder: "2",
    end: "31/5/2027",
    address: "rivadavia 4686",
    status: "Alquiler",
    tenant: "cuellar moreno, rosario del pilar",
    owner: "ranni, abel ernesto",
  },
  {
    folder: "3",
    end: "30/4/2026",
    address: "vicente lopez 2195",
    status: "Vencido",
    tenant: "gasparin, ruben dario",
    owner: "rossi, ana maria",
  },
  {
    folder: "3",
    end: "30/4/2028",
    address: "av. Del valle 2696",
    status: "Alquiler",
    tenant: "gasparin, ruben dario",
    owner: "rossi, ana maria",
  },
  {
    folder: "4",
    end: "31/8/2027",
    address: "del valle 3001 lavadero",
    status: "Alquiler",
    tenant: "BANOVIC, ADRIANA MONICA",
    owner: "rossi, ana maria",
  },
  {
    folder: "5",
    end: "31/8/2026",
    address: "colon 2670 kiosco",
    status: "Alquiler",
    tenant: "biondi, maria paz",
    owner: "rossi, ana maria",
  },
]

function ContractsTable({ contracts = defaultContracts }) {
  return (
    <section className="w-full space-y-4">
      <div className="flex justify-center">
        <div className="relative w-full max-w-sm">
          <Input className="pr-9" aria-label="Buscar" placeholder="Buscar" />
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
              <HeaderCell icon={Folder}>Cpta.</HeaderCell>
              <HeaderCell icon={CalendarDays}>Fin</HeaderCell>
              <HeaderCell icon={Home}>Direccion</HeaderCell>
              <HeaderCell icon={CircleHelp}>Estado</HeaderCell>
              <HeaderCell icon={User}>Cobros</HeaderCell>
              <HeaderCell icon={User}>Liquidacion</HeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract, index) => (
              <ContractRow
                contract={contract}
                key={`${contract.folder}-${contract.end}-${index}`}
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

function ContractRow({ contract }) {
  const expired = contract.status === "Vencido"

  return (
    <TableRow>
      <TableCell>{contract.folder}</TableCell>
      <TableCell className={expired ? "text-destructive" : undefined}>
        {contract.end}
      </TableCell>
      <TableCell>{contract.address}</TableCell>
      <TableCell>
        <Badge variant={expired ? "destructive" : "secondary"}>
          {contract.status}
        </Badge>
      </TableCell>
      <PersonCell name={contract.tenant} />
      <PersonCell name={contract.owner} />
    </TableRow>
  )
}

function PersonCell({ name }) {
  return (
    <TableCell>
      <div className="flex min-w-0 items-center gap-2">
        <Button aria-label="Buscar persona" size="icon-sm" variant="ghost">
          <Search />
        </Button>
        <Button aria-label="Abrir ficha" size="icon-sm" variant="ghost">
          <BookOpen />
        </Button>
        <span className="truncate">{name}</span>
      </div>
    </TableCell>
  )
}

export { ContractsTable }
