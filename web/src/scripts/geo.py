import json, math, sys
src, out = sys.argv[1], sys.argv[2]
Z = 10
W0 = 256 * 2 ** Z
LON0, LON1, LAT0, LAT1 = 23.5, 46.5, 34.0, 43.8

def px(lon, lat):
    x = (lon + 180) / 360 * W0
    s = math.sin(math.radians(lat))
    y = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * W0
    return x, y

X0, Y0 = px(LON0, LAT1)
X1, Y1 = px(LON1, LAT0)
WID, HEI = X1 - X0, Y1 - Y0

def proj(ring):
    return [((p := px(lo, la))[0] - X0, p[1] - Y0) for lo, la in ring]

def clip(ring, pad=40):
    lo_x, lo_y, hi_x, hi_y = -pad, -pad, WID + pad, HEI + pad
    def c(pts, inside, inter):
        res = []
        for i in range(len(pts)):
            a, b = pts[i - 1], pts[i]
            ia, ib = inside(a), inside(b)
            if ib:
                if not ia: res.append(inter(a, b))
                res.append(b)
            elif ia:
                res.append(inter(a, b))
        return res
    def ix(xv):
        return lambda a, b: (xv, a[1] + (b[1] - a[1]) * (xv - a[0]) / (b[0] - a[0]))
    def iy(yv):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (yv - a[1]) / (b[1] - a[1]), yv)
    pts = ring
    for inside, inter in [(lambda p: p[0] >= lo_x, ix(lo_x)), (lambda p: p[0] <= hi_x, ix(hi_x)),
                          (lambda p: p[1] >= lo_y, iy(lo_y)), (lambda p: p[1] <= hi_y, iy(hi_y))]:
        if not pts: return []
        pts = c(pts, inside, inter)
    return pts

def dp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        ax, ay = pts[i]; bx, by = pts[j]
        dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1e-9
        best, bi = 0, -1
        for k in range(i + 1, j):
            d = abs((pts[k][0] - ax) * dy - (pts[k][1] - ay) * dx) / L
            if d > best: best, bi = d, k
        if best > tol:
            keep[bi] = True; stack += [(i, bi), (bi, j)]
    return [p for p, k in zip(pts, keep) if k]

def rings(geom):
    if geom['type'] == 'Polygon': polys = [geom['coordinates']]
    elif geom['type'] == 'MultiPolygon': polys = geom['coordinates']
    else: return []
    return [r for poly in polys for r in poly]

def path(rs, tol, closed=True, minlen=4):
    parts = []
    for r in rs:
        p = clip(proj(r))
        if len(p) < 3: continue
        p = dp(p[:-1] if p[0] == p[-1] else p, tol)
        q = [(round(x), round(y)) for x, y in p]
        q = [pt for i, pt in enumerate(q) if i == 0 or pt != q[i - 1]]
        if len(q) < minlen: continue
        s = 'M%d %d' % q[0] + 'l' + ' '.join('%d %d' % (b[0] - a[0], b[1] - a[1]) for a, b in zip(q, q[1:]))
        parts.append(s + ('z' if closed else ''))
    return ''.join(parts)

def in_box(geom):
    xs = [c for r in rings(geom) for c in r]
    return any(LON0 - 2 < lo < LON1 + 2 and LAT0 - 2 < la < LAT1 + 2 for lo, la in xs[::10] or xs)

C = json.load(open(src + '/ne_10m_admin_0_countries.geojson'))
land, tr = [], []
for f in C['features']:
    if f['properties'].get('ADM0_A3') == 'TUR': tr += rings(f['geometry'])
    elif in_box(f['geometry']): land += rings(f['geometry'])
A = json.load(open(src + '/ne_10m_admin_1_states_provinces.geojson'))
prov, labels = [], []
for f in A['features']:
    p = f['properties']
    if p.get('adm0_a3') != 'TUR': continue
    prov += rings(f['geometry'])
    x, y = px(p['longitude'], p['latitude'])
    labels.append([p.get('name_tr') or p['name'], round(x - X0), round(y - Y0)])
Lk = json.load(open(src + '/ne_10m_lakes.geojson'))
lakes = [r for f in Lk['features'] if in_box(f['geometry']) for r in rings(f['geometry'])]
g = dict(z=Z, w=round(WID), h=round(HEI), x0=X0, y0=Y0,
         land=path(land, 5), tr=path(tr, 2.5), prov=path(prov, 3.5, minlen=3), lakes=path(lakes, 2.5), labels=labels)
json.dump(g, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
print({k: (len(v) if isinstance(v, (str, list)) else v) for k, v in g.items()})
