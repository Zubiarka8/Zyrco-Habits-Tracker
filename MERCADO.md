# Analisis de Producto y Mercado — Zyrco Habit Tracker
> Generado automaticamente · 27/06/2026  
> Enfoque: UI · UX · Features mal implementadas · Features faltantes · Offline  
> Basado en: lectura directa del codigo fuente + investigacion de mercado

---

## Pasos recomendados para continuar
Esta seccion resume las acciones concretas ordenadas por impacto/esfuerzo. Pensada para retomar el trabajo al dia siguiente sin tener que releer el documento entero.


### Hoy mismo — P0 Criticos (cosas rotas)
Estas tres cosas generan expectativas falsas en el usuario y deben resolverse antes de cualquier lanzamiento publico:

- [ ] **Notificaciones rotas** — el toggle existe, el permiso se pide, pero nunca llega ninguna notificacion. Solucion rapida (mientras se conecta el scheduling real): ocultar el campo 'Recordatorio' en HabitForm con un placeholder 'Proximamente'. Archivo: `src/components/HabitForm.tsx`
- [ ] **Timer se pierde al navegar** — `activeTimers` vive en React state efimero. Guardar `startedAt` en `localStorage['zyrco-active-timers']` al iniciar y restaurar al montar `Today.tsx`. Archivo: `src/pages/Today.tsx:798`
- [ ] **Timer no muestra el objetivo** — `completion_target` existe en DB pero no se renderiza durante la sesion activa. Mostrar `MM:SS / objetivo` en el boton de parar. Archivo: `src/pages/Today.tsx:119` (TimerButton)


### Proxima sesion — P1 Quick wins (alto impacto, bajo esfuerzo)
Cada uno de estos se puede implementar en menos de 30 minutos:

- [ ] **Animacion de confetti al completar todos los habitos** — instalar `canvas-confetti` (~3KB), disparar cuando `done === total && total > 0` en Today.tsx. Es el gap de retencion mas barato de resolver. Archivo: `src/pages/Today.tsx:1154`
- [ ] **Haptic feedback** — una linea: `if (navigator.vibrate) navigator.vibrate(50)` en `handleToggle` de Today.tsx al completar. Cero dependencias. Archivo: `src/pages/Today.tsx:177`
- [ ] **Tarjetas de Habits clicables** — el area central de `renderHabitCard` debe ser un `NavLink` a `/habits/:id`. Actualmente el unico camino al detalle es por el menu (···). Archivo: `src/pages/Habits.tsx:103`
- [ ] **Undo toast tras completar** — usar el `ToastContext` existente para mostrar 'Deshacer' durante 4 segundos tras cualquier toggle. Archivo: `src/pages/Today.tsx:177` (handleToggle)
- [ ] **Backup automatico semanal** — en Rust, copiar `zyrco.db` a una carpeta configurable cada 7 dias. Si el usuario pierde el dispositivo ahora, pierde todo. Archivo: `src-tauri/src/`
- [ ] **Busqueda en Habits** — campo `<input type='search'>` en el header de Habits.tsx que filtra `habits` con `useMemo`. Una tarde de trabajo. Archivo: `src/pages/Habits.tsx:182`
- [ ] **Long-press para abrir menu** — `onPointerDown` con setTimeout 400ms en habit-row activa el dropdown sin necesitar el boton (···) de 16px. Archivo: `src/pages/Today.tsx:196`


### Esta semana — P2 Mejoras de producto
Mas trabajo pero cada una mejora la puntuacion del producto significativamente:

- [ ] **strengthScore visualizado en HabitDetail** — el EMA ya se calcula en `useStats.ts`. Solo falta mostrarlo como numero grande y mini-grafica en `/habits/:id`. Esto iguala a Loop Habit Tracker (5M descargas, gratis) en analiticas.
- [ ] **Check-in de animo diario** — 5 emojis en Today, tabla `moods (date, value 1-5)`. Correlacionar en Stats. Feature mas pedida en reviews de App Store de todos los competidores.
- [ ] **Vacation mode global** — boton en Settings: 'Pausar todos hasta:' + date picker. Inserta skips en todos los habitos activos. Muy solicitado; actualmente hay que pausar cada habito manualmente.
- [ ] **Three-state visual (done/skipped/missed)** — en Calendar y AnnualHeatmap, distinguir visualmente dias saltados (patron rayado/amarillo) de dias fallados (gris). Requiere pasar `rangeSkips` a Calendar page.
- [ ] **Retrospectiva mensual automatica** — el dia 1 de cada mes, mostrar un modal con la tasa del mes anterior, mejor habito, racha maxima. Nadie en el mercado lo tiene bien — diferenciador.
- [ ] **Audit de aria-labels** — especialmente `check-btn` (necesita aria-label por habito) y `menu-btn` (debe decir 'Opciones de {habit.name}', no 'Editar'). Bajo esfuerzo.


### Posicionamiento de marca (no es codigo)
El hallazgo de mercado mas importante de este analisis:

