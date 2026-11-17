"""Inventario ODS en streaming; no modifica la base de datos."""
import argparse
import json
import xml.etree.ElementTree as ET
import zipfile

T = '{urn:oasis:names:tc:opendocument:xmlns:table:1.0}'
X = '{urn:oasis:names:tc:opendocument:xmlns:text:1.0}'
O = '{urn:oasis:names:tc:opendocument:xmlns:office:1.0}'


def inspect(path, on_row=None, on_row_location=None):
    sheets, stack = [], []
    current = None
    row_number = header_row = 0
    with zipfile.ZipFile(path) as archive, archive.open('content.xml') as content:
        for event, node in ET.iterparse(content, events=('start', 'end')):
            if event == 'start':
                stack.append(node)
                if node.tag == T + 'table':
                    row_number = header_row = 0
                    current = dict(sheet=node.get(T + 'name'), rows=0, headers=[], nonempty_by_column=[])
                    sheets.append(current)
                continue
            if node.tag == T + 'table-row' and current is not None:
                row_repeat = int(node.get(T + 'number-rows-repeated', '1'))
                row_start = row_number + 1
                row_number += row_repeat
                cells = []
                column = 0
                for cell in node:
                    if cell.tag not in (T + 'table-cell', T + 'covered-table-cell'):
                        continue
                    value = '\n'.join(''.join(p.itertext()) for p in cell.iter(X + 'p'))
                    value = value or cell.get(O + 'date-value') or cell.get(O + 'value') or ''
                    repeat = int(cell.get(T + 'number-columns-repeated', '1'))
                    if column + repeat > 16384:
                        raise ValueError('Demasiadas columnas')
                    if value.strip():
                        cells.extend([''] * (column - len(cells)))
                        cells.extend([value] * repeat)
                    column += repeat
                while cells and not cells[-1].strip():
                    cells.pop()
                if cells:
                    repeat = int(node.get(T + 'number-rows-repeated', '1'))
                    if not current['headers']:
                        current['headers'] = cells
                        header_row = row_start
                    else:
                        if on_row_location is not None:
                            on_row_location(current['sheet'], current['headers'], cells, repeat,
                                            dict(headerRow=header_row, rowStart=row_start, rowEnd=row_number))
                        if on_row is not None:
                            on_row(current['sheet'], current['headers'], cells, repeat)
                        current['rows'] += repeat
                        counts = current['nonempty_by_column']
                        counts.extend([0] * max(0, len(cells) - len(counts)))
                        for i, value in enumerate(cells):
                            if value.strip():
                                counts[i] += repeat
                stack[-2].remove(node)
                node.clear()
            elif node.tag == T + 'table':
                current = None
                stack[-2].remove(node)
                node.clear()
            elif current is None and len(stack) > 1:
                stack[-2].remove(node)
                node.clear()
            stack.pop()
    return sheets


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file')
    args = parser.parse_args()
    print(json.dumps(inspect(args.file), ensure_ascii=False, indent=2))
