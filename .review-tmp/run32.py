import subprocess,json,time,sys,os
R='/home/edutor/.lead/github.com/edutormakh1/build-something/runs/chore/cloudflare-hosting'
H=R+'/D01-hosted-candidate-prepared-v3';S=R+'/D01-hosted-candidate-execution-v2/hosted-20261017-r1';G=R+'/D01-hosted-operation-grants-v3/hosted-20261017-r1'
P='00bbce703191ad97d9e03d7fa7ce084b8847ba64f4aae6471c95e22997a8e392';W='/home/edutor/.t3/worktrees/build-something/t3-3409c35f'
CASES={'people':['C01','C03','C05','C08','C10','C11','C14','C15','C17','C20','C24','C32','P01','P02','P03','P04'],'agents':['C01','C03','C05','C08','C10','C11','C14','C15','C17','C20','C24','C32','A02','A05','A07','A11']}
env={'PATH':'/home/edutor/.nvm/versions/node/v24.22.0/bin:/usr/local/bin:/usr/bin:/bin','HOME':'/home/edutor','LANG':'C.UTF-8','CI':'1'}
log=open(sys.argv[1],'a')
n=0
for app in ['people','agents']:
 for c in CASES[app]:
  t0=time.time()
  p=subprocess.run(['/usr/bin/python3','-I','-B',H+'/hosted.py','probe','--session',S,'--reviewed-packet-sha256',P,'--root-grant',G+f'/probe-reviewer-{app}.json','--execute-authorized','--app',app,'--role','reviewer','--case',c],cwd=W,env=env,capture_output=True,text=True,timeout=120)
  n+=1
  rec={'n':n,'app':app,'case':c,'start':t0,'dur':round(time.time()-t0,3),'exit':p.returncode,'stdoutTail':p.stdout[-300:],'stderrTail':p.stderr[-600:]}
  log.write(json.dumps(rec)+'\n');log.flush()
  print(n,app,c,p.returncode,rec['dur'],flush=True)
  if p.returncode!=0:
   print('STOP first failure',flush=True);sys.exit(3)
print('ALL32DONE',flush=True)
