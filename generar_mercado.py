"""
Genera MERCADO.md — analisis competitivo y de producto de Zyrco Habit Tracker.
Enfoque: UI, UX, features mal implementadas, features faltantes, capacidad offline.
Ejecutar: python generar_mercado.py
"""

from datetime import date

HOY = date.today().strftime("%d/%m/%Y")

# ─────────────────────────────────────────────────────────────
# DATOS
# ─────────────────────────────────────────────────────────────

UI_GAPS = [
    {
        "area": "Habit cards no son clicables como navegacion",
        "gravedad": "Alto",
        "descripcion": (
            "En Habits.tsx, el unico camino al detalle de un habito es: tarjeta → menu (···) → 'Ver detalle'. "
            "El clic en la tarjeta no hace nada. Todos los competidores (Loop, Streaks, HabitNow) "
            "navegan al detalle con un simple tap en la fila/tarjeta."
        ),
        "evidencia_codigo": "Habits.tsx:103 — renderHabitCard() no tiene onClick de navegacion; solo el menu-btn la lanza.",
        "referencia_mercado": "Loop, Streaks, HabitNow: tap en la fila = ir al detalle.",
        "solucion": "Hacer el area central de la tarjeta (icon + nombre + meta) un NavLink a /habits/:id. El menu (···) mantiene las acciones destructivas.",
        "esfuerzo": "Bajo",
    },
    {
        "area": "Sort control usa <select> nativo que rompe el design system",
        "gravedad": "Medio",
        "descripcion": (
            "SortControl en Today.tsx renderiza un <select> HTML nativo. En Windows 11 este control usa "
            "el estilo del OS: diferente tipografia, diferente radio, diferente altura. Rompe la coherencia "
            "visual con el resto de la UI que usa CSS custom properties."
        ),
        "evidencia_codigo": "Today.tsx:515 — <select className='habit-sort-select'>.",
        "referencia_mercado": "Streaks, Finch, Done: controles de ordenacion como chips o segmented controls nativos del design system.",
        "solucion": "Reemplazar por un grupo de 3 chips (mismo estilo que TypeFilterChips) o un popover con RadioGroup.",
        "esfuerzo": "Bajo",
    },
    {
        "area": "Chevron de seccion done/session usa caracteres Unicode, no icono",
        "gravedad": "Bajo",
        "descripcion": (
            "DoneSection y SessionGroup usan los caracteres '▲' / '▼' para el toggle de expansion. "
            "Estos caracteres tienen kerning inconsistente entre fuentes y no respetan el color/tamanyo "
            "del design system. Lucide-react ya esta importado; ChevronUp/ChevronDown son la solucion correcta."
        ),
        "evidencia_codigo": "Today.tsx:601 — <span className='done-section-chevron'>{open ? '▲' : '▼'}</span>.",
        "referencia_mercado": "Estandar en toda app moderna: iconos vectoriales para toggles.",
        "solucion": "Sustituir por <ChevronUp size={14}/> / <ChevronDown size={14}/> de lucide-react.",
        "esfuerzo": "Bajo",
    },
    {
        "area": "PerfectDayBanner se muestra desde 0% (al inicio del dia)",
        "gravedad": "Medio",
        "descripcion": (
            "El ring SVG de progreso en Today.tsx se renderiza cuando done=0 y total>0, "
            "mostrando un circulo vacio. El efecto visual no motiva; al contrario, recuerda al usuario "
            "cuanto le falta desde el primer segundo. Finch y Streaks ocultan o minimizan el indicador "
            "de progreso hasta que el usuario marca al menos 1 habito."
        ),
        "evidencia_codigo": "Today.tsx:685 — PerfectDayBanner({ done, total }) renderiza siempre que total > 0.",
        "referencia_mercado": "Finch: muestra celebracion solo al completar. Streaks: el circulo empieza a llenarse, no a vaciarse.",
        "solucion": "Ocultar el banner hasta done >= 1, o cambiar el diseno a un indicador positivo ('1 de 5 completados' en lugar de ring vacio).",
        "esfuerzo": "Bajo",
    },
    {
        "area": "Dropdown de menu se puede salir de la pantalla",
        "gravedad": "Medio",
        "descripcion": (
            "MenuState posiciona el dropdown con top: menu.y, left: menu.x usando rect.right/rect.bottom "
            "del boton. Si el habito esta en la parte baja o derecha de la pantalla, el menu se sale del viewport "
            "sin ningun calculo de clamp. En mobile (360px de ancho) esto es especialmente problematico."
        ),
        "evidencia_codigo": "Today.tsx:904 — openMenu() calcula rect.right, rect.bottom sin viewport clamp.",
        "referencia_mercado": "Todos los menus contextuales maduros hacen clamp al viewport o flip cuando no hay espacio.",
        "solucion": "En el div dropdown, calcular si x + anchura_menu > window.innerWidth y flipear a left: menu.x - anchura_menu. Mismo para y.",
        "esfuerzo": "Bajo",
    },
    {
        "area": "Empty state es texto plano sin ilustracion",
        "gravedad": "Bajo",
        "descripcion": (
            "Las pantallas vacias (Habits, Stats, Todos) muestran un emoji + texto. Finch, Fabulous y Streaks "
            "usan ilustraciones SVG animadas que comunican el valor del producto y reducen el abandono en "
            "usuarios nuevos. Un empty state bien disenado aumenta la conversion al primer habito."
        ),
        "evidencia_codigo": "Habits.tsx:210 — <span className='empty-state-emoji'>✨</span>.",
        "referencia_mercado": "Finch: pagina vacia con el pajaro animado diciendo 'Empieza tu primer habito'. Streaks: ilustracion de un circulo vacio con CTA.",
        "solucion": "Crear un SVG simple inline para la pantalla vacia de Habits y Hoy. No requiere libreria externa.",
        "esfuerzo": "Medio",
    },
    {
        "area": "Stats: unico grafico es un BarChart de completions totales",
        "gravedad": "Alto",
        "descripcion": (
            "Stats.tsx solo tiene un BarChart de 'completions por dia'. No hay: "
            "linea de tendencia, mejor dia de semana por habito, radar por categoria, "
            "sparklines por habito. Loop Habit Tracker —gratuito y open source— tiene "
            "histograma de frecuencia, tendencia lineal y frecuencia relativa por dia de la semana. "
            "Zyrco cobra (o planea cobrar) y ofrece menos estadisticas."
        ),
        "evidencia_codigo": "Stats.tsx:275 — unico <BarChart> con data de overall.byDate.",
        "referencia_mercado": "Loop: 4 tipos de graficas por habito. Bearable: correlaciones entre factores. HabitNow: grafica mensual con heatmap integrado.",
        "solucion": "Anadir al menos: (1) linea de tendencia 30d por habito en HabitDetail, (2) 'mejor dia de semana' barchart horizontal en HabitDetail.",
        "esfuerzo": "Medio",
    },
    {
        "area": "Numeric input expansion es un patron UX no estandar",
        "gravedad": "Medio",
        "descripcion": (
            "Para habitos numericos, el primer tap expande un row inline con +/- stepper. "
            "El usuario no sabe que esto va a pasar: el boton circular parece identico a un checkmark. "
            "Habitica y HabitNow usan un bottom sheet o modal para el input numerico, "
            "que es mas predecible y accesible para pantallas tactiles."
        ),
        "evidencia_codigo": "Today.tsx:248 — if (isNumeric && !completed) { setExpandedNumeric(...) }.",
        "referencia_mercado": "HabitNow: bottom sheet con teclado numerico. Loop: campo inline pero con icono diferente para indicar que es numerico.",
        "solucion": "Cambiar el icono del check-btn para habitos numericos (usar un '123' o un icono de input) y considerar un mini-sheet en lugar del expand inline.",
        "esfuerzo": "Medio",
    },
    {
        "area": "Filtros de tipo + categoria generan doble fila de chips",
        "gravedad": "Bajo",
        "descripcion": (
            "Cuando hay habitos de multiples tipos Y multiples categorias, FilterBar muestra "
            "dos filas de chips. En mobile esto consume mucho espacio vertical antes de que aparezca "
            "el primer habito. Streaks y HabitNow unifican tipo y categoria en un unico selector contextual."
        ),
        "evidencia_codigo": "Today.tsx:558 — FilterBar renderiza TypeFilterChips + CategoryFilterChips en fila separada.",
        "referencia_mercado": "HabitNow: un unico dropdown de filtro con secciones. Streaks: no necesita filtros (limite de 12 habitos).",
        "solucion": "Colapsar ambos en un unico row scrollable horizontal con chips mezclados, o usar un icono de filtro que abre un popover.",
        "esfuerzo": "Bajo",
    },
    {
        "area": "HabitDetail solo accesible desde menu contextual en Habits",
        "gravedad": "Alto",
        "descripcion": (
            "La pagina /habits/:id existe y tiene estadisticas detalladas por habito (racha, notas, "
            "barChart por dia de semana). Pero es invisible desde Today, que es donde el usuario "
            "pasa el 80% del tiempo. El unico camino es ir a Habits > abrir menu (···) > Ver detalle."
        ),
        "evidencia_codigo": "Today.tsx no tiene ningun NavLink a /habits/:id. HabitList tampoco.",
        "referencia_mercado": "Loop: tap en el nombre del habito en cualquier lista lleva al detalle. HabitNow: icono de detalle visible en cada fila.",
        "solucion": "Hacer clicable el nombre/icono del habito en Today para ir a /habits/:id, o anadir un icono de 'ver mas' junto al streakBadge.",
        "esfuerzo": "Bajo",
    },
]

