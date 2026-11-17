import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('inspector', Path(__file__).with_name('inspect-legacy-ods.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class InventoryTests(unittest.TestCase):
    def test_repetitions_empty_rows_typed_values_and_multiple_sheets(self):
        xml = '''<office:document-content
          xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
          xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
          xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
          <office:body><office:spreadsheet><table:table table:name="Contratos">
          <table:table-row><table:table-cell><text:p>Id</text:p></table:table-cell>
          <table:table-cell><text:p>Fecha</text:p></table:table-cell></table:table-row>
          <table:table-row table:number-rows-repeated="2">
          <table:table-cell office:value="0"/><table:table-cell office:date-value="2026-11-01"/>
          <table:table-cell table:number-columns-repeated="16382"/></table:table-row>
          <table:table-row table:number-rows-repeated="1000000">
          <table:table-cell table:number-columns-repeated="16384"/></table:table-row>
          </table:table><table:table table:name="Otra"><table:table-row>
          <table:table-cell><text:p>Un <text:span>campo</text:span></text:p></table:table-cell>
          </table:table-row><table:table-row><table:table-cell table:number-columns-repeated="2"/>
          <table:table-cell><text:p>dato privado</text:p></table:table-cell></table:table-row>
          </table:table></office:spreadsheet></office:body></office:document-content>'''
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'sample.ods'
            with zipfile.ZipFile(path, 'w') as archive:
                archive.writestr('content.xml', xml)
            report = module.inspect(path)
        self.assertEqual(report[0], dict(sheet='Contratos', rows=2, headers=['Id', 'Fecha'], nonempty_by_column=[2, 2]))
        self.assertEqual(report[1], dict(sheet='Otra', rows=1, headers=['Un campo'], nonempty_by_column=[0, 0, 1]))
        self.assertNotIn('dato privado', str(report))

    def test_physical_rows_include_empty_and_repeated_rows(self):
        xml = f'''<office:document-content xmlns:office="{module.O[1:-1]}"
          xmlns:table="{module.T[1:-1]}" xmlns:text="{module.X[1:-1]}">
          <office:body><office:spreadsheet><table:table table:name="Datos">
          <table:table-row table:number-rows-repeated="3"><table:table-cell/></table:table-row>
          <table:table-row><table:table-cell><text:p>ID</text:p></table:table-cell></table:table-row>
          <table:table-row table:number-rows-repeated="2"><table:table-cell office:value="1"/></table:table-row>
          <table:table-row table:number-rows-repeated="10"><table:table-cell/></table:table-row>
          <table:table-row><table:table-cell office:value="2"/></table:table-row>
          </table:table></office:spreadsheet></office:body></office:document-content>'''
        locations = []
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'rows.ods'
            with zipfile.ZipFile(path, 'w') as archive:
                archive.writestr('content.xml', xml)
            module.inspect(path, on_row_location=lambda sheet, headers, cells, repeat, location: locations.append(location))
        self.assertEqual(locations, [dict(headerRow=4, rowStart=5, rowEnd=6), dict(headerRow=4, rowStart=17, rowEnd=17)])


if __name__ == '__main__':
    unittest.main()
