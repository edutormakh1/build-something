# Candidato nocturno local (inactivo)

Ubuntu puede permanecer encendido para servir visitantes con Next mientras los
builds/checks pesados esperan la noche. Este helper sólo prepara candidatos:
instala dependencias únicamente con `prepare` offline; no sirve HTTP, hace pull, publica, promueve releases,
reinicia apps, crea túneles ni cambia auth/DNS. No inicia un LLM ni un flujo de
«automejora», no verifica hechos ni aprueba PRs. No requiere Workers Paid para
cómputo del origen; electricidad/Internet y límites de servicios siguen contando.

La ventana inicial elegida es **03:00 inclusive a 06:00 exclusive**, zona IANA
`America/Argentina/Buenos_Aires`, independiente del TZ del host. El dueño pidió
trabajo nocturno, sin especificar horas. No existe `--force`. Se deja un margen
de cinco segundos antes de las 06:00 para cancelar procesos propios.

## Contrato mínimo

PLAN no requiere estado ni configuración, no invoca Git/AMB/pnpm ni lee secretos:

```sh
node scripts/ubuntu-nightly.mjs --task build
node scripts/ubuntu-nightly.mjs --task check
node scripts/ubuntu-nightly.mjs --task prepare
```

Después de revisión e integración, Root debe preparar **otro linked git worktree dedicado**,
registrarlo previamente en AMB y fijar el commit revisado completo (incluido este
runner). Puede empezar sin `node_modules`: `prepare` instala sólo de noche desde
el store local, sin copiar dependencias mutables de otro worktree ni instalar de
día. No usar el checkout principal, un clon independiente, uno de
desarrollo, otro agente ni el directorio de una release que atienda visitantes.
Este trabajo no crea ese checkout. Desde su raíz, el contrato de ejecución es:

```text
/RUTA/NODE scripts/ubuntu-nightly.mjs --execute --task build \
  --workspace /RUTA/DEDICADA --workspace-id w0123456789abcdef \
  --source COMMIT_REVISADO_DE_40_HEX
```

Los valores son ejemplos inválidos, no configuración activa. No hay shell ni
comandos configurables. `prepare` ejecuta exactamente `pnpm install --offline
--frozen-lockfile --ignore-scripts` bajo perfil AMB **setup**: sin scripts de
ciclo de vida, actualizaciones automáticas, descarga de registry ni fallback
remoto. Si falta algo en el store, falla una vez y detiene la secuencia; Root
resolverá esa falta por separado. No se ejecutó una instalación en esta entrega.
`build` ejecuta secuencialmente `pnpm --filter @bs/people
build` y `pnpm --filter @bs/agents build`: Next normal, sin OpenNext/deploy.
`check` ejecuta `pnpm lint`, `pnpm typecheck`, `pnpm test` en ese orden. Todos
pasan por `amb run setup|check|build -- node ...` y sus entrypoints/cola/límites
existentes (Vitest hasta dos workers). No ejecutar estos comandos pesados de día.

Antes de encolar y tras obtener turno se comprueban raíz física, identidad AMB,
proyecto, HEAD exacto y estado Git limpio (incluidos no rastreados, excluidos
ignorados). Se repite antes de cada fase. No se ejecuta código recién descargado.
`amb context` comprueba identidad; Root debe haber registrado el checkout antes
(esa CLI puede registrar uno ausente). No se inspeccionan contenidos ignorados,
envs ni credenciales; Root debe mantener cualquier configuración de ese checkout
aislada y apta para checks/builds sin servicios remotos. Esto no es aislamiento
contra modificaciones maliciosas simultáneas del mismo usuario.
Para la primera noche Root configurará los inputs públicos Supabase de prueba
en la unidad aún inactiva: URL loopback y clave pública `public-anon-placeholder`.
Los `.example` no contienen valores de credenciales. No leer stores de env ni
configurar auth de producción. Si prepare cambia un lockfile/archivo rastreado,
el guard de limpieza siguiente rechaza check/build; no se restaura ni oculta.

