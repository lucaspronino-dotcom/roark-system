import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

function ContractStatusBadge({ expired }) {
  const { t } = useTranslation()

  return (
    <Badge variant={expired ? "destructive" : "secondary"}>
      {expired ? t("status.expired") : t("status.activeRent")}
    </Badge>
  )
}

export { ContractStatusBadge }