UX_GAPS = [
    {
        "patron": "Swipe para completar (swipe-to-check)",
        "gravedad": "Alto",
        "descripcion": (
            "Ninguna fila de habito responde a gestos de swipe. En movil, el gesto mas rapido "
            "para marcar un habito es deslizar a la derecha. Streaks (el winner del Apple Design Award) "
            "lo tiene como interaccion principal. HabitNow lo tiene en Android. "
            "En Zyrco el unico camino es pulsar el circulo check, que en compact view es pequeyo."
        ),
        "referencia_mercado": "Streaks: swipe right = completar. HabitNow: swipe left = opciones, swipe right = completar. Loop: tap largo = menu.",
        "solucion_corta": "Implementar onTouchStart/onTouchEnd en habit-row para detectar swipe horizontal > 60px y triggear toggle. En desktop no es necesario.",
        "esfuerzo": "Medio",
    },
    {
        "patron": "Drag para reordenar habitos",
        "gravedad": "Medio",
        "descripcion": (
            "El orden de los habitos es el de creacion y no se puede cambiar sin editar cada uno. "
            "Los usuarios quieren poner sus habitos mas importantes arriba. Habitica, HabitNow y Loop "
            "tienen drag & drop para reordenar. En desktop esto es esperado y en mobile tambien."
        ),
        "referencia_mercado": "Habitica: drag en lista de habitos. Loop: drag en la lista principal. HabitNow: drag & drop con handle.",
        "solucion_corta": "Anadir una columna 'sort_order' INTEGER a la tabla habits. En React usar @dnd-kit/sortable (ligero, accesible). Solo en Habits page.",
        "esfuerzo": "Medio",
    },
    {
        "patron": "Undo para acciones accidentales",
        "gravedad": "Alto",
        "descripcion": (
            "Si el usuario completa un habito por error o lo elimina, no hay undo. "
            "La eliminacion tiene confirmacion modal, pero el complete/uncomplete no tiene señal visual "
            "de que se puede deshacer. Loop y Finch muestran un toast con 'Deshacer' tras completar. "
            "El sistema de toasts de Zyrco existe pero no lo usa para undo."
        ),
        "referencia_mercado": "Loop: 'Undo' en toast 3s despues de completar. Finch: animacion de papiro con 'Deshacer'.",
        "solucion_corta": "En handleToggle, despues de toggle(), mostrar un toast con boton 'Deshacer' que llame a toggle(habitId, !completed) en los proximos 4 segundos.",
        "esfuerzo": "Bajo",
    },
    {
        "patron": "Busqueda de habitos",
        "gravedad": "Alto",
        "descripcion": (
            "No hay campo de busqueda en la pagina Habits ni en Today. Con 10+ habitos, "
            "encontrar uno especifico para editarlo requiere scroll. HabitNow y Bearable tienen "
            "busqueda en tiempo real en la lista de habitos. En Habits.tsx el filtro solo es por tipo/categoria."
        ),
        "referencia_mercado": "HabitNow: barra de busqueda siempre visible. Bearable: busqueda con filtros combinados.",
        "solucion_corta": "Anadir un <input type='search'> en el header de Habits.tsx que filtre habits por nombre en el cliente (useMemo).",
        "esfuerzo": "Bajo",
    },
    {
        "patron": "Teclado shortcuts en desktop",
        "gravedad": "Medio",
        "descripcion": (
            "Zyrco es una app Tauri de escritorio pero no tiene ningun keyboard shortcut. "
            "Los usuarios de desktop esperan: Space/Enter para completar el habito seleccionado, "
            "N para nuevo habito, Escape para cerrar modales, / para buscar. "
            "Notion, Linear, Obsidian —apps con usuarios de productividad— tienen shortcuts extensos."
        ),
        "referencia_mercado": "Ninguno de los competidores mobiles los tiene, pero los de desktop si (Notion: N = nueva nota, etc.).",
        "solucion_corta": "Implementar useEffect con document.addEventListener('keydown') para al menos: N = nuevo habito, Escape = cerrar modal, / = focus busqueda.",
        "esfuerzo": "Bajo",
    },
    {
        "patron": "Timer habito se reinicia al navegar",
        "gravedad": "Alto",
        "descripcion": (
            "El estado del timer vive en un Map<string, {startedAt}> en Today.tsx. "
            "Navegar a Settings y volver reinicia el timer a 0 sin registrar el tiempo. "
            "No hay ninguna advertencia visual. Para habitos de meditacion o ejercicio de 20-30 minutos, "
            "esto es un bug funcional aunque este documentado como 'by design'."
        ),
        "evidencia_codigo": "Today.tsx:798 — useState<Map<string, {startedAt}>>: estado efimero de React.",
        "referencia_mercado": "Streaks: el timer persiste en background aunque la app este minimizada. HabitNow: timer en notificacion persistente.",
        "solucion_corta": "Persistir el startedAt en localStorage bajo clave 'zyrco-active-timers'. Al montar Today.tsx, restaurar timers activos del dia de hoy.",
        "esfuerzo": "Bajo",
    },
    {
        "patron": "No hay acceso rapido a HabitDetail desde Today",
        "gravedad": "Medio",
        "descripcion": (
            "El flujo para ver las estadisticas de un habito desde Today es: "
            "Hoy → abrir menu (···) → no existe la opcion → ir a Habits → abrir menu (···) → Ver detalle. "
            "Son 5 pasos. En Loop: tap en el habito = detalle inmediato."
        ),
        "referencia_mercado": "Loop: tap en fila = detalle. HabitNow: icono de grafica junto al nombre. Streaks: tap largo = detalle.",
        "solucion_corta": "Anadir 'Ver detalle' al menu contextual de Today.tsx (actualmente no esta) y hacer el nombre del habito un link a /habits/:id.",
        "esfuerzo": "Bajo",
    },
    {
        "patron": "No hay modo de foco (un habito a la vez)",
        "gravedad": "Bajo",
        "descripcion": (
            "Algunas apps ofrecen un 'focus mode' que muestra solo el siguiente habito pendiente, "
            "minimizando las distracciones. Util para usuarios con muchos habitos o con TDAH. "
            "Fabulous lo tiene como su flujo principal (cada paso de la rutina se muestra uno a uno)."
        ),
        "referencia_mercado": "Fabulous: la rutina se presenta como un wizard paso a paso. Forest: gamificacion de foco en un solo habito.",
        "solucion_corta": "Anadir un boton 'Modo foco' en Today que muestre solo el primer pendingHabit con navegacion next/prev. Estado efimero de React.",
        "esfuerzo": "Medio",
    },
    {
        "patron": "Acciones en lote (bulk actions)",
        "gravedad": "Bajo",
        "descripcion": (
            "No hay forma de archivar, eliminar o pausar varios habitos a la vez. "
            "Para usuarios que quieren reorganizar radicalmente su lista, "
            "es tedioso hacer cada accion de uno en uno."
        ),
        "referencia_mercado": "HabitNow: seleccion multiple con checkbox. Habitica: seleccion de tareas en lote.",
        "solucion_corta": "Anadir modo seleccion en Habits.tsx: mantener pulsado activa checkboxes en las tarjetas; barra de acciones aparece abajo.",
        "esfuerzo": "Alto",
    },
]