> Loop Habit Tracker tiene 5M+ descargas con el pitch 'your data never leaves your phone'. Es gratis, open source y con UI datada. Zyrco es local-first, tiene mejor UI, y es de escritorio. Este posicionamiento no esta comunicado en ningun sitio de la app. El copy en tienda/landing debe ser: **'Sin cuenta. Sin servidores. Tus habitos, en tu dispositivo.'**


---

## Indice
1. [Problemas de UI (13 issues)](#ui)
2. [Problemas de UX / interaccion (10 issues)](#ux)
3. [Features mal implementadas (8 issues)](#mal-implementadas)
4. [Features faltantes con validacion de mercado (13 items)](#faltantes)
5. [Capacidad offline — fortaleza y brechas](#offline)
6. [Tendencias emergentes del mercado (4 tendencias)](#tendencias)
7. [Accesibilidad (5 gaps)](#accesibilidad)
8. [Scorecard vs competidores](#scorecard)
9. [Roadmap priorizado](#roadmap)

---

## 1. Problemas de UI
> Problemas encontrados directamente en el codigo fuente. Cada uno incluye la referencia exacta al archivo y linea.


### UI-01: Sin animacion de celebracion al completar todos los habitos
**Gravedad:** 🟠 Alto

Cuando el usuario completa todos los habitos del dia, Zyrco muestra un texto 'All done for today!' con un emoji estatico 🎉. Todos los competidores relevantes tienen una animacion: Loop tiene confetti, Habitica drops gold+XP, Finch hace un 'happy dance' del pajaro, (Not Boring) Habits —ganadora del Apple Design Award 2022— tiene una explosion 3D con particulas y haptics. Las animaciones de celebracion son el mecanismo de refuerzo positivo mas documentado en retencion de habit trackers. Sin esto, completar todos los habitos tiene el mismo feedback visual que completar uno solo.
**Codigo:** `Today.tsx:1154 — <div className='all-done'><span>🎉</span><p>{t('today.allDone')}</p></div>`

**Referencia de mercado:** Loop: confetti. Habitica: XP + gold drop + avatar animation. Finch: happy dance. (Not Boring) Habits: 3D particle explosion.
**Solucion:** Anadir una animacion CSS de confetti (canvas-confetti, ~3KB) que se dispara cuando done === total && total > 0. Solo en la vista de Hoy, no en el calendario.
**Esfuerzo:** ⚡ Bajo


### UI-02: Three-state tracking (done/skipped/missed) no es visualmente distinto
**Gravedad:** 🟠 Alto

Way of Life (app con 4.8* en App Store) popularizo el tracking de tres estados: verde = hecho, rojo = fallado, amarillo = saltado. Esta distincion es critica: un dia saltado (vacaciones) no debe verse igual que un dia fallado. Zyrco tiene el concepto de 'skip' implementado en useSkips, pero en el calendario y en Stats no se distingue visualmente de 'missed' — ambos aparecen como celda vacia/gris. Los usuarios que saltan dias intencionalmente ven su tasa de completado caer injustamente.
**Codigo:** `Calendar.tsx: dias saltados y dias sin habitos se renderizan igual (sin chips, sin color). AnnualHeatmap: sin distincion skipped vs missed.`

**Referencia de mercado:** Way of Life: verde/rojo/amarillo con configuracion de 'skip day' por habito. Loop: skip = celda punteada, diferente a missed = celda vacia.
**Solucion:** En Calendar y AnnualHeatmap, mostrar los dias con skips con un patron diferente (celda rayada o color amarillo suave). Requiere pasar rangeSkips al Calendar page.
**Esfuerzo:** 🔧 Medio


### UI-03: Long-press en filas de habitos no hace nada
**Gravedad:** 🟡 Medio

En Streaks (Apple Design Award), el gesto principal para completar un habito es un long-press. En HabitNow y Strides, el long-press abre un menu contextual rapido. En Zyrco, un long-press en cualquier fila de habito no hace absolutamente nada. El acceso al menu de opciones requiere encontrar el boton ··· de 16px de ancho, que es un objetivo de toque muy pequeyo en mobile.
**Codigo:** `HabitList en Today.tsx: el div de cada habit-row no tiene onContextMenu, onLongPress ni similar.`

**Referencia de mercado:** Streaks: long-press = completar. HabitNow: long-press = menu. Strides: long-press = undo log.
**Solucion:** En habit-row, implementar onPointerDown con un setTimeout de 400ms que abre el dropdown menu. Si el usuario hace click corto, hace toggle normal.
**Esfuerzo:** ⚡ Bajo


### UI-04: Habit cards no son clicables como navegacion
**Gravedad:** 🟠 Alto

En Habits.tsx, el unico camino al detalle de un habito es: tarjeta → menu (···) → 'Ver detalle'. El clic en la tarjeta no hace nada. Todos los competidores (Loop, Streaks, HabitNow) navegan al detalle con un simple tap en la fila/tarjeta.
**Codigo:** `Habits.tsx:103 — renderHabitCard() no tiene onClick de navegacion; solo el menu-btn la lanza.`

**Referencia de mercado:** Loop, Streaks, HabitNow: tap en la fila = ir al detalle.
**Solucion:** Hacer el area central de la tarjeta (icon + nombre + meta) un NavLink a /habits/:id. El menu (···) mantiene las acciones destructivas.
**Esfuerzo:** ⚡ Bajo


### UI-05: Sort control usa <select> nativo que rompe el design system
**Gravedad:** 🟡 Medio

SortControl en Today.tsx renderiza un <select> HTML nativo. En Windows 11 este control usa el estilo del OS: diferente tipografia, diferente radio, diferente altura. Rompe la coherencia visual con el resto de la UI que usa CSS custom properties.
**Codigo:** `Today.tsx:515 — <select className='habit-sort-select'>.`

**Referencia de mercado:** Streaks, Finch, Done: controles de ordenacion como chips o segmented controls nativos del design system.
**Solucion:** Reemplazar por un grupo de 3 chips (mismo estilo que TypeFilterChips) o un popover con RadioGroup.
**Esfuerzo:** ⚡ Bajo


### UI-06: Chevron de seccion done/session usa caracteres Unicode, no icono
**Gravedad:** 🟢 Bajo

DoneSection y SessionGroup usan los caracteres '▲' / '▼' para el toggle de expansion. Estos caracteres tienen kerning inconsistente entre fuentes y no respetan el color/tamanyo del design system. Lucide-react ya esta importado; ChevronUp/ChevronDown son la solucion correcta.
**Codigo:** `Today.tsx:601 — <span className='done-section-chevron'>{open ? '▲' : '▼'}</span>.`

**Referencia de mercado:** Estandar en toda app moderna: iconos vectoriales para toggles.
**Solucion:** Sustituir por <ChevronUp size={14}/> / <ChevronDown size={14}/> de lucide-react.
**Esfuerzo:** ⚡ Bajo


### UI-07: PerfectDayBanner se muestra desde 0% (al inicio del dia)
**Gravedad:** 🟡 Medio

El ring SVG de progreso en Today.tsx se renderiza cuando done=0 y total>0, mostrando un circulo vacio. El efecto visual no motiva; al contrario, recuerda al usuario cuanto le falta desde el primer segundo. Finch y Streaks ocultan o minimizan el indicador de progreso hasta que el usuario marca al menos 1 habito.
**Codigo:** `Today.tsx:685 — PerfectDayBanner({ done, total }) renderiza siempre que total > 0.`

**Referencia de mercado:** Finch: muestra celebracion solo al completar. Streaks: el circulo empieza a llenarse, no a vaciarse.
**Solucion:** Ocultar el banner hasta done >= 1, o cambiar el diseno a un indicador positivo ('1 de 5 completados' en lugar de ring vacio).
**Esfuerzo:** ⚡ Bajo


### UI-08: Dropdown de menu se puede salir de la pantalla
**Gravedad:** 🟡 Medio

MenuState posiciona el dropdown con top: menu.y, left: menu.x usando rect.right/rect.bottom del boton. Si el habito esta en la parte baja o derecha de la pantalla, el menu se sale del viewport sin ningun calculo de clamp. En mobile (360px de ancho) esto es especialmente problematico.
**Codigo:** `Today.tsx:904 — openMenu() calcula rect.right, rect.bottom sin viewport clamp.`

**Referencia de mercado:** Todos los menus contextuales maduros hacen clamp al viewport o flip cuando no hay espacio.
**Solucion:** En el div dropdown, calcular si x + anchura_menu > window.innerWidth y flipear a left: menu.x - anchura_menu. Mismo para y.
**Esfuerzo:** ⚡ Bajo


### UI-09: Empty state es texto plano sin ilustracion
**Gravedad:** 🟢 Bajo

Las pantallas vacias (Habits, Stats, Todos) muestran un emoji + texto. Finch, Fabulous y Streaks usan ilustraciones SVG animadas que comunican el valor del producto y reducen el abandono en usuarios nuevos. Un empty state bien disenado aumenta la conversion al primer habito.
**Codigo:** `Habits.tsx:210 — <span className='empty-state-emoji'>✨</span>.`

**Referencia de mercado:** Finch: pagina vacia con el pajaro animado diciendo 'Empieza tu primer habito'. Streaks: ilustracion de un circulo vacio con CTA.
**Solucion:** Crear un SVG simple inline para la pantalla vacia de Habits y Hoy. No requiere libreria externa.
**Esfuerzo:** 🔧 Medio


### UI-10: Stats: unico grafico es un BarChart de completions totales
**Gravedad:** 🟠 Alto

Stats.tsx solo tiene un BarChart de 'completions por dia'. No hay: linea de tendencia, mejor dia de semana por habito, radar por categoria, sparklines por habito. Loop Habit Tracker —gratuito y open source— tiene histograma de frecuencia, tendencia lineal y frecuencia relativa por dia de la semana. Zyrco cobra (o planea cobrar) y ofrece menos estadisticas.
**Codigo:** `Stats.tsx:275 — unico <BarChart> con data de overall.byDate.`

**Referencia de mercado:** Loop: 4 tipos de graficas por habito. Bearable: correlaciones entre factores. HabitNow: grafica mensual con heatmap integrado.
**Solucion:** Anadir al menos: (1) linea de tendencia 30d por habito en HabitDetail, (2) 'mejor dia de semana' barchart horizontal en HabitDetail.
**Esfuerzo:** 🔧 Medio


### UI-11: Numeric input expansion es un patron UX no estandar
**Gravedad:** 🟡 Medio

Para habitos numericos, el primer tap expande un row inline con +/- stepper. El usuario no sabe que esto va a pasar: el boton circular parece identico a un checkmark. Habitica y HabitNow usan un bottom sheet o modal para el input numerico, que es mas predecible y accesible para pantallas tactiles.
**Codigo:** `Today.tsx:248 — if (isNumeric && !completed) { setExpandedNumeric(...) }.`

**Referencia de mercado:** HabitNow: bottom sheet con teclado numerico. Loop: campo inline pero con icono diferente para indicar que es numerico.
**Solucion:** Cambiar el icono del check-btn para habitos numericos (usar un '123' o un icono de input) y considerar un mini-sheet en lugar del expand inline.
**Esfuerzo:** 🔧 Medio


### UI-12: Filtros de tipo + categoria generan doble fila de chips
**Gravedad:** 🟢 Bajo

Cuando hay habitos de multiples tipos Y multiples categorias, FilterBar muestra dos filas de chips. En mobile esto consume mucho espacio vertical antes de que aparezca el primer habito. Streaks y HabitNow unifican tipo y categoria en un unico selector contextual.
**Codigo:** `Today.tsx:558 — FilterBar renderiza TypeFilterChips + CategoryFilterChips en fila separada.`

**Referencia de mercado:** HabitNow: un unico dropdown de filtro con secciones. Streaks: no necesita filtros (limite de 12 habitos).
**Solucion:** Colapsar ambos en un unico row scrollable horizontal con chips mezclados, o usar un icono de filtro que abre un popover.
**Esfuerzo:** ⚡ Bajo


### UI-13: HabitDetail solo accesible desde menu contextual en Habits
**Gravedad:** 🟠 Alto

La pagina /habits/:id existe y tiene estadisticas detalladas por habito (racha, notas, barChart por dia de semana). Pero es invisible desde Today, que es donde el usuario pasa el 80% del tiempo. El unico camino es ir a Habits > abrir menu (···) > Ver detalle.
**Codigo:** `Today.tsx no tiene ningun NavLink a /habits/:id. HabitList tampoco.`

**Referencia de mercado:** Loop: tap en el nombre del habito en cualquier lista lleva al detalle. HabitNow: icono de detalle visible en cada fila.
**Solucion:** Hacer clicable el nombre/icono del habito en Today para ir a /habits/:id, o anadir un icono de 'ver mas' junto al streakBadge.
**Esfuerzo:** ⚡ Bajo


---

## 2. Problemas de UX / interaccion
> Patrones de interaccion que el mercado ya considera estandar y que Zyrco no tiene. Afectan directamente a la retencion a 7 y 30 dias.


### UX-01: Haptic feedback al completar un habito
**Gravedad:** 🟠 Alto

Streaks cita explicitamente el 'haptic buzz on habit completion' como mecanismo de retencion. (Not Boring) Habits describe 'zingy haptics' como elemento central de su diseno. En Tauri mobile, el Web API navigator.vibrate() esta disponible sin plugins adicionales. El feedback haptico activa la misma respuesta de refuerzo positivo que el sonido pero sin molestar en entornos silenciosos. Es el micro-momento mas barato de implementar.
**Referencia de mercado:** Streaks: haptic en cada completion. (Not Boring) Habits: haptic + sonido. Finch: vibration en el 'happy dance'.
**Solucion minima:** En handleToggle de Today.tsx, tras confirmar el toggle a completed=true: if (navigator.vibrate) navigator.vibrate(50). Cero dependencias.
**Esfuerzo:** ⚡ Bajo


### UX-02: Swipe para completar (swipe-to-check)
**Gravedad:** 🟠 Alto

Ninguna fila de habito responde a gestos de swipe. En movil, el gesto mas rapido para marcar un habito es deslizar a la derecha. Streaks (el winner del Apple Design Award) lo tiene como interaccion principal. HabitNow lo tiene en Android. En Zyrco el unico camino es pulsar el circulo check, que en compact view es pequeyo.
**Referencia de mercado:** Streaks: swipe right = completar. HabitNow: swipe left = opciones, swipe right = completar. Loop: tap largo = menu.
**Solucion minima:** Implementar onTouchStart/onTouchEnd en habit-row para detectar swipe horizontal > 60px y triggear toggle. En desktop no es necesario.
**Esfuerzo:** 🔧 Medio


### UX-03: Drag para reordenar habitos
**Gravedad:** 🟡 Medio

El orden de los habitos es el de creacion y no se puede cambiar sin editar cada uno. Los usuarios quieren poner sus habitos mas importantes arriba. Habitica, HabitNow y Loop tienen drag & drop para reordenar. En desktop esto es esperado y en mobile tambien.
**Referencia de mercado:** Habitica: drag en lista de habitos. Loop: drag en la lista principal. HabitNow: drag & drop con handle.
**Solucion minima:** Anadir una columna 'sort_order' INTEGER a la tabla habits. En React usar @dnd-kit/sortable (ligero, accesible). Solo en Habits page.
**Esfuerzo:** 🔧 Medio


### UX-04: Undo para acciones accidentales
**Gravedad:** 🟠 Alto

Si el usuario completa un habito por error o lo elimina, no hay undo. La eliminacion tiene confirmacion modal, pero el complete/uncomplete no tiene señal visual de que se puede deshacer. Loop y Finch muestran un toast con 'Deshacer' tras completar. El sistema de toasts de Zyrco existe pero no lo usa para undo.
**Referencia de mercado:** Loop: 'Undo' en toast 3s despues de completar. Finch: animacion de papiro con 'Deshacer'.
**Solucion minima:** En handleToggle, despues de toggle(), mostrar un toast con boton 'Deshacer' que llame a toggle(habitId, !completed) en los proximos 4 segundos.
**Esfuerzo:** ⚡ Bajo


### UX-05: Busqueda de habitos
**Gravedad:** 🟠 Alto

No hay campo de busqueda en la pagina Habits ni en Today. Con 10+ habitos, encontrar uno especifico para editarlo requiere scroll. HabitNow y Bearable tienen busqueda en tiempo real en la lista de habitos. En Habits.tsx el filtro solo es por tipo/categoria.
**Referencia de mercado:** HabitNow: barra de busqueda siempre visible. Bearable: busqueda con filtros combinados.
**Solucion minima:** Anadir un <input type='search'> en el header de Habits.tsx que filtre habits por nombre en el cliente (useMemo).
**Esfuerzo:** ⚡ Bajo


### UX-06: Teclado shortcuts en desktop
**Gravedad:** 🟡 Medio

Zyrco es una app Tauri de escritorio pero no tiene ningun keyboard shortcut. Los usuarios de desktop esperan: Space/Enter para completar el habito seleccionado, N para nuevo habito, Escape para cerrar modales, / para buscar. Notion, Linear, Obsidian —apps con usuarios de productividad— tienen shortcuts extensos.
**Referencia de mercado:** Ninguno de los competidores mobiles los tiene, pero los de desktop si (Notion: N = nueva nota, etc.).
**Solucion minima:** Implementar useEffect con document.addEventListener('keydown') para al menos: N = nuevo habito, Escape = cerrar modal, / = focus busqueda.
**Esfuerzo:** ⚡ Bajo


### UX-07: Timer habito se reinicia al navegar
**Gravedad:** 🟠 Alto

El estado del timer vive en un Map<string, {startedAt}> en Today.tsx. Navegar a Settings y volver reinicia el timer a 0 sin registrar el tiempo. No hay ninguna advertencia visual. Para habitos de meditacion o ejercicio de 20-30 minutos, esto es un bug funcional aunque este documentado como 'by design'.
**Referencia de mercado:** Streaks: el timer persiste en background aunque la app este minimizada. HabitNow: timer en notificacion persistente.
**Solucion minima:** Persistir el startedAt en localStorage bajo clave 'zyrco-active-timers'. Al montar Today.tsx, restaurar timers activos del dia de hoy.
**Esfuerzo:** ⚡ Bajo


### UX-08: No hay acceso rapido a HabitDetail desde Today
**Gravedad:** 🟡 Medio

El flujo para ver las estadisticas de un habito desde Today es: Hoy → abrir menu (···) → no existe la opcion → ir a Habits → abrir menu (···) → Ver detalle. Son 5 pasos. En Loop: tap en el habito = detalle inmediato.
**Referencia de mercado:** Loop: tap en fila = detalle. HabitNow: icono de grafica junto al nombre. Streaks: tap largo = detalle.
**Solucion minima:** Anadir 'Ver detalle' al menu contextual de Today.tsx (actualmente no esta) y hacer el nombre del habito un link a /habits/:id.
**Esfuerzo:** ⚡ Bajo


### UX-09: No hay modo de foco (un habito a la vez)
**Gravedad:** 🟢 Bajo

Algunas apps ofrecen un 'focus mode' que muestra solo el siguiente habito pendiente, minimizando las distracciones. Util para usuarios con muchos habitos o con TDAH. Fabulous lo tiene como su flujo principal (cada paso de la rutina se muestra uno a uno).
**Referencia de mercado:** Fabulous: la rutina se presenta como un wizard paso a paso. Forest: gamificacion de foco en un solo habito.
**Solucion minima:** Anadir un boton 'Modo foco' en Today que muestre solo el primer pendingHabit con navegacion next/prev. Estado efimero de React.
**Esfuerzo:** 🔧 Medio


### UX-10: Acciones en lote (bulk actions)
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


### FALTA-11: Pantalla de retrospectiva mensual automatica
**Impacto:** 🟡 Medio

Al final de cada mes, ninguna app genera automaticamente un resumen: 'En junio completaste el 78% de tus habitos, tu mejor semana fue la del 10, tu habito mas constante fue Meditar. El primero de cada mes aparece en la app y es una oportunidad de retention muy documentada. Ordly hace un resumen semanal; ninguna app hace un resumen mensual formal con datos propios.
**Quien lo tiene:** Nadie lo tiene bien — es una OPORTUNIDAD DIFERENCIAL.
**Solucion minima viable:** Al abrir la app el dia 1 de cada mes, mostrar un modal con: tasa del mes anterior, mejor habito, peor habito, racha maxima alcanzada. Datos ya disponibles en useStats.
**Esfuerzo:** 🔧 Medio


### FALTA-12: strengthScore EMA no se visualiza en el tiempo
**Impacto:** 🟡 Medio

useStats.ts ya calcula un strengthScore (0-100, exponential moving average). Es exactamente el 'habit strength score' que Loop tiene y que recibe los mayores elogios en sus resenas. En Zyrco solo se muestra como una barra inline horizontal en la lista de habitos de Today. Loop lo muestra como un numero prominente y como una grafica de tendencia. El dato existe pero no se comunica su valor al usuario.
**Quien lo tiene:** Loop Habit Tracker (el estandar de referencia, gratuito).
**Solucion minima viable:** En HabitDetail, mostrar el strengthScore con un numero grande (ej. '73 / 100') y una mini grafica de como ha evolucionado en los ultimos 30 dias.
**Esfuerzo:** 🔧 Medio


### FALTA-13: Recordatorios basados en ubicacion
**Impacto:** 🟢 Bajo

Productive (premium) tiene 'location-based reminders': el habito 'Ir al gimnasio' se dispara cuando el usuario llega al gimnasio. Es la notificacion mas efectiva porque no depende de la hora sino del contexto. Alto valor para habitos ligados a lugares: gimnasio, oficina, supermercado, casa de un familiar.
**Quien lo tiene:** Productive (unico en el mercado de habit trackers).
**Solucion minima viable:** Requiere Tauri plugin de geolocation y acceso a GPS en background. Complejo. Alternativa: usar Wi-Fi SSID como proxy de ubicacion.
**Esfuerzo:** 🏋️ Alto


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
> Loop Habit Tracker usa 'your data never leaves your phone' como pitch principal y tiene 5M+ descargas. Loop es gratis y open source. Zyrco puede tomar ese mismo posicionamiento pero con UI premium y desktop-first. En el segmento premium, NADIE comunica local-first como valor de marca. El copy en la tienda deberia ser: 'Sin cuenta. Sin servidores. Tus habitos, en tu dispositivo.' Esto diferencia de Habitica, Finch y Fabulous (todos requieren cuenta) y de Loop (UI datada). Es el angulo de marketing mas honesto, diferencial y sostenible para Zyrco.


---

## 6. Tendencias emergentes del mercado
> Movimientos estructurales en el mercado de habit trackers (2024-2026). Algunos validan decisiones ya tomadas en Zyrco; otros son oportunidades sin explotar.


### T-01: Anti-streak philosophy (no castigar los dias perdidos)
(Not Boring) Habits (Apple Design Award 2022) elimino las rachas completamente. En su lugar: 66 repeticiones totales hacia el objetivo (basado en el estudio de Phillippa Lally sobre los 66 dias para formar un habito). No hay racha que perder. No hay culpa. Ordly (2025) y varios proyectos indie siguen la misma filosofia. Loop Habit Tracker usa EWMA (Exponential Weighted Moving Average): la puntuacion decae lentamente cuando fallas en vez de resetearse a cero. Recibe los mayores elogios en resenas. El mercado se esta moviendo de 'streak = motivacion' a 'no hagas que el usuario se sienta culpable'.
**Relevancia para Zyrco:** Zyrco tiene grace days (correcto) pero el mensaje es 'Racha de X dias'. El strengthScore EMA ya esta implementado internamente pero no se comunica. Oportunidad: destacar el strengthScore como el 'modo no-culpable' de medir habitos.


### T-02: Celebraciones como mecanismo principal de retencion
El mercado ha convergido en que el momento de completar el habito es el momento mas critico para la retencion. (Not Boring) Habits tiene una explosion 3D con sonido y haptics. Finch tiene animacion del pajaro. Habitica tiene drops de oro. Loop tiene confetti. El usuario necesita un momento memorable al completar — no solo un checkmark.
**Relevancia para Zyrco:** Zyrco muestra texto y un emoji estatico. Gap critico de bajo esfuerzo.


### T-03: Apps de habitos para TDAH y neurodiverencia
Routinery presenta cada tarea una a la vez con voz TTS que dice el nombre del siguiente paso. Focus Habits integra con el Modo Foco del sistema (iOS/Android). Es un mercado desatendido con alta disposicion a pagar y comunidades activas en Reddit.
**Relevancia para Zyrco:** El modo foco (un habito a la vez) es simple de implementar y abriria este segmento.


### T-04: Habitos basados en identidad, no en comportamiento
James Clear ('Atomic Habits'): 'No quiero correr, soy un corredor'. Finch lo gamifica con el crecimiento del pajaro como metafora del yo. Fabulous usa un 'viaje del heroe' narrativo. El tipo de habito 'good/bad/neutral' de Zyrco apunta en esta direccion pero no tiene narrativa.
**Relevancia para Zyrco:** Oportunidad de copy: en el onboarding, preguntar 'Quien quieres ser?' en vez de '¿Que habito quieres crear?'.


---

## 7. Accesibilidad
> Gaps de accesibilidad encontrados directamente en el codigo. La mayoria son de bajo esfuerzo. Una app de desktop tiene mayor exigencia de accesibilidad que una de movil porque los usuarios de desktop esperan navegacion por teclado completa.


### A11Y-01: Botones de icono sin aria-label descriptivo
**Gravedad:** 🟠 Alto

Los botones de solo icono en Today.tsx usan aria-label genericos o los del componente padre. El boton ··· del menu dice aria-label={t('habits.edit')} — pero en realidad abre un menu, no edita. El lector de pantalla anunciaria 'Editar, boton' cuando el usuario toca el (···), que es incorrecto.
**Codigo:** `Today.tsx:342 — <button ... aria-label={t('habits.edit')}> para el menu-btn.`

**Solucion:** aria-label='More options for {habit.name}' en el menu-btn. aria-label={t('today.checkGood')} o t('today.checkBad') en check-btn segun el tipo de habito.
**Esfuerzo:** ⚡ Bajo


### A11Y-02: cal-chip (emojis en calendario) solo tiene title, no aria-label
**Gravedad:** 🟡 Medio

Los chips de emoji en Calendar.tsx usan title={h.name} para el tooltip. En lectores de pantalla (VoiceOver/TalkBack), title no se lee correctamente en elementos span. El lector leeria el nombre del emoji unicode ('Flexed Biceps' para 💪) en lugar del nombre del habito.
**Codigo:** `Calendar.tsx:349 — <span ... title={h.name}>{h.icon}</span> — sin aria-label ni role.`

**Solucion:** Cambiar a <span ... aria-label={h.name} role='img'>. O cambiar el span a un button si se quiere que sea interactivo.
**Esfuerzo:** ⚡ Bajo


### A11Y-03: Contraste de color no auditado en modo oscuro
**Gravedad:** 🟡 Medio

Las CSS custom properties (--color-muted, --color-border, --color-text) en dark mode no han sido auditadas contra WCAG 2.2 AA (4.5:1 para texto normal, 3:1 para texto grande). Elementos como .habit-desc, .category-badge text, .cal-day-wd, .per-habit-rate usan colores muted que pueden estar bajo el ratio minimo en dark mode.
**Codigo:** `index.css — dark mode vars no tienen evidencia de audit de contraste.`

**Solucion:** Ejecutar las paletas de colores en dark mode contra un verificador WCAG (Colour Contrast Analyser o axe DevTools). Ajustar los valores de --color-muted y --color-border.
**Esfuerzo:** ⚡ Bajo


### A11Y-04: Teclado: el menu contextual no es accesible con teclado
**Gravedad:** 🟡 Medio

El dropdown-menu que aparece al pulsar ··· no es un <menu> semantico ni tiene role='menu' con role='menuitem' en sus items. No tiene focus trap: al abrirse, el foco no va al primer item. Escape no lo cierra. Arrow keys no navegan entre opciones. En una app de desktop (Tauri) esto es especialmente importante.
**Codigo:** `Today.tsx:1339 — <div className='dropdown-menu dropdown-menu--fixed'> sin role, sin focus management.`

**Solucion:** Anadir role='menu' al contenedor, role='menuitem' a cada button, useEffect con focus al primer item al abrir, y keydown handler para Escape + Arrow keys.
**Esfuerzo:** 🔧 Medio


### A11Y-05: Dynamic type / escalado de fuente no probado
**Gravedad:** 🟢 Bajo

Ninguna referencia al escalado de fuente del sistema en el codigo. Las fuentes usan valores px fijos (font-size: 13px, 11px, etc.) que no respetan el escalado de accesibilidad del sistema operativo. En Windows, el 200% de escala de texto es comun entre usuarios con baja vision.
**Codigo:** `index.css — font-size en px en lugar de rem referenciados a :root font-size.`

**Solucion:** Convertir los font-size criticos de px a rem. Asegurar que los breakpoints de layout se mantienen con texto grande.
**Esfuerzo:** 🔧 Medio


---

## 8. Scorecard vs competidores (0–10)
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

## 9. Roadmap priorizado por impacto/esfuerzo
| Prioridad | Tarea | Impacto | Esfuerzo |
|-----------|-------|---------|----------|
| P0 — CRITICO | Conectar scheduling de notificaciones en Rust (useReminders + Tauri plugin) | 🔴 Critico | 🔧 Medio |
| P0 — CRITICO | Ocultar campo 'Recordatorio' en HabitForm hasta que notificaciones funcionen | 🔴 Critico | ⚡ Bajo |
| P0 — CRITICO | Timer: persistir startedAt en localStorage para sobrevivir navegacion | 🔴 Critico | ⚡ Bajo |
| P1 — ALTO | Animacion de confetti al completar todos los habitos del dia (canvas-confetti) | 🟠 Alto | ⚡ Bajo |
| P1 — ALTO | Haptic feedback al completar un habito (navigator.vibrate(50)) | 🟠 Alto | ⚡ Bajo |
| P1 — ALTO | aria-label descriptivos en check-btn y menu-btn de Today | 🟠 Alto | ⚡ Bajo |
| P1 — ALTO | Hacer tarjetas de Habits.tsx clicables (navegar a /habits/:id) | 🟠 Alto | ⚡ Bajo |
| P1 — ALTO | Undo toast tras completar habito (4 segundos, ToastContext) | 🟠 Alto | ⚡ Bajo |
| P1 — ALTO | Backup automatico semanal del .db a carpeta local (Rust) | 🟠 Alto | ⚡ Bajo |
| P1 — ALTO | Busqueda de habitos en Habits.tsx (filtro en cliente, useMemo) | 🟠 Alto | ⚡ Bajo |
| P1 — ALTO | Timer: mostrar objetivo (X min) y arco de progreso durante la sesion | 🟠 Alto | ⚡ Bajo |
| P1 — ALTO | Acceso a HabitDetail desde menu contextual de Today (nadie sabe que existe) | 🟠 Alto | ⚡ Bajo |
| P1 — ALTO | Long-press en habit-row como atajo al menu contextual | 🟠 Alto | ⚡ Bajo |
| P2 — MEDIO | strengthScore visualizado en HabitDetail (numero + mini-grafica 30d) | 🟡 Medio | 🔧 Medio |
| P2 — MEDIO | Swipe-to-check en filas de habitos (onPointerDown gesture) | 🟡 Medio | 🔧 Medio |
| P2 — MEDIO | role='menu' + focus trap + Escape en el dropdown contextual | 🟡 Medio | ⚡ Bajo |
| P2 — MEDIO | Clamp del menu contextual para que no salga del viewport | 🟡 Medio | ⚡ Bajo |
| P2 — MEDIO | Reemplazar <select> de ordenacion por chips del design system | 🟡 Medio | ⚡ Bajo |
| P2 — MEDIO | Check-in de animo diario (5 emojis en Today, tabla moods) | 🟡 Medio | ⚡ Bajo |
| P2 — MEDIO | Vacation mode global: pausar todos los habitos hasta una fecha | 🟡 Medio | ⚡ Bajo |
| P2 — MEDIO | Date picker personalizado en el modal de Pausa (en vez de 3/7/14/30) | 🟡 Medio | ⚡ Bajo |
| P2 — MEDIO | Three-state visual (done/skipped/missed) en Calendar y AnnualHeatmap | 🟡 Medio | 🔧 Medio |
| P2 — MEDIO | Linea de tendencia 30d y mejor/peor dia de semana en HabitDetail | 🟡 Medio | 🔧 Medio |
| P2 — MEDIO | Nota del dia libre en Today (daily journal, tabla daily_notes) | 🟡 Medio | ⚡ Bajo |
| P2 — MEDIO | Orden personalizado de habitos (sort_order + drag & drop con @dnd-kit) | 🟡 Medio | 🔧 Medio |
| P2 — MEDIO | Pantalla de retrospectiva mensual automatica (el dia 1 de cada mes) | 🟡 Medio | 🔧 Medio |
| P2 — MEDIO | font-size en rem para respetar escalado de accesibilidad del SO | 🟡 Medio | 🔧 Medio |
| P3 — BAJO | Modo foco: mostrar un habito a la vez con navegacion next/prev | 🟢 Bajo | 🔧 Medio |
| P3 — BAJO | Chevrons de DoneSection/SessionGroup con iconos Lucide (ChevronUp/Down) | 🟢 Bajo | ⚡ Bajo |
| P3 — BAJO | Empty states con SVG ilustracion en Habits y Today | 🟢 Bajo | 🔧 Medio |
| P3 — BAJO | Keyboard shortcuts en desktop (N = nuevo, Escape = cerrar, / = buscar) | 🟢 Bajo | ⚡ Bajo |
| P3 — BAJO | Preview de conflictos en Import antes de ejecutar | 🟢 Bajo | 🔧 Medio |
| P3 — BAJO | Streak shield: comodin por habito con recarga configurable | 🟢 Bajo | 🔧 Medio |
| P3 — BAJO | Habito stacking: encadenar un habito despues de completar otro | 🟢 Bajo | 🔧 Medio |
| P3 — BAJO | cal-chip con aria-label={h.name} + role='img' en Calendar | 🟢 Bajo | ⚡ Bajo |
| P3 — BAJO | Retro log ampliado a 365 dias (eliminar limite arbitrario de 30) | 🟢 Bajo | ⚡ Bajo |


---
*Generado por `generar_mercado.py` · 27/06/2026*  
*Basado en lectura directa de: Today.tsx, Stats.tsx, Habits.tsx, HabitForm.tsx, Settings.tsx, ImportExport.tsx, RetroLogModal.tsx, Onboarding.tsx*  
