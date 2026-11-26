import json,re,sys
keys=json.load(open('/tmp/claude-0/-home-claude/b3a76c8c-07fb-52e2-bad8-70d5cd0b87e8/scratchpad/l20/keys.json'))
SKIP={18,64,65,66,67,103,116,187,217,218,233,255,273}|set(range(151,165))|set(range(235,249))
for code in sys.argv[1:]:
    d={}
    for ln in open(f'/tmp/claude-0/-home-claude/b3a76c8c-07fb-52e2-bad8-70d5cd0b87e8/scratchpad/l20/{code}.txt',encoding='utf-8'):
        ln=ln.rstrip('\n')
        if not ln.strip(): continue
        i,t=ln.split('\t',1); d[int(i)]=t.strip()
    miss=[i for i in range(len(keys)) if i not in d and i not in SKIP]
    bad=[i for i,t in d.items() if sorted(re.findall(r'\{\d\}',t))!=sorted(re.findall(r'\{\d\}',keys[i]))]
    print(code,'satır',len(d),'eksik',miss[:20],len(miss),'yer tutucu hatası',bad)
    json.dump({keys[i]:t for i,t in d.items()},open(f'/tmp/claude-0/-home-claude/b3a76c8c-07fb-52e2-bad8-70d5cd0b87e8/scratchpad/l20/{code}.json','w'),ensure_ascii=False)
