"""Prepare an auditable private JSON plan from ODS, without database writes."""
import argparse
from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
import hashlib
import importlib.util
import json
from pathlib import Path
import re
from uuid import NAMESPACE_URL, uuid5

spec = importlib.util.spec_from_file_location('ods', Path(__file__).with_name('inspect-legacy-ods.py'))
ods = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ods)
TABLES = ['Contrato', 'Propiedades', 'Propietarios', 'Inquilinos', 'RelaciónPropietarios',
          'Conceptos_Fijos', 'Recibos', 'ResumendeCuentaPropietario', 'Movimientos',
          'FormasPagoDetalle', 'localidades', 'Ciudades']


def uid(kind, old_id):
    return str(uuid5(NAMESPACE_URL, f'roark:legacy:v1:{kind}:{old_id}'))


def number(value):
    value = str(value).strip().replace('$', '').replace(' ', '')
    if not value:
        return None
    if not re.fullmatch(r'-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?', value):
        raise ValueError('Invalid legacy decimal')
    try:
        result = Decimal(value.replace('.', '').replace(',', '.'))
    except InvalidOperation as error:
        raise ValueError('Invalid legacy decimal') from error
    return result


def percent(value):
    parsed = number(value)
    return None if parsed is None else float((parsed * 100).quantize(Decimal('0.0001')))


def iso_date(value):
    if not value:
        return None
    return datetime.strptime(value.strip(), '%d/%m/%Y').date().isoformat()


def money(value):
    parsed = number(value)
    if parsed is None:
        return ''
    return f'{parsed:,.2f}'.replace(',', '_').replace('.', ',').replace('_', '.')


def index(rows, key):
    result = {}
    for row in rows:
        identifier = row.get(key, '').strip()
        if not identifier or identifier in result:
            raise ValueError(f'Missing/duplicate source ID: {key}')
        result[identifier] = row
    return result


