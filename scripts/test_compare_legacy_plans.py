import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('compare', Path(__file__).with_name('compare-legacy-plans.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ComparisonTests(unittest.TestCase):
    def test_reports_actual_changes_without_source_hash_noise_or_personal_values(self):
        before = dict(sourceHash='old', asOf='2026-11-03', **{k: [] for k in m.TABLES})
        after = dict(sourceHash='new', asOf='2026-11-03', **{k: [] for k in m.TABLES})
        before['people'] = [dict(id='one', phone='private-old'), dict(id='removed')]
        after['people'] = [dict(id='one', phone='private-new'), dict(id='added')]
        before['contracts'] = [dict(id='same', settings=dict(legacy=dict(sourceHash='old')))]
        after['contracts'] = [dict(id='same', settings=dict(legacy=dict(sourceHash='new')))]
        report = m.compare(before, after)
        self.assertEqual(report['tables']['people']['changed'], [dict(id='one', fields=['phone'])])
        self.assertEqual(report['tables']['people']['added'], ['added'])
        self.assertEqual(report['tables']['people']['removed'], ['removed'])
        self.assertEqual(report['tables']['contracts']['unchanged'], 1)
        self.assertNotIn('private-', str(report))
        self.assertEqual(before['contracts'][0]['settings']['legacy']['sourceHash'], 'old')
