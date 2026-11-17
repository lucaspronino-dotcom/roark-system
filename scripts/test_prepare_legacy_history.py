import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('history', Path(__file__).with_name('prepare-legacy-history.py'))
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)


class HistoryTests(unittest.TestCase):
    def setUp(self):
        self.plan = dict(sourceHash='a' * 64,
                         contracts=[dict(id='contract', tenantId='tenant', propertyId='property',
                                         settings=dict(legacy=dict(contractId='7')))],
                         people=[dict(id='person', firstName='Persona', lastName='Prueba')],
                         tenants=[dict(id='tenant', personId='person')],
                         properties=[dict(id='property', address='Dirección de prueba', folder='1')])
        self.row = {'IdClave': '42', 'Id Recibo': '123', 'Contrato': '7',
                    'Fecha Alta': '4/11/2026', 'Total': '1.200,50',
                    'MontoPagado': '1.000,00', 'SaldoInquilino': '200,50',
                    'Anulado': 'FALSO', 'PeriodoTXT': 'Texto original'}

    def prepare(self, rows=None):
        return h.prepare_history(rows or [(2, self.row)], self.plan, 'a' * 64)

    def test_preserves_snapshot_amounts_and_contracts(self):
        before = copy.deepcopy(self.plan)
        result = self.prepare()
        receipt = result['receipts'][0]
        self.assertEqual((receipt['total'], receipt['paid'], receipt['balance']), (1200.5, 1000, 200.5))
        self.assertEqual(receipt['snapshot']['original']['PeriodoTXT'], 'Texto original')
        self.assertEqual(receipt['snapshot']['sourceRow'], 2)
        self.assertEqual(receipt['snapshot']['reviewReasons'], [])
        self.assertNotIn('items', receipt['snapshot'])
        self.assertIsNone(receipt['pdfBase64'])
        self.assertEqual(receipt['origin'], 'LEGACY')
        self.assertEqual(self.plan, before)
        self.assertEqual(result, self.prepare())

    def test_missing_and_inconsistent_amounts_are_not_corrected(self):
        self.row['MontoPagado'] = ''
        receipt = self.prepare()['receipts'][0]
        self.assertIsNone(receipt['paid'])
        self.assertIn('missing-amount', receipt['snapshot']['reviewReasons'])
        self.row['MontoPagado'] = '0'
        receipt = self.prepare()['receipts'][0]
        self.assertEqual(receipt['paid'], 0)
        self.assertEqual(receipt['balance'], 200.5)
        self.assertIn('amounts-do-not-reconcile', receipt['snapshot']['reviewReasons'])

    def test_cancelled_receipts_remain_in_history(self):
        self.row['Anulado'] = 'VERDADERO'
        self.assertTrue(self.prepare()['receipts'][0]['snapshot']['cancelled'])

    def test_unlinked_and_owner_receipts_are_reported(self):
        result = self.prepare([(2, dict(self.row, Contrato='unknown')),
                               (3, dict(self.row, **{'Id Recibo': ''}))])
        self.assertEqual(result['receipts'], [])
        self.assertEqual([r['reason'] for r in result['skipped']],
                         ['contract-not-imported', 'not-tenant-receipt'])

    def test_rejects_duplicate_identity_number_and_wrong_source(self):
        for second in [self.row, dict(self.row, IdClave='43')]:
            with self.assertRaises(ValueError):
                self.prepare([(2, self.row), (3, second)])
        with self.assertRaises(ValueError):
            h.prepare_history([(2, self.row)], self.plan, 'b' * 64)

    def test_rejects_invalid_dates_amounts_and_flags(self):
        for field, value in [('Fecha Alta', ''), ('Fecha Alta', '31/2/2026'),
                             ('Total', 'NaN'), ('Total', '1,001'),
                             ('Anulado', ''), ('Id Recibo', '-1')]:
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                self.prepare([(2, dict(self.row, **{field: value}))])


if __name__ == '__main__':
    unittest.main()
