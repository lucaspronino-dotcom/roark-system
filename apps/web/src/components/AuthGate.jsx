import { useEffect, useState } from "react"
import { get, post } from "@/services/apiClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AuthGate({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    const expire = () => { setUser(null); setError("") }
    window.addEventListener("auth-expired", expire)
    get("/auth/me").then(value => { if (active) setUser(value) }).catch(() => {}).finally(() => { if (active) setLoading(false) })
    return () => { active = false; window.removeEventListener("auth-expired", expire) }
  }, [])

  async function login(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError("")
    try { setUser(await post("/auth/login", { username: data.get("username"), password: data.get("password") })) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function logout() {
    setBusy(true)
    setError("")
    try { await post("/auth/logout"); setUser(null) }
    catch { setError("No se pudo cerrar la sesión. Intentá nuevamente.") }
    finally { setBusy(false) }
  }

  if (loading) return <main className="p-8" role="status">Cargando…</main>
  if (user) return <><div className="flex items-center justify-end gap-4 bg-background px-8 py-3 text-foreground"><span>{user.username}</span><Button variant="outline" onClick={logout} disabled={busy}>Cerrar sesión</Button>{error && <p role="alert">{error}</p>}</div>{children}</>
  return <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6 text-foreground">
    <form onSubmit={login} className="w-full max-w-sm space-y-5 rounded-xl border bg-background p-8 shadow-sm">
      <div><h1 className="text-2xl font-semibold">Roark</h1><p className="mt-2 text-sm text-muted-foreground">Iniciá sesión para acceder al sistema.</p></div>
      <div className="space-y-2"><Label htmlFor="username">Usuario</Label><Input id="username" name="username" autoComplete="username" required maxLength={100} /></div>
      <div className="space-y-2"><Label htmlFor="password">Contraseña</Label><Input id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" type="submit" disabled={busy}>{busy ? "Ingresando…" : "Iniciar sesión"}</Button>
    </form>
  </main>
}