def prepare(source, source_hash, today, skip_missing_owners=False):
    contracts = index(source['Contrato'], 'ID Contrato')
    properties = index(source['Propiedades'], 'ID')
    tenants = index(source['Inquilinos'], 'Id Inquilino')
    owners = index(source['Propietarios'], 'ID Propietario')
    cities = index(source['localidades'], 'Id')
    links = defaultdict(list)
    missing_owners = set()
    for row in source['RelaciónPropietarios']:
        if row['Propiedad'] not in properties or row['Propietario'] not in owners:
            if skip_missing_owners:
                missing_owners.add(row['Propiedad'])
                continue
            raise ValueError('Unresolved property ownership reference')
        links[row['Propiedad']].append(row)
    skipped = []
    if skip_missing_owners:
        for identifier, row in list(contracts.items()):
            if row['Propiedad'] in missing_owners or not links[row['Propiedad']]:
                skipped.append(dict(kind='skipped-contract-missing-owner', sourceId=identifier, propertyId=row['Propiedad']))
                del contracts[identifier]
    used_properties, used_tenants = set(), set()
    for row in contracts.values():
        if row['Propiedad'] not in properties or row['Inquilino'] not in tenants:
            raise ValueError('Unresolved contract reference')
        used_properties.add(row['Propiedad'])
        used_tenants.add(row['Inquilino'])
    used_owners = {r['Propietario'] for p in used_properties for r in links[p]}
    plan = dict(version=1, sourceHash=source_hash, asOf=today.isoformat(),
                people=[], tenants=[], owners=[], properties=[], propertyOwners=[], contracts=[], issues=[])
    issues = plan['issues']
    issues.extend(skipped)

    def city(value):
        if not value or value == '0':
            return ''
        if value not in cities:
            if not value.isdigit():
                return value
            raise ValueError('Unknown city ID')
        return cities[value]['Nombre']

    for role, ids, records in [('tenant', used_tenants, tenants), ('owner', used_owners, owners)]:
        for identifier in sorted(ids):
            row = records[identifier]
            person_id = uid(role + '-person', identifier)
            dni = row.get('Documentos', '').strip() or None
            plan['people'].append(dict(id=person_id, firstName=row.get('Nombre', ''),
                                      lastName=row.get('Apellido', ''), dni=dni,
                                      phone=row.get('Celular') or row.get('Telefonos', ''),
                                      email=row.get('email') or None))
            if role == 'owner':
                plan['owners'].append(dict(id=uid(role, identifier), personId=person_id,
                                           address=row.get('Dirección', ''), city=city(row.get('Localidad')),
                                           transferAliasOrCbu=row.get('CBU') or None))
            else:
                related = [r for r in contracts.values() if r['Inquilino'] == identifier]
                latest = max(related, key=lambda r: iso_date(r['Inicio Contrato']))
                plan['tenants'].append(dict(id=uid(role, identifier), personId=person_id,
                                            rentalAddress=properties[latest['Propiedad']]['Dirección']))

    # Preserve source identities even when folder and address are repeated.
    property_map = {}
    for canonical in sorted(used_properties):
        row = properties[canonical]
        if not row['Carpeta'] or not row['Dirección']:
            raise ValueError('Referenced property missing folder/address')
        folder, address = row['Carpeta'].strip(), row['Dirección'].strip()
        ids = [canonical]
        property_id = uid('property', canonical)
        if not links[canonical]:
            raise ValueError('Property missing owners')
        if sum(r['Titular'] == 'VERDADERO' for r in links[canonical]) != 1:
            raise ValueError('Property must have exactly one primary owner')
        if sum(number(r['Participación']) or Decimal(0) for r in links[canonical]) != Decimal(1):
            raise ValueError('Property participation must sum to 100%')
        plan['properties'].append(dict(id=property_id, folder=folder, address=address,
                                       type='', status='', city=city(properties[canonical]['Localidad'])))
        issues.append(dict(kind='property-type-status-unmapped', sourceIds=ids))
        for identifier in ids:
            property_map[identifier] = property_id
        for row in links[canonical]:
            plan['propertyOwners'].append(dict(id=uid('property-owner', canonical + ':' + row['Propietario']),
                propertyId=property_id, ownerId=uid('owner', row['Propietario']),
                isPrimary=row['Titular'] == 'VERDADERO', participation=percent(row['Participación']),
                administration=percent(row['AdminPor']), commission=float(number(row['AdministFija']) or 0)))

    for identifier, row in contracts.items():
        start, end = iso_date(row['Inicio Contrato']), iso_date(row['Fin Contrato'])
        if not start or not end or start > end:
            raise ValueError('Invalid contract dates')
        installments = int(row['Cuotas'])
        periods, last = [], 0
        for i in range(1, 13):
            until = int(row.get(f'Per{i}') or 0)
            amount = row.get('Monto del Alquiler' + (str(i) if i > 1 else ''), '')
            if not until:
                if amount:
                    issues.append(dict(kind='rent-without-period', contract=identifier, period=i))
                continue
            if until <= last or until > installments:
                issues.append(dict(kind='invalid-period-limit', contract=identifier, period=i, until=until))
                continue
            if not amount:
                issues.append(dict(kind='missing-rent', contract=identifier, period=i))
            periods.append(dict(untilInstallment=until, rent=money(amount), extras=money(row.get(f'Documento{i}', ''))))
            last = until
        if last < installments:
            periods.append(dict(untilInstallment=installments, rent='', extras=''))
            issues.append(dict(kind='missing-final-rent', contract=identifier))
        primary = next(r for r in links[row['Propiedad']] if r['Titular'] == 'VERDADERO')
        terminated = row['Rescindio'] == 'VERDADERO'
        legacy = dict(source='BB_DD.ods', sourceHash=source_hash, contractId=identifier,
                      propertyId=row['Propiedad'], tenantId=row['Inquilino'], ownerId=primary['Propietario'],
                      reconciliationRequired=True, originalContract=row,
                      originalProperty=properties[row['Propiedad']],
                      fixedConcepts=[r for r in source['Conceptos_Fijos'] if r['Contrato'] == identifier],
                      receiptCount=sum(r.get('Contrato') == identifier for r in source['Recibos']))
        settings = dict(periods=dict(installments=str(installments), adjustmentInterval=row.get('Per1', ''),
                            adjustmentType='', rows=periods, skipPastPeriods=False, pendingFrom=None),
                        surcharges=dict(chargeFromDay='', dailyPercentagePoints=str(percent(row['Punitorios'])).replace('.', ','),
                            finalPayment=row.get('Pago Final', ''), firstPaymentDate=row.get('FechadePrimerPago', ''),
                            fixedDailyPoints='', graceDays=row.get('DiasGracia', '')),
                        termination=dict(date=row.get('FechaRes', '') if terminated else ''), legacy=legacy)
        plan['contracts'].append(dict(id=uid('contract', identifier), folder=properties[row['Propiedad']]['Carpeta'],
            startDate=start+'T00:00:00.000Z', endDate=end+'T00:00:00.000Z',
            status='EXPIRED' if terminated or end < today.isoformat() else 'ACTIVE',
            propertyId=property_map[row['Propiedad']], tenantId=uid('tenant', row['Inquilino']),
            ownerId=uid('owner', primary['Propietario']), settings=settings))
    if not plan['contracts']:
        raise ValueError('Empty import refused')
    return plan



def column_letter(index):
    result = ''
    while index:
        index, remainder = divmod(index - 1, 26)
        result = chr(65 + remainder) + result
    return result


