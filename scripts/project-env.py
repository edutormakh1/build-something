#!/usr/bin/env python3
"""Run an app using its Ubuntu environment master; no secrets in this file."""
import os,sys
from pathlib import Path
PROJECT = 'build-something'
args=sys.argv[1:]
if not args or args[0] not in ('local','staging','production') or '--' not in args:
    print('Usage: python3 scripts/project-env.py local|staging|production [--allow-production] -- COMMAND [ARGS]',file=sys.stderr)
    sys.exit(2)
pos=args.index('--'); selection=args[:pos]; command=args[pos+1:]
if not command or any(x!='--allow-production' for x in selection[1:]):
    print('Invalid environment selection or missing command.',file=sys.stderr);sys.exit(2)
if PROJECT=='PAW' and Path(command[0]).name in ('mvn','mvnw'):
    if any(x.startswith('-P') and 'pampero' in x for x in command[1:]):
        print('Pampero retains its existing deployment profile; do not combine it with this local-master launcher.',file=sys.stderr);sys.exit(2)
    command.insert(1,'-Pproject-env')
tool=Path.home()/'.local/share/project-env/project_env.py'
if not tool.is_file():
    print('project-env must be installed on the execution machine.',file=sys.stderr);sys.exit(2)
os.execv(sys.executable,[sys.executable,str(tool),'run',PROJECT,*selection,'--scope','app','--cwd',str(Path.cwd()),'--',*command])
