import json, math, collections, sys
ns={}
for f in ['new200_a.py','new200_b.py','new200_c.py']: exec(open(f).read(), ns)
N=ns['A']+ns['B']+ns['C']
M='/home/claude/turkiye-gezi-android/src/data/'
P=json.load(open(M+'places.json')); prov=json.load(open(M+'provinces.json')); rings=json.load(open(M+'turkey.json'))
def inring(x,y,r):
    ins=False; j=len(r)-1
    for i in range(len(r)):
        xi,yi=r[i]; xj,yj=r[j]
        if (yi>y)!=(yj>y) and x < (xj-xi)*(y-yi)/(yj-yi)+xi: ins=not ins
        j=i
    return ins
def dist(a,b,c,d):
    r=math.pi/180; x=(d-b)*r*math.cos((a+c)/2*r); y=(c-a)*r; return math.hypot(x,y)*6371000
def intr(lat,lng):
    if any(inring(lng,lat,rg) for rg in rings): return True
    return min(dist(lat,lng,p[1],p[0]) for rg in rings for p in rg) < 6000
provnames={p[0] for p in prov}
ids={p['id'] for p in P}; seen=set(); bad=0
for x in N:
    msg=[]
    id_,n,il,semt,r,c,lat,lng=x[:8]
    if not id_.isascii() or id_ in ids or id_ in seen: msg.append('id')
    seen.add(id_)
    if len(x)!=12 or not all(isinstance(v,str) and v for v in x[8:]): msg.append('alan')
    if il not in provnames: msg.append('il '+il)
    if not intr(lat,lng): msg.append('Türkiye dışı')
    for q in P+[{'n':y[1],'lat':y[6],'lng':y[7],'id':y[0]} for y in N if y is not x]:
        d=dist(lat,lng,q['lat'],q['lng'])
        if d<300: msg.append(f"{q['n']} ile {d:.0f} m")
    if msg: bad+=1; print(id_,'|','; '.join(msg))
print('toplam',len(N),dict(collections.Counter(x[4] for x in N)),'sorunlu',bad)
