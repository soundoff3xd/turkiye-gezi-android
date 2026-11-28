import math, json
BG='#1E1A1A'; PIN='#E0453A'; EM='#FFF6EE'
def cres_d(R, k=0.8, off=0.5):
    r=R*k; dd=R*off; x=(R*R-r*r+dd*dd)/(2*dd); y=math.sqrt(R*R-x*x)
    return f'M{x:.3f},{-y:.3f} A{R},{R} 0 1 0 {x:.3f},{y:.3f} A{r},{r} 0 1 1 {x:.3f},{-y:.3f}Z'
def star_d(R):
    p=[]
    for i in range(10):
        a=math.pi+i*math.pi/5; rr=R*0.4 if i%2 else R
        p.append(f'{rr*math.cos(a):.3f},{rr*math.sin(a):.3f}')
    return 'M'+'L'.join(p)+'Z'
# iğne: uç (0,0), baş merkezi (0,-18), yarıçap 10 (birim). Ay-yıldız baş merkezine göre.
PIN_D='M0,0 C-6,-8 -10,-12 -10,-18 A10,10 0 1 1 10,-18 C10,-12 6,-8 0,0Z'
ER=12.5/2.2  # ay yarıçapı (iğne biriminde)
CRES=f'<path transform="translate({-ER*0.16:.3f},-18)" d="{cres_d(ER)}"/>'
STAR=f'<path transform="translate({ER*0.6:.3f},-18)" d="{star_d(ER*0.37)}"/>'
def logo(pin=PIN, em=EM): return f'<path d="{PIN_D}" fill="{pin}"/><g fill="{em}">{CRES}{STAR}</g>'
geo={'pin':PIN_D,'cres':cres_d(ER),'cresX':-ER*0.16,'star':star_d(ER*0.37),'starX':ER*0.6,'headY':-18,'headR':10}
json.dump(geo,open('geo_pin.json','w'))
def wrap(inner, size, bg=None, vb='0 0 100 100'):
    b=f'<rect width="100%" height="100%" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="{vb}">{b}{inner}</svg>'
shadow=lambda cx,cy,rx,op: f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{rx*0.22:.2f}" fill="{PIN}" fill-opacity="{op}"/>'
S=2.2
full=f'{shadow(50,84,15,.25)}<g transform="translate(50,84) scale({S})">{logo()}</g>'
out={}
out['icon.png']=(wrap(full,1024,BG),1024)
# adaptive foreground: safe circle 626/1024 → pin height (28 units) ~ 520px; 100-unit canvas => s
s=19.0/10*1.0
pin_h=28  # 0..-28
sc=0.5*100/ (pin_h)*1.0
# iğne yüksekliği 28 birim; tuval 100 birim; 50 birime sığsın (≈512px)
k=50/pin_h; cx=50; tipy=50+ (pin_h*k)/2 - 0  # dikey ortala (gölge hariç)
out['adaptive-icon.png']=(wrap(f'<g transform="translate({cx},{tipy:.2f}) scale({k:.4f})">{logo()}</g>',1024),1024)
# splash: şeffaf, iğne ortada
k2=70/pin_h; tip2=50+35
out['splash-icon.png']=(wrap(f'<g transform="translate(50,{tip2}) scale({k2:.4f})">{logo()}</g>',1024),1024)
# bildirim: beyaz siluet, ay-yıldız boşluk
k3=86/pin_h; tip3=50+43
mask=f'<defs><mask id="m"><g transform="translate(50,{tip3}) scale({k3:.4f})"><path d="{PIN_D}" fill="#fff"/><g fill="#000">{CRES}{STAR}</g></g></mask></defs><rect width="100" height="100" fill="#fff" mask="url(#m)"/>'
out['notification-icon.png']=(wrap(mask,96),96)
# site favicon (yuvarlatılmış)
fav=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="{BG}"/><g transform="translate(50,88) scale(2.55)">{logo()}</g></svg>'
open('favicon.svg','w').write(fav)
json.dump({k:v for k,v in out.items()},open('assets.json','w'))
