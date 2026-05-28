import { ContractsTable } from "@/components/contracts-table"

function App() {
  return (
    <main className="min-h-screen bg-muted/40 p-8 text-foreground">
      <div className="mx-auto w-full max-w-6xl">
        <ContractsTable />
      </div>
    </main>
  )
}

export default App
