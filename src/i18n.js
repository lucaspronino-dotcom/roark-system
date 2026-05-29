import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "@/locales/en.json"
import es from "@/locales/es.json"

const defaultLocale = "es"
const i18nOptions = ["es", "en"]

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: getInitialLocale(),
  fallbackLng: defaultLocale,
  interpolation: {
    escapeValue: false,
  },
})

function getInitialLocale() {
  const storedLocale = localStorage.getItem("locale")

  if (storedLocale && i18nOptions.includes(storedLocale)) {
    return storedLocale
  }

  const browserLocale = navigator.language?.slice(0, 2)

  return i18nOptions.includes(browserLocale) ? browserLocale : defaultLocale
}

export { i18nOptions }
export default i18n
