# PLAN DE REESTRUCTURACIÓN — Zyrco
**Fecha**: Junio 2026 | Basado en: inspección completa del código + ANALISIS.md

---

## Metodología

Este plan cruza la lectura directa del código fuente con las recomendaciones de ANALISIS.md.
Cada ítem incluye: problema real encontrado en el código → impacto en UX → acción concreta → archivos afectados.

Los niveles de prioridad son:
- **🔴 P0 — Crítico**: bloquea distribución o causa confusión fundamental
- **🟠 P1 — Alta**: UX core incompleta o feature prometida no funcionando
- **🟡 P2 — Media**: diferenciación y polish
- **⚪ P3 — Baja**: extras y optimizaciones

---

## NIVEL P0 — CRÍTICO (hacer antes de mostrar la app a nadie)

### P0-01 — El at-risk banner solo aparece en vista diaria (BUG)

**Problema en código**: En `Today.tsx` línea 1147, el banner `.at-risk-banner` está dentro del bloque `{calView === "daily" && ...}`. Si el usuario está en vista mensual o semanal a las 20:00 con hábitos pendientes, nunca ve el aviso. La vista más usada es la mensual (es la default).

**Impacto**: La feature R-06 existe en Settings, tiene i18n, tiene CSS — pero no funciona para la mayoría de usuarios.

**Acción**:
- Mover el banner fuera de los bloques de vista
- Renderizarlo en un contenedor fijo (sticky o fixed) al tope de la página
- Afecta: `src/pages/Today.tsx` (mover JSX del banner al nivel del `<>` raíz)

---

### P0-02 — La barra de filtros está duplicada (DEUDA TÉCNICA)

**Problema en código**: En `Today.tsx`, el JSX del `filter-bar` aparece dos veces:
- Líneas ~1032–1053 (dentro del monthly panel)
- Líneas ~1199–1220 (dentro del daily layout)

El código es idéntico en ambos bloques. Si se cambia algo en uno, hay que recordar cambiarlo en el otro. Esto ya causó un bug cuando se añadió el at-risk banner — solo se añadió en uno de los bloques.

**Impacto**: Deuda técnica que genera bugs futuros garantizados.

**Acción**:
- Extraer `<FilterBar typeFilter hasBad hasGood hasNormal categoryFilter .../>` como componente local
- Usar en ambos layouts
- Afecta: `src/pages/Today.tsx`

---

### P0-03 — "Tareas" ocupa el slot 3 de 5 en el nav (ARQUITECTURA)

**Problema en código**: En `Sidebar.tsx` línea 6–10:
```
{ to: "/",        icon: CalendarCheck, key: "nav.today"  },
{ to: "/habits",  icon: ListChecks,    key: "nav.habits" },
{ to: "/todos",   icon: CheckSquare,   key: "nav.todos"  },  ← slot 3
{ to: "/stats",   icon: BarChart2,     key: "nav.stats"  },
```

Todos compite cognitivamente con Hábitos (ambos son "listas de cosas a hacer"). Un usuario nuevo no entiende la diferencia a primera vista. Stats queda relegada al slot 4.

**Impacto**: Confusión en el primer uso. El producto no comunica claramente que es un habit tracker.

**Acción**:
- Opción recomendada: quitar Todos del nav principal, añadirlo como sección dentro de Settings o como pestaña secundaria dentro de Today
- Nav nuevo: `Hoy → Hábitos → Estadísticas → Ajustes`
- Afecta: `src/components/Sidebar.tsx`, routing en `src/App.tsx`, `src/i18n/locales/*.json`

---

### P0-04 — App icon genérico de Tauri (PERCEPCIÓN)

**Problema**: La app usa el icono por defecto de Tauri. Cualquier usuario que la instale verá el logo de Tauri en la barra de tareas y en el instalador.

**Impacto**: Percepción de app sin terminar. El icono es lo primero que ve el usuario al instalar.

**Acción**:
- Diseñar o generar un icono para Zyrco (puede ser una "Z" estilizada, o un ícono de racha/habit)
- Colocar en `src-tauri/icons/` (PNG 32/128/256/512)
- Actualizar `src-tauri/tauri.conf.json` → `bundle.icon`
- Afecta: `src-tauri/icons/`, `src-tauri/tauri.conf.json`

