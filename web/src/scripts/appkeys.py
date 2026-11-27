import json, re, subprocess
A = '/home/claude/turkiye-gezi-android/'
D = {}
for f in ['site.json', 'app.json', 'more20.json']: D.update(json.load(open(A + 'src/i18n/' + f)))
STR = re.compile(r"'((?:[^'\\\n]|\\.)*)'")
def ok(t):
    if len(t) < 2 or not re.search(r'[A-Za-zçğıöşüÇĞİÖŞÜ]', t): return False
    if not re.search(r'[ çğıöşüÇĞİÖŞÜ’]|^[A-ZÇĞİÖŞÜ]', t): return False
    if re.search(r'^[a-z_]+$|https?:|\\[sd]|=|^[(\[]|\(\?|\.\*|^\w+\.\w+$', t): return False
    return True
cands = []
files = subprocess.run(['git', '-C', A, 'diff', '--name-only', '286ae95', '--', 'src', 'App.tsx'], capture_output=True, text=True).stdout.split()
for f in files:
    if not f.endswith(('.ts', '.tsx')): continue
    diff = subprocess.run(['git', '-C', A, 'diff', '-U0', '286ae95', '--', f], capture_output=True, text=True).stdout
    added = '\n'.join(l[1:] for l in diff.splitlines() if l.startswith('+') and not l.startswith('+++'))
    cands += [m.group(1) for m in STR.finditer(added) if ok(m.group(1))]
for f in ['src/components/Extras5.tsx', 'src/components/Translate.tsx', 'src/data/collections.ts']:
    cands += [m.group(1) for m in STR.finditer(open(A + f).read()) if ok(m.group(1))]
tr = json.load(open(A + 'src/data/trails.json'))
cands += [x['d'] for x in tr['list']] + [tr['src']]
seen = []
[seen.append(c) for c in cands if c not in seen]
miss = [c for c in seen if c not in D]
json.dump(miss, open('miss_app.json', 'w'), ensure_ascii=False, indent=0)
print(len(miss)); print('\n'.join(miss))
