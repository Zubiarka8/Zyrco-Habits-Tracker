# ANALISIS.md — Zyrco: Qué Necesita para Triunfar
**Fecha**: Junio 2026 | **Versión actual**: 0.1.0 | **Stack**: Tauri 2 + React 19 + SQLite

---

## Índice

1. [Estado actual — inventario honesto](#1-estado-actual)
2. [Análisis del Navbar / Navegación](#2-navbar--navegación)
3. [UI: fortalezas y debilidades](#3-ui-fortalezas-y-debilidades)
4. [UX: flujos críticos y puntos de fricción](#4-ux-flujos-críticos)
5. [Gap Analysis — qué falta para competir](#5-gap-analysis)
6. [Prioridades de implementación](#6-prioridades)
7. [Features premium de competencia — implementar gratis en Zyrco](#7-features-premium-gratis)
8. [Propuestas concretas de mejora](#8-propuestas-concretas)
9. [Resumen ejecutivo](#9-resumen-ejecutivo)

---

## 1. Estado Actual

### Lo que funciona bien (keep)

| Feature | Estado | Nota |
|---------|--------|------|
| Check-in diario (binary) | ✅ | Tap único, feedback visual |
| Check-in numérico (stepper) | ✅ | Funcional, UI aceptable |
| Check-in timer | ✅ | Funcional; se resetea en navegación (by design) |
| Agrupación por sesión (mañana/tarde/noche) | ✅ | Validado por Habitify como el patrón más elogiado |
| Streak + badge visual | ✅ | Badge coloreado por rango |
| EMA Strength Score 0–100 | ✅ | Único vs. competencia |
| Annual Heatmap | ✅ | Feature validado (HabitKit) |
| Milestone badges 7/21/30/66/100 | ✅ | Toast + corona en racha |
| Grace days configurables (0/1/2) | ✅ | Settings |
| Onboarding first-run | ✅ | Overlay 3 steps |
| Template library (27 templates, bilingual) | ✅ | EN/ES, 6 categorías |
| Retroactive logging (30 días) | ✅ | Modal desde Habits |
| Pause habit (3/7/14/30 días) | ✅ | Filtrado de Today |
| Compact view toggle | ✅ | Header de Today |
| At-risk banner (20:00, streak >= 3) | ✅ | Descartable |
| Category system (color + icon, CRUD) | ✅ | |
| Import / Export JSON | ✅ | Settings |
| Dark / Light / System theme | ✅ | CSS custom props |
| i18n EN + ES | ✅ | react-i18next |
| Responsive (900/600px) | ✅ | Desktop/tablet/mobile |
| Skip day individual | ✅ | Por hábito, por día |
| Notes per log | ✅ | Modal |

### Lo que falta (gap)

| Feature | Impacto | Esfuerzo |
|---------|---------|----------|
| System Tray (check-in sin abrir app) | 🔴 Crítico | M |
| Notificaciones OS funcionando | 🔴 Crítico | M |
| Habit Detail Page | 🔴 Alto | M |
| Weekly Digest | 🟠 Alto | M |
| Smart notifications | 🟠 Alto | H |
| Category grouping en /habits | 🟠 Medio | L |
| Drag & drop reorder | 🟡 Medio | M |
| Insights por día de la semana | 🟠 Medio | M |
| Comparativa temporal en Stats (↑/↓) | 🟠 Medio | L |
| Custom app icon | 🔴 Crítico (percepción) | L |
| Heatmap mensual en Stats | 🟡 Bajo | M |

---

## 2. Navbar / Navegación

### Estructura actual

```
Sidebar (desktop)
├── [Z] Zyrco          ← brand
├── 📅 Hoy             ← /
├── 📋 Hábitos         ← /habits
├── ✅ Tareas          ← /todos
├── 📊 Estadísticas    ← /stats
└── ⚙️ Ajustes         ← /settings (footer)
```

```
Bottom Nav (mobile ≤600px)
├── 📅 Hoy
├── 📋 Hábitos
├── ✅ Tareas
├── 📊 Estadísticas
└── ⚙️ Ajustes
```

### Problemas detectados

#### A. "Tareas" no encaja en la misión del producto

Zyrco es un habit tracker. Los Todos son una categoría diferente de producto — task management. Su presencia en la barra principal:
- Compite cognitivamente con "Hábitos" (ambos son listas de cosas a hacer)
- Genera confusión: "¿los hábitos son diferentes a las tareas?"
- Ocupa el slot #3 de 5, empujando Stats a #4

**Evidencia**: Los trackers que mezclan habit + todo reciben críticas de que "el producto no sabe qué quiere ser". Loop Habit Tracker (4.8★, 59.500+ reseñas) elimina cualquier feature que no sea habit tracking puro.

**Opciones**:
1. **Mover Todos a Settings** → funcionalidad secundaria (recomendado)
2. **Integrar con hábitos** → una tarea es un hábito de frecuencia "una vez"
3. **Mantener pero relegar** → sacar del nav, accesible desde Settings

#### B. El sidebar no comunica el progreso del día

La barra lateral es estática. El usuario tiene que navegar a "Hoy" para saber cuántos hábitos tiene pendientes. Habitify muestra un mini-contador en el nav item de Today.

**Fix**: Badge de progreso en el nav item "Hoy":
- `[3/7]` en amarillo si hay pendientes
- `[✓]` en verde si todo completado
- En modo icon-only: punto de color en el icono

#### C. Sin botón de acción rápida global

Para añadir un hábito, el usuario debe navegar a /habits. Las apps más valoradas tienen un FAB accesible desde cualquier pantalla.

**Fix**: Botón "+" en el footer del sidebar (o FAB en mobile) con:
- Marcar hábito rápido (dropdown de hábitos de hoy)
- Crear hábito nuevo
- Añadir nota rápida al log del día

#### D. Sin tooltip en modo icon-only

En pantallas de 768–900px, el sidebar colapsa a solo iconos. Settings queda como un engranaje sin label. Los usuarios nuevos pueden no encontrarlo.

**Fix**: Tooltip en hover para todos los items en modo icon-only.

#### E. Sin micro-animación en tabs de mobile

El bottom nav no tiene transición al cambiar de sección. En táctil, el feedback visual de navegación es parte de la UX.

**Fix**: `scale: 1.1` + `transition` en el icono del tab activo.

### Navbar propuesto

```
Sidebar (desktop)
├── [Z] Zyrco    · 4/7 hoy    ← progreso inline, pequeño y en color
├── 📅 Hoy       [4/7]         ← badge: amarillo si pendiente, verde si completo
├── 📋 Hábitos
├── 📊 Estadísticas
├── [+] Acción rápida           ← FAB expandible
└── ⚙️ Ajustes                  ← footer

Todos: eliminado del nav principal, movido a Settings
```

---

## 3. UI: Fortalezas y Debilidades

### Fortalezas

**1. Sistema de colores coherente**
CSS custom properties hacen que dark mode funcione sin parches. El primario indigo #6366f1 es elegante. Las habit cards usan `--habit-color` para personalización por hábito.

**2. Densidad correcta en Today**
Progreso (X/Y), perfect day banner, sesiones agrupadas, hábitos con streak + color. Equilibrio entre información y claridad visual.

**3. StreakBadge reconocible**
Badge coloreado por rango (blanco → naranja → dorado) + número. La corona 🏆 en milestone es discreta y efectiva.

**4. HabitForm completo pero manejable**
Muchos campos bien organizados en secciones. Preview de "próximos 8 días" es una feature rara y valiosa que ningún competidor tiene.

**5. Compact view es una apuesta acertada**
Pocos apps ofrecen toggle de densidad. Usuarios con 7+ hábitos lo necesitan.

### Debilidades

**1. Habit cards en /habits son genéricas**
El color del hábito aparece solo como barra lateral de 4px. Las cards necesitan más personalidad: icono más prominente, color de acento en el header de la card.

**2. Stats no emociona**
El gráfico de barras es funcional pero no diferenciador. El heatmap anual (elemento más atractivo) está al final — debería estar arriba. Las métricas no tienen contexto temporal (sin ↑/↓ vs. período anterior).

**3. Empty states son texto plano**
Sin ilustración, sin personalidad. Oportunidad de storytelling perdida. Cada empty state debería tener un emoji grande (64px) + copy que invite a la acción de forma personal.

**4. Brand débil**
La "Z" en cuadrado no comunica nada. Necesita icono personalizado antes de distribución pública.

**5. Modales de confirmación fríos**
Los modals de "¿Eliminar?" no tienen icono ni color de alerta. La destrucción de datos necesita affordance visual de "danger" más claro (encabezado en rojo).

**6. Sin skeleton UI**
En arranque solo hay texto "Cargando...". Una skeleton haría la app sentirse más rápida.

**7. Emoji picker limitado**
Solo ~20 emojis hardcoded. Los usuarios esperan elegir cualquier emoji en 2026.

---

## 4. UX: Flujos Críticos

### Flujo 1: Check-in diario — el más importante

**Estado actual**:
1. Abrir app → Today (~0.5s carga)
2. Ver hábitos pendientes (inmediato)
3. Tap en checkmark → marcado en <100ms ✅

**Fricción residual**:
- Hábitos numéricos: 3 pasos (tap → stepper → guardar). Aceptable.
- Timer: Start → esperar → Stop. Sin registro manual de "hice X min ayer" sin retrolog.
- Sin system tray: hay que abrir la app para marcar.

**Objetivo**: menos de 3 segundos desde abrir la app hasta el primer hábito marcado.

### Flujo 2: Crear un nuevo hábito

**Estado actual**: /habits → "Nuevo hábito" → modal completo.

**Fricción residual**:
- Sin "+" accesible desde Today cuando ya hay hábitos creados.
- En mobile, el formulario requiere mucho scroll.

### Flujo 3: Revisar el progreso

**Estado actual**: /stats → período → gráfico → métricas → heatmap (al fondo).

**Fricción residual**:
- Heatmap al fondo: el elemento más visual requiere scroll para llegar.
- Sin comparativa temporal en métricas (sin ↑/↓ vs. mes anterior).
- Sin vista de "mejor semana" o "racha histórica" en lugar prominente.

### Flujo 4: Onboarding (first run)

**Estado actual**: 3 steps: bienvenida → template (3 opciones) → celebración.

**Fricción residual**:
- Solo 3 templates. Un usuario que quiere "beber agua" no ve su hábito.
- El paso 3 (celebración) no incluye el primer check-in — el loop queda abierto.
- **Fix crítico**: el onboarding debe terminar con el usuario habiendo marcado su primer hábito, no solo habiéndolo creado.

### Flujo 5: Recuperación de streak

**Estado actual**: Grace days (0/1/2) ✅, retrolog ✅, sin indicador visual de grace day activo.

**Fricción residual**: El usuario no sabe que está "en grace day". El badge muestra el número normal.

**Fix**: badge con ⚡ cuando el streak se mantiene por grace day activo.

---

## 5. Gap Analysis

### GAP-01: System Tray — CRÍTICO

Las apps de escritorio con mayor retención no requieren que el usuario las abra. El equivalente al widget de iOS en Windows/macOS es el system tray.

- Icono en bandeja del sistema con tooltip del progreso ("3/7 hábitos")
- Click → mini-ventana flotante (360×400px, sin bordes, `always_on_top`)
- Hábitos pendientes + check-in en 1 click
- Cierra al hacer click fuera (on_blur)

**Implementación**: Plugin `tauri-plugin-tray-icon` + ventana secundaria Tauri.

### GAP-02: Notificaciones OS — CRÍTICO

El plugin está instalado y el toggle en UI existe, pero no hay scheduling en background. Sin notificaciones, el at-risk banner de las 20:00 solo se ve si la app ya está abierta.

**Opciones de implementación**:
1. Background thread en Rust que despierta a las HH:MM configuradas (más limpio)
2. Task Scheduler de Windows al cerrar la app
3. Polling cada 5min mientras la app está abierta (fallback simple)

### GAP-03: Habit Detail Page — ALTO

No hay vista de detalle por hábito. El usuario no puede analizar su historial individual ni ver patrones.

**Ruta**: `/habits/:id` con heatmap del hábito, streak actual + mejor, tasa por día de la semana, notas recientes, botón editar.

### GAP-04: Weekly Digest — ALTO

El resumen semanal es el feature más citado en reviews positivas de Habitify. Genera un ritual de revisión que aumenta la adherencia.

**Trigger**: primer arranque del lunes.
**Contenido**: tasa de la semana, mejor hábito, hábito que necesita atención, comparativa con semana anterior.

### GAP-05: Stats sin contexto temporal — MEDIO

"68% de completado" no dice nada sin comparativa.
**Fix**: delta vs. período anterior con flecha de color (↑ verde / ↓ rojo).

### GAP-06: Custom app icon — CRÍTICO (percepción)

El icono de Tauri por defecto es genérico. Es lo primero que ve el usuario al instalar.

### GAP-07: Emoji picker completo — BAJO-MEDIO

Solo ~20 emojis hardcoded en HabitForm. Los usuarios esperan poder elegir cualquier emoji.

---

## 6. Prioridades

### Tier 1 — Obligatorio antes de beta pública

| # | Item | Justificación |
|---|------|---------------|
| T1-01 | App icon personalizado | Primer contacto visual. Sin esto parece inacabada. |
| T1-02 | System Tray básico | Retención en desktop. Diferenciador clave vs. móvil. |
| T1-03 | Notificaciones OS en background | El toggle existe — sin backend es feature falsa. |
| T1-04 | Badge de progreso en nav "Hoy" | Información crítica sin abrir la página. |
| T1-05 | Habit Detail Page (/habits/:id) | Profundidad de análisis por hábito. |

### Tier 2 — Para v1.0 completa

| # | Item | Justificación |
|---|------|---------------|
| T2-01 | Weekly Digest modal | El ritual semanal más valorado en la categoría. |
| T2-02 | Stats con deltas temporales | Contexto en métricas = motivación real. |
| T2-03 | Grace day indicator (⚡ en badge) | Transparencia del sistema de gracia. |
| T2-04 | "+" global / FAB | Crear hábito desde cualquier pantalla. |
| T2-05 | Category grouping en /habits | Coherencia con 7+ hábitos. |
| T2-06 | First check-in en el onboarding | Cerrar el loop: crear + marcar = primer win. |
| T2-07 | Empty states con personalidad | Primera impresión de la app vacía. |

### Tier 3 — Para v1.5 / diferenciación

| # | Item | Justificación |
|---|------|---------------|
| T3-01 | Emoji picker completo | Personalización real en la creación. |
| T3-02 | Skeleton UI en carga | Percepción de velocidad. |
| T3-03 | Day-of-week insights en Stats | "Tus mejores días son lunes y martes." |
| T3-04 | Drag & drop reorder | Control total de la experiencia. |
| T3-05 | Smart notifications | Skip si el hábito ya está completado. |
| T3-06 | Todos → Settings | Limpiar la arquitectura del nav. |

---

## 7. Features Premium de Competencia — Implementar Gratis en Zyrco

Esta sección documenta features que los competidores cobran como premium y que Zyrco puede implementar gratuitamente al ser una app local sin servidor.

### 7.1 Análisis avanzado de datos ilimitado — Premium en Habitify ($4.99/mes) y Bearable ($8.99/mes)

**Lo que cobran**:
- Estadísticas más allá de 7 días de historial
- Gráficas de tendencia y evolución
- Exportación de datos en CSV
- Comparativa entre hábitos

**Por qué Zyrco puede darlo gratis**:
- SQLite local: 0 coste de almacenamiento por usuario
- Sin servidor: no hay coste de cómputo
- El análisis es cálculo en cliente, no en nube

**Implementación**:
- Stats: período ilimitado (actualmente 7/30/90 días — quitar el techo)
- Exportación CSV además de JSON (JSON ya implementado)
- Correlación simple entre hábitos: "cuando completas X, completas Y el 78% del tiempo"
- Gráficas de tendencia mensual por hábito (recharts ya instalado)

### 7.2 Múltiples recordatorios por hábito — Premium en la mayoría de apps

**Lo que cobran**:
- Habitify Premium: múltiples notificaciones por hábito
- Streaks: solo 1 notificación por hábito en free tier
- Loop: sin notificaciones inteligentes en free

**Por qué Zyrco puede darlo gratis**:
- Sin infraestructura de servidor para enviar notificaciones
- Solo requiere scheduling local en Rust
- Sin coste marginal por usuario

**Implementación propuesta**:
- Hasta 3 recordatorios por hábito (HH:MM configurable)
- Skip automático si el hábito ya está completado a esa hora
- Recordatorio "de cierre de día" configurable (p.ej. 21:00 si quedan pendientes)

### 7.3 Streak Shields / Freeze ilimitados — Pago en Duolingo y clones

**Lo que cobran**:
- Duolingo: 1 streak freeze gratuito/mes, más a €2.99 la unidad
- Habitify: streak protection solo en Premium
- Muchos clones: "streak insurance" como microtransacción

**Zyrco lo da gratis y mejor**:
- Grace days configurables (0/1/2) ya son una implementación superior a los shields de un solo uso
- Sin monetización de la ansiedad del usuario

**Mejora propuesta: Modo Vacaciones**:
- Pausa el tracking de TODOS los hábitos por N días sin penalización de streak
- El streak queda "congelado" visualmente (icono ❄️) durante el período
- Reactivación automática al llegar la fecha de regreso
- Sin límite de usos, sin compras, sin tokens

### 7.4 Heatmap y visualizaciones avanzadas — Premium en HabitKit ($2.99/mes)

**Lo que cobran**:
- HabitKit: heatmap separado por mes detrás de paywall
- Bearable: gráficas de correlación en Premium
- Habitify: analytics de 90+ días en Premium

**Zyrco puede darlo gratis**:
- Heatmap anual ya implementado (gratis) ✅
- Añadir: heatmap mensual con separación visual por mes (más legible)
- Gráfica de racha histórica (timeline de streaks)
- Vista de "días perfectos" en calendario

### 7.5 Temas visuales y personalización — Premium en casi todos

**Lo que cobran**:
- Habitify Premium: paletas de color exclusivas ($4.99/mes)
- Streaks: temas en pago
- HabitKit: colores premium

**Zyrco puede darlo gratis**:
- Ya tiene dark/light/system ✅
- Añadir colores de acento personalizables (cambiar el primario indigo por verde/rosa/azul/naranja)
- Implementación: 5–8 paletas predefinidas que sobreescriben `--color-primary` en `<html>`
- Guardado en `localStorage["zyrco-accent"]`
- Sin servidor, 0 coste

### 7.6 Exportación e importación avanzada — Premium en Habitify y Bearable

**Lo que cobran**:
- Habitify: exportación CSV en Premium ($4.99/mes)
- Bearable: exportación a Google Sheets en Premium
- La mayoría: backup automático en la nube en Premium

**Zyrco puede darlo gratis**:
- Export/Import JSON ya implementado ✅
- Añadir: Export CSV para abrir en Excel/Google Sheets
- Añadir: Export filtrado por hábito o rango de fechas
- Backup automático local en carpeta configurable (sin nube = sin coste)

### 7.7 Widgets y acceso rápido — Premium en HabitKit y Streaks

**Lo que cobran**:
- HabitKit: widget de iOS requiere Premium
- Streaks: la app completa es de pago
- Habitify: widget de macOS en Premium

**Zyrco puede darlo gratis**:
- System Tray (equivalente desktop al widget) sin ningún coste adicional
- Al ser app local, no hay backend que escale con usuarios

### 7.8 Hábitos y datos ilimitados — Frecuentemente limitado en free

**Lo que cobran**:
- Habitify free: máx 3 hábitos activos
- HabitKit free: máx 3 hábitos
- Muchos apps: 30 días de historial en free, ilimitado en premium

**Zyrco da ilimitado gratis**:
- Sin límite de hábitos (el aviso de +7 es informativo, no un límite técnico)
- Sin límite de historial (SQLite local, sin coste de almacenamiento)
- Sin límite de períodos de análisis

### 7.9 Correlaciones e insights inteligentes — Solo en apps de pago ($8–15/mes)

**Lo que cobran**:
- Bearable Premium: correlaciones entre hábitos y estado de ánimo ($8.99/mes)
- Habitify Pro: insights de patrones semanales
- Apps de coaching de hábitos con IA: $15+/mes

**Zyrco puede dar versión local gratis**:
- "Tu mejor día de la semana es el martes (82%). Tu peor es el viernes (41%)."
- "Cuando completas Meditación, completas Ejercicio el 78% del tiempo."
- "Tu racha más larga fue del 3 al 24 de febrero (22 días)."
- Todo calculado en cliente con los datos de SQLite — 0 coste de servidor.

### 7.10 Weekly Digest y reportes automáticos — Premium en Habitify

**Lo que cobran**:
- Habitify: weekly report por email en Premium
- Otras apps: notificaciones de logros en Premium tier

**Zyrco puede darlo gratis**:
- Weekly Digest modal en el arranque del lunes (sin email, sin servidor) — pendiente de implementar
- Notificaciones OS de milestone (streak de 7, 21, 30 días) — ya parcialmente implementado
- Resumen del domingo: "Esta semana completaste 5/7 hábitos. ¡Top 3 racha!"

---

## 8. Propuestas Concretas

### Propuesta A: Rediseño del Sidebar

**Actual**:
```
[Z] Zyrco
📅 Hoy
📋 Hábitos
✅ Tareas
📊 Estadísticas
────────────────
⚙️ Ajustes
```

**Propuesto**:
```
[Z] Zyrco    · 3/7 hoy    ← progress inline, pequeño y en color
────────────────
📅 Hoy       [3/7]         ← amarillo si pendiente, verde si completo
📋 Hábitos
📊 Estadísticas
────────────────
⚙️ Ajustes
```

- Todos desaparece del nav principal (o se mueve a Settings)
- Badge [3/7] cambia a [✓] cuando todos completados
- En modo icon-only: punto de color en el icono del nav item

### Propuesta B: Habit Detail Page

Ruta: `/habits/:id` — accesible desde el menú de contexto (···) de cada tarjeta en /habits.

```
← Volver a Hábitos                           [Editar]

🏃 Ejercicio diario    ████████░░  78%   ⚡ EMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Racha actual: 14 días 🏆   Mejor racha: 34 días
Total completados: 127     Creado: 15 ene 2026

[Heatmap anual de este hábito — coloreado con su color]

Rendimiento por día de semana:
Lun  ████████░  89%
Mar  ██████░░░  67%
Mié  █████████  94%
Jue  ██████░░░  63%
Vie  ████░░░░░  45%
Sáb  ███░░░░░░  33%
Dom  ██████░░░  72%

Últimas notas:
· 24 jun: "Buena sesión, 30 min de cardio"
· 21 jun: "Solo 15 min, cansado"
```

### Propuesta C: Weekly Digest

Trigger: primer arranque del lunes (comprobado con `localStorage["zyrco-last-digest"]`).

```
╔══════════════════════════════════╗
║  📊 Tu semana (17–23 jun)        ║
║                                  ║
║  Completado: 72%   ↑ +8%         ║
║                                  ║
║  🏆 Mejor hábito:                ║
║      Meditar — 7/7 días          ║
║                                  ║
║  ⚠️  Necesita atención:           ║
║      Ejercicio — 3/7 días        ║
║                                  ║
║  Esta semana: ¡Sigue así! 💪      ║
║                                  ║
║        [Ver estadísticas]        ║
║        [Cerrar]                  ║
╚══════════════════════════════════╝
```

### Propuesta D: Grace Day indicator en badge

Cuando la racha se mantiene por grace day activo (ayer no completado, el streak aún no cae):

```
[🔥 14⚡]   ← ⚡ indica grace day activo
```

Tooltip: "Racha activa con 1 día de gracia usado. ¡Completa hoy para mantenerla!"

### Propuesta E: System Tray

Icono en bandeja del sistema. Click → mini-ventana (360×400px, sin bordes, `always_on_top`):

```
╔════════════════════════════════════╗
║  Zyrco  ·  Hoy  ·  3/7 completos  ║
║  ████████░░░░░░░░  43%             ║
╠════════════════════════════════════╣
║  ○ Meditar 10 min          [✓]    ║
║  ✓ Ejercicio 30 min               ║
║  ○ Leer 20 min             [✓]    ║
║  ○ Agua 8 vasos            [+]    ║
╠════════════════════════════════════╣
║  [Abrir Zyrco]       [Cerrar]      ║
╚════════════════════════════════════╝
```

Implementación: plugin `tauri-plugin-tray-icon` + ventana secundaria Tauri. Cierra con on_blur.

### Propuesta F: Acento de color personalizable (gratis vs. Habitify Premium)

En Settings → Apariencia:
```
Color de acento:
  [● Índigo]  [● Verde]  [● Azul]  [● Rosa]  [● Naranja]
```

Implementación: 5 paletas que sobreescriben `--color-primary` y `--color-primary-hover` en `<html>`. Guardado en `localStorage["zyrco-accent"]`. Sin servidor, 0 coste adicional.

### Propuesta G: Modo Vacaciones (gratis vs. Duolingo freeze de pago)

Accesible desde Settings → Rachas o desde el menú de cualquier hábito:
```
[❄️ Modo Vacaciones]
  Fecha de regreso: [____-__-__]
  → Pausa todos los hábitos sin penalización de streak
```

- Los hábitos muestran ❄️ en Today durante el período
- El streak queda "congelado" — ni suma ni resta días
- Reactivación automática al llegar la fecha de regreso
- Sin límite de usos, sin compras, sin tokens consumibles

---

## 9. Resumen Ejecutivo

Zyrco está en **estado sólido de MVP funcional** con más features que la mayoría de apps en sus primeras semanas. El EMA Strength Score y el preview de "próximos 8 días" en el formulario son diferenciadores únicos que ningún competidor directo tiene.

**La mayor ventaja competitiva de Zyrco es ser local-first.**

Los competidores cobran premium por:
- Análisis ilimitado → Zyrco: gratis (SQLite local)
- Hábitos ilimitados → Zyrco: gratis (sin servidor)
- Múltiples recordatorios → Zyrco: gratis (scheduling local en Rust)
- Streak freeze/shields → Zyrco: grace days configurables (superior al modelo de shields)
- Temas visuales → Zyrco: pendiente pero trivial de implementar
- Exportación CSV → Zyrco: pendiente, trivial de implementar
- Weekly Digest → Zyrco: pendiente de implementar

**El riesgo principal no es la falta de features — es la visibilidad y el hábito de uso.**

Las apps de habit tracking mueren cuando el usuario olvida usarlas. El único antídoto probado es la presencia constante en el sistema:

1. **System tray** → el usuario lo ve en la barra de tareas y recuerda
2. **Notificaciones OS** → el sistema le avisa
3. **Badge de progreso en nav** → feedback inmediato sin abrir la app

**El segundo riesgo es la primera impresión**: icono genérico de Tauri + onboarding que no cierra el loop de "crear + marcar" = usuarios que no llegan al primer quick win y no vuelven.

**Próximos 3 movimientos en orden de impacto**:
1. App icon personalizado → credibilidad y presentación
2. System tray básico → presencia constante en el escritorio
3. Notificaciones OS en background → el sistema recuerda por el usuario