---

### P0-05 — Notificaciones OS prometidas pero no enviadas (FEATURE FALSA)

**Problema en código**: `src/hooks/useReminders.ts` — el hook llama a `isPermissionGranted` de `@tauri-apps/plugin-notification` pero solo hace `console.log` sin enviar notificaciones reales. El toggle en Settings activa/desactiva algo que no hace nada todavía. Registrado como gap en el propio CLAUDE.md: "OS notification scheduling not yet wired".

**Impacto**: El usuario activa recordatorios, no recibe ninguno, pierde confianza.

**Acción**:
- Implementar scheduling en Rust con un `std::thread::spawn` que duerme hasta la hora configurada y llama a `tauri_plugin_notification::NotificationBuilder`
- Alternativa más simple: polling cada 60s en el hook `useReminders` (ya existente) que comprueba la hora actual vs `reminder_time` de cada hábito y dispara si coincide
- El polling en JS es suficiente mientras la app esté abierta; para background real necesita el thread Rust
- Afecta: `src/hooks/useReminders.ts`, `src-tauri/src/main.rs`

---

## NIVEL P1 — ALTA (UX core completa)

### P1-01 — Badge de progreso en el nav "Hoy"

**Problema en código**: `Sidebar.tsx` — el nav link de "Hoy" no tiene ningún indicador del estado actual. El usuario tiene que navegar a la página para saber cuántos hábitos tiene pendientes.

**Impacto**: Fricción innecesaria. En apps como Habitify, el badge `[3/7]` es el elemento más consultado de la interfaz.

**Acción**:
- Crear hook `useTodayProgress()` que devuelva `{ done, total }` usando `useHabits` + `useDateLogs(today)` + `useStats`
- Añadir el badge en el nav link de "Hoy":
  - `[3/7]` en color amarillo si hay pendientes
  - `[✓]` en verde si todo completado
  - Sin badge si `total === 0`
- En modo icon-only (width ≤ 900px), mostrar como punto de color sobre el icono
- Afecta: `src/components/Sidebar.tsx`, nuevo hook `src/hooks/useTodayProgress.ts`

---

### P1-02 — Habit Detail Page — sin profundidad por hábito

**Problema en código**: No existe ninguna ruta `/habits/:id`. Las tarjetas en `/habits` tienen datos resumidos pero no hay forma de profundizar. El usuario no puede ver su historial anual de un hábito específico, ni su rendimiento por día de la semana.

**Impacto**: Los usuarios que llevan semanas usando la app no tienen forma de analizar su evolución por hábito. Stats es solo global.

**Acción**:
- Nueva ruta: `/habits/:id`
- Nuevo componente: `src/pages/HabitDetail.tsx`
- Contenido:
  1. Header: icono + nombre + color bar + EMA score
  2. Métricas: racha actual, mejor racha, total completados, fecha de creación
  3. `AnnualHeatmap` filtrado para ese hábito (ya existe el componente — añadir prop `habitId`)
  4. Gráfica de barras por día de la semana (lunes–domingo), calculada con los logs del hábito
  5. Últimas 5 notas del log
  6. Botón editar
- Acceso: añadir "Ver detalle" en el menú de contexto de las habit cards en `/habits`
- Afecta: `src/pages/HabitDetail.tsx` (nuevo), `src/pages/Habits.tsx`, `src/App.tsx` (routing), `src/components/AnnualHeatmap.tsx` (prop `habitId`)

---

### P1-03 — Stats sin contexto temporal (no hay ↑/↓)

**Problema en código**: `Stats.tsx` línea 222–231 — las tarjetas muestran valores absolutos. `avgCompletionRate` es un solo número sin comparativa. "68%" no tiene semántica motivacional sin saber si es mejor o peor que antes.

**Impacto**: Las estadísticas no motivan. Un número sin referencia es ruido, no información.

**Acción**:
- En `useStats`, calcular `getOverallStats(period)` para el período ANTERIOR también
- Añadir deltas a las stat cards:
  ```
  68%  ↑ +12%   ← vs. período anterior
  ```
- Color: verde si ↑, rojo si ↓, gris si igual (±2%)
- Afecta: `src/hooks/useStats.ts`, `src/pages/Stats.tsx`