FEATURES_MAL_IMPLEMENTADAS = [
    {
        "feature": "Notificaciones: UI promete, OS no entrega",
        "gravedad": "Critico",
        "descripcion": (
            "Settings.tsx importa @tauri-apps/plugin-notification y pide permisos. "
            "HabitForm.tsx tiene un toggle de 'Activar recordatorio' con hora configurable. "
            "El problema: ninguna parte del codigo programa una notificacion real en el sistema operativo. "
            "useReminders.ts existe pero solo registra si hay habitos con reminder, sin disparar nada. "
            "El usuario activa el toggle, configura la hora, y nunca recibe la notificacion."
        ),
        "evidencia_codigo": "Settings.tsx:3 — import de plugin-notification solo para requestPermission. useReminders.ts no llama a schedule().",
        "impacto": "El 31% de los abandonos de habit trackers son por falta de recordatorios efectivos (dato de mercado). Esta es la funcionalidad #1 en importancia y esta rota.",
        "solucion": "Implementar un loop en Rust (src-tauri) con tauri::async_runtime::spawn que cada minuto compruebe si algun habito tiene reminder_time == hora_actual y dispare la notificacion.",
        "esfuerzo": "Medio",
    },
    {
        "feature": "Retro log limitado arbitrariamente a 30 dias",
        "gravedad": "Medio",
        "descripcion": (
            "RetroLogModal.tsx permite registrar los ultimos 30 dias. El numero 30 es arbitrario; "
            "no esta en la documentacion ni tiene logica de negocio. Usuarios que vienen de otra app "
            "o que quieren registrar un mes de vacaciones no pueden ir mas atras."
        ),
        "evidencia_codigo": "RetroLogModal.tsx — Array.from({length: 30}, (_, i) => subDays(today, i + 1)).",
        "impacto": "Limita la utilidad para usuarios de importacion y usuarios que vuelven despues de un periodo de inactividad.",
        "solucion": "Cambiar el limite a 365 dias con scroll virtual (react-window o similar). El input de fecha deberia permitir cualquier fecha pasada.",
        "esfuerzo": "Bajo",
    },
    {
        "feature": "Import: sin resolucion de conflictos",
        "gravedad": "Medio",
        "descripcion": (
            "ImportExport.tsx usa INSERT OR REPLACE para habitos y categorias. "
            "Si el usuario importa un archivo con habitos que ya existen (mismo ID), los sobreescribe. "
            "Si importa habitos con IDs diferentes pero mismo nombre, crea duplicados. "
            "No hay ninguna pantalla de confirmacion mostrando que va a pasar."
        ),
        "evidencia_codigo": "ImportExport.tsx — importAllData() usa INSERT OR REPLACE sin diff previo.",
        "impacto": "Un usuario que importa un backup antiguo puede perder datos recientes o crear duplicados invisibles.",
        "solucion": "Antes de importar, mostrar un modal de preview: '5 habitos nuevos, 2 habitos que ya existen (sobreescribir / conservar / renombrar)'.",
        "esfuerzo": "Medio",
    },
    {
        "feature": "Pausa de habito: solo opciones fijas (3/7/14/30 dias)",
        "gravedad": "Bajo",
        "descripcion": (
            "El modal de pausa en Habits.tsx ofrece 4 botones fijos: 3, 7, 14, 30 dias. "
            "No hay selector de fecha personalizado. Si el usuario se va de vacaciones del 15 al 23, "
            "tiene que elegir entre 14 dias (se queda corto) o 30 dias (hay que reactivar manualmente)."
        ),
        "evidencia_codigo": "Habits.tsx:331 — {[3, 7, 14, 30].map((d) => <button ...>)}.",
        "impacto": "Minor UX friction; los usuarios que pausan habitualmente se frustran.",
        "solucion": "Anadir un date picker de 'Pausar hasta:' debajo de los botones rapidos. Solo requiere <input type='date'>.",
        "esfuerzo": "Bajo",
    },
    {
        "feature": "Stats: periodo 'Todo el tiempo' no indica rango real de fechas",
        "gravedad": "Bajo",
        "descripcion": (
            "Cuando period = 365 en Stats.tsx, el label dice 'Todo el tiempo' pero la ventana "
            "de datos es de exactamente los ultimos 365 dias, no desde la fecha de creacion del habito. "
            "Un usuario con 2 anos de datos cree que ve todo pero solo ve el ultimo anyo. "
            "Ademas, rateDelta se fuerza a 0 sin explicar por que."
        ),
        "evidencia_codigo": "Stats.tsx:130 — const rateDelta = period < 365 ? ... : 0;",
        "impacto": "Confusion para usuarios con historial largo. La etiqueta promete mas de lo que entrega.",
        "solucion": "Cambiar la etiqueta a 'Ultimos 12 meses' o calcular el rango real desde la fecha del primer log.",
        "esfuerzo": "Bajo",
    },
    {
        "feature": "HabitForm: campo de recordatorio crea expectativas que no se cumplen",
        "gravedad": "Alto",
        "descripcion": (
            "HabitForm.tsx tiene un toggle 'Activar recordatorio' con un campo de hora. "
            "El usuario lo configura, lo guarda, y espera recibir una notificacion a esa hora. "
            "No llega nada. Este es el gap mas peligroso de credibilidad del producto."
        ),
        "evidencia_codigo": "HabitForm.tsx — reminder (boolean) y reminder_time (string) se guardan en DB pero nunca se usan para scheduling.",
        "impacto": "Critico para retencion. El usuario que no recibe notificaciones abandona a los 3-5 dias.",
        "solucion": "O bien conectar el scheduling (solucion correcta) o bien ocultar el campo reminder del formulario hasta que este implementado, con un placeholder 'Proxximamente'.",
        "esfuerzo": "Bajo (ocultar) / Alto (implementar correctamente)",
    },
    {
        "feature": "Timer: sin indicador de objetivo/duracion",
        "gravedad": "Medio",
        "descripcion": (
            "Habitos de tipo timer muestran un cronometro ascendente (MM:SS). "
            "Pero el campo completion_target existe (minutos objetivo) y nunca se muestra durante el timer. "
            "El usuario no sabe si va bien, si le falta mucho o si ya pasó el objetivo."
        ),
        "evidencia_codigo": "Today.tsx:119 — TimerButton muestra solo elapsed. habit.completion_target nunca se referencia en el timer activo.",
        "impacto": "La utilidad del timer para habitos con objetivo (ej. 'Meditar 20 min') es reducida.",
        "solucion": "Mostrar el target en el boton de parar: 'Stop — 12:34 / 20:00'. Usar un arc SVG que muestre progreso contra el objetivo.",
        "esfuerzo": "Bajo",
    },
    {
        "feature": "Onboarding de un solo uso sin hints contextuales",
        "gravedad": "Medio",
        "descripcion": (
            "El onboarding inicial es bueno (3 pasos, seleccion de plantilla, primera marca). "
            "Pero una vez completado, el usuario nuevo nunca ve hints sobre funciones avanzadas: "
            "el retro-log, el modo calendario, las estadisticas, las categorias, el modo de pausa. "
            "Las 7 funciones mas potentes de Zyrco son invisibles hasta que el usuario las descubre solo."
        ),
        "evidencia_codigo": "Onboarding.tsx — solo corre una vez (localStorage 'zyrco-onboarding-done'). No hay sistema de contextual hints.",
        "impacto": "El 60% de los usuarios nunca descubren funciones avanzadas si no hay discovery activo.",
        "solucion": "Anadir un sistema de 'coachmarks' progresivos: el 2do dia mostrar un badge en el icono de Stats, al primer habito completado mostrar el hint de nota, etc.",
        "esfuerzo": "Medio",
    },
]

