import os
import json, sys
b = sys.argv[1]
T5 = {'ayasofya', 'mavi', 'topkapi', 'galatakulesi', 'kapalicarsi'}
T4 = {'yerebatan', 'misir', 'dolmabahce', 'taksim', 'kizkulesi', 'ortakoy', 'suleymaniye', 'galatakoprusu', 'kadikoy'}
ist = json.load(open(b + '/istanbul.json'))
for p in ist:
    p['t'] = 5 if p['id'] in T5 else 4 if p['id'] in T4 else 3 if p['c'] != 'manzara' else 2
places = ist + json.load(open(b + '/turkiye.json')) + json.load(open(b + '/turkiye2.json')) + json.load(open(b + '/turkiye3.json')) + json.load(open(b + '/turkiye4.json'))
cats = json.load(open(b + '/cats.json'))
for p in cats['new']:
    p = dict(p); p.pop('en'); places.append(p)
for p in places:
    p['c'] = cats['map'][p['id']] if p['id'] in cats['map'] else p['c']
assert len({p['id'] for p in places}) == len(places)
geo = open(b + '/geo.json').read()
_ic = json.load(open(os.path.join(os.path.dirname(b), 'icons', 'icons.json')))
_mk = open(os.path.join(os.path.dirname(b), 'icons', 'marker.js')).read().replace("if (typeof module !== 'undefined') module.exports = { catMarker, lmMarker };", '')
icons_js = '/* harita işaretleri (icons/icons.py üretir) */\nconst MKI = ' + json.dumps({'colors': _ic['colors'], 'glyphs': _ic['glyphs'], 'lm': {k: v['svg'] for k, v in _ic['landmarks'].items()}}, ensure_ascii=False) + ';\n' + _mk
app = open(b + '/app1.js').read() + '\n' + icons_js + '\n' + open(b + '/app2.js').read() + '\n' + open(b + '/app3.js').read() + '\n' + open(b + '/app5.js').read() + '\n' + open(b + '/app6.js').read() + '\n' + open(b + '/app7.js').read() + '\n' + open(b + '/app8.js').read() + '\n' + open(b + '/app9.js').read() + '\n' + open(b + '/app10.js').read() + '\n' + open(b + '/app11.js').read() + '\n' + open(b + '/app12.js').read() + '\n' + open(b + '/app13.js').read() + '\n' + open(b + '/app14.js').read() + '\n' + open(b + '/app15.js').read() + '\n' + open(b + '/app16.js').read() + '\n' + open(b + '/app17.js').read() + '\n' + open(b + '/app18.js').read() + '\n' + 'const DISHES = ' + open(os.path.join(os.path.dirname(os.path.abspath(b)), 'paint', 'dishes.json')).read() + ';\nconst PSHAPES = ' + open(os.path.join(os.path.dirname(os.path.abspath(b)), 'paint', 'prov_shapes.json')).read() + ';\n' + open(b + '/app19.js').read() + '\n' + open(b + '/app20.js').read() + '\n' + 'const PHOTOS = ' + open(os.path.join(os.path.dirname(os.path.abspath(b)), 'photos', 'photos.json')).read() + ';\n' + open(b + '/app21.js').read() + '\n' + open(b + '/app22.js').read() + '\n' + open(b + '/app23.js').read() + '\n' + open(b + '/app24.js').read() + '\n' + open(b + '/app25.js').read() + '\n' + open(b + '/app26.js').read() + '\n' + open(b + '/app27.js').read() + '\n' + 'const ROUTES = ' + open(b + '/data/routes.json').read() + ';\nconst PHRASES = ' + open(b + '/data/phrases.json').read() + ';\n' + open(b + '/app28.js').read() + '\n' + 'const FEST = ' + open(b + '/data/festivals.json').read() + ';\nconst TRANSPORT = ' + open(b + '/data/transport.json').read() + ';\nconst FAQ = ' + open(b + '/data/faq.json').read() + ';\n' + open(b + '/app29.js').read() + '\n' + open(b + '/app30.js').read() + '\n' + open(b + '/app4.js').read()
html = open(b + '/template.html').read()
ui = json.load(open(b + '/i18n_ui.json')); en = json.load(open(b + '/en_places.json'))
for p in cats['new']: en[p['id']] = p['en']
en.update(json.load(open(b + '/en_places3.json')))
en.update(json.load(open(b + '/en_places4.json')))
for p in places:
    tr_ = en[p['id']]
    ui[p['d']] = [tr_[0]]
    if p.get('h'): ui[p['h']] = [tr_[1]]
ph = json.load(open(b + '/lang/photo.json'))
for k, d in ph.items():
    ui[k] = [d.get(l) for l in ['en','de','ru']]
more = json.load(open(b + '/lang/more.json'))
for cid, k in more['key'].items():
    arr = list(ui[k]) + [None] * (len(more['order']) - len(ui[k]))
    for l, d in more['langs'].items():
        arr[more['order'].index(l)] = d[cid]
    ui[k] = arr
for k, d in ph.items():
    arr = list(ui[k]) + [None] * (len(more['order']) - len(ui[k]))
    for l, v in d.items(): arr[more['order'].index(l)] = v
    ui[k] = arr
for k, arr in json.load(open(b + '/lang/db_i18n.json')).items():
    ui[k] = arr
for k, arr in json.load(open(b + '/lang/support_i18n.json')).items():
    ui[k] = arr
for k, arr in json.load(open(b + '/lang/map_i18n.json')).items():
    ui[k] = arr
for k, arr in json.load(open(b + '/lang/cats_i18n.json')).items():
    ui[k] = arr
for k, arr in json.load(open(b + '/lang/avatar_i18n.json')).items():
    ui[k] = arr
for k, arr in json.load(open(b + '/lang/loc_i18n.json')).items():
    ui[k] = arr
for k, arr in json.load(open(b + '/lang/onb_i18n.json')).items():
    ui[k] = arr
for k, arr in json.load(open(b + '/lang/v6_i18n.json')).items():
    ui[k] = arr
for k, arr in json.load(open(b + '/lang/v7_i18n.json')).items():
    ui[k] = arr
for k, arr in json.load(open(b + '/lang/v8_i18n.json')).items():
    ui[k] = arr
for k, arr in json.load(open(b + '/lang/v9_i18n.json')).items():
    ui[k] = arr
for k, arr in json.load(open(b + '/lang/v10_i18n.json')).items():
    ui[k] = arr
for k, arr in json.load(open(b + '/lang/v11_i18n.json')).items():
    ui[k] = arr
L20 = ['ku','ka','kk','uz','sq','sr','hr','cs','hu','sv','no','da','fi','he','hi','ur','id','ms','th','vi']
_l20 = {c: json.load(open(os.path.join(os.path.dirname(b), 'l20', c + '.json'))) for c in L20}
for k in list(ui.keys()):
    arr = list(ui[k])[:19]; arr += [None] * (19 - len(arr))
    arr = arr + [_l20[c].get(k) for c in L20]
    while len(arr) > 1 and arr[-1] is None: arr.pop()
    ui[k] = arr
html = html.replace('/*I18N*/', json.dumps(ui, ensure_ascii=False))
html = html.replace('/*GEO*/', geo).replace('/*PLACES*/', json.dumps(places, ensure_ascii=False)).replace('/*APP*/', app)
open(sys.argv[2], 'w').write(html)
print(len(places), 'yer,', len(html) // 1024, 'KB')