---

### P1-04 — Heatmap anual al fondo de Stats (orden incorrecto)

**Problema en código**: `Stats.tsx` línea 234 — el `AnnualHeatmap` está después de las stat cards y antes del gráfico de barras. En una pantalla estándar, requiere scroll para llegar. Es el elemento más visual y motivador de la página.

**Impacto**: El elemento que más engancha visualmente está enterrado. Los usuarios no llegan a él.

**Acción**:
- Mover `AnnualHeatmap` al tope de Stats, justo después del header y el period selector
- Orden propuesto: header → period → heatmap → stat cards → activity chart → per-habit
- Afecta: `src/pages/Stats.tsx` (reordenar JSX)

---

### P1-05 — Onboarding no cierra el loop (falta first check-in)

**Problema en código**: `src/components/Onboarding.tsx` — el paso 3 ("celebración") muestra el nombre del hábito creado y un botón "Ir a Hoy". El hábito se crea pero no se marca. El loop de "crear → completar → recompensa" no se cierra.

**Impacto**: El usuario no experimenta el feedback inmediato de marcar su primer hábito. No llega al "primer quick win". Retención en D1 reducida.

**Acción**:
- En el paso "celebrate" del Onboarding, añadir un botón prominente: "¡Marcar mi primer check-in!" que:
  1. Navega a `/` (Today)
  2. Hace que el hábito recién creado esté visualmente resaltado (border o glow animation)
  3. Al marcarlo, dispara el confeti/celebration inmediatamente
- Implementación: pasar el `habitId` recién creado a Today via state de navegación (`useNavigate` con `state: { highlightHabitId }`)
- Afecta: `src/components/Onboarding.tsx`, `src/App.tsx`, `src/pages/Today.tsx`

---

### P1-06 — Sin botón "+" accesible en vista mensual de Today

**Problema en código**: En el monthly layout de `Today.tsx` (líneas 1002–1018), el botón `+` existe en el header del panel lateral (`cal-day-panel-header`), pero en la vista diaria el botón "Nuevo hábito" es prominente (línea 1172). La vista monthly tiene el `+` escondido en el panel.

**Impacto**: Los usuarios en vista mensual tienen que hacer más clicks para crear un hábito.

**Acción**:
- Añadir un FAB (Floating Action Button) persistente en todas las vistas de Today
- Posición: bottom-right, encima del bottom nav en mobile
- En desktop: añadirlo en el sidebar footer como botón "+"
- Afecta: `src/components/Sidebar.tsx`, `src/index.css` (estilos FAB)

---

### P1-07 — Weekly Digest no existe

**Problema**: No hay ningún componente o trigger para el resumen semanal. Es el feature más citado en reviews positivas de Habitify y el de mayor impacto en retención semanal.

**Impacto**: Sin ritual semanal, el usuario solo tiene el feedback diario. La retención a 7+ días es más baja.

**Acción**:
- Nuevo componente: `src/components/WeeklyDigest.tsx` — modal que se muestra al abrir la app el lunes
- Trigger: en `App.tsx`, comparar `new Date().getDay() === 1` (lunes) con `localStorage["zyrco-last-digest"]`
- Contenido calculado de la semana anterior:
  - Tasa de completado (%)
  - Delta vs semana anterior (↑/↓)
  - Hábito más consistente (nombre + días completados)
  - Hábito que más falla (menor tasa)
  - Mensaje motivacional según el nivel de desempeño
- Afecta: `src/components/WeeklyDigest.tsx` (nuevo), `src/App.tsx`

---

### P1-08 — Grace day activo sin indicador visual

**Problema en código**: En `useStats.ts`, `calculateStreak()` permite hasta N días de gracia sin romper la racha. Pero el badge de streak en `StreakBadge.tsx` muestra el número normalmente — no hay ninguna indicación de que el streak se mantiene "con gracia" (ayer no se completó).

**Impacto**: El usuario no sabe que está usando un grace day. Podría creer que su hábito está al día cuando no lo está.

