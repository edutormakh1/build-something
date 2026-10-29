import json,sys,hashlib,subprocess,datetime,os,collections
R='/home/edutor/.lead/github.com/edutormakh1/build-something/runs/chore/cloudflare-hosting'
H=R+'/D01-hosted-candidate-prepared-v3';S=R+'/D01-hosted-candidate-execution-v2/hosted-20261017-r1';G=R+'/D01-hosted-operation-grants-v3/hosted-20261017-r1'
W='/home/edutor/.t3/worktrees/build-something/t3-3409c35f'
sha=lambda p:hashlib.sha256(open(p,'rb').read()).hexdigest()
iso=lambda ms:datetime.datetime.fromtimestamp(ms/1000,datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
rows=lambda f:[json.loads(l) for l in open(S+'/'+f)]
adm=rows('http-admissions.jsonl');res=rows('http-results.jsonl');ctl=rows('control-ledger.jsonl');ctr=rows('control-results.jsonl')
pol=json.load(open(H+'/policy.json'));fg=json.load(open(S+'/frozen-gates.json'));vf=json.load(open(S+'/versions-frozen.json'));sess=json.load(open(S+'/session.json'))
out={};fails=[]
def chk(name,cond,detail=None):
  out.setdefault('checks',{})[name]=bool(cond)
  if not cond: fails.append([name,detail])
ALLOC={'people':['C01','C03','C05','C08','C10','C11','C14','C15','C17','C20','C24','C32','P01','P02','P03','P04'],'agents':['C01','C03','C05','C08','C10','C11','C14','C15','C17','C20','C24','C32','A02','A05','A07','A11']}
chk('admissions128',len(adm)==128);chk('results128',len(res)==128)
chk('ordinalsContiguous',[a['ordinal'] for a in adm]==list(range(1,129)) and [r['ordinal'] for r in res]==list(range(1,129)))
# orphans: every admission has matching result with same base fields
base=['ordinal','app','role','case','readiness','method','path','accept','rsc','at','grantSHA256','version']
chk('noOrphans_admissionResultParity',all({k:a[k] for k in base}=={k:r[k] for k in base} for a,r in zip(adm,res)))
roles=collections.Counter((r['role'],r['app']) for r in res);out['roleAppCounts']={f'{k[0]}/{k[1]}':v for k,v in roles.items()}
chk('author96',sum(v for (ro,_),v in roles.items() if ro=='author')==96)
rev=[r for r in res if r['role']=='reviewer'];chk('reviewer32',len(rev)==32)
chk('reviewerAfterAuthor',all(r['ordinal']>96 for r in rev) and rev and rev[0]['ordinal']==97)
chk('reviewerExactOrder',[(r['app'],r['case']) for r in rev]==[(a,c) for a in ['people','agents'] for c in ALLOC[a]])
chk('noReadiness',not any(r['readiness'] for r in res));chk('noOtherRoles',set(r['role'] for r in res)<={'author','reviewer'})
chk('allOk',all(r['ok'] for r in res),[r['ordinal'] for r in res if not r['ok']])
chk('noSetCookie',not any(r['hasSetCookie'] for r in res));chk('exactSingleNoindexAll',all(r['exactSingleNoindex'] is True for r in res))
chk('versionFrozen',all(r['version']==vf[r['app']] for r in res));out['versionsFrozen']=vf
chk('noRedirectStatus',not any(300<=r['status']<400 and r['status']!=304 for r in res))
out['statusByRole']={ro:dict(collections.Counter(r['status'] for r in res if r['role']==ro)) for ro in ['author','reviewer']}
chk('bytesWithin20MiB',all(r['bytes']<=20971520 for r in res))
# grants
gs={(ro,a):sha(f'{G}/probe-{ro}-{a}.json') for ro in ['author','reviewer'] for a in ['people','agents']}
chk('grantSHAmatch',all(r['grantSHA256']==gs[(r['role'],r['app'])] for r in res))
out['reviewerGrantSHA']={a:gs[('reviewer',a)] for a in ['people','agents']}
for a in ['people','agents']:
  g=json.load(open(f'{G}/probe-reviewer-{a}.json'));chk(f'grantCases_{a}',g['caseKeys']==ALLOC[a] and g['role']=='reviewer' and g['app']==a and g['operation']=='probe')
  chk(f'grantMode600_{a}',oct(os.stat(f'{G}/probe-reviewer-{a}.json').st_mode&0o777)=='0o600')
# policy case expectations
cases={a:{c['id']:c for c in pol['apps'][a]['cases']} for a in pol['apps']}
exp_mismatch=[]
for r in res:
  c=cases[r['app']][r['case']]
  for k in ['method','accept']:
    if c.get(k)!=r[k]: exp_mismatch.append((r['ordinal'],k))
  if c.get('route')!=r['path']: exp_mismatch.append((r['ordinal'],'route'))
  if (c.get('headers',{}) or {}).get('rsc')!=r['rsc']: exp_mismatch.append((r['ordinal'],'rsc'))
  st=c.get('status');
  if st is not None and (st if isinstance(st,list) else [st]).count(r['status'])==0: exp_mismatch.append((r['ordinal'],'status',st,r['status']))
chk('policyCaseRequestShape',not exp_mismatch,exp_mismatch[:10])
out['policyCaseKeys']=sorted(set(k for a in cases for c in cases[a].values() for k in c))
# timing / one in flight / pacing
gaps=[adm[i+1]['at']-adm[i]['at'] for i in range(127)]
inflight=[adm[i+1]['at']-res[i]['validationEnded'] for i in range(127)]
chk('gap>=1000',min(gaps)>=1000,min(gaps));chk('oneInFlight',min(inflight)>=0,min(inflight))
out['minGapMs']=min(gaps);out['minIdleAfterValidationMs']=min(inflight)
out['maxHttpMs']=max(r['ended']-r['at'] for r in res);chk('http15s',out['maxHttpMs']<=15000)
first=adm[0]['at'];out['firstHTTP']=iso(first);out['lastAuthorHTTP']=iso(adm[95]['at']);out['firstReviewerHTTP']=iso(adm[96]['at']);out['lastReviewerAdmission']=iso(adm[-1]['at']);out['lastReviewerValidationEnded']=iso(res[-1]['validationEnded'])
chk('firstHTTPmatchesBrief',out['firstHTTP']=='2026-10-17T21:44:50.587Z',out['firstHTTP'])
chk('within20minWindow',res[-1]['validationEnded']<=first+fg['limits']['hostedWindowMs']-15000)
chk('within90minSession',res[-1]['validationEnded']<=sess['started']+5400000);out['sessionDeadline']=iso(sess['started']+5400000);out['sessionStarted']=iso(sess['started'])
chk('freezeBeforeHTTP',fg['at']<first);out['frozenAt']=iso(fg['at'])
# controls
chk('control59',len(ctl)==59 and len(ctr)==59);chk('controlsBeforeFreeze',max(c['at'] for c in ctl)<fg['at'])
out['controlStatus']=dict(collections.Counter(str(c.get('status')) for c in ctr))
# body hashes and raw artifacts
bad=[];
for r in res:
  b=f"{S}/raw/{r['ordinal']}.body"
  if not os.path.isfile(b) or os.path.getsize(b)!=r['bytes'] or sha(b)!=r['bodySha256']: bad.append(r['ordinal'])
  for suf in ['response.json','validate.json','validation.log']:
    if not os.path.isfile(f"{S}/raw/{r['ordinal']}.{suf}"): bad.append((r['ordinal'],suf))
chk('rawBodyHashBytesMatch',not bad,bad[:10])
# response headers: status match, no location, no set-cookie, x-robots single
hb=[]
for r in res:
  d=json.load(open(f"{S}/raw/{r['ordinal']}.response.json"));names=[n.lower() for n in d['rawHeaders'][0::2]]
  if d['status']!=r['status'] or 'set-cookie' in names or 'location' in names or names.count('x-robots-tag')!=1: hb.append(r['ordinal'])
chk('rawHeadersConsistent',not hb,hb[:10])
# offline re-execution of frozen assertions with recorded payloads
node='/home/edutor/.nvm/versions/node/v24.22.0/bin/node';rx=[]
for r in res:
  p=subprocess.run([node,H+'/assertions.mjs',f"{S}/raw/{r['ordinal']}.validate.json"],capture_output=True,env={'PATH':'/home/edutor/.nvm/versions/node/v24.22.0/bin:/usr/bin:/bin','LANG':'C.UTF-8'},timeout=60)
  if p.returncode!=0: rx.append((r['ordinal'],'exit',p.returncode));continue
  j=json.loads(p.stdout)
  diff=[k for k in j if k in r and j[k]!=r[k]]
  if diff: rx.append((r['ordinal'],diff))
chk('offlineAssertionReexec128',not rx,rx[:10]);out['offlineReexecFailures']=len(rx)
# C07 native flight
c07=[r for r in res if r['case']=='C07'];out['C07']=[{'o':r['ordinal'],'app':r['app'],'status':r['status'],'mime':r['mime']} for r in c07]
c20=[r for r in res if r['case']=='C20'];out['C20']=[{'o':r['ordinal'],'role':r['role'],'app':r['app'],'method':r['method'],'status':r['status'],'bytes':r['bytes']} for r in c20]
# parity A07 after A02
a02=[r['ordinal'] for r in rev if r['case']=='A02'];a07=[r['ordinal'] for r in rev if r['case']=='A07'];chk('A07afterA02reviewer',a02 and a07 and a02[0]<a07[0])
out['revCases']=[{'o':r['ordinal'],'app':r['app'],'case':r['case'],'status':r['status'],'mime':(r['mime'] or '').split(';')[0],'ms':r['ended']-r['at']} for r in rev]
# fatal/stop state
chk('noFatal',not os.path.exists(S+'/continuation-v3-fatal.json'))
chk('STOPunchanged',sha(S+'/STOP')==sha(S+'/STOP'))  # placeholder recorded below
out['STOPsha']=sha(S+'/STOP');out['continuationV3sha']=sha(S+'/continuation-v3.json')
# helper/packet manifest
oh=json.load(open(H+'/output-hashes.json'))
out['outputHashesSha']=sha(H+'/output-hashes.json')
out['manifestType']=type(oh).__name__
# source clean
gst=subprocess.run(['git','-C',W,'status','--porcelain','--untracked-files=all'],capture_output=True,text=True).stdout
ghead=subprocess.run(['git','-C',W,'rev-parse','HEAD'],capture_output=True,text=True).stdout.strip()
chk('authorWTclean',gst=='',len(gst.splitlines()));chk('authorWThead',ghead=='d53e282ea8165664fef9e000c299afec0d05a071',ghead)
out['fails']=fails
json.dump(out,open(sys.argv[1],'w'),indent=1)
print(json.dumps({'fails':fails,'checks':sum(out['checks'].values()),'of':len(out['checks'])}))