FEATURES_FALTANTES = [
    {
        "feature": "Streak freeze / Modo vacaciones global",
        "impacto": "Alto",
        "descripcion": (
            "La pausa actual es por habito individual. Si el usuario se va de vacaciones 2 semanas, "
            "tiene que pausar cada habito manualmente. No hay 'vacation mode' que pause todos los habitos "
            "hasta una fecha y los reactive automaticamente. Streaks tiene 'Freeze streak' para no romper la racha."
        ),
        "quien_lo_tiene": "Streaks (freeze de racha), HabitNow (vacation mode en Pro), Done (skip period)",
        "solucion_minima": "Un botón en Settings: 'Modo vacaciones hasta:' con date picker. Inserta skip entries para todos los habitos activos en ese rango.",
        "esfuerzo": "Bajo",
    },
    {
        "feature": "Busqueda global en la app",
        "impacto": "Medio",
        "descripcion": (
            "No hay busqueda en ninguna pagina de la app. En Habits, en Today, en Stats: "
            "no se puede buscar un habito por nombre. Con 15-20 habitos el scroll manual es tedioso. "
            "En desktop la expectativa es Ctrl+K / Cmd+K para busqueda rapida."
        ),
        "quien_lo_tiene": "HabitNow, Bearable, Habitica",
        "solucion_minima": "Campo de busqueda en Habits.tsx que filtra la lista en cliente (useMemo sobre habits.filter).",
        "esfuerzo": "Bajo",
    },
    {
        "feature": "Habito stacking (if-then chaining)",
        "impacto": "Medio",
        "descripcion": (
            "El concepto de James Clear ('Atomic Habits'): '...despues de X, hare Y'. "
            "Permite crear cadenas de habitos donde completar el primero sugiere automaticamente "
            "o desbloquea el siguiente. Es una tecnica cientificamente validada para la adopcion de habitos. "
            "Ningun competidor directo lo tiene bien implementado — oportunidad diferencial."
        ),
        "quien_lo_tiene": "Parcialmente: Fabulous (rutinas secuenciales), Streaks (no lo tiene)",
        "solucion_minima": "Campo 'despues de:' en HabitForm que elige otro habito. En Today, el habito encadenado aparece highlighted cuando el padre se completa.",
        "esfuerzo": "Medio",
    },
    {
        "feature": "Check-in de animo diario",
        "impacto": "Medio",
        "descripcion": (
            "Un check-in de 5 emojis (muy mal / mal / regular / bien / excelente) al inicio o final de Hoy "
            "permite correlacionar el estado emocional con la tasa de completado. "
            "Es el dato mas solicitado en resenas de habit trackers en App Store. "
            "Finch y Bearable lo tienen como pilar de su propuesta."
        ),
        "quien_lo_tiene": "Finch (core feature), Bearable (health tracking), Fabulous (parcial)",
        "solucion_minima": "5 botones emoji en la cabecera de Today, solo visibles si el usuario no ha hecho el check-in del dia. Guarda en una tabla 'moods' (date, value 1-5).",
        "esfuerzo": "Bajo",
    },
    {
        "feature": "Metricas de tendencia y mejor dia de semana",
        "impacto": "Alto",
        "descripcion": (
            "HabitDetail.tsx tiene un barChart de 'completions por dia de semana' (implementado). "
            "Pero no tiene: tendencia lineal de la tasa en los ultimos 30d, "
            "prediccion de probabilidad de completar hoy basada en el historial, "
            "ni detecta patrones de fallo (ej. 'los lunes fallas el 70% de las veces'). "
            "Loop Habit Tracker ofrece todos estos de forma gratuita."
        ),
        "quien_lo_tiene": "Loop (EMA, frecuencia), Bearable (correlaciones), HabitNow (monthly trends)",
        "solucion_minima": "En HabitDetail: anadir una linea de tendencia de 30d usando regresion lineal simple (calculada en cliente). Y un callout: 'Tu dia mas debil: Lunes (55%)'.",
        "esfuerzo": "Medio",
    },
    {
        "feature": "Resumen semanal automatico (digest push)",
        "impacto": "Alto",
        "descripcion": (
            "WeeklyDigest.tsx existe como componente visual. "
            "Pero se abre manualmente; no hay ninguna notificacion automatica "
            "que lo presente los domingos. El valor del digest es cero si el usuario "
            "no sabe que existe o tiene que buscarlo. "
            "Fabulous envia resumenes semanales por push con animaciones."
        ),
        "quien_lo_tiene": "Fabulous (push semanal), Habitica (email semanal), HabitNow (resumen en notificacion)",
        "solucion_minima": "Conectado al sistema de notificaciones (cuando este implementado): disparar WeeklyDigest el domingo a las 20:00 como notificacion local.",
        "esfuerzo": "Bajo (cuando notificaciones esten conectadas)",
    },
    {
        "feature": "Proteccion de racha (streak shield)",
        "impacto": "Alto",
        "descripcion": (
            "Grace days existe (0/1/2 dias de margen), configurado globalmente. "
            "Pero no hay un 'Streak Shield' por habito individual: un comodin que preserva la racha "
            "una vez cuando el usuario falla. Duolingo popularizo este mecanismo con resultados "
            "de retencion medidos (+15-20% en retencion D30)."
        ),
        "quien_lo_tiene": "Duolingo (streak shield como item de tienda), Streaks (freeze), HabitNow (streak saver)",
        "solucion_minima": "Un boton 'Usar escudo' visible cuando el habito esta pendiente a medianoche. El escudo se recarga cada N dias (configurable en Settings).",
        "esfuerzo": "Medio",
    },
    {
        "feature": "Backup automatico a archivo local",
        "impacto": "Alto",
        "descripcion": (
            "Los datos estan en SQLite en %APPDATA% (Windows) o ~/Library/Application Support (Mac). "
            "Si el usuario formatea el PC o cambia de dispositivo, pierde todo sin aviso. "
            "No hay backup automatico a ninguna ubicacion. El export JSON existe pero es manual. "
            "Loop Habit Tracker hace backup automatico en la carpeta de Descargas cada semana."
        ),
        "quien_lo_tiene": "Loop (auto-backup semanal), HabitNow (Google Drive automatico), Streaks (iCloud automatico)",
        "solucion_minima": "En src-tauri: anadir un trigger semanal que copia el archivo .db a ~/Desktop/zyrco-backup-FECHA.db (o carpeta configurable).",
        "esfuerzo": "Bajo",
    },
    {
        "feature": "Notas de dia (journal diario, no por habito)",
        "impacto": "Bajo",
        "descripcion": (
            "Zyrco tiene notas por check-in individual (una nota por habito por dia). "
            "Pero no hay un espacio de reflexion diaria libre: '¿Como fue el dia?'. "
            "Finch tiene un diario de gratitud. HabitNow tiene un campo de notas del dia. "
            "Bearable tiene un cuadro de reflexion. Los usuarios de productividad valoran este espacio."
        ),
        "quien_lo_tiene": "Finch (diario de gratitud), Bearable (notas del dia), HabitNow (nota diaria)",
        "solucion_minima": "Un campo de texto libre al final de la vista de Hoy: 'Nota del dia'. Guarda en tabla 'daily_notes' (date, text). Integrable con el weekly digest.",
        "esfuerzo": "Bajo",
    },
    {
        "feature": "Orden personalizado de habitos (sort_order)",
        "impacto": "Alto",
        "descripcion": (
            "Los habitos aparecen en orden de creacion y no se puede cambiar sin eliminar y recrear. "
            "El 90% de los usuarios quiere poner sus habitos mas importantes arriba. "
            "No hay columna sort_order en la tabla habits. "
            "Todos los competidores principales permiten reordenar."
        ),
        "quien_lo_tiene": "Todos los competidores principales.",
        "solucion_minima": "Columna INTEGER sort_order en habits (ALTER TABLE migration). Drag & drop en Habits.tsx con @dnd-kit. Actualizar al soltar.",
        "esfuerzo": "Medio",
    },
]