**Acción**:
- En `useStats.ts → calculateStreak()`, devolver también `graceDayActive: boolean` (true si el día de ayer no se completó pero el streak está activo por gracia)
- En `StreakBadge.tsx`, añadir icono ⚡ cuando `graceDayActive === true`
- Tooltip: "Racha activa con día de gracia. Completa hoy para mantenerla."
- Afecta: `src/hooks/useStats.ts`, `src/components/StreakBadge.tsx`

---

## NIVEL P2 — MEDIA (diferenciación y polish)

### P2-01 — Category grouping en /habits

**Problema en código**: `Habits.tsx` renderiza un grid plano (`habits-grid`) con todas las tarjetas en orden de creación. Con 7+ hábitos, la página es una lista sin estructura.

**Impacto**: Cognitivamente costoso con muchos hábitos. Habitify recibe elogios específicamente por el agrupamiento.

**Acción**:
- Agrupar habit cards por `category_id`
- Render: `<CategoryGroup name="" color="" habits=[...]>` con header colapsable por categoría
- Sin categoría: grupo "Sin categoría" al final
- Toggle "agrupar/lista plana" en el header de /habits
- Afecta: `src/pages/Habits.tsx`

---

### P2-02 — Empty states sin personalidad

**Problema en código**: Los empty states de Today (`today.noHabits`), Habits (`habits.noHabits`) y Stats son solo texto plano + botón. No tienen ningún elemento visual.

**Impacto**: Primera impresión pobre para usuarios nuevos. Oportunidad de storytelling perdida.

**Acción**:
- Today vacío: emoji grande (📅, 64px) + texto animado + CTA
- Habits vacío: emoji (✨, 64px) + copy invitador
- Stats vacío: emoji (📊) + explicación de qué aparecerá cuando haya datos
- CSS: `.empty-state-icon { font-size: 3rem; display: block; margin-bottom: 1rem; }`
- Afecta: `src/pages/Today.tsx`, `src/pages/Habits.tsx`, `src/pages/Stats.tsx`

---

### P2-03 — Modales de confirmación sin affordance visual de peligro

**Problema en código**: El modal de eliminar en `Habits.tsx` (línea 311–330) tiene título `t("habits.delete")` + texto + dos botones. No hay ningún color de danger en el encabezado ni icono de alerta. El usuario puede confundir "Eliminar" con "Archivar" en un momento de distracción.

**Impacto**: Riesgo de pérdida accidental de datos. La destrucción debe ser visualmente clara.

**Acción**:
- Añadir `size="sm" danger={true}` prop al Modal de confirmación de borrado
- Cuando `danger=true`: encabezado con fondo rojo suave, icono de alerta (Trash2 en rojo)
- Afecta: `src/components/Modal.tsx`, `src/pages/Habits.tsx`, `src/pages/Today.tsx`

---

### P2-04 — Acento de color personalizable (gratis vs. Habitify Premium)

**Problema**: El primario indigo `#6366f1` es el único color disponible. Los competidores cobran por paletas de color.

**Impacto**: Personalización = inversión emocional = retención.

**Acción**:
- 5–6 paletas predefinidas: Índigo (actual), Verde, Azul, Rosa, Naranja, Aguamarina
- Cada paleta: `--color-primary`, `--color-primary-hover`, `--color-primary-muted`
- Guardado en `localStorage["zyrco-accent"]`
- UI en Settings → Apariencia: botones circulares de color
- Implementación: función `applyAccent(paletteId)` que setea las CSS vars en `document.documentElement`
- Afecta: `src/pages/Settings.tsx`, `src/index.css`

---

### P2-05 — Stats limitado a 90 días (sin vista "todo el tiempo")

**Problema en código**: `Stats.tsx` línea 64–68, los periods son `7 | 30 | 90`. No hay opción de ver todo el historial o un rango personalizado.

**Impacto**: Usuarios de más de 3 meses no pueden ver su progreso completo. Uno de los beneficios de ser local-first (historial ilimitado) no se aprovecha en la UI.

**Acción**:
- Añadir período `"all"` al tipo `Period`
- Label: "Todo" / "All time"
- Cuando `period === "all"`, usar todos los logs sin filtro de fecha
- Afecta: `src/pages/Stats.tsx`, `src/hooks/useStats.ts`

---

### P2-06 — Tooltip en sidebar modo icon-only

