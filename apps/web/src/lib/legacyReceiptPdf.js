import { createSettlementPdf } from "./settlementPdf.js"

// Export only saved source values. Never use the current contract or infer items.
export function legacyReceiptLines(receipt) {
  const snapshot = receipt.snapshot ?? {}
  const original = snapshot.original ?? {}
  const lines = [
    `HISTORICO - RECIBO Nro ${snapshot.originalNumber ?? receipt.receipt}`,
    'Exportacion de datos del sistema anterior. No es el PDF original.',
    `Inquilino: ${snapshot.tenantName ?? receipt.personName ?? 'No informado'}`,
    `Propiedad: ${snapshot.propertyAddress || 'No informada'}`,
    `Carpeta: ${snapshot.folder ?? 'No informada'}`,
    `Origen: Recibos, fila ${snapshot.sourceRow ?? '-'}, ID ${snapshot.sourceId ?? '-'}`,
    '',
  ]
  if (snapshot.reviewReasons?.length) lines.push('REVISAR: importes faltantes o que no concilian. Se conservan los originales.', '')
  for (const field of ['Id Recibo', 'Fecha Alta', 'Contrato', 'Total', 'MontoPagado', 'SaldoInquilino', 'MontoPagadoA', 'MontoPagadoB', 'SaldoA', 'SaldoB', 'Alquiler', 'Punitorios', 'Periodo-Mes', 'PeriodoTXT', 'PeridoDeudaTXT', 'Conceptos', 'Obs', 'txtcomprobante', 'Anulado']) {
    lines.push(`${field}: ${original[field] || 'No informado'}`)
  }
  return lines
}

export function createLegacyReceiptPdf(receipt) {
  const snapshot = receipt.snapshot ?? {}
  const original = snapshot.original ?? {}
  const saved = key => original[key] === null || original[key] === undefined || original[key] === ''
    ? null : String(original[key])
  const cancelled = receipt.cancelled || snapshot.cancelled || original.Anulado === 'VERDADERO'
  const period = saved('PeriodoTXT') ?? saved('Periodo-Mes') ?? 'No informado'
  return createSettlementPdf({
    variant: 'receipt',
    historical: {
      cancelled,
      description: `Reproduccion del recibo importado. Propiedad: ${snapshot.propertyAddress || 'No informada'}. Periodo: ${period}. No es el PDF original.`,
    },
    contract: {
      owner: snapshot.ownerName || 'No informado en el registro',
      tenant: snapshot.tenantName || receipt.personName || 'No informado',
      address: snapshot.propertyAddress || 'No informada',
    },
    receiptNumber: snapshot.originalNumber ?? receipt.receipt,
    date: saved('Fecha Alta') ?? 'No informada',
    total: saved('Total'), paidAmount: saved('MontoPagado'), balance: saved('SaldoInquilino'),
    items: [{
      apply: true, dueDate: 'No informado',
      description: 'Alquiler y punitorios registrados (sin desglose completo)',
      edit: saved('Alquiler'), penaltyAmount: saved('Punitorios'), totalAmount: null,
    }],
    notes: [
      'Reproduccion de datos importados. No es el PDF original. Ver detalle en las paginas siguientes.',
      ...(snapshot.reviewReasons?.length ? ['REVISAR: importes faltantes o que no concilian; se conservan los originales.'] : []),
    ],
    appendixLines: legacyReceiptLines(receipt),
  })
}
