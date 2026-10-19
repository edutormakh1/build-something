# Operación Ubuntu y candidato nocturno

## Estado instalado al 19 de octubre de 2026

Ambos `www` canónicos sirven Next normal mediante Cloudflare Free + Tunnel desde
`~/.local/share/build-something/releases/20261019-989addd`, fuente
`989addd145ab7f315d36c8bb30b8c487e57c9a67`, AMB `wa5ad7fb4482cf57b`,
puertos People 21775 y Agents 21776. Las unidades dedicadas
`newbuild-something-ui-people.service`, `newbuild-something-ui-agents.service` y
`newbuild-something-prod-connector.service` quedaron enabled/active. Ubuntu debe
seguir conectado y despierto. La configuración/release `production-ed28` se
conserva para rollback; sus apps anteriores en 21451/21452 están detenidas y
deshabilitadas. El [README principal](../../README.md#active-production-hosting--19-october-2026)
registra límites de aceptación y retención del fallback.

El recibo externo `D02-Ubuntu-nightly-activation-receipt-v1.json` registra la
instalación del helper y las unidades privadas, y el timer nocturno enabled,
active/waiting a las 03:00 ART, con `Persistent=no`. La fuente instalada del
runner sigue siendo `e46ad116345a6f93290bad815bcdf9ef986e2370` en
`~/.local/share/build-something/nightly-source`, AMB `wa45c5a672e5dbbe2`.
La revisión operacional previa es `D02-Ubuntu-nightly-activation-review1.md`;
ambos archivos están en el run externo `~/.lead/github.com/edutormakh1/build-something/runs/chore/cloudflare-hosting/`.
Activar el timer no inició el servicio en ese recibo: `firstNightResult=UNKNOWN`.
No hay aceptación de una noche exitosa por el mero estado enabled.

Los `.example` del repo siguen siendo plantillas genéricas inertes. Las unidades
privadas instaladas proceden del paquete operacional revisado, con rutas/pin e
identidad concretos y preflight de cola; no son una copia literal de las plantillas.
Esta documentación no es una instrucción para reinstalarlas ni cambiar el timer.
No hay auto-pull, promoción de releases, publicación ni verificación autónoma de hechos.

## Alcance del helper

Ubuntu permanece encendido para servir visitantes con Next mientras los
builds/checks pesados esperan la noche. Este helper sólo prepara candidatos:
instala dependencias únicamente con `prepare` offline; no sirve HTTP, hace pull, publica, promueve releases,
reinicia apps, crea túneles ni cambia auth/DNS. No inicia un LLM ni un flujo de
«automejora», no verifica hechos ni aprueba PRs. No requiere Workers Paid para
cómputo del origen; electricidad/Internet y límites de servicios siguen contando.

La ventana inicial elegida es **03:00 inclusive a 06:00 exclusive**, zona IANA
`America/Argentina/Buenos_Aires`, independiente del TZ del host. El dueño pidió
trabajo nocturno; esta ventana quedó concretada en la activación operacional.
No existe `--force`. Se deja un margen
de cinco segundos antes de las 06:00 para cancelar procesos propios.

## Contrato mínimo

PLAN no requiere estado ni configuración, no invoca Git/AMB/pnpm ni lee secretos:

```sh
node scripts/ubuntu-nightly.mjs --task build
node scripts/ubuntu-nightly.mjs --task check
node scripts/ubuntu-nightly.mjs --task prepare
```

El diseño exigió **otro linked git worktree dedicado** (ya instalado como se indica arriba),
registrado previamente en AMB y fijado al commit revisado completo (incluido este
runner). Puede empezar sin `node_modules`: `prepare` instala sólo de noche desde
el store local, sin copiar dependencias mutables de otro worktree ni instalar de
día. No usar el checkout principal, un clon independiente, uno de
desarrollo, otro agente ni el directorio de una release que atienda visitantes.
La preparación inicial no creaba ese checkout. Desde su raíz, el contrato de ejecución es:

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
resolverá esa falta por separado. La entrega inicial del helper no ejecutó una
instalación; el recibo operacional posterior registra su activación, no el éxito de prepare/check/build nocturnos.
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
El paquete operacional configuró inputs públicos Supabase de prueba
para el candidato: URL loopback y clave pública `public-anon-placeholder`.
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

## Plantillas históricas y evaluación operacional

Los dos `.example` **no son las unidades privadas instaladas**. Sus rutas, Node/PATH, identidad
y pin eran ejemplos para revisión; el timer referencia el servicio sin `.example` y usa
`Persistent=false`: una noche omitida se salta. La entrega inicial no habilitaba timer, linger,
WakeSystem, túnel ni servicios; la activación posterior quedó registrada arriba. El servicio oneshot
ejecuta **prepare → check → build**, con el mismo pin/paths/id y una admisión AMB
por tarea. El primer exit no cero detiene los siguientes ExecStart; nunca publica,
promueve ni reinicia. `TimeoutStartSec=3h` fija una cota de respaldo para el oneshot;
no amplía la ventana: cada runner conserva su corte antes de las 06:00.

La activación requirió comprobar de nuevo el propietario del daemon de la
cola Task Spooler seleccionada: `queue_ready`/`tsp -S` puede autoarrancarlo si no
existe. Debe vivir fuera del cgroup de la unidad, para que el cierre de
ésta no mate una cola compartida. El paquete instalado añade un preflight que
comprueba metadatos del socket/owner
y rechaza una cola ausente, desconocida o dentro del cgroup de la unidad.
No reserva atómicamente el daemon durante toda la secuencia; su desaparición
entre fases sigue siendo un residual aceptado en la revisión operacional.
No se modifica la cola compartida como parte de esta corrección documental.

Nice=15, CPUWeight=10 e IOWeight=10 se propusieron para baja prioridad y
quedaron en el paquete instalado;
AMB mueve el trabajo a su propio scope, de modo que esos pesos no demuestran
límites efectivos de sus hijos. Se respeta la cola global de un pesado; el slice
300% no reserva un núcleo exclusivo y la cobertura histórica es parcial. No se
cambia política global ni se deducen consumos individuales del loadavg.

El diseño inicial separaba el servicio Next permanente y sus releases del runner.
Luego se registraron muestras locales acotadas y se activó la release pública
indicada arriba; esas muestras no prueban capacidad sostenida ni eficiencia
de la noche nativa. No se promete cero impacto ni encaje gratuito completo.
Este runner sólo escribe artefactos en el checkout candidato, nunca toca una
versión publicada. La reversión inicial por no integrar los cinco archivos era histórica.
La reversión operacional del timer instalado está en el paquete externo revisado;
no debe confundirse con el rollback de las apps públicas ni ejecutarse por leer este documento.

Comando histórico de validación pequeña del helper (no ejecutado en esta corrección documental):

```sh
amb run check -- node --test scripts/ubuntu-nightly.test.mjs
```