**Problema en código**: En CSS, cuando el sidebar colapsa a icon-only (≤900px), los labels desaparecen. No hay `title` ni tooltip. Settings queda como un engranaje sin contexto.

**Impacto**: Usuarios en pantallas medianas (768–900px) pueden perderse.

**Acción**:
- Añadir `title={t(key)}` a los `NavLink` del sidebar (ya hay el texto, solo falta que sea visible en icon-only)
- CSS: en modo icon-only, añadir `::after` pseudo-elemento con tooltip en hover
- O más simple: añadir `title` attribute a cada nav-link (ya funciona nativo en browser)
- Afecta: `src/components/Sidebar.tsx`

---

### P2-07 — Modo Vacaciones (gratis vs. Duolingo freeze de pago)

**Problema**: El sistema de grace days cubre olvidos de 1–2 días. Para vacaciones de 7–14 días, el usuario tiene que pausar cada hábito individualmente.

**Impacto**: Un usuario que se va de vacaciones una semana y no pausa todos sus hábitos verá sus rachas rotas al volver. Esto causa abandono definitivo de la app.

**Acción**:
- En Settings → Rachas: botón "Modo Vacaciones" con selector de fecha de regreso
- Al activar: guarda `localStorage["zyrco-vacation-until"] = "yyyy-MM-dd"`
- En `useStats → calculateStreak()`: si `vacation-until` está activo para ese rango de fechas, no contar esos días como fallos
- En Today: banner informativo "❄️ Modo vacaciones activo hasta [fecha]"
- Afecta: `src/hooks/useStats.ts`, `src/pages/Settings.tsx`, `src/pages/Today.tsx`

---

### P2-08 — Export CSV además de JSON

**Problema**: `ImportExport.tsx` solo exporta JSON. Para usuarios que quieren analizar en Excel o Google Sheets, el JSON es inutilizable.

**Impacto**: Los competidores cobran el CSV export en Premium. Zyrco puede darlo gratis.

**Acción**:
- En `ImportExport.tsx`, añadir botón "Exportar CSV"
- Generar un CSV plano con columnas: `fecha, hábito, categoría, completado, valor, nota`
- Usar `Blob` + link descargable (patrón ya existente en el Export JSON)
- Afecta: `src/components/ImportExport.tsx`

---

### P2-09 — Skeleton UI en carga inicial

**Problema en código**: En `Today.tsx` línea 921–923, cuando `habitsLoading` es true, se muestra solo `<div className="page-loading">{t("common.loading")}</div>`. Mismo patrón en Stats y Habits.

**Impacto**: Percepción de lentitud. La app parece congelada durante 0.5–1s al arrancar.

**Acción**:
- Crear componente `SkeletonHabitRow` — rectángulo gris animado que imita la forma de una habit row
- Mostrar 3–5 skeletons mientras `loading === true`
- CSS animation: `@keyframes skeleton-shimmer` (ya es un patrón establecido)
- Afecta: `src/pages/Today.tsx`, `src/pages/Habits.tsx`, nuevo `src/components/Skeleton.tsx`

---

### P2-10 — Micro-animación en check-in

**Problema**: El check-in binario cambia el icono de `Circle` a `CheckCircle2` en <100ms pero sin animación. El feedback visual existe pero no hay micro-recompensa animada.

**Impacto**: Las apps con mejor retención (Loop, Streaks) tienen una animación satisfactoria al completar. El refuerzo positivo inmediato consolida el hábito de uso.

**Acción**:
- CSS: al hacer check-in, añadir clase `habit-row--just-done` que triggera:
  ```css
  @keyframes habit-check-pop {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
  ```
- La animación dura 300ms y se aplica al `check-btn` y a la `habit-row`
- Se elimina la clase después de 400ms con `setTimeout`
- Afecta: `src/pages/Today.tsx` (handler de toggle), `src/index.css`

---

## NIVEL P3 — BAJA (polish y extras)

### P3-01 — Emoji picker completo

**Problema**: `HabitForm.tsx` tiene ~20 emojis hardcoded. Los usuarios quieren personalizar con cualquier emoji.

**Acción**:
- Integrar `emoji-picker-element` (web component, ~50KB) o implementar un grid buscable de los ~100 emojis más usados en productividad
- Afecta: `src/components/HabitForm.tsx`

