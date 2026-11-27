import json, re, os, glob
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
new = json.load(open(S + '/l26/new.json')); G = {}
L19 = ['en','de','ru','fr','es','it','pt','nl','pl','ro','el','uk','bg','az','ar','fa','zh','ja','ko']
L20 = ['ku','ka','kk','uz','sq','sr','hr','cs','hu','sv','no','da','fi','he','hi','ur','id','ms','th','vi']
T = {}
for f in sorted(glob.glob(S + '/l26/t*.txt')):
    cur = None
    for ln in open(f, encoding='utf-8'):
        ln = ln.rstrip('\n')
        if not ln.strip(): continue
        if ln.startswith('@'): cur = ln[1:].strip(); T[cur] = {}; continue
        i, t = ln.split('\t', 1); T[cur][int(i)] = t.replace('\u00ad', '').strip()
errs = []
for l in L19[1:] + L20:
    d = T.get(l)
    if not d: errs.append(f'{l}: yok'); continue
    miss = [i for i in range(len(new)) if i not in d and False]
    if miss: errs.append(f'{l}: eksik {miss}')
    for i, t in d.items():
        if sorted(re.findall(r'\{\d\}', t)) != sorted(re.findall(r'\{\d\}', new[i][0])): errs.append(f'{l}#{i}: yer tutucu')
        if '%G%' in t or not t: errs.append(f'{l}#{i}: boş/G')
print('diller', len(T), 'hatalar', errs or 'yok')
assert not errs
# site: 19 dil dizisi + 20 dil l20/<c>.json
v10 = {k: [en] + [T[l].get(i) for l in L19[1:]] for i, (k, en) in enumerate(new)}
json.dump(v10, open(S + '/build/lang/v12_i18n.json', 'w'), ensure_ascii=False)
for l in L20:
    p = S + f'/l20/{l}.json'; d = json.load(open(p))
    for i, (k, _) in enumerate(new):
        if i in T[l]: d[k] = T[l][i]
    json.dump(d, open(p, 'w'), ensure_ascii=False)
bp = S + '/scripts/build.py'; s = open(bp).read()
if 'v12_i18n' not in s:
    a = "for k, arr in json.load(open(b + '/lang/v11_i18n.json')).items():\n    ui[k] = arr\n"
    assert a in s
    s = s.replace(a, a + "for k, arr in json.load(open(b + '/lang/v12_i18n.json')).items():\n    ui[k] = arr\n"); open(bp, 'w').write(s)
# uygulama
A = '/home/claude/turkiye-gezi-android/src/i18n/'
app = json.load(open(A + 'app.json')); m20 = json.load(open(A + 'more20.json'))
for k, arr in v10.items(): app[k] = arr
for i, (k, _) in enumerate(new):
    if any(i in T[l] for l in L20): m20[k] = [T[l].get(i) for l in L20]
json.dump(app, open(A + 'app.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(m20, open(A + 'more20.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('site v8', len(v10), '| uygulama app.json', len(app), 'more20', len(m20))