def traceability(source, plan, locations, inventory):
    """Record source coordinates and planned destinations, not personal values."""
    contracts = {c['settings']['legacy']['contractId']: c for c in plan['contracts']}
    properties = {c['settings']['legacy']['propertyId']: c['propertyId'] for c in plan['contracts']}
    people = {p['id'] for p in plan['people']}
    links = {(r['propertyId'], r['ownerId']): r['id'] for r in plan['propertyOwners']}
    link_ids = {r['id'] for r in plan['propertyOwners']}
    cities = {r.get('Localidad') for r in source['Propiedades'] if r['ID'] in properties}
    cities.update(r.get('Localidad') for r in source['Propietarios'] if uid('owner-person', r['ID Propietario']) in people)
    keys = {'Contrato': 'ID Contrato', 'Propiedades': 'ID', 'Inquilinos': 'Id Inquilino',
            'Propietarios': 'ID Propietario', 'RelaciónPropietarios': 'id',
            'Conceptos_Fijos': 'ID Concepto', 'Recibos': 'IdClave',
            'localidades': 'Id', 'Ciudades': 'Id', 'Movimientos': 'IDgasto'}
    sheets = {}
    for table in inventory:
        name = table['sheet']
        if name not in source:
            continue
        records = []
        for row, location in zip(source[name], locations.get(name, []), strict=True):
            old_id = row.get(keys.get(name, 'Id'), '')
            usage, refs = 'archive-only', []
            if name == 'Contrato' and old_id in contracts:
                usage, refs = 'converted', ['contracts/' + contracts[old_id]['id']]
            elif name == 'Contrato':
                usage = 'skipped-missing-owner'
            elif name in ('Inquilinos', 'Propietarios'):
                role = 'tenant' if name == 'Inquilinos' else 'owner'
                if uid(role + '-person', old_id) in people:
                    usage, refs = 'converted', ['people/' + uid(role + '-person', old_id), role + 's/' + uid(role, old_id)]
            elif name == 'Propiedades' and old_id in properties:
                usage, refs = 'converted-or-consolidated', ['properties/' + properties[old_id]]
            elif name == 'RelaciónPropietarios' and row['Propiedad'] in properties:
                destination = links[(properties[row['Propiedad']], uid('owner', row['Propietario']))]
                original = uid('property-owner', row['Propiedad'] + ':' + row['Propietario'])
                usage = 'converted' if original in link_ids else 'consolidated-reference'
                refs = ['propertyOwners/' + destination]
            elif name == 'Conceptos_Fijos' and row['Contrato'] in contracts:
                usage, refs = 'snapshot-only', ['contracts/' + contracts[row['Contrato']]['id'] + '/settings/legacy/fixedConcepts']
            elif name == 'Recibos' and row.get('Contrato') in contracts:
                usage, refs = 'count-only', ['contracts/' + contracts[row['Contrato']]['id'] + '/settings/legacy/receiptCount']
            elif name == 'localidades' and old_id in cities:
                usage = 'lookup'
            records.append(dict(**location, sourceId=old_id, usage=usage, destinationPlanRefs=refs))
        sheets[name] = dict(columns=[dict(index=i, letter=column_letter(i), header=h,
            extracted=not any(word in h.lower() for word in ['password', 'username', 'userweb']))
            for i, h in enumerate(table['headers'], 1)], rows=records)
    return dict(version=1, sourceHash=plan['sourceHash'], asOf=plan['asOf'],
                note='Destinations are plan IDs. The DB importer can reuse an existing property UUID.', sheets=sheets)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('ods')
    parser.add_argument('--output-dir', default='private/migration')
    parser.add_argument('--as-of', default=date.today().isoformat())
    parser.add_argument('--skip-missing-owners', action='store_true')
    args = parser.parse_args()
    output = Path(args.output_dir).resolve()
    private = Path(__file__).resolve().parent.parent / 'private'
    if not output.is_relative_to(private):
        raise ValueError('Output must stay inside private/')
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    if any((output / name).exists() for name in ['source.json', 'plan.json', 'traceability.json']):
        raise ValueError('Output already contains an attempt; choose a new --output-dir')
    source = {name: [] for name in TABLES}
    locations = {name: [] for name in TABLES}
    def collect(sheet, headers, cells, repeat, location):
        if sheet in source:
            if repeat > 10000:
                raise ValueError('Unexpected repeated business records')
            row = {h: cells[i] if i < len(cells) else '' for i, h in enumerate(headers)
                   if not any(word in h.lower() for word in ['password', 'username', 'userweb'])}
            source[sheet].extend([row] * repeat)
            locations[sheet].extend(dict(headerRow=location['headerRow'], row=location['rowStart'] + i) for i in range(repeat))
    inventory = ods.inspect(args.ods, on_row_location=collect)
    with open(args.ods, 'rb') as original:
        digest = hashlib.file_digest(original, 'sha256').hexdigest()
    plan = prepare(source, digest, date.fromisoformat(args.as_of), args.skip_missing_owners)
    trace = traceability(source, plan, locations, inventory)
    trace['inputFile'] = Path(args.ods).name
    trace['scriptSha256'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    for name, value in [('source.json', source), ('plan.json', plan), ('traceability.json', trace)]:
        path = output / name
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2))
        path.chmod(0o600)
    counts = {k: len(plan[k]) for k in ['people', 'tenants', 'owners', 'properties', 'propertyOwners', 'contracts', 'issues']}
    print(json.dumps(counts))


if __name__ == '__main__':
    main()