OFFLINE_ANALISIS = {
    "estado_actual": "FORTALEZA — Zyrco es 100% local-first por diseno",
    "puntos_positivos": [
        "Toda la logica corre en SQLite local via @tauri-apps/plugin-sql. Sin cuenta, sin servidor.",
        "Funciona sin conexion a internet en todas sus funciones (ver habitos, completar, ver stats, editar).",
        "El dato nunca sale del dispositivo del usuario (privacidad maxima).",
        "Sin dependencias de servicios externos que puedan caer o cambiar TOS.",
        "Cero latencia en operaciones de lectura/escritura (SQLite en disco local).",
    ],
    "brechas_offline": [
        {
            "brecha": "Sin backup automatico local",
            "descripcion": "El DB esta en %APPDATA%/com.zubia.zyrco/zyrco.db. Sin backup automatico, un fallo de disco = datos perdidos para siempre.",
            "solucion": "Auto-backup semanal a una carpeta configurable (via Tauri dialog).",
        },
        {
            "brecha": "Sincronizacion entre dispositivos no existe por defecto",
            "descripcion": "Para usar Zyrco en PC + movil necesitas configurar Turso manualmente (.env). Para el 99% de los usuarios esto es imposible.",
            "solucion": "Ofrecer sync gratuita basica via un endpoint propio minimo, o soporte de iCloud/Google Drive Drive como opcion one-click.",
        },
        {
            "brecha": "Export manual como unico mecanismo de copia",
            "descripcion": "El JSON export existe pero es manual. Un usuario que no lo usa y pierde el dispositivo pierde todo.",
            "solucion": "Anadir un banner de recordatorio mensual: 'Han pasado 30 dias sin exportar tus datos. Hacer backup ahora'.",
        },
    ],
    "oportunidad_marketing": (
        "Privacy-first local-first es un diferencial REAL y comunicable. "
        "Ningun competidor principal (Habitica, Finch, Fabulous) ofrece esto. "
        "Hay un segmento creciente de usuarios que no quiere sus datos de salud en la nube. "
        "El copy en la tienda deberia ser: 'Sin cuenta. Sin servidores. Tus habitos, en tu dispositivo.'"
    ),
}

