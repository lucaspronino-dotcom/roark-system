import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Moon, Sun } from "lucide-react"

import { ContractRecord } from "@/components/ContractRecord"
import { ContractsTable } from "@/components/ContractsTable"
import { PropertyDetail } from "@/components/PropertyDetail"
import { Label } from "@/components/ui/label"
import { defaultContracts } from "@/data/contracts"
import { i18nOptions } from "@/i18n"

function App() {
  const [view, setView] = useState({ name: "contracts" })
  const [theme, setThemeState] = useState(getInitialTheme)
  const { i18n, t } = useTranslation()

  function handleLocaleChange(nextLocale) {
    localStorage.setItem("locale", nextLocale)
    i18n.changeLanguage(nextLocale)
  }

  function setTheme(nextTheme) {
    document.documentElement.classList.toggle("dark", nextTheme === "dark")
    localStorage.setItem("theme", nextTheme)
    setThemeState(nextTheme)
  }

  return (
    <main className="min-h-screen bg-muted/40 p-8 pb-16 text-foreground">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex justify-end gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="locale">{t("language.label")}</Label>
            <select
              className="h-8 border border-input bg-background px-2 text-xs"
              id="locale"
              onChange={(event) => handleLocaleChange(event.target.value)}
              value={i18n.language}
            >
              {i18nOptions.map((availableLocale) => (
                <option key={availableLocale} value={availableLocale}>
                  {t(`language.${availableLocale}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="theme">{t("theme.label")}</Label>
            <select
              className="h-8 border border-input bg-background px-2 text-xs"
              id="theme"
              onChange={(event) => setTheme(event.target.value)}
              value={theme}
            >
              <option value="light">{t("theme.light")}</option>
              <option value="dark">{t("theme.dark")}</option>
            </select>
            {theme === "dark" ? (
              <Moon className="size-4 text-muted-foreground" />
            ) : (
              <Sun className="size-4 text-muted-foreground" />
            )}
          </div>
        </div>
        {view.name === "contract" ? (
          <ContractRecord
            contract={view.contract}
            onBack={() => setView({ name: "contracts" })}
          />
        ) : null}
        {view.name === "property" ? (
          <PropertyDetail
            onBack={() => setView({ name: "contracts" })}
            property={view.property}
          />
        ) : null}
        {view.name === "contracts" ? (
          <ContractsTable
            contracts={defaultContracts}
            onOpenContract={(contract) => setView({ name: "contract", contract })}
            onOpenProperty={(property) => setView({ name: "property", property })}
          />
        ) : null}
      </div>
    </main>
  )
}

function getInitialTheme() {
  const storedTheme = localStorage.getItem("theme")
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  const theme = storedTheme ?? (prefersDark ? "dark" : "light")

  document.documentElement.classList.toggle("dark", theme === "dark")

  return theme
}

export default App
