"""Compare conversion plans offline; report IDs/field paths, not personal values."""
import argparse
import copy
import json
from pathlib import Path

TABLES = ['people', 'tenants', 'owners', 'properties', 'propertyOwners', 'contracts']


def normalized(row):
    result = copy.deepcopy(row)
    result.get('settings', {}).get('legacy', {}).pop('sourceHash', None)
    return result


def changed_fields(before, after, prefix=''):
    if isinstance(before, dict) and isinstance(after, dict):
        result = []
        for key in sorted(before.keys() | after.keys()):
            path = prefix + '.' + key if prefix else key
            if key not in before or key not in after:
                result.append(path)
            else:
                result.extend(changed_fields(before[key], after[key], path))
        return result
    return [prefix] if before != after else []


def compare(before, after):
    result = dict(beforeHash=before['sourceHash'], afterHash=after['sourceHash'],
                  beforeAsOf=before['asOf'], afterAsOf=after['asOf'], tables={})
    for name in TABLES:
        old = {r['id']: normalized(r) for r in before[name]}
        new = {r['id']: normalized(r) for r in after[name]}
        changed = [dict(id=key, fields=changed_fields(old[key], new[key])) for key in sorted(old.keys() & new.keys()) if old[key] != new[key]]
        result['tables'][name] = dict(added=sorted(new.keys() - old.keys()), removed=sorted(old.keys() - new.keys()), changed=changed,
                                     unchanged=sum(old[k] == new[k] for k in old.keys() & new.keys()))
    result['issues'] = dict(before=len(before.get('issues', [])), after=len(after.get('issues', [])))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before')
    parser.add_argument('after')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    if not output.is_relative_to(Path(__file__).resolve().parent.parent / 'private'):
        raise ValueError('Keep comparison reports inside private/')
    report = compare(json.loads(Path(args.before).read_text()), json.loads(Path(args.after).read_text()))
    with output.open('x') as file:
        output.chmod(0o600)
        json.dump(report, file, ensure_ascii=False, indent=2)
    print(json.dumps({name: {key: len(value) if isinstance(value, list) else value for key, value in table.items()}
                      for name, table in report['tables'].items()}))