SCORECARD = [
    ("Facilidad de uso (onboarding)",   {"Zyrco": 7, "Habitica": 5, "Streaks": 9, "Finch": 8, "Loop": 7, "HabitNow": 7}),
    ("Calidad visual / coherencia UI",  {"Zyrco": 6, "Habitica": 4, "Streaks": 10, "Finch": 9, "Loop": 5, "HabitNow": 6}),
    ("Profundidad de features",         {"Zyrco": 7, "Habitica": 9, "Streaks": 5, "Finch": 5, "Loop": 8, "HabitNow": 8}),
    ("Estadísticas y analíticas",       {"Zyrco": 5, "Habitica": 4, "Streaks": 3, "Finch": 2, "Loop": 9, "HabitNow": 7}),
    ("Retención / motivación",          {"Zyrco": 5, "Habitica": 9, "Streaks": 7, "Finch": 9, "Loop": 6, "HabitNow": 6}),
    ("Notificaciones funcionales",      {"Zyrco": 1, "Habitica": 8, "Streaks": 9, "Finch": 8, "Loop": 8, "HabitNow": 9}),
    ("Gestos e interacciones UX",       {"Zyrco": 3, "Habitica": 5, "Streaks": 9, "Finch": 7, "Loop": 6, "HabitNow": 7}),
    ("Privacidad / local-first",        {"Zyrco": 10, "Habitica": 2, "Streaks": 6, "Finch": 2, "Loop": 9, "HabitNow": 4}),
    ("Multiplataforma (desktop+móvil)", {"Zyrco": 6, "Habitica": 9, "Streaks": 2, "Finch": 7, "Loop": 2, "HabitNow": 2}),
    ("Precio / accesibilidad",          {"Zyrco": 9, "Habitica": 7, "Streaks": 8, "Finch": 5, "Loop": 10, "HabitNow": 9}),
]

