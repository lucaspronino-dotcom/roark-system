import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Moon, Palette, Sun } from "lucide-react"

import { ContractRecord } from "@/components/ContractRecord"
import { ContractsTable } from "@/components/ContractsTable"
import { RentSettlement } from "@/components/RentSettlement"
import { PropertyDetail } from "@/components/PropertyDetail"
import { Label } from "@/components/ui/label"
import { defaultContracts } from "@/data/contracts"
import { i18nOptions } from "@/i18n"

const themeFamilyOptions = ["default", "claudePlus", "deSwissDesign"]
const colorModeOptions = ["light", "dark"]

function App() {
  const [view, setView] = useState({ name: "contracts" })
  const [themeSettings, setThemeSettings] = useState(getInitialTheme)
  const themeFamily = themeSettings.family
  const colorMode = themeSettings.mode
  const { i18n, t } = useTranslation()

  function handleLocaleChange(nextLocale) {
    localStorage.setItem("locale", nextLocale)
    i18n.changeLanguage(nextLocale)
  }

  function setThemeFamily(nextThemeFamily) {
    applyTheme(nextThemeFamily, colorMode)
    localStorage.setItem("themeFamily", nextThemeFamily)
    setThemeSettings({ family: nextThemeFamily, mode: colorMode })
  }

  function setColorMode(nextColorMode) {
    applyTheme(themeFamily, nextColorMode)
    localStorage.setItem("colorMode", nextColorMode)
    setThemeSettings({ family: themeFamily, mode: nextColorMode })
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
            <Label htmlFor="theme-family">{t("themeFamily.label")}</Label>
            <select
              className="h-8 border border-input bg-background px-2 text-xs"
              id="theme-family"
              onChange={(event) => setThemeFamily(event.target.value)}
              value={themeFamily}
            >
              {themeFamilyOptions.map((availableThemeFamily) => (
                <option key={availableThemeFamily} value={availableThemeFamily}>
                  {t(`themeFamily.${availableThemeFamily}`)}
                </option>
              ))}
            </select>
            <Palette className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="color-mode">{t("colorMode.label")}</Label>
            <select
              className="h-8 border border-input bg-background px-2 text-xs"
              id="color-mode"
              onChange={(event) => setColorMode(event.target.value)}
              value={colorMode}
            >
              {colorModeOptions.map((availableColorMode) => (
                <option key={availableColorMode} value={availableColorMode}>
                  {t(`colorMode.${availableColorMode}`)}
                </option>
              ))}
            </select>
            {colorMode === "dark" ? (
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
        {view.name === "rentSettlement" ? (
          <RentSettlement
            contract={view.contract}
            onBack={() => setView({ name: "contracts" })}
          />
        ) : null}
        {view.name === "contracts" ? (
          <ContractsTable
            contracts={defaultContracts}
            onOpenContract={(contract) => setView({ name: "contract", contract })}
            onOpenProperty={(property) => setView({ name: "property", property })}
            onOpenRentSettlement={(contract) =>
              setView({ name: "rentSettlement", contract })
            }
          />
        ) : null}
      </div>
    </main>
  )
}

function getInitialTheme() {
  const storedThemeFamily = localStorage.getItem("themeFamily")
  const storedColorMode = localStorage.getItem("colorMode")
  const legacyTheme = localStorage.getItem("theme")
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  const fallbackColorMode = prefersDark ? "dark" : "light"
  const family = themeFamilyOptions.includes(storedThemeFamily)
    ? storedThemeFamily
    : legacyTheme === "claudePlus"
      ? "claudePlus"
      : legacyTheme === "deSwissDesign"
        ? "deSwissDesign"
      : "default"
  const mode = colorModeOptions.includes(storedColorMode)
    ? storedColorMode
    : colorModeOptions.includes(legacyTheme)
      ? legacyTheme
      : fallbackColorMode

  applyTheme(family, mode)

  return { family, mode }
}

function applyTheme(themeFamily, colorMode) {
  document.documentElement.classList.toggle("dark", colorMode === "dark")
  document.documentElement.classList.toggle(
    "theme-claude-plus",
    themeFamily === "claudePlus",
  )
  document.documentElement.classList.toggle(
    "theme-de-swiss-design",
    themeFamily === "deSwissDesign",
  )
}

export default App