---

### P3-02 — Day-of-week insights en Stats

**Problema**: Stats muestra tasa global pero no dice "tus mejores días son los lunes".

**Acción**:
- En Stats o en HabitDetail, añadir mini gráfica de barras horizontal con la tasa de completado por día de la semana (lun–dom), calculada de todos los logs
- Afecta: `src/pages/Stats.tsx` o `src/pages/HabitDetail.tsx` (cuando se implemente P1-02)

---

### P3-03 — Drag & drop reorder en Today

**Problema**: El orden de los hábitos en Today es por `created_at` o por racha/nombre (sort). No hay forma de reordenar manualmente.

**Acción**:
- Añadir columna `sort_order INTEGER DEFAULT 0` en la tabla `habits` via migration
- Usar `@dnd-kit/core` para drag & drop en la lista
- Persistir el nuevo orden en DB
- Afecta: `src/db/database.ts`, `src/pages/Today.tsx`, `src/hooks/useHabits.ts`

---

### P3-04 — System Tray (check-in sin abrir la app)

**Problema**: Sin system tray, el usuario tiene que abrir Zyrco para saber qué tiene pendiente. Es el gap más grande vs. apps móviles con widget.

**Complejidad**: Alta — requiere Rust + IPC + ventana secundaria.

**Acción**:
- Plugin `tauri-plugin-tray-icon`: icono en bandeja con tooltip del progreso
- Click → ventana secundaria `tray-window.html` (sin bordes, 360×400, `always_on_top`)
- La ventana secundaria consume los mismos hooks via Tauri IPC commands
- Afecta: `src-tauri/src/main.rs`, nuevo componente React para la ventana del tray

---

### P3-05 — Correlación entre hábitos en Stats

**Problema**: Stats no muestra relación entre hábitos. "Cuando completas Meditación, completas Ejercicio el 78% del tiempo" es información accionable.

**Acción**:
- Calcular matriz de co-completado: para cada par (habitA, habitB), porcentaje de días donde ambos se completaron / días donde A se completó
- Mostrar las 3 correlaciones más altas en Stats
- Afecta: `src/hooks/useStats.ts`, `src/pages/Stats.tsx`

---

### P3-06 — Skeleton animada para modal de confirmación

Actualmente los modales de confirmación (delete, archive) no tienen ninguna animación de entrada. Un `slide-up` o `scale-in` de 150ms mejora la percepción.

**Acción**: Añadir `@keyframes modal-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }` al Modal component. Afecta: `src/components/Modal.tsx`, `src/index.css`.

---

## RESUMEN — TABLA DE PRIORIDADES