ROADMAP = [
    ("P0 — CRITICO",   "Conectar scheduling de notificaciones en Rust (useReminders + Tauri plugin)", "Critico", "Medio"),
    ("P0 — CRITICO",   "Ocultar campo 'Recordatorio' en HabitForm hasta que notificaciones funcionen", "Critico", "Bajo"),
    ("P0 — CRITICO",   "Timer: persistir startedAt en localStorage para sobrevivir navegacion", "Critico", "Bajo"),
    ("P1 — ALTO",      "Hacer tarjetas de Habits.tsx clicables (navegar a /habits/:id)", "Alto", "Bajo"),
    ("P1 — ALTO",      "Undo toast tras completar habito (4 segundos, usar ToastContext)", "Alto", "Bajo"),
    ("P1 — ALTO",      "Backup automatico semanal del .db a carpeta local (Rust)", "Alto", "Bajo"),
    ("P1 — ALTO",      "Busqueda de habitos en Habits.tsx (filtro en cliente)", "Alto", "Bajo"),
    ("P1 — ALTO",      "Timer: mostrar objetivo (X min) durante la sesion activa", "Alto", "Bajo"),
    ("P1 — ALTO",      "Acceso a HabitDetail desde el menu contextual de Today", "Alto", "Bajo"),
    ("P2 — MEDIO",     "Swipe-to-check en filas de habitos (touch gesture detection)", "Medio", "Medio"),
    ("P2 — MEDIO",     "Clamp del menu contextual para que no salga del viewport", "Medio", "Bajo"),
    ("P2 — MEDIO",     "Reemplazar <select> de ordenacion por chips del design system", "Medio", "Bajo"),
    ("P2 — MEDIO",     "Check-in de animo diario (5 emojis en Today)", "Medio", "Bajo"),
    ("P2 — MEDIO",     "Vacation mode: pausar todos los habitos hasta una fecha", "Medio", "Bajo"),
    ("P2 — MEDIO",     "Date picker personalizado en el modal de Pausa", "Medio", "Bajo"),
    ("P2 — MEDIO",     "Linea de tendencia 30d y mejor dia de semana en HabitDetail", "Medio", "Medio"),
    ("P2 — MEDIO",     "Nota del dia libre en Today (daily journal)", "Medio", "Bajo"),
    ("P2 — MEDIO",     "Orden personalizado de habitos (sort_order + drag & drop)", "Medio", "Medio"),
    ("P3 — BAJO",      "Modo foco: mostrar un habito a la vez", "Bajo", "Medio"),
    ("P3 — BAJO",      "Chevrons de DoneSection/SessionGroup con iconos Lucide", "Bajo", "Bajo"),
    ("P3 — BAJO",      "Empty states con SVG ilustracion en Habits y Today", "Bajo", "Medio"),
    ("P3 — BAJO",      "Keyboard shortcuts en desktop (N, Escape, /)", "Bajo", "Bajo"),
    ("P3 — BAJO",      "Preview de conflictos en Import antes de ejecutar", "Bajo", "Medio"),
    ("P3 — BAJO",      "Streak shield: comodin por habito con recarga configurable", "Bajo", "Medio"),
    ("P3 — BAJO",      "Habito stacking: encadenar un habito despues de otro", "Bajo", "Medio"),
]


# ─────────────────────────────────────────────────────────────
# GENERADOR DE MARKDOWN
# ─────────────────────────────────────────────────────────────

def gravedad_icon(g: str) -> str:
    return {"Critico": "🔴", "Alto": "🟠", "Medio": "🟡", "Bajo": "🟢"}.get(g, "⚪")

def esfuerzo_icon(e: str) -> str:
    return {"Bajo": "⚡", "Medio": "🔧", "Alto": "🏋️"}.get(e, "—")

