import importlib.util
from datetime import date
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('migration', Path(__file__).with_name('prepare-legacy-migration.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ConversionTests(unittest.TestCase):
    def test_money_percent_and_missing_values(self):
        self.assertEqual(m.money('120.000,50'), '120.000,50')
        self.assertEqual(m.money('0,00'), '0,00')
        self.assertEqual(m.money(''), '')
        self.assertEqual(m.percent('0,050000001'), 5)
        self.assertEqual(m.percent('1'), 100)
        self.assertEqual(m.percent('0,005'), 0.5)
        for value in ['NaN', '1.5', '1,2,3', 'abc']:
            with self.assertRaises(ValueError):
                m.number(value)

    def test_dates_ids_and_duplicate_source_ids(self):
        self.assertEqual(m.iso_date('1/11/2026'), '2026-11-01')
        self.assertIsNone(m.iso_date(''))
        with self.assertRaises(ValueError):
            m.iso_date('31/2/2026')
        self.assertEqual(m.uid('tenant', '1'), m.uid('tenant', '1'))
        self.assertNotEqual(m.uid('tenant', '1'), m.uid('owner', '1'))
        with self.assertRaises(ValueError):
            m.index([{'id': '1'}, {'id': '1'}], 'id')

    def test_contract_mapping_null_dni_unknown_cutoff_and_rescission(self):
        data = {key: [] for key in m.TABLES}
        data['Inquilinos'] = [{'Id Inquilino': '1', 'Nombre': 'Persona', 'Apellido': 'Prueba'}]
        data['Propietarios'] = [{'ID Propietario': '2', 'Nombre': 'Dueño', 'Apellido': 'Prueba'}]
        data['Propiedades'] = [{'ID': '3', 'Carpeta': '10', 'Dirección': 'Calle ficticia', 'Localidad': '0'}]
        data['RelaciónPropietarios'] = [{'Propiedad': '3', 'Propietario': '2', 'Titular': 'VERDADERO', 'Participación': '1', 'AdminPor': '0,05', 'AdministFija': '0'}]
        data['Contrato'] = [{'ID Contrato': '4', 'Propiedad': '3', 'Inquilino': '1', 'Inicio Contrato': '1/11/2026', 'Fin Contrato': '31/10/2027', 'Cuotas': '12', 'Per1': '12', 'Monto del Alquiler': '120.000,00', 'Punitorios': '0,01', 'Rescindio': 'VERDADERO', 'FechaRes': '1/12/2026'}]
        plan = m.prepare(data, 'a' * 64, date(2026, 11, 3))
        self.assertTrue(all(p['dni'] is None for p in plan['people']))
        contract = plan['contracts'][0]
        self.assertEqual(contract['endDate'], '2027-10-31T00:00:00.000Z')
        self.assertEqual(contract['status'], 'EXPIRED')
        self.assertIsNone(contract['settings']['periods']['pendingFrom'])
        self.assertTrue(contract['settings']['legacy']['reconciliationRequired'])
        self.assertEqual(contract['settings']['periods']['rows'][0]['rent'], '120.000,00')
        self.assertEqual(contract['settings']['surcharges']['dailyPercentagePoints'], '1,0')
        inventory = [dict(sheet=name, headers=list(rows[0]) if rows else []) for name, rows in data.items()]
        locations = {name: [dict(headerRow=1, row=i+2) for i in range(len(rows))] for name, rows in data.items()}
        trace = m.traceability(data, plan, locations, inventory)
        record = trace['sheets']['Contrato']['rows'][0]
        self.assertEqual(record['row'], 2)
        self.assertEqual(record['sourceId'], '4')
        self.assertEqual(record['usage'], 'converted')
        self.assertEqual(record['destinationPlanRefs'], ['contracts/' + contract['id']])
        self.assertNotIn('Calle ficticia', str(trace))
        self.assertEqual([m.column_letter(n) for n in [1, 26, 27, 52, 53]], ['A', 'Z', 'AA', 'AZ', 'BA'])
        data['RelaciónPropietarios'][0]['AdministFija'] = '10.000,50'
        fixed_plan = m.prepare(data, 'a' * 64, date(2026, 11, 3))
        self.assertEqual(fixed_plan['propertyOwners'][0]['commission'], 10000.50)
        self.assertEqual(fixed_plan['propertyOwners'][0]['administration'], 5)
        # A broken owner must omit the affected contract, retaining the valid one.
        data['Propiedades'].append(dict(data['Propiedades'][0], ID='5'))
        data['Contrato'].append(dict(data['Contrato'][0], **{'ID Contrato': '6', 'Propiedad': '5'}))
        data['RelaciónPropietarios'].append(dict(data['RelaciónPropietarios'][0], Propiedad='5', Propietario=''))
        with self.assertRaisesRegex(ValueError, 'ownership reference'):
            m.prepare(data, 'a' * 64, date(2026, 11, 3))
        filtered = m.prepare(data, 'a' * 64, date(2026, 11, 3), skip_missing_owners=True)
        self.assertEqual([c['settings']['legacy']['contractId'] for c in filtered['contracts']], ['4'])
        self.assertIn(dict(kind='skipped-contract-missing-owner', sourceId='6', propertyId='5'), filtered['issues'])
        inventory = [dict(sheet=name, headers=list(rows[0]) if rows else []) for name, rows in data.items()]
        locations = {name: [dict(headerRow=1, row=i+2) for i in range(len(rows))] for name, rows in data.items()}
        trace = m.traceability(data, filtered, locations, inventory)
        self.assertEqual(trace['sheets']['Contrato']['rows'][1]['usage'], 'skipped-missing-owner')
        data['RelaciónPropietarios'][-1]['Propietario'] = '2'
        data['Propietarios'].append(dict(data['Propietarios'][0], **{'ID Propietario': '7'}))
        data['RelaciónPropietarios'][-1]['Propietario'] = '7'
        repeated = m.prepare(data, 'a' * 64, date(2026, 11, 3))
        self.assertEqual(len(repeated['properties']), 2)
        self.assertEqual(len(repeated['contracts']), 2)
        self.assertNotEqual(repeated['contracts'][0]['propertyId'], repeated['contracts'][1]['propertyId'])
        self.assertNotEqual(repeated['contracts'][0]['ownerId'], repeated['contracts'][1]['ownerId'])
        data['Contrato'][0]['Inquilino'] = 'missing'
        with self.assertRaises(ValueError):
            m.prepare(data, 'a' * 64, date(2026, 11, 3))


if __name__ == '__main__':
    unittest.main()
