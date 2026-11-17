"""Extract tenant receipt history without changing contracts or inferring paid periods."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location('migration', Path(__file__).with_name('prepare-legacy-migration.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

FIELDS = ['IdClave', 'Id Recibo', 'IdReciboProp', 'Contrato', 'Fecha Alta', 'Total',
          'MontoPagado', 'SaldoInquilino', 'MontoPagadoA', 'MontoPagadoB', 'SaldoA',
          'SaldoB', 'SaldoODebe', 'Anulado', 'EsDeuda', 'BalanceIni', 'Alquiler',
          'Punitorios', 'Conceptos', 'Periodo-Mes', 'PeriodoTXT', 'PeridoDeudaTXT',
          'Obs', 'txtcomprobante', 'Tipo', 'nroRecibo', 'NroReciboC', 'NroReciboGral']


def amount(value):
    parsed = m.number(value)
    if parsed is None:
        return None
    if parsed != parsed.quantize(m.Decimal('0.01')):
        raise ValueError('History amount has more than two decimals')
    return format(parsed, '.2f')


def prepare_history(rows, contracts_plan, source_hash):
    if contracts_plan['sourceHash'] != source_hash:
        raise ValueError('ODS differs from the selected contracts plan')
    contracts = {c['settings']['legacy']['contractId']: c for c in contracts_plan['contracts']}
    people = {p['id']: p for p in contracts_plan['people']}
    tenants = {t['id']: t for t in contracts_plan['tenants']}
    properties = {p['id']: p for p in contracts_plan['properties']}
    result = dict(version=1, type='legacy-tenant-history', sourceHash=source_hash,
                  receipts=[], skipped=[], reviewCount=0)
    seen, numbers = set(), set()
    for row_number, row in rows:
        number = row.get('Id Recibo', '').strip()
        if not number or number == '0':
            result['skipped'].append(dict(row=row_number, sourceId=row.get('IdClave'), reason='not-tenant-receipt'))
            continue
        source_id = row.get('IdClave', '').strip()
        if not source_id or source_id in seen:
            raise ValueError('Missing/duplicate tenant receipt source ID')
        seen.add(source_id)
        old_contract = row.get('Contrato', '').strip()
        if old_contract not in contracts:
            result['skipped'].append(dict(row=row_number, sourceId=source_id, contractId=old_contract, reason='contract-not-imported'))
            continue
        if not number.isdigit() or not 0 < int(number) <= 2147483647 or int(number) in numbers:
            raise ValueError(f'Invalid/duplicate receipt number at Recibos row {row_number}')
        numbers.add(int(number))
        contract = contracts[old_contract]
        person = people[tenants[contract['tenantId']]['personId']]
        person_name = f"{person['lastName']}, {person['firstName']}".lower()
        property_row = properties[contract['propertyId']]
        date = m.iso_date(row.get('Fecha Alta', ''))
        if not date:
            raise ValueError(f'Missing date at Recibos row {row_number}')
        total, paid, balance = (amount(row.get(key, '')) for key in ['Total', 'MontoPagado', 'SaldoInquilino'])
        cancelled = row.get('Anulado', '').strip()
        if cancelled not in ['VERDADERO', 'FALSO']:
            raise ValueError(f'Unknown cancelled flag at Recibos row {row_number}')
        reasons = []
        if any(value is None for value in [total, paid, balance]):
            reasons.append('missing-amount')
        elif m.Decimal(total) - m.Decimal(paid) != m.Decimal(balance):
            reasons.append('amounts-do-not-reconcile')
        result['reviewCount'] += bool(reasons)
        result['receipts'].append(dict(
            id=m.uid('tenant-history', source_id), origin='LEGACY', kind='TENANT_SETTLEMENT',
            contractId=contract['id'], number=int(number), date=date+'T00:00:00.000Z',
            personName=person_name, pdfBase64=None,
            total=None if total is None else float(total), paid=None if paid is None else float(paid),
            balance=None if balance is None else float(balance),
            snapshot=dict(sourceHash=source_hash, sourceId=source_id, sourceSheet='Recibos',
                          sourceRow=row_number, sourceContractId=old_contract, originalNumber=number,
                          tenantName=person_name, propertyAddress=property_row['address'], folder=property_row['folder'],
                          cancelled=cancelled == 'VERDADERO', reviewReasons=reasons,
                          original={field: row.get(field, '') for field in FIELDS})))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('ods')
    parser.add_argument('--contracts-plan', required=True)
    parser.add_argument('--output-dir', required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent / 'private'
    output = Path(args.output_dir).resolve()
    if not output.is_relative_to(root):
        raise ValueError('Output must stay in private/')
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    target = output / 'history-plan.json'
    if target.exists():
        raise ValueError('History plan exists; choose a new output directory')
    rows = []
    def collect(sheet, headers, cells, repeat, location):
        if sheet == 'Recibos':
            if repeat > 10000:
                raise ValueError('Unexpected repeated receipts')
            row = {h: cells[i] if i < len(cells) else '' for i, h in enumerate(headers) if h in FIELDS}
            rows.extend((location['rowStart'] + i, row) for i in range(repeat))
    m.ods.inspect(args.ods, on_row_location=collect)
    if not rows:
        raise ValueError('Recibos sheet is empty or missing')
    with open(args.ods, 'rb') as source:
        source_hash = hashlib.file_digest(source, 'sha256').hexdigest()
    contracts = json.loads(Path(args.contracts_plan).read_text())
    plan = prepare_history(rows, contracts, source_hash)
    plan['inputFile'] = Path(args.ods).name
    plan['preparedAt'] = datetime.now(timezone.utc).isoformat()
    plan['scriptSha256'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    with target.open('x') as stream:
        target.chmod(0o600)
        json.dump(plan, stream, ensure_ascii=False, indent=2)
    print(json.dumps(dict(receipts=len(plan['receipts']), reviewCount=plan['reviewCount'], skipped=len(plan['skipped']))))


if __name__ == '__main__':
    main()