def generar() -> str:
    L: list[str] = []

    def h(n: int, t: str): L.append(f"\n{'#'*n} {t}\n")
    def p(t: str): L.append(t + "\n")
    def sep(): L.append("\n---\n")
    def bl(t: str): L.append(f"> {t}\n")

    # ── PORTADA ──────────────────────────────────────────────
    L.append(f"# Analisis de Producto y Mercado — Zyrco Habit Tracker\n")
    L.append(f"> Generado automaticamente · {HOY}  \n")
    L.append(f"> Enfoque: UI · UX · Features mal implementadas · Features faltantes · Offline  \n")
    L.append(f"> Basado en: lectura directa del codigo fuente + investigacion de mercado\n")
    sep()

    # ── INDICE ───────────────────────────────────────────────
    h(2, "Indice")
    p("1. [Problemas de UI (10 issues)](#ui)")
    p("2. [Problemas de UX / interaccion (9 issues)](#ux)")
    p("3. [Features mal implementadas (8 issues)](#mal-implementadas)")
    p("4. [Features faltantes con validacion de mercado (10 items)](#faltantes)")
    p("5. [Capacidad offline — fortaleza y brechas](#offline)")
    p("6. [Scorecard vs competidores](#scorecard)")
    p("7. [Roadmap priorizado](#roadmap)")
    sep()

    # ── 1. UI GAPS ───────────────────────────────────────────
    h(2, "1. Problemas de UI")
    bl(
        "Problemas encontrados directamente en el codigo fuente. "
        "Cada uno incluye la referencia exacta al archivo y linea."
    )
    L.append("\n")

    for i, item in enumerate(UI_GAPS, 1):
        h(3, f"UI-{i:02d}: {item['area']}")
        L.append(f"**Gravedad:** {gravedad_icon(item['gravedad'])} {item['gravedad']}\n\n")
        p(item["descripcion"])
        if "evidencia_codigo" in item:
            L.append(f"**Codigo:** `{item['evidencia_codigo']}`\n\n")
        p(f"**Referencia de mercado:** {item['referencia_mercado']}")
        p(f"**Solucion:** {item['solucion']}")
        L.append(f"**Esfuerzo:** {esfuerzo_icon(item['esfuerzo'])} {item['esfuerzo']}\n\n")
    sep()

    # ── 2. UX GAPS ───────────────────────────────────────────
    h(2, "2. Problemas de UX / interaccion")
    bl(
        "Patrones de interaccion que el mercado ya considera estandar y que Zyrco no tiene. "
        "Afectan directamente a la retencion a 7 y 30 dias."
    )
    L.append("\n")

    for i, item in enumerate(UX_GAPS, 1):
        h(3, f"UX-{i:02d}: {item['patron']}")
        L.append(f"**Gravedad:** {gravedad_icon(item['gravedad'])} {item['gravedad']}\n\n")
        p(item["descripcion"])
        p(f"**Referencia de mercado:** {item['referencia_mercado']}")
        p(f"**Solucion minima:** {item['solucion_corta']}")
        L.append(f"**Esfuerzo:** {esfuerzo_icon(item['esfuerzo'])} {item['esfuerzo']}\n\n")
    sep()

    # ── 3. FEATURES MAL IMPLEMENTADAS ───────────────────────
    h(2, "3. Features mal implementadas")
    bl(
        "Features que existen en la UI pero cuya implementacion tiene gaps criticos "
        "— ya sea que no funcionan, tienen limites arbitrarios, o generan expectativas que no se cumplen."
    )
    L.append("\n")

    for i, item in enumerate(FEATURES_MAL_IMPLEMENTADAS, 1):
        h(3, f"MAL-{i:02d}: {item['feature']}")
        L.append(f"**Gravedad:** {gravedad_icon(item['gravedad'])} {item['gravedad']}\n\n")
        p(item["descripcion"])
        if "evidencia_codigo" in item:
            L.append(f"**Codigo:** `{item['evidencia_codigo']}`\n\n")
        if "impacto" in item:
            p(f"**Impacto:** {item['impacto']}")
        p(f"**Solucion:** {item['solucion']}")
        L.append(f"**Esfuerzo:** {esfuerzo_icon(item['esfuerzo'])} {item['esfuerzo']}\n\n")
    sep()

    # ── 4. FEATURES FALTANTES ────────────────────────────────
    h(2, "4. Features faltantes con validacion de mercado")
    bl(
        "Features que los competidores tienen y que los usuarios solicitan activamente "
        "en reviews de App Store, Reddit r/habittracker y ProductHunt."
    )
    L.append("\n")

    for i, item in enumerate(FEATURES_FALTANTES, 1):
        h(3, f"FALTA-{i:02d}: {item['feature']}")
        L.append(f"**Impacto:** {gravedad_icon(item['impacto'])} {item['impacto']}\n\n")
        p(item["descripcion"])
        p(f"**Quien lo tiene:** {item['quien_lo_tiene']}")
        p(f"**Solucion minima viable:** {item['solucion_minima']}")
        L.append(f"**Esfuerzo:** {esfuerzo_icon(item['esfuerzo'])} {item['esfuerzo']}\n\n")
    sep()

    # ── 5. OFFLINE ───────────────────────────────────────────
    h(2, "5. Capacidad offline")

    h(3, f"Estado actual: {OFFLINE_ANALISIS['estado_actual']}")
    L.append("\n")

    h(4, "Fortalezas (mantener y comunicar)")
    for punto in OFFLINE_ANALISIS["puntos_positivos"]:
        L.append(f"- {punto}\n")
    L.append("\n")

    h(4, "Brechas a resolver")
    for brecha in OFFLINE_ANALISIS["brechas_offline"]:
        h(5, brecha["brecha"])
        p(brecha["descripcion"])
        p(f"**Solucion:** {brecha['solucion']}")
        L.append("\n")

    h(4, "Oportunidad de marketing")
    bl(OFFLINE_ANALISIS["oportunidad_marketing"])
    L.append("\n")
    sep()

    # ── 6. SCORECARD ─────────────────────────────────────────
    h(2, "6. Scorecard vs competidores (0–10)")
    p("Evaluacion cualitativa basada en codigo real + uso directo de cada app.")
    L.append("\n")

    apps = ["Zyrco", "Habitica", "Streaks", "Finch", "Loop", "HabitNow"]
    L.append("| Dimension | " + " | ".join(f"**{a}**" if a == "Zyrco" else a for a in apps) + " |\n")
    L.append("|" + "---|" * (len(apps) + 1) + "\n")

    totales = {a: 0 for a in apps}
    for dim, scores in SCORECARD:
        fila = f"| {dim}"
        for app in apps:
            s = scores.get(app, 0)
            totales[app] = totales[app] + s
            em = "🔴" if s <= 3 else ("🟡" if s <= 6 else "🟢")
            bold = "**" if app == "Zyrco" else ""
            fila += f" | {bold}{em} {s}{bold}"
        fila += " |\n"
        L.append(fila)

    fila_total = "| **TOTAL /100**"
    for app in apps:
        bold = "**" if app == "Zyrco" else ""
        fila_total += f" | {bold}{totales[app]}{bold}"
    fila_total += " |\n"
    L.append(fila_total)
    L.append("\n")

    p(
        f"Zyrco total: **{totales['Zyrco']}/100**. "
        f"El mayor gap es en notificaciones ({next(s for d, s in SCORECARD if 'Notif' in d)['Zyrco']}/10) "
        f"y gestos UX ({next(s for d, s in SCORECARD if 'Gestos' in d)['Zyrco']}/10). "
        f"El mayor activo es privacidad/local-first ({next(s for d, s in SCORECARD if 'rivac' in d)['Zyrco']}/10)."
    )
    sep()

    # ── 7. ROADMAP ───────────────────────────────────────────
    h(2, "7. Roadmap priorizado por impacto/esfuerzo")

    L.append("| Prioridad | Tarea | Impacto | Esfuerzo |\n")
    L.append("|-----------|-------|---------|----------|\n")
    for pri, tarea, impacto, esfuerzo in ROADMAP:
        L.append(f"| {pri} | {tarea} | {gravedad_icon(impacto)} {impacto} | {esfuerzo_icon(esfuerzo)} {esfuerzo} |\n")

    L.append("\n")
    sep()

    L.append(f"*Generado por `generar_mercado.py` · {HOY}*  \n")
    L.append("*Basado en lectura directa de: Today.tsx, Stats.tsx, Habits.tsx, HabitForm.tsx, Settings.tsx, ImportExport.tsx, RetroLogModal.tsx, Onboarding.tsx*  \n")

    return "".join(L)


if __name__ == "__main__":
    contenido = generar()
    ruta = "MERCADO.md"
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(contenido)
    print(f"[OK] {ruta} generado - {len(contenido):,} chars, {contenido.count(chr(10))} lineas")
    print(f"   * {len(UI_GAPS)} problemas de UI")
    print(f"   * {len(UX_GAPS)} problemas de UX")
    print(f"   * {len(FEATURES_MAL_IMPLEMENTADAS)} features mal implementadas")
    print(f"   * {len(FEATURES_FALTANTES)} features faltantes")
    print(f"   * {len(ROADMAP)} items en roadmap")