| # | Nombre | Nivel | Impacto | Complejidad | Archivos principales |
|---|--------|-------|---------|-------------|----------------------|
| P0-01 | At-risk banner en todas las vistas | 🔴 P0 | 🔴 Alto | L | Today.tsx |
| P0-02 | Extraer FilterBar como componente | 🔴 P0 | 🟠 Medio | L | Today.tsx |
| P0-03 | Quitar Todos del nav principal | 🔴 P0 | 🔴 Alto | L | Sidebar.tsx, App.tsx |
| P0-04 | App icon personalizado | 🔴 P0 | 🔴 Alto | L | tauri.conf.json, icons/ |
| P0-05 | Notificaciones OS funcionando | 🔴 P0 | 🔴 Alto | M | useReminders.ts, main.rs |
| P1-01 | Badge de progreso en nav | 🟠 P1 | 🔴 Alto | M | Sidebar.tsx, nuevo hook |
| P1-02 | Habit Detail Page | 🟠 P1 | 🔴 Alto | M | nuevo HabitDetail.tsx |
| P1-03 | Stats con deltas temporales | 🟠 P1 | 🟠 Medio | M | useStats.ts, Stats.tsx |
| P1-04 | Heatmap al tope de Stats | 🟠 P1 | 🟠 Medio | L | Stats.tsx |
| P1-05 | Onboarding → first check-in | 🟠 P1 | 🔴 Alto | M | Onboarding.tsx, Today.tsx |
| P1-06 | FAB "+" global | 🟠 P1 | 🟠 Medio | M | Sidebar.tsx |
| P1-07 | Weekly Digest | 🟠 P1 | 🔴 Alto | M | nuevo WeeklyDigest.tsx |
| P1-08 | Grace day indicator en badge | 🟠 P1 | 🟡 Bajo | M | useStats.ts, StreakBadge.tsx |
| P2-01 | Category grouping en /habits | 🟡 P2 | 🟠 Medio | M | Habits.tsx |
| P2-02 | Empty states con personalidad | 🟡 P2 | 🟠 Medio | L | Today.tsx, Habits.tsx, Stats.tsx |
| P2-03 | Modal peligro visual | 🟡 P2 | 🟠 Medio | L | Modal.tsx |
| P2-04 | Acento de color personalizable | 🟡 P2 | 🟠 Medio | M | Settings.tsx, index.css |
| P2-05 | Stats → período "Todo el tiempo" | 🟡 P2 | 🟠 Medio | L | Stats.tsx, useStats.ts |
| P2-06 | Tooltip en icon-only sidebar | 🟡 P2 | 🟡 Bajo | L | Sidebar.tsx |
| P2-07 | Modo Vacaciones | 🟡 P2 | 🟠 Medio | M | useStats.ts, Settings.tsx |
| P2-08 | Export CSV | 🟡 P2 | 🟡 Bajo | L | ImportExport.tsx |
| P2-09 | Skeleton UI en carga | 🟡 P2 | 🟠 Medio | M | Today.tsx, Habits.tsx |
| P2-10 | Micro-animación en check-in | 🟡 P2 | 🟠 Medio | L | Today.tsx, index.css |
| P3-01 | Emoji picker completo | ⚪ P3 | 🟡 Bajo | M | HabitForm.tsx |
| P3-02 | Day-of-week insights | ⚪ P3 | 🟡 Bajo | M | Stats.tsx |
| P3-03 | Drag & drop reorder | ⚪ P3 | 🟡 Bajo | H | Today.tsx, database.ts |
| P3-04 | System Tray | ⚪ P3 | 🔴 Alto | H | main.rs, nuevo componente |
| P3-05 | Correlación entre hábitos | ⚪ P3 | 🟡 Bajo | M | useStats.ts, Stats.tsx |
| P3-06 | Animación en modales | ⚪ P3 | 🟡 Bajo | L | Modal.tsx, index.css |

**Leyenda complejidad**: L = baja (<2h), M = media (2–8h), H = alta (8h+)

---

## SPRINT SUGERIDO — Orden de ejecución

### Sprint A — "Base sólida" (P0s + quick P1s) — estimado: 1–2 días

1. P0-01: Fix at-risk banner (mover fuera del bloque calView) — 30min
2. P0-02: Extraer FilterBar como componente — 45min
3. P0-03: Quitar Todos del nav (mover a Settings o eliminar) — 1h
4. P1-04: Heatmap al tope de Stats — 15min (reordenar JSX)
5. P2-02: Empty states con personalidad — 1h
6. P2-03: Modal danger visual — 45min
7. P2-06: Tooltip en sidebar icon-only — 15min
8. P2-10: Micro-animación en check-in — 45min

### Sprint B — "UX completa" (P1s principales) — estimado: 3–4 días

1. P1-01: Badge de progreso en nav
2. P1-02: Habit Detail Page (/habits/:id)
3. P1-03: Stats con deltas temporales
4. P1-05: Onboarding → first check-in
5. P1-07: Weekly Digest
6. P1-08: Grace day indicator (⚡ en badge)

### Sprint C — "Diferenciación" (P2s de mayor impacto) — estimado: 3–5 días

1. P0-05: Notificaciones OS (si no se hizo antes)
2. P2-01: Category grouping en /habits
3. P2-04: Acento de color personalizable
4. P2-05: Stats → "Todo el tiempo"
5. P2-07: Modo Vacaciones
6. P2-08: Export CSV
7. P2-09: Skeleton UI

### Sprint D — "Features premium gratis" (P3s) — estimado: 5–10 días

1. P3-04: System Tray (el más impactante de P3)
2. P3-01: Emoji picker
3. P3-02: Day-of-week insights
4. P3-03: Drag & drop reorder
5. P3-05: Correlación entre hábitos
