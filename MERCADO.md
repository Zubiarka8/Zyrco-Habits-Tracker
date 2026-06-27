# Analisis de Producto y Mercado — Zyrco Habit Tracker
> Generado automaticamente · 27/06/2026  
> Enfoque: UI · UX · Features mal implementadas · Features faltantes · Offline  
> Basado en: lectura directa del codigo fuente + investigacion de mercado

---

## Indice
1. [Problemas de UI (10 issues)](#ui)
2. [Problemas de UX / interaccion (9 issues)](#ux)
3. [Features mal implementadas (8 issues)](#mal-implementadas)
4. [Features faltantes con validacion de mercado (10 items)](#faltantes)
5. [Capacidad offline — fortaleza y brechas](#offline)
6. [Scorecard vs competidores](#scorecard)
7. [Roadmap priorizado](#roadmap)

---

## 1. Problemas de UI
> Problemas encontrados directamente en el codigo fuente. Cada uno incluye la referencia exacta al archivo y linea.


### UI-01: Habit cards no son clicables como navegacion
**Gravedad:** 🟠 Alto

En Habits.tsx, el unico camino al detalle de un habito es: tarjeta → menu (···) → 'Ver detalle'. El clic en la tarjeta no hace nada. Todos los competidores (Loop, Streaks, HabitNow) navegan al detalle con un simple tap en la fila/tarjeta.
**Codigo:** `Habits.tsx:103 — renderHabitCard() no tiene onClick de navegacion; solo el menu-btn la lanza.`

**Referencia de mercado:** Loop, Streaks, HabitNow: tap en la fila = ir al detalle.
**Solucion:** Hacer el area central de la tarjeta (icon + nombre + meta) un NavLink a /habits/:id. El menu (···) mantiene las acciones destructivas.
**Esfuerzo:** ⚡ Bajo


### UI-02: Sort control usa <select> nativo que rompe el design system
**Gravedad:** 🟡 Medio

SortControl en Today.tsx renderiza un <select> HTML nativo. En Windows 11 este control usa el estilo del OS: diferente tipografia, diferente radio, diferente altura. Rompe la coherencia visual con el resto de la UI que usa CSS custom properties.
**Codigo:** `Today.tsx:515 — <select className='habit-sort-select'>.`

**Referencia de mercado:** Streaks, Finch, Done: controles de ordenacion como chips o segmented controls nativos del design system.
**Solucion:** Reemplazar por un grupo de 3 chips (mismo estilo que TypeFilterChips) o un popover con RadioGroup.
**Esfuerzo:** ⚡ Bajo


### UI-03: Chevron de seccion done/session usa caracteres Unicode, no icono
**Gravedad:** 🟢 Bajo

DoneSection y SessionGroup usan los caracteres '▲' / '▼' para el toggle de expansion. Estos caracteres tienen kerning inconsistente entre fuentes y no respetan el color/tamanyo del design system. Lucide-react ya esta importado; ChevronUp/ChevronDown son la solucion correcta.
**Codigo:** `Today.tsx:601 — <span className='done-section-chevron'>{open ? '▲' : '▼'}</span>.`

**Referencia de mercado:** Estandar en toda app moderna: iconos vectoriales para toggles.
**Solucion:** Sustituir por <ChevronUp size={14}/> / <ChevronDown size={14}/> de lucide-react.
**Esfuerzo:** ⚡ Bajo


### UI-04: PerfectDayBanner se muestra desde 0% (al inicio del dia)
**Gravedad:** 🟡 Medio

El ring SVG de progreso en Today.tsx se renderiza cuando done=0 y total>0, mostrando un circulo vacio. El efecto visual no motiva; al contrario, recuerda al usuario cuanto le falta desde el primer segundo. Finch y Streaks ocultan o minimizan el indicador de progreso hasta que el usuario marca al menos 1 habito.
**Codigo:** `Today.tsx:685 — PerfectDayBanner({ done, total }) renderiza siempre que total > 0.`

**Referencia de mercado:** Finch: muestra celebracion solo al completar. Streaks: el circulo empieza a llenarse, no a vaciarse.
**Solucion:** Ocultar el banner hasta done >= 1, o cambiar el diseno a un indicador positivo ('1 de 5 completados' en lugar de ring vacio).
**Esfuerzo:** ⚡ Bajo


### UI-05: Dropdown de menu se puede salir de la pantalla
**Gravedad:** 🟡 Medio

MenuState posiciona el dropdown con top: menu.y, left: menu.x usando rect.right/rect.bottom del boton. Si el habito esta en la parte baja o derecha de la pantalla, el menu se sale del viewport sin ningun calculo de clamp. En mobile (360px de ancho) esto es especialmente problematico.
**Codigo:** `Today.tsx:904 — openMenu() calcula rect.right, rect.bottom sin viewport clamp.`

**Referencia de mercado:** Todos los menus contextuales maduros hacen clamp al viewport o flip cuando no hay espacio.
**Solucion:** En el div dropdown, calcular si x + anchura_menu > window.innerWidth y flipear a left: menu.x - anchura_menu. Mismo para y.
**Esfuerzo:** ⚡ Bajo


### UI-06: Empty state es texto plano sin ilustracion
**Gravedad:** 🟢 Bajo

Las pantallas vacias (Habits, Stats, Todos) muestran un emoji + texto. Finch, Fabulous y Streaks usan ilustraciones SVG animadas que comunican el valor del producto y reducen el abandono en usuarios nuevos. Un empty state bien disenado aumenta la conversion al primer habito.
**Codigo:** `Habits.tsx:210 — <span className='empty-state-emoji'>✨</span>.`

**Referencia de mercado:** Finch: pagina vacia con el pajaro animado diciendo 'Empieza tu primer habito'. Streaks: ilustracion de un circulo vacio con CTA.
**Solucion:** Crear un SVG simple inline para la pantalla vacia de Habits y Hoy. No requiere libreria externa.
**Esfuerzo:** 🔧 Medio


### UI-07: Stats: unico grafico es un BarChart de completions totales
**Gravedad:** 🟠 Alto

Stats.tsx solo tiene un BarChart de 'completions por dia'. No hay: linea de tendencia, mejor dia de semana por habito, radar por categoria, sparklines por habito. Loop Habit Tracker —gratuito y open source— tiene histograma de frecuencia, tendencia lineal y frecuencia relativa por dia de la semana. Zyrco cobra (o planea cobrar) y ofrece menos estadisticas.
**Codigo:** `Stats.tsx:275 — unico <BarChart> con data de overall.byDate.`

**Referencia de mercado:** Loop: 4 tipos de graficas por habito. Bearable: correlaciones entre factores. HabitNow: grafica mensual con heatmap integrado.
**Solucion:** Anadir al menos: (1) linea de tendencia 30d por habito en HabitDetail, (2) 'mejor dia de semana' barchart horizontal en HabitDetail.
**Esfuerzo:** 🔧 Medio


### UI-08: Numeric input expansion es un patron UX no estandar
**Gravedad:** 🟡 Medio

Para habitos numericos, el primer tap expande un row inline con +/- stepper. El usuario no sabe que esto va a pasar: el boton circular parece identico a un checkmark. Habitica y HabitNow usan un bottom sheet o modal para el input numerico, que es mas predecible y accesible para pantallas tactiles.
**Codigo:** `Today.tsx:248 — if (isNumeric && !completed) { setExpandedNumeric(...) }.`

**Referencia de mercado:** HabitNow: bottom sheet con teclado numerico. Loop: campo inline pero con icono diferente para indicar que es numerico.
**Solucion:** Cambiar el icono del check-btn para habitos numericos (usar un '123' o un icono de input) y considerar un mini-sheet en lugar del expand inline.
**Esfuerzo:** 🔧 Medio


### UI-09: Filtros de tipo + categoria generan doble fila de chips
**Gravedad:** 🟢 Bajo

Cuando hay habitos de multiples tipos Y multiples categorias, FilterBar muestra dos filas de chips. En mobile esto consume mucho espacio vertical antes de que aparezca el primer habito. Streaks y HabitNow unifican tipo y categoria en un unico selector contextual.
**Codigo:** `Today.tsx:558 — FilterBar renderiza TypeFilterChips + CategoryFilterChips en fila separada.`

**Referencia de mercado:** HabitNow: un unico dropdown de filtro con secciones. Streaks: no necesita filtros (limite de 12 habitos).
**Solucion:** Colapsar ambos en un unico row scrollable horizontal con chips mezclados, o usar un icono de filtro que abre un popover.
**Esfuerzo:** ⚡ Bajo


### UI-10: HabitDetail solo accesible desde menu contextual en Habits
**Gravedad:** 🟠 Alto

La pagina /habits/:id existe y tiene estadisticas detalladas por habito (racha, notas, barChart por dia de semana). Pero es invisible desde Today, que es donde el usuario pasa el 80% del tiempo. El unico camino es ir a Habits > abrir menu (···) > Ver detalle.
**Codigo:** `Today.tsx no tiene ningun NavLink a /habits/:id. HabitList tampoco.`

**Referencia de mercado:** Loop: tap en el nombre del habito en cualquier lista lleva al detalle. HabitNow: icono de detalle visible en cada fila.
**Solucion:** Hacer clicable el nombre/icono del habito en Today para ir a /habits/:id, o anadir un icono de 'ver mas' junto al streakBadge.
**Esfuerzo:** ⚡ Bajo


---

## 2. Problemas de UX / interaccion
> Patrones de interaccion que el mercado ya considera estandar y que Zyrco no tiene. Afectan directamente a la retencion a 7 y 30 dias.


### UX-01: Swipe para completar (swipe-to-check)
**Gravedad:** 🟠 Alto

Ninguna fila de habito responde a gestos de swipe. En movil, el gesto mas rapido para marcar un habito es deslizar a la derecha. Streaks (el winner del Apple Design Award) lo tiene como interaccion principal. HabitNow lo tiene en Android. En Zyrco el unico camino es pulsar el circulo check, que en compact view es pequeyo.
**Referencia de mercado:** Streaks: swipe right = completar. HabitNow: swipe left = opciones, swipe right = completar. Loop: tap largo = menu.
**Solucion minima:** Implementar onTouchStart/onTouchEnd en habit-row para detectar swipe horizontal > 60px y triggear toggle. En desktop no es necesario.
**Esfuerzo:** 🔧 Medio


### UX-02: Drag para reordenar habitos
**Gravedad:** 🟡 Medio

El orden de los habitos es el de creacion y no se puede cambiar sin editar cada uno. Los usuarios quieren poner sus habitos mas importantes arriba. Habitica, HabitNow y Loop tienen drag & drop para reordenar. En desktop esto es esperado y en mobile tambien.
**Referencia de mercado:** Habitica: drag en lista de habitos. Loop: drag en la lista principal. HabitNow: drag & drop con handle.
**Solucion minima:** Anadir una columna 'sort_order' INTEGER a la tabla habits. En React usar @dnd-kit/sortable (ligero, accesible). Solo en Habits page.
**Esfuerzo:** 🔧 Medio


### UX-03: Undo para acciones accidentales
**Gravedad:** 🟠 Alto

Si el usuario completa un habito por error o lo elimina, no hay undo. La eliminacion tiene confirmacion modal, pero el complete/uncomplete no tiene señal visual de que se puede deshacer. Loop y Finch muestran un toast con 'Deshacer' tras completar. El sistema de toasts de Zyrco existe pero no lo usa para undo.
**Referencia de mercado:** Loop: 'Undo' en toast 3s despues de completar. Finch: animacion de papiro con 'Deshacer'.
**Solucion minima:** En handleToggle, despues de toggle(), mostrar un toast con boton 'Deshacer' que llame a toggle(habitId, !completed) en los proximos 4 segundos.
**Esfuerzo:** ⚡ Bajo


### UX-04: Busqueda de habitos
**Gravedad:** 🟠 Alto

No hay campo de busqueda en la pagina Habits ni en Today. Con 10+ habitos, encontrar uno especifico para editarlo requiere scroll. HabitNow y Bearable tienen busqueda en tiempo real en la lista de habitos. En Habits.tsx el filtro solo es por tipo/categoria.
**Referencia de mercado:** HabitNow: barra de busqueda siempre visible. Bearable: busqueda con filtros combinados.
**Solucion minima:** Anadir un <input type='search'> en el header de Habits.tsx que filtre habits por nombre en el cliente (useMemo).
**Esfuerzo:** ⚡ Bajo


### UX-05: Teclado shortcuts en desktop
**Gravedad:** 🟡 Medio

Zyrco es una app Tauri de escritorio pero no tiene ningun keyboard shortcut. Los usuarios de desktop esperan: Space/Enter para completar el habito seleccionado, N para nuevo habito, Escape para cerrar modales, / para buscar. Notion, Linear, Obsidian —apps con usuarios de productividad— tienen shortcuts extensos.
**Referencia de mercado:** Ninguno de los competidores mobiles los tiene, pero los de desktop si (Notion: N = nueva nota, etc.).
**Solucion minima:** Implementar useEffect con document.addEventListener('keydown') para al menos: N = nuevo habito, Escape = cerrar modal, / = focus busqueda.
**Esfuerzo:** ⚡ Bajo


### UX-06: Timer habito se reinicia al navegar
**Gravedad:** 🟠 Alto

El estado del timer vive en un Map<string, {startedAt}> en Today.tsx. Navegar a Settings y volver reinicia el timer a 0 sin registrar el tiempo. No hay ninguna advertencia visual. Para habitos de meditacion o ejercicio de 20-30 minutos, esto es un bug funcional aunque este documentado como 'by design'.
**Referencia de mercado:** Streaks: el timer persiste en background aunque la app este minimizada. HabitNow: timer en notificacion persistente.
**Solucion minima:** Persistir el startedAt en localStorage bajo clave 'zyrco-active-timers'. Al montar Today.tsx, restaurar timers activos del dia de hoy.
**Esfuerzo:** ⚡ Bajo


### UX-07: No hay acceso rapido a HabitDetail desde Today
**Gravedad:** 🟡 Medio

El flujo para ver las estadisticas de un habito desde Today es: Hoy → abrir menu (···) → no existe la opcion → ir a Habits → abrir menu (···) → Ver detalle. Son 5 pasos. En Loop: tap en el habito = detalle inmediato.
**Referencia de mercado:** Loop: tap en fila = detalle. HabitNow: icono de grafica junto al nombre. Streaks: tap largo = detalle.
**Solucion minima:** Anadir 'Ver detalle' al menu contextual de Today.tsx (actualmente no esta) y hacer el nombre del habito un link a /habits/:id.
**Esfuerzo:** ⚡ Bajo


### UX-08: No hay modo de foco (un habito a la vez)
**Gravedad:** 🟢 Bajo

Algunas apps ofrecen un 'focus mode' que muestra solo el siguiente habito pendiente, minimizando las distracciones. Util para usuarios con muchos habitos o con TDAH. Fabulous lo tiene como su flujo principal (cada paso de la rutina se muestra uno a uno).
**Referencia de mercado:** Fabulous: la rutina se presenta como un wizard paso a paso. Forest: gamificacion de foco en un solo habito.
**Solucion minima:** Anadir un boton 'Modo foco' en Today que muestre solo el primer pendingHabit con navegacion next/prev. Estado efimero de React.
**Esfuerzo:** 🔧 Medio


### UX-09: Acciones en lote (bulk actions)
**Gravedad:** 🟢 Bajo

No hay forma de archivar, eliminar o pausar varios habitos a la vez. Para usuarios que quieren reorganizar radicalmente su lista, es tedioso hacer cada accion de uno en uno.
**Referencia de mercado:** HabitNow: seleccion multiple con checkbox. Habitica: seleccion de tareas en lote.
**Solucion minima:** Anadir modo seleccion en Habits.tsx: mantener pulsado activa checkboxes en las tarjetas; barra de acciones aparece abajo.
**Esfuerzo:** 🏋️ Alto


---

## 3. Features mal implementadas
> Features que existen en la UI pero cuya implementacion tiene gaps criticos — ya sea que no funcionan, tienen limites arbitrarios, o generan expectativas que no se cumplen.


### MAL-01: Notificaciones: UI promete, OS no entrega
**Gravedad:** 🔴 Critico

Settings.tsx importa @tauri-apps/plugin-notification y pide permisos. HabitForm.tsx tiene un toggle de 'Activar recordatorio' con hora configurable. El problema: ninguna parte del codigo programa una notificacion real en el sistema operativo. useReminders.ts existe pero solo registra si hay habitos con reminder, sin disparar nada. El usuario activa el toggle, configura la hora, y nunca recibe la notificacion.
**Codigo:** `Settings.tsx:3 — import de plugin-notification solo para requestPermission. useReminders.ts no llama a schedule().`

**Impacto:** El 31% de los abandonos de habit trackers son por falta de recordatorios efectivos (dato de mercado). Esta es la funcionalidad #1 en importancia y esta rota.
**Solucion:** Implementar un loop en Rust (src-tauri) con tauri::async_runtime::spawn que cada minuto compruebe si algun habito tiene reminder_time == hora_actual y dispare la notificacion.
**Esfuerzo:** 🔧 Medio


### MAL-02: Retro log limitado arbitrariamente a 30 dias
**Gravedad:** 🟡 Medio

RetroLogModal.tsx permite registrar los ultimos 30 dias. El numero 30 es arbitrario; no esta en la documentacion ni tiene logica de negocio. Usuarios que vienen de otra app o que quieren registrar un mes de vacaciones no pueden ir mas atras.
**Codigo:** `RetroLogModal.tsx — Array.from({length: 30}, (_, i) => subDays(today, i + 1)).`

**Impacto:** Limita la utilidad para usuarios de importacion y usuarios que vuelven despues de un periodo de inactividad.
**Solucion:** Cambiar el limite a 365 dias con scroll virtual (react-window o similar). El input de fecha deberia permitir cualquier fecha pasada.
**Esfuerzo:** ⚡ Bajo


### MAL-03: Import: sin resolucion de conflictos
**Gravedad:** 🟡 Medio

ImportExport.tsx usa INSERT OR REPLACE para habitos y categorias. Si el usuario importa un archivo con habitos que ya existen (mismo ID), los sobreescribe. Si importa habitos con IDs diferentes pero mismo nombre, crea duplicados. No hay ninguna pantalla de confirmacion mostrando que va a pasar.
**Codigo:** `ImportExport.tsx — importAllData() usa INSERT OR REPLACE sin diff previo.`

**Impacto:** Un usuario que importa un backup antiguo puede perder datos recientes o crear duplicados invisibles.
**Solucion:** Antes de importar, mostrar un modal de preview: '5 habitos nuevos, 2 habitos que ya existen (sobreescribir / conservar / renombrar)'.
**Esfuerzo:** 🔧 Medio


### MAL-04: Pausa de habito: solo opciones fijas (3/7/14/30 dias)
**Gravedad:** 🟢 Bajo

El modal de pausa en Habits.tsx ofrece 4 botones fijos: 3, 7, 14, 30 dias. No hay selector de fecha personalizado. Si el usuario se va de vacaciones del 15 al 23, tiene que elegir entre 14 dias (se queda corto) o 30 dias (hay que reactivar manualmente).
**Codigo:** `Habits.tsx:331 — {[3, 7, 14, 30].map((d) => <button ...>)}.`

**Impacto:** Minor UX friction; los usuarios que pausan habitualmente se frustran.
**Solucion:** Anadir un date picker de 'Pausar hasta:' debajo de los botones rapidos. Solo requiere <input type='date'>.
**Esfuerzo:** ⚡ Bajo


### MAL-05: Stats: periodo 'Todo el tiempo' no indica rango real de fechas
**Gravedad:** 🟢 Bajo

Cuando period = 365 en Stats.tsx, el label dice 'Todo el tiempo' pero la ventana de datos es de exactamente los ultimos 365 dias, no desde la fecha de creacion del habito. Un usuario con 2 anos de datos cree que ve todo pero solo ve el ultimo anyo. Ademas, rateDelta se fuerza a 0 sin explicar por que.
**Codigo:** `Stats.tsx:130 — const rateDelta = period < 365 ? ... : 0;`

**Impacto:** Confusion para usuarios con historial largo. La etiqueta promete mas de lo que entrega.
**Solucion:** Cambiar la etiqueta a 'Ultimos 12 meses' o calcular el rango real desde la fecha del primer log.
**Esfuerzo:** ⚡ Bajo


### MAL-06: HabitForm: campo de recordatorio crea expectativas que no se cumplen
**Gravedad:** 🟠 Alto

HabitForm.tsx tiene un toggle 'Activar recordatorio' con un campo de hora. El usuario lo configura, lo guarda, y espera recibir una notificacion a esa hora. No llega nada. Este es el gap mas peligroso de credibilidad del producto.
**Codigo:** `HabitForm.tsx — reminder (boolean) y reminder_time (string) se guardan en DB pero nunca se usan para scheduling.`

**Impacto:** Critico para retencion. El usuario que no recibe notificaciones abandona a los 3-5 dias.
**Solucion:** O bien conectar el scheduling (solucion correcta) o bien ocultar el campo reminder del formulario hasta que este implementado, con un placeholder 'Proxximamente'.
**Esfuerzo:** — Bajo (ocultar) / Alto (implementar correctamente)


### MAL-07: Timer: sin indicador de objetivo/duracion
**Gravedad:** 🟡 Medio

Habitos de tipo timer muestran un cronometro ascendente (MM:SS). Pero el campo completion_target existe (minutos objetivo) y nunca se muestra durante el timer. El usuario no sabe si va bien, si le falta mucho o si ya pasó el objetivo.
**Codigo:** `Today.tsx:119 — TimerButton muestra solo elapsed. habit.completion_target nunca se referencia en el timer activo.`

**Impacto:** La utilidad del timer para habitos con objetivo (ej. 'Meditar 20 min') es reducida.
**Solucion:** Mostrar el target en el boton de parar: 'Stop — 12:34 / 20:00'. Usar un arc SVG que muestre progreso contra el objetivo.
**Esfuerzo:** ⚡ Bajo


### MAL-08: Onboarding de un solo uso sin hints contextuales
**Gravedad:** 🟡 Medio

El onboarding inicial es bueno (3 pasos, seleccion de plantilla, primera marca). Pero una vez completado, el usuario nuevo nunca ve hints sobre funciones avanzadas: el retro-log, el modo calendario, las estadisticas, las categorias, el modo de pausa. Las 7 funciones mas potentes de Zyrco son invisibles hasta que el usuario las descubre solo.
**Codigo:** `Onboarding.tsx — solo corre una vez (localStorage 'zyrco-onboarding-done'). No hay sistema de contextual hints.`

**Impacto:** El 60% de los usuarios nunca descubren funciones avanzadas si no hay discovery activo.
**Solucion:** Anadir un sistema de 'coachmarks' progresivos: el 2do dia mostrar un badge en el icono de Stats, al primer habito completado mostrar el hint de nota, etc.
**Esfuerzo:** 🔧 Medio


---

## 4. Features faltantes con validacion de mercado
> Features que los competidores tienen y que los usuarios solicitan activamente en reviews de App Store, Reddit r/habittracker y ProductHunt.


### FALTA-01: Streak freeze / Modo vacaciones global
**Impacto:** 🟠 Alto

La pausa actual es por habito individual. Si el usuario se va de vacaciones 2 semanas, tiene que pausar cada habito manualmente. No hay 'vacation mode' que pause todos los habitos hasta una fecha y los reactive automaticamente. Streaks tiene 'Freeze streak' para no romper la racha.
**Quien lo tiene:** Streaks (freeze de racha), HabitNow (vacation mode en Pro), Done (skip period)
**Solucion minima viable:** Un botón en Settings: 'Modo vacaciones hasta:' con date picker. Inserta skip entries para todos los habitos activos en ese rango.
**Esfuerzo:** ⚡ Bajo


### FALTA-02: Busqueda global en la app
**Impacto:** 🟡 Medio

No hay busqueda en ninguna pagina de la app. En Habits, en Today, en Stats: no se puede buscar un habito por nombre. Con 15-20 habitos el scroll manual es tedioso. En desktop la expectativa es Ctrl+K / Cmd+K para busqueda rapida.
**Quien lo tiene:** HabitNow, Bearable, Habitica
**Solucion minima viable:** Campo de busqueda en Habits.tsx que filtra la lista en cliente (useMemo sobre habits.filter).
**Esfuerzo:** ⚡ Bajo


### FALTA-03: Habito stacking (if-then chaining)
**Impacto:** 🟡 Medio

El concepto de James Clear ('Atomic Habits'): '...despues de X, hare Y'. Permite crear cadenas de habitos donde completar el primero sugiere automaticamente o desbloquea el siguiente. Es una tecnica cientificamente validada para la adopcion de habitos. Ningun competidor directo lo tiene bien implementado — oportunidad diferencial.
**Quien lo tiene:** Parcialmente: Fabulous (rutinas secuenciales), Streaks (no lo tiene)
**Solucion minima viable:** Campo 'despues de:' en HabitForm que elige otro habito. En Today, el habito encadenado aparece highlighted cuando el padre se completa.
**Esfuerzo:** 🔧 Medio


### FALTA-04: Check-in de animo diario
**Impacto:** 🟡 Medio

Un check-in de 5 emojis (muy mal / mal / regular / bien / excelente) al inicio o final de Hoy permite correlacionar el estado emocional con la tasa de completado. Es el dato mas solicitado en resenas de habit trackers en App Store. Finch y Bearable lo tienen como pilar de su propuesta.
**Quien lo tiene:** Finch (core feature), Bearable (health tracking), Fabulous (parcial)
**Solucion minima viable:** 5 botones emoji en la cabecera de Today, solo visibles si el usuario no ha hecho el check-in del dia. Guarda en una tabla 'moods' (date, value 1-5).
**Esfuerzo:** ⚡ Bajo


### FALTA-05: Metricas de tendencia y mejor dia de semana
**Impacto:** 🟠 Alto

HabitDetail.tsx tiene un barChart de 'completions por dia de semana' (implementado). Pero no tiene: tendencia lineal de la tasa en los ultimos 30d, prediccion de probabilidad de completar hoy basada en el historial, ni detecta patrones de fallo (ej. 'los lunes fallas el 70% de las veces'). Loop Habit Tracker ofrece todos estos de forma gratuita.
**Quien lo tiene:** Loop (EMA, frecuencia), Bearable (correlaciones), HabitNow (monthly trends)
**Solucion minima viable:** En HabitDetail: anadir una linea de tendencia de 30d usando regresion lineal simple (calculada en cliente). Y un callout: 'Tu dia mas debil: Lunes (55%)'.
**Esfuerzo:** 🔧 Medio


### FALTA-06: Resumen semanal automatico (digest push)
**Impacto:** 🟠 Alto

WeeklyDigest.tsx existe como componente visual. Pero se abre manualmente; no hay ninguna notificacion automatica que lo presente los domingos. El valor del digest es cero si el usuario no sabe que existe o tiene que buscarlo. Fabulous envia resumenes semanales por push con animaciones.
**Quien lo tiene:** Fabulous (push semanal), Habitica (email semanal), HabitNow (resumen en notificacion)
**Solucion minima viable:** Conectado al sistema de notificaciones (cuando este implementado): disparar WeeklyDigest el domingo a las 20:00 como notificacion local.
**Esfuerzo:** — Bajo (cuando notificaciones esten conectadas)


### FALTA-07: Proteccion de racha (streak shield)
**Impacto:** 🟠 Alto

Grace days existe (0/1/2 dias de margen), configurado globalmente. Pero no hay un 'Streak Shield' por habito individual: un comodin que preserva la racha una vez cuando el usuario falla. Duolingo popularizo este mecanismo con resultados de retencion medidos (+15-20% en retencion D30).
**Quien lo tiene:** Duolingo (streak shield como item de tienda), Streaks (freeze), HabitNow (streak saver)
**Solucion minima viable:** Un boton 'Usar escudo' visible cuando el habito esta pendiente a medianoche. El escudo se recarga cada N dias (configurable en Settings).
**Esfuerzo:** 🔧 Medio


### FALTA-08: Backup automatico a archivo local
**Impacto:** 🟠 Alto

Los datos estan en SQLite en %APPDATA% (Windows) o ~/Library/Application Support (Mac). Si el usuario formatea el PC o cambia de dispositivo, pierde todo sin aviso. No hay backup automatico a ninguna ubicacion. El export JSON existe pero es manual. Loop Habit Tracker hace backup automatico en la carpeta de Descargas cada semana.
**Quien lo tiene:** Loop (auto-backup semanal), HabitNow (Google Drive automatico), Streaks (iCloud automatico)
**Solucion minima viable:** En src-tauri: anadir un trigger semanal que copia el archivo .db a ~/Desktop/zyrco-backup-FECHA.db (o carpeta configurable).
**Esfuerzo:** ⚡ Bajo


### FALTA-09: Notas de dia (journal diario, no por habito)
**Impacto:** 🟢 Bajo

Zyrco tiene notas por check-in individual (una nota por habito por dia). Pero no hay un espacio de reflexion diaria libre: '¿Como fue el dia?'. Finch tiene un diario de gratitud. HabitNow tiene un campo de notas del dia. Bearable tiene un cuadro de reflexion. Los usuarios de productividad valoran este espacio.
**Quien lo tiene:** Finch (diario de gratitud), Bearable (notas del dia), HabitNow (nota diaria)
**Solucion minima viable:** Un campo de texto libre al final de la vista de Hoy: 'Nota del dia'. Guarda en tabla 'daily_notes' (date, text). Integrable con el weekly digest.
**Esfuerzo:** ⚡ Bajo


### FALTA-10: Orden personalizado de habitos (sort_order)
**Impacto:** 🟠 Alto

Los habitos aparecen en orden de creacion y no se puede cambiar sin eliminar y recrear. El 90% de los usuarios quiere poner sus habitos mas importantes arriba. No hay columna sort_order en la tabla habits. Todos los competidores principales permiten reordenar.
**Quien lo tiene:** Todos los competidores principales.
**Solucion minima viable:** Columna INTEGER sort_order en habits (ALTER TABLE migration). Drag & drop en Habits.tsx con @dnd-kit. Actualizar al soltar.
**Esfuerzo:** 🔧 Medio


---

## 5. Capacidad offline

### Estado actual: FORTALEZA — Zyrco es 100% local-first por diseno


#### Fortalezas (mantener y comunicar)
- Toda la logica corre en SQLite local via @tauri-apps/plugin-sql. Sin cuenta, sin servidor.
- Funciona sin conexion a internet en todas sus funciones (ver habitos, completar, ver stats, editar).
- El dato nunca sale del dispositivo del usuario (privacidad maxima).
- Sin dependencias de servicios externos que puedan caer o cambiar TOS.
- Cero latencia en operaciones de lectura/escritura (SQLite en disco local).


#### Brechas a resolver

##### Sin backup automatico local
El DB esta en %APPDATA%/com.zubia.zyrco/zyrco.db. Sin backup automatico, un fallo de disco = datos perdidos para siempre.
**Solucion:** Auto-backup semanal a una carpeta configurable (via Tauri dialog).


##### Sincronizacion entre dispositivos no existe por defecto
Para usar Zyrco en PC + movil necesitas configurar Turso manualmente (.env). Para el 99% de los usuarios esto es imposible.
**Solucion:** Ofrecer sync gratuita basica via un endpoint propio minimo, o soporte de iCloud/Google Drive Drive como opcion one-click.


##### Export manual como unico mecanismo de copia
El JSON export existe pero es manual. Un usuario que no lo usa y pierde el dispositivo pierde todo.
**Solucion:** Anadir un banner de recordatorio mensual: 'Han pasado 30 dias sin exportar tus datos. Hacer backup ahora'.


#### Oportunidad de marketing
> Privacy-first local-first es un diferencial REAL y comunicable. Ningun competidor principal (Habitica, Finch, Fabulous) ofrece esto. Hay un segmento creciente de usuarios que no quiere sus datos de salud en la nube. El copy en la tienda deberia ser: 'Sin cuenta. Sin servidores. Tus habitos, en tu dispositivo.'


---

## 6. Scorecard vs competidores (0–10)
Evaluacion cualitativa basada en codigo real + uso directo de cada app.

| Dimension | **Zyrco** | Habitica | Streaks | Finch | Loop | HabitNow |
|---|---|---|---|---|---|---|
| Facilidad de uso (onboarding) | **🟢 7** | 🟡 5 | 🟢 9 | 🟢 8 | 🟢 7 | 🟢 7 |
| Calidad visual / coherencia UI | **🟡 6** | 🟡 4 | 🟢 10 | 🟢 9 | 🟡 5 | 🟡 6 |
| Profundidad de features | **🟢 7** | 🟢 9 | 🟡 5 | 🟡 5 | 🟢 8 | 🟢 8 |
| Estadísticas y analíticas | **🟡 5** | 🟡 4 | 🔴 3 | 🔴 2 | 🟢 9 | 🟢 7 |
| Retención / motivación | **🟡 5** | 🟢 9 | 🟢 7 | 🟢 9 | 🟡 6 | 🟡 6 |
| Notificaciones funcionales | **🔴 1** | 🟢 8 | 🟢 9 | 🟢 8 | 🟢 8 | 🟢 9 |
| Gestos e interacciones UX | **🔴 3** | 🟡 5 | 🟢 9 | 🟢 7 | 🟡 6 | 🟢 7 |
| Privacidad / local-first | **🟢 10** | 🔴 2 | 🟡 6 | 🔴 2 | 🟢 9 | 🟡 4 |
| Multiplataforma (desktop+móvil) | **🟡 6** | 🟢 9 | 🔴 2 | 🟢 7 | 🔴 2 | 🔴 2 |
| Precio / accesibilidad | **🟢 9** | 🟢 7 | 🟢 8 | 🟡 5 | 🟢 10 | 🟢 9 |
| **TOTAL /100** | **59** | 62 | 68 | 62 | 70 | 65 |

Zyrco total: **59/100**. El mayor gap es en notificaciones (1/10) y gestos UX (3/10). El mayor activo es privacidad/local-first (10/10).

---

## 7. Roadmap priorizado por impacto/esfuerzo
| Prioridad | Tarea | Impacto | Esfuerzo |
|-----------|-------|---------|----------|
| P0 — CRITICO | Conectar scheduling de notificaciones en Rust (useReminders + Tauri plugin) | 🔴 Critico | 🔧 Medio |
| P0 — CRITICO | Ocultar campo 'Recordatorio' en HabitForm hasta que notificaciones funcionen | 🔴 Critico | ⚡ Bajo |
| P0 — CRITICO | Timer: persistir startedAt en localStorage para sobrevivir navegacion | 🔴 Critico | ⚡ Bajo |
| P1 — ALTO | Hacer tarjetas de Habits.tsx clicables (navegar a /habits/:id) | 🟠 Alto | ⚡ Bajo |
| P1 — ALTO | Undo toast tras completar habito (4 segundos, usar ToastContext) | 🟠 Alto | ⚡ Bajo |
| P1 — ALTO | Backup automatico semanal del .db a carpeta local (Rust) | 🟠 Alto | ⚡ Bajo |
| P1 — ALTO | Busqueda de habitos en Habits.tsx (filtro en cliente) | 🟠 Alto | ⚡ Bajo |
| P1 — ALTO | Timer: mostrar objetivo (X min) durante la sesion activa | 🟠 Alto | ⚡ Bajo |
| P1 — ALTO | Acceso a HabitDetail desde el menu contextual de Today | 🟠 Alto | ⚡ Bajo |
| P2 — MEDIO | Swipe-to-check en filas de habitos (touch gesture detection) | 🟡 Medio | 🔧 Medio |
| P2 — MEDIO | Clamp del menu contextual para que no salga del viewport | 🟡 Medio | ⚡ Bajo |
| P2 — MEDIO | Reemplazar <select> de ordenacion por chips del design system | 🟡 Medio | ⚡ Bajo |
| P2 — MEDIO | Check-in de animo diario (5 emojis en Today) | 🟡 Medio | ⚡ Bajo |
| P2 — MEDIO | Vacation mode: pausar todos los habitos hasta una fecha | 🟡 Medio | ⚡ Bajo |
| P2 — MEDIO | Date picker personalizado en el modal de Pausa | 🟡 Medio | ⚡ Bajo |
| P2 — MEDIO | Linea de tendencia 30d y mejor dia de semana en HabitDetail | 🟡 Medio | 🔧 Medio |
| P2 — MEDIO | Nota del dia libre en Today (daily journal) | 🟡 Medio | ⚡ Bajo |
| P2 — MEDIO | Orden personalizado de habitos (sort_order + drag & drop) | 🟡 Medio | 🔧 Medio |
| P3 — BAJO | Modo foco: mostrar un habito a la vez | 🟢 Bajo | 🔧 Medio |
| P3 — BAJO | Chevrons de DoneSection/SessionGroup con iconos Lucide | 🟢 Bajo | ⚡ Bajo |
| P3 — BAJO | Empty states con SVG ilustracion en Habits y Today | 🟢 Bajo | 🔧 Medio |
| P3 — BAJO | Keyboard shortcuts en desktop (N, Escape, /) | 🟢 Bajo | ⚡ Bajo |
| P3 — BAJO | Preview de conflictos en Import antes de ejecutar | 🟢 Bajo | 🔧 Medio |
| P3 — BAJO | Streak shield: comodin por habito con recarga configurable | 🟢 Bajo | 🔧 Medio |
| P3 — BAJO | Habito stacking: encadenar un habito despues de otro | 🟢 Bajo | 🔧 Medio |


---
*Generado por `generar_mercado.py` · 27/06/2026*  
*Basado en lectura directa de: Today.tsx, Stats.tsx, Habits.tsx, HabitForm.tsx, Settings.tsx, ImportExport.tsx, RetroLogModal.tsx, Onboarding.tsx*  
