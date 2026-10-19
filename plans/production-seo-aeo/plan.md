# Producción y crecimiento SEO y AEO de Build Something

## Estado actual — 19 de octubre de 2026

Ambos sitios canónicos, [People](https://www.buildsomethingpeoplewant.com) y
[Agents](https://www.buildsomethingagentswant.com), sirven la UI mínima y el mosaico original del dueño
desde `989addd145ab7f315d36c8bb30b8c487e57c9a67`. El hosting público usa zonas Cloudflare Free +
Tunnel hacia Next normal en Ubuntu; los dominios actuales no usan Workers. La release inmutable es
`~/.local/share/build-something/releases/20261019-989addd`, AMB `wa5ad7fb4482cf57b`, puertos 21775/21776.
Las dos unidades UI y el conector dedicados quedaron enabled/active. Ubuntu debe seguir conectado y despierto.
Supabase conserva cuentas y datos; el catálogo público sigue en JSON versionado, sin migración.

Los informes externos `People-final-cutover-result-review1.md` (SHA-256
`5907681f64016349aba723d4486d4bb113e78fe790885f3c8b5ab00d7d4a142a`) y
`Agents-final-cutover-result-review1.md` (SHA-256
`d0ecf4b91326b5c5c6ac772a3c5cccec4426eb50852ec454d88c9980e19ff176`) dieron PASS
acotado al hosting público. Están en el run `~/.lead/github.com/edutormakh1/build-something/runs/chore/cloudflare-hosting/`.
La captura `Agents-public-browser-20261019.safe.json` registra la UI nueva pública; el informe anterior
`UI-production-989addd-result-review1.md` describía una etapa intermedia con Agents/apex pendientes,
superada por estos resultados finales. **No se marca D02 completo, Auth ni SEO/AEO completos.**

Las correcciones de implementación SEO/catálogo y la UI ya fueron revisadas; los defectos de fuente
enumerados en la foto inicial de abajo no constituyen una lista actual de bugs sin corregir.
Login real, recuperación con correo/SMTP y allowlists no tienen aceptación independiente: sólo pasó
el 303 de recuperación sin código. Search Console, Bing, indexación, rankings, citas e ingresos siguen sin medir.

El runner candidato instalado conserva el pin `e46ad116345a6f93290bad815bcdf9ef986e2370`,
`~/.local/share/build-something/nightly-source`, AMB `wa45c5a672e5dbbe2`, y ventana 03:00–06:00
`America/Argentina/Buenos_Aires`. Su activación documentada no demuestra una noche exitosa.
No verifica hechos, publica, hace auto-pull ni promueve releases; tampoco hay un despliegue GitHub/CI
actual acreditado. Los cambios futuros de fuente requieren su propia revisión y promoción explícita.

### Secuencia restante actual

1. Conservar los recibos finales y el rollback: `production-ed28` retenido, apps antiguas 21451/21452
   detenidas/deshabilitadas; Vercel sigue siendo registrar y conserva proyectos, attachments y DNS.
   Retención compartida mínima **2026-10-26T05:45:10.205629Z**, más los horizontes de caché observados,
   sin borrado automático. Certificado fallback registrado hasta 24 de noviembre; autorrenovación desconocida.
   Los cinco Workers antiguos y los dos previews se conservan. Sin renovaciones, billing ni Cloudflare Paid autorizados.
2. Resolver y revisar las aceptaciones todavía abiertas de D02 y Auth con alcance y evidencia propios;
   separar login/recuperación reales, arranque tras reboot y rendimiento sostenido de las comprobaciones ya hechas.
   Revisar el resultado de la noche nativa cuando exista; enabled no equivale a éxito.
3. Retomar descubrimiento y medición con acceso a Search Console/Bing y una línea de base real;
   después evaluar contenido verificable y ventanas 7/28 días. Publicación, indexación, citación e ingresos
   son resultados diferentes. No inventar resultados ni habilitar publicación autónoma.

El [README](../../README.md) y el [contrato Ubuntu](../../ops/ubuntu/README.md) detallan la operación actual.
La secuencia Workers/DNS/CI propuesta originalmente más abajo se conserva como historia, no como despliegue
activo ni como autorización para retirar fallbacks o instalar automatizaciones.

## Foto histórica — 16 de octubre de 2026

En esa fecha el plan estaba preparado para ejecución por Lead. Las dos apps tenían adaptación local a
Cloudflare; publicación, cuentas y resultados de búsqueda seguían pendientes. Rama de trabajo:
`chore/cloudflare-hosting`; base: `main`. Los hallazgos y el orden original siguientes describen ese punto
de partida; el estado y la secuencia actuales de arriba prevalecen.

El objetivo es terminar y publicar los dos sitios, conservar sus URLs y construir descubrimiento orgánico alrededor de información propia y comprobable. Lead ejecuta investigación, implementación, pruebas y revisión. El dueño interviene cuando falta autenticar una cuenta o autorizar un cambio irreversible nuevo.

## Qué existía y qué faltaba — inventario histórico del 16 de octubre

El inventario de esa fecha registraba 72 productos publicados, 147 filas de reseñas —144 editoriales y tres notas con fuente pública—, diez categorías, siete artículos, 25 comparaciones curadas y tres autores declarados. Estos son registros del catálogo, no usuarios, reseñas verificadas, URLs indexadas ni métricas de autoridad. El catálogo público se lee de JSON versionado; Supabase recibe parte de las operaciones de cuentas y formularios.

Ya existían HTML renderizado en servidor, metadatos, sitemaps, robots, JSON-LD, negociación Markdown, API/OpenAPI y recursos para agentes. En la revisión inicial se identificaron estos pendientes (históricos; no son bugs actuales confirmados):

- Las comparaciones permitían combinaciones arbitrarias, orden inverso y comparaciones de un producto consigo mismo. El Markdown de algunas comparaciones inexistentes respondía 200.
- El JSON-LD convertía un Twin Score compuesto en `AggregateRating` con conteos editoriales y podía asignar estrellas de respaldo a notas sin puntuación. Se pedía representar lo realmente evaluado y visible.
- Faltaban registros auditables de evidencias y evaluación por producto. Las biografías y afirmaciones de uso personal no estaban verificadas por los archivos del repo; no se las debía dar por demostradas ni declarar ficticias sin evidencia.
- Los selectores por slug no filtraban consistentemente entidades no publicadas; entonces todos los productos estaban publicados, pero la implementación no protegía futuros borradores.
- Algunas respuestas Markdown eran genéricas. La recuperación de contraseña enviaba un correo, pero no se encontró la interfaz que completaba el cambio de contraseña.
- Las reseñas pendientes en Supabase no aparecían automáticamente en el catálogo estático. La moderación y la publicación necesitaban una decisión explícita antes de habilitar ese circuito; esa separación se mantiene.
- No se había encontrado integración de métricas de búsqueda. El comando `next lint` de entonces tampoco constituía un control válido para la versión usada.

Hallazgos históricos basados en `packages/db/src/catalog.ts`, `packages/db/src/types.ts`, `packages/seo/src/{jsonld,markdown,urls}.ts`, las rutas de comparación y los formularios de autenticación. El backlog enlaza los archivos concretos.

## Estrategia para aprender de referentes grandes

**G2:** su metodología pública separa categorización y evaluación; su explicación para lectores humanos y máquinas enlaza procesos y límites. Adaptaremos una metodología Twin Score reproducible, páginas de categoría útiles y evidencia enlazada. Esto es una observación de su arquitectura editorial, no una medición de qué señales causan su posicionamiento. Fuentes: [metodología de G2](https://research.g2.com/methodology), [información de G2 para lectores y asistentes](https://www.g2.com/ai-instructions).

**AlternativeTo:** su página de alternativas de ChatGPT permite comparar por tipo de aplicación, plataforma y licencia. Adaptaremos comparaciones y filtros que respondan decisiones reales; sólo tendrán URLs indexables propias cuando haya información suficiente y diferenciada. [Página observada](https://alternativeto.net/software/chatgpt/).

La ventaja propia será comparar utilidad para humanos y agentes con el mismo conjunto de pruebas y hechos trazables. Las primeras hipótesis de contenido son herramientas de desarrollo e IA con diferencias concretas de API, CLI, autenticación, límites e integración. La demanda y la competencia se validan antes de elegir el primer grupo; no se inventan volúmenes ni dificultades de palabras clave.

Google señala que sus experiencias de IA siguen apoyándose en fundamentos de SEO y contenido útil; no requieren archivos o marcado especiales. Conservaremos Markdown, `llms.txt` y los datos para los consumidores que sí los usen, sin presentarlos como un beneficio demostrado para el ranking de Google. [Guía oficial](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

El crecimiento vendrá de pruebas propias, comparaciones que resuelvan decisiones, fuentes primarias, organización y actualización. La publicación masiva de páginas casi iguales no es el objetivo: Google identifica el contenido a escala sin valor añadido como una práctica abusiva. [Políticas de búsqueda](https://developers.google.com/search/docs/essentials/spam-policies).

## Orden de ejecución original — histórico

### Primera etapa: preparación y correcciones locales

1. Conservar y revisar el cambio de hosting ya existente. Guardar checkpoints en Git sin perder cambios previos.
2. Corregir publicación de entidades, comparaciones inexistentes y duplicadas; documentar el comportamiento antes de cambiar respuestas públicas.
3. Representar fielmente Twin Score y las reseñas. No añadir conteos o estrellas sin observaciones que los justifiquen.
4. Inventariar URLs actuales y redirecciones apex/www. Mantener durante el cambio el host preferido efectivo y todas las rutas útiles; alinear canonical, sitemap, enlaces y redirecciones. No hacer una desindexación masiva sin inventario y revisión.
5. Configurar comprobaciones reales de lint, tipos, tests, builds y smoke tests HTTP. Medir rendimiento móvil y limitar el coste de la decoración 3D, preservando contenido útil sin WebGL.

En aquella etapa la cuenta de Cloudflare estaba autenticada y las tareas locales continuaban mientras se resolvían permisos DNS y configuración de producción. Esos bloqueos de acceso/DNS no describen el hosting actual. Las mediciones locales de C01 detectaron inestabilidad/coste móvil en Agents; P01 incorporaba la corrección con trazas antes/después como requisito previo al cambio de dominios. Las mediciones de laboratorio no certifican Core Web Vitals de usuarios. [Definición de CLS](https://web.dev/articles/cls).

### Segunda etapa: credibilidad editorial y producto completo

Crear un registro interno de evidencias por slug antes de cambiar contratos de API o esquemas de Supabase: fuente primaria, fecha de comprobación, responsable, método, resultado y limitaciones. Las comprobaciones documentales y las pruebas prácticas se identifican por separado. La evidencia de uso personal sólo existe cuando se realizó y se conserva el resultado.

Verificar las afirmaciones y biografías de la primera cohorte; corregir, matizar o retirar lo no sustentado mediante un cambio revisado. Mantener el inventario anterior y documentar cualquier cambio de indexabilidad. La primera cohorte propuesta es diez productos y cinco comparaciones dentro de dos grupos temáticos; su elección depende de evidencia de demanda y capacidad de aportar datos propios.

Completar el flujo existente de recuperación de contraseña y hacer explícito qué sucede con los envíos pendientes. El trabajo de autenticación recibe una propuesta y revisión específicas. No se agrega publicación automática de reseñas, un backend nuevo ni migraciones de base como parte implícita de SEO.

### Tercera etapa original: Workers en Cloudflare — alternativa histórica sustituida por Ubuntu + Tunnel

- Obtener acceso a la cuenta permanente y a las zonas DNS. En la foto inicial no había credenciales locales disponibles; el navegador integrado estaba bloqueado por un requisito del host y la alternativa llegó a una verificación de Cloudflare. No intentar eludir verificaciones ni sustituir producción por una cuenta temporal que expire.
- Exportar configuración y registros de DNS existentes, incluidos correo y verificación, y preparar rollback.
- Configurar variables públicas de Supabase durante el build y variables privadas sólo donde se necesiten. No introducir claves privilegiadas en el cliente. Mantener Supabase y sus datos.
- Publicar ambos Workers en URLs de prueba con indexación deshabilitada para previews. Comprobar headers, APIs, HTML/Markdown, recursos estáticos y URLs de error.
- Medir CPU y peticiones reales con el primer tráfico controlado. Un dry-run o el tiempo local de respuesta no demuestra que el plan gratuito alcance.
- Conectar dominios preservando host, rutas y registros ajenos al hosting. Validar HTTPS y redirecciones; los enlaces de autenticación deben volver al dominio correcto.
- La propuesta original incluía despliegues futuros desde GitHub con tests y credenciales de alcance mínimo, y eventual retiro de Vercel tras validación. No se acredita esa automatización ni se ejecuta ese retiro: prevalecen la promoción explícita y la retención actual indicadas arriba.

### Cuarta etapa: descubrimiento y medición

Verificar ambos dominios en Search Console y Bing Webmaster Tools si el acceso lo permite; usar la verificación existente cuando ya haya propiedades. Enviar únicamente sitemaps de URLs canónicas elegibles. Registrar cobertura, errores y señales de rastreo sin confundir rastreo con indexación. Comprobar en Search Console la inclusión del sitio en las funciones generativas de Search y habilitarla cuando corresponda dentro de la cuenta autorizada. Registrar el informe **Generative AI performance** por separado de la analítica clásica de búsqueda, con fecha y ventana de medición. Si la cuenta no ofrece el control o el informe, guardar esa limitación y mantener la comprobación pendiente; no inferir visibilidad de IA de las métricas clásicas. [Requisitos y medición oficiales](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

Crear páginas de comparación y categoría con respuestas útiles, evidencia y enlaces contextuales, diferenciando la decisión humana de la integración por agentes. HTML, Markdown, datos y metadatos deben expresar los mismos hechos. Elegir canonical o exclusión explícita para representaciones duplicadas; evitar que filtros o el orden de un par multipliquen páginas indexables sin valor.

El conjunto de datos Twin Score y los resultados reproducibles son activos potencialmente citables. Preparar recursos y propuestas de distribución pertinentes. Enviar mensajes, hacer outreach, pagar enlaces o contratar servicios no está autorizado por este plan.

## Criterios de cierre

El archivo `backlog.json` contiene dependencias, límites y criterios de aceptación por tarea. Toda entrega necesita una revisión independiente con evidencia y SHA antes de marcarse aprobada.

- **Preparado localmente:** tests/builds/smoke tests pasan y quedan sus resultados, pero no se afirma despliegue.
- **Publicado:** URLs alojadas verificadas en la cuenta correcta, variables adecuadas, dominios y rollback registrados. No se afirma que el login real pasó con sólo ver su formulario.
- **Producto verificable:** controles de publicación, comparaciones y marcado funcionan; cada afirmación del grupo publicado tiene evidencia o limitación explícita; las tareas de autenticación están resueltas o claramente excluidas del lanzamiento.
- **Descubrimiento medido:** propiedades y sitemaps verificados; línea de base real de indexación, impresiones, clics, consultas y rendimiento. Tráfico de prueba o de crawlers no se cuenta como audiencia humana.
- **AEO medido:** registrar preguntas, fecha, motor, región y URL efectivamente citada; comparar muestras repetidas. `llms.txt`, un JSON-LD válido o una visita de un bot no prueban citación.
- **Crecimiento:** comparar ventanas de 7 y 28 días desde la línea de base y cohortes de URLs verificadas. Observar clics de salida a proveedores y uso de comparaciones/dataset cuando existan datos. No hay un objetivo de ranking o tráfico garantizado.

Las ventanas de revisión a 30/60/90 días son momentos de evaluación desde la salida real, no promesas de resultados ni tareas programadas ya creadas. La preparación del 16 de octubre no instalaba un scheduler; la activación posterior del timer candidato Ubuntu se registra arriba y no programa esas revisiones SEO.

## Cómo lo ejecuta Lead

Cada worker recibe un brief pequeño con objetivo, archivos propios, dependencias y comandos de aceptación. Se prefiere un reviewer de otra familia de modelos, resuelto desde el catálogo vivo y `roles.yaml`. Si falta disponibilidad, se registra la limitación antes de usar un reviewer independiente de contexto nuevo de la misma familia; una revisión no disponible nunca cuenta como PASS. Se permiten dos workers paralelos sólo si los archivos no se pisan. Antes de cada despacho, Lead expande los alcances del backlog a archivos concretos y registra su reserva en el brief y worklog, incluidos tests, lockfiles y archivos nuevos. Un alcance amplio o dudoso se ejecuta en serie; las reservas se liberan al integrar el commit. Una ampliación de alcance requiere actualizar el brief, las reservas y las dependencias antes de continuar. S03 espera a S01 y S02 y tiene rutas explícitas; autenticación, publicación de datos y contratos públicos se tratan primero como propuestas concretas revisadas.

Si falta una cuenta, Lead marca la dependencia y continúa la próxima tarea local independiente. No pide otra vez autorización para la migración de hosting ya aprobada. Sólo escala acceso/identidad, gasto nuevo, cambios irreversibles nuevos o un bloqueo que alcanzó el límite de intentos.

La configuración local del repo vive fuera del código en `~/.lead/github.com/edutormakh1/build-something/`. Allí están constitución, roles resueltos contra el catálogo vivo de T3, brief, worklog, checklist y briefs. Las credenciales de los proveedores se mantienen fuera de estos artefactos. El plan compartido y el backlog viven en esta carpeta del repo. `execution-state.json` es el punto de reanudación actual; los estados de revisión anteriores son históricos. Desde los nuevos checkpoints se guardan snapshots fechados de configuración, briefs y evidencia con el SHA inspeccionado, sin reconstruir estados históricos que no se archivaron.

Para continuar en este repo:

```text
$lead:run "Retomá plans/production-seo-aeo/plan.md y su backlog. Leé el worklog y checklist del run actual. Ejecutá la primera tarea pendiente sin dependencias bloqueadas; conservá el cambio Cloudflare y Supabase. Revisá cada entrega con evidencia y seguí hacia producción y crecimiento SEO/AEO. Si falta acceso a una cuenta, avanzá las tareas locales independientes."
```

La preparación histórica no certificaba el producto completo ni modificaba producción; el hosting fue activado después con el alcance indicado arriba. La siguiente tarea actual está indicada en el estado de Lead; las decisiones, evidencias y PRs se incorporan allí durante la ejecución.