El lock exclusivo privado está fuera del código en
`~/.local/state/build-something-nightly/<workspace-id>/run.lock`, modo 0600 bajo
directorio 0700. Cubre espera y ejecución, falla inmediatamente ante otro lock y
se libera al salir normalmente o por señales manejables. No adopta locks
antiguos/ajenos: tras SIGKILL o apagado, Root debe comprobar que terminó el job
propietario antes de retirar manualmente ese lock. No hay limpieza automática.

El wrapper admitido exige lease viva y scope AMB correcto. Revalida horario
después de la cola; si el turno llega de día, difiere sin lanzar pnpm. Un watchdog
cancela la espera/ejecución antes del límite: TERM y luego KILL al grupo propio;
AMB cancela su scope mediante su manejador de TERM. Nunca usa pkill ni detiene
otros jobs. Cada fase elimina sus descendientes del grupo antes de continuar.
La garantía presupone que Linux/AMB y el planificador responden; una suspensión
o fallo del sistema puede retrasar cualquier temporizador de software.

Cada fase tiene **un intento**. No se puede clasificar fiablemente un error de
pnpm como red transitoria; ni exit 125 ni texto de error autorizan reintentos.
Sin bucle hasta verde, publicación remota ni reintentos de escrituras.
Sólo se registran fase y estado/código; la salida de prepare/check/build se descarta
para no volcar valores sensibles al journal. Diagnóstico posterior requiere una
operación local explícita. Estados: PLAN/OK=0, FAILED=1, LOCKED=73,
DEFERRED_WINDOW=75, REFUSED=78, cancelación INT=130/TERM-HUP=143.

## Ejemplos y evaluación posterior

Los dos `.example` **no están instalados**. Reemplazar rutas, Node/PATH, identidad
y pin sólo tras revisión; el timer referencia el servicio sin `.example` y usa
`Persistent=false`: una noche omitida se salta. No habilitar timer, linger,
WakeSystem, túnel ni servicios como parte de esta entrega. El servicio oneshot
ejecuta **prepare → check → build**, con el mismo pin/paths/id y una admisión AMB
por tarea. El primer exit no cero detiene los siguientes ExecStart; nunca publica,
promueve ni reinicia. `TimeoutStartSec=3h` evita el default corto de arranque;
no amplía la ventana: cada runner conserva su corte antes de las 06:00.

Antes de activar, Root debe comprobar de nuevo el propietario del daemon de la
cola Task Spooler seleccionada: `queue_ready`/`tsp -S` puede autoarrancarlo si no
existe. Debe vivir fuera del futuro cgroup de la unidad, para que el cierre de
ésta no mate una cola compartida. Root ya identificó el propietario del socket
real en una sesión externa; este delta no hizo inventarios ni reinició la cola.
Las precauciones operativas finales se completarán al configurar, no aquí.

Nice=15, CPUWeight=10 e IOWeight=10 son propuestas locales de baja prioridad;
AMB mueve el trabajo a su propio scope, de modo que esos pesos no demuestran
límites efectivos de sus hijos. Se respeta la cola global de un pesado; el slice
300% no reserva un núcleo exclusivo y la cobertura histórica es parcial. No se
cambia política global ni se deducen consumos individuales del loadavg.

El servicio Next liviano permanente y sus releases se diseñarán por separado:
antes de un Tunnel público, medir RSS/CPU en reposo y solicitudes acotadas con
ambas apps. Su presupuesto será una propuesta hasta medirlo; no se promete cero
impacto ni encaje gratuito completo. Este runner sólo escribe artefactos en el
checkout candidato, nunca toca una versión publicada. La reversión consiste en
no integrar estos cinco archivos; si se adopta después, su activación/reversión
operativa requerirá otra revisión.

Única prueba pequeña autorizada para esta entrega:

```sh
amb run check -- node --test scripts/ubuntu-nightly.test.mjs
```
