# Ritual

**Un rastreador de hábitos offline-first con rachas.**

Ritual es una aplicación nativa para iOS y Android para mantener hábitos, construida con Expo SDK 58, React Native 0.88 y TypeScript. Registra hábitos diarios, con cuota semanal y de días concretos, calcula rachas que sobreviven a un periodo en curso y muestra constancia, un mapa de calor tipo contribución y un desglose por día de la semana — todo a partir de una base de datos SQLite dentro del sandbox privado de la aplicación. No hay backend, ni cuenta, ni analítica y sin permiso de red: nada de lo que registras sale nunca de tu teléfono.

**Licencia:** MIT · **Plataformas:** iOS y Android (Expo SDK 58 / React Native 0.88) · **Acceso a red:** ninguno · **Idiomas:** documentación en inglés y español

- [Pruébalo en 60 segundos](#pruébalo-en-60-segundos)
- [Por qué existe](#por-qué-existe)
- [Funcionalidades](#funcionalidades)
- [Arquitectura](#arquitectura)
- [Pruebas](#pruebas)
- [Scripts](#scripts)
- [Modelo de privacidad](#modelo-de-privacidad)
- [Hoja de ruta](#hoja-de-ruta)
- [Decisiones que defendería en una entrevista](#decisiones-que-defendería-en-una-entrevista)

---

## Por qué existe

La mayoría de las aplicaciones de hábitos se financian con suscripciones, lo que significa que su hoja de ruta es «recolectar más datos y enviar más notificaciones». Yo quería lo contrario: una aplicación cuyo modelo de negocio no exista, para que su único incentivo sea ser útil en el dispositivo que tienes en la mano.

Esa restricción motivó cada decisión de ingeniería interesante de este repositorio. Sin servidor, el modelo de datos tiene que ser sólido en local: consultas relacionales y migraciones en SQLite, un motor de rachas puro y totalmente testeable, y un modelo de fechas que no pueda romperse con el cambio de horario de verano ni con una zona horaria distinta. Offline-first no es una frase de marketing en este repositorio — es la razón por la que la capa de dominio no importa nada de React Native.

Dos detalles de producto importan más de lo que parecen, y los dos están implementados:

1. **Rachas conscientes de la frecuencia.** Un hábito de «3 veces por semana» no puede medirse en días consecutivos. Ritual lo mide en _semanas_ consecutivas, así que una racha de 6 significa seis semanas cumpliendo el objetivo. Ver [ADR 0004](./docs/adr/0004-week-based-streaks-for-quota-habits.md).
2. **Regla de gracia.** Que hoy — o la semana en la que todavía estás — esté sin marcar no rompe la racha. Una racha solo debería morir cuando un periodo que sí podías cumplir quedó sin cumplir.

## Pruébalo en 60 segundos

```bash
git clone https://github.com/Tserriednich-Git/ritual.git
cd ritual
npm install
npx expo start
```

Después escanea el código QR con la app Expo Go en tu iPhone (iOS) o con la cámara / flujo de QR en Android.

En el primer arranque la app crea tres hábitos iniciales — _Move for 20 minutes_, _Read 10 pages_, _Water refill_ — y deliberadamente **cero** registros, para que no aparezca ninguna racha que no hayas ganado. Bórralos en el editor si prefieres empezar de cero.

Requisitos: Node 22 (ver [`.nvmrc`](./.nvmrc)) y npm.

> [!NOTE]
> **Las notificaciones requieren una build de desarrollo en Android.** Expo Go solo incluye sus propios módulos nativos integrados, así que los recordatorios programados con `expo-notifications` no se comportarán ahí. Construye un cliente de desarrollo en su lugar:
>
> ```bash
> npm run prebuild
> npx expo run:android   # o: npx expo run:ios
> ```
>
> o `eas build --profile development --platform android`. Todo lo que no sean recordatorios funciona bien en Expo Go.

## Funcionalidades

### De usuario

| Área                  | Qué hace                                                                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hábitos               | Crear, editar, archivar, desarchivar, eliminar y reordenar (hasta 24 hábitos activos). Archivar es un borrado suave (`archived_at`), así que el histórico sigue alimentando las estadísticas.      |
| Modelos de frecuencia | Todos los días · N veces por semana (cuota semanal, objetivo 1–7) · días concretos de la semana.                                                                                                   |
| Primer arranque       | Se crean tres hábitos iniciales **sin** ningún registro, de modo que no se inventa ninguna racha.                                                                                                  |
| Registro              | Un toque en la pestaña Hoy alterna el día de hoy; repetir el toque es idempotente. Nota corta opcional por día (140 caracteres).                                                                   |
| Rachas                | Por días para hábitos diarios y de días fijos; **por semanas** para hábitos de cuota semanal. La racha más larga nunca es menor que la actual.                                                     |
| Regla de gracia       | Un hoy sin marcar, o una semana en curso, no rompe la racha.                                                                                                                                       |
| Progreso              | Constancia % sobre una ventana de 28 días, mapa de calor tipo contribución, desglose por día de la semana sobre las últimas 12 semanas y una pantalla de detalle por hábito con su franja semanal. |
| Recordatorios         | Notificación local diaria por hábito a la hora `HH:MM` elegida, y una acción «Preview a reminder» en Ajustes. Desactivados salvo que actives uno.                                                  |
| Apariencia            | Tema claro, oscuro o del sistema; preferencia de inicio de semana (domingo/lunes) para la franja semanal.                                                                                          |
| Tus datos             | Exportación JSON y CSV que se escribe en la carpeta de la propia app y se entrega al panel de vista previa/compartir del sistema; importación JSON con modo **fusionar** o **reemplazar**.         |

### De ingeniería

- **Núcleo de dominio puro.** `src/domain` contiene tipos, utilidades de fecha civil, reglas de frecuencia, el motor de rachas, estadísticas, validación y el esquema del fichero de copia de seguridad. No importa nada de React Native, así que las reglas se ejecutan en Node bajo Jest y algún día podrían ejecutarse sin cambios en un servidor.
- **Migraciones de SQLite versionadas.** Solo hacia delante, cada una aplicada dentro de una transacción, controladas con `PRAGMA user_version`; las restricciones `UNIQUE (habit_id, local_date)` y los `CHECK` viven en el propio esquema.
- **Navegación tipada.** React Navigation con un único contrato tipado (`TabsParamList`, `RootStackParamList`): pestañas inferiores (Hoy / Progreso / Ajustes) más una pila nativa para `HabitEditor` y `HabitDetail`.
- **TypeScript estricto.** `strict`, además de `noUncheckedIndexedAccess`, `noImplicitOverride` y `noFallthroughCasesInSwitch` — sin salidas por `any` implícito.
- **Relojes inyectados.** Toda función sensible a fechas recibe `today` como parámetro opcional, así que las pruebas de rachas son deterministas sin mockear `Date`.
- **ESLint con flat config + Prettier**, `expo-doctor` en CI y una CI que ejecuta lint, typecheck y pruebas con cobertura en cada push y pull request.
- **New Architecture** activado y motor Hermes. `react-native-web` y `react-dom` están solo para que el target web pueda empaquetarse; ni `App.tsx` ni `src/` los importan, y el objetivo de producto sigue siendo iOS/Android.

## Arquitectura

Tres reglas sostienen todo el conjunto:

1. Las pantallas nunca hablan con SQLite. Despachan acciones al store y leen selectores derivados.
2. El repository es el único módulo autorizado a usar `expo-sqlite`.
3. `src/domain` es TypeScript puro: sin React, sin React Native, sin imports de Expo. Todo lo que está por debajo puede depender hacia arriba de los tipos de dominio; nada puede depender hacia abajo de la interfaz.

```mermaid
flowchart TD
    UI["src/features/&lt;feature&gt; (pantallas)<br/>src/app/navigation (React Navigation)"] --> STORE["src/store (zustand)<br/>acciones + selectores derivados"]
    STORE --> DB["src/db (repository con expo-sqlite<br/>+ migraciones versionadas)"]
    STORE --> NOTIF["src/notifications<br/>(programación local de recordatorios)"]
    UI --> THEME["src/theme"]
    DB --> DOMAIN["src/domain (TS puro)<br/>types · date · frequency · streak · stats · validation"]
    NOTIF --> DOMAIN
    STORE --> DOMAIN
    UI --> DOMAIN
    DOMAIN -.->|"sin imports de RN / Expo"| STOP[""]
```

Versión en texto plano, para terminal:

```text
  src/app/navigation      src/features/<feature>        src/theme
            |                       |                       |
            +-----------> src/store (zustand) <--------------+
                            |           |
              +-------------+           +--------------+
              |                                       |
      src/db (expo-sqlite)                   src/notifications
              |                                       |
              +-------------> src/domain <------------+
                     TS puro: types, date, frequency,
                     streak, stats, validation
          (no importa nada de React Native / Expo)
```

El dato fluye en una dirección: las filas del repository se mapean a tipos de dominio, el store las guarda y cada número que ves en pantalla _se deriva_ de esas filas en lugar de guardarse. Por eso un toque de registro no «actualiza un contador de racha»; inserta un cumplimiento y deja que `computeStreak` vuelva a derivar la respuesta. Así el número visible no puede desincronizarse de los datos. Detalle completo en [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Pruebas

133 pruebas en 11 suites, todas deterministas: sin mockear el reloj, sin red y sin dispositivo. Se ejecutan con `npm test`.

Configuración actual en `jest.config.js` y `jest.setup.ts`:

- preset `jest-expo`; patrón de pruebas `**/__tests__/**/*.test.{ts,tsx}` (carpetas junto al código);
- `jest.setup.ts` mockea `expo-notifications` y `expo-device`, porque esos módulos nativos no existen bajo Jest;
- la cobertura se recoge solo de la lógica pura sobre la que hay aserciones: `src/domain/**`, `src/store/selectors.ts`, `src/db/mapping.ts`, `src/utils/id.ts` y `src/components/HabitRow.tsx`. Las pantallas quedan fuera a propósito — se verifican en dispositivo, y mezclarlas solo diluiría la cifra;
- umbral sobre ese conjunto: 90 % de sentencias, líneas y funciones, 80 % de ramas. Medido hoy: **96,8 % sentencias, 86,5 % ramas, 99,1 % funciones, 97,9 % líneas**.

Qué fija cada suite:

- **`domain/date`** — ida y vuelta con `YYYY-MM-DD`, rechazo de fechas imposibles como `2026-02-30`, aritmética de días a través de cambios de horario de verano, inicio de semana en lunes y en domingo, claves ISO-8601 que cruzan el año y la ruta de reserva cuando el `Intl` del dispositivo no está disponible.
- **`domain/frequency`** — qué días están programados en cada modelo y `expectedCompletions` en rangos parciales (una cuota semanal nunca exige más de una semana de objetivo por el resto).
- **`domain/streak`** — unidad día frente a semana, racha actual frente a la más larga, la regla de gracia para un hoy sin marcar y una semana en curso sin terminar, y los huecos que sí rompen la racha.
- **`domain/stats`** — constancia en la ventana de 28 días, niveles de las celdas del mapa de calor, tasas por día de la semana y una fecha de creación futura que no borra el histórico.
- **`domain/validation`** — límites de nombre y descripción, tokens de color e icono, objetivo semanal entre 1 y 7, días sin duplicados, formato `HH:MM` y nombres duplicados.
- **`domain/backup`** — ida y vuelta del fichero `ritual.backup` v1, rechazo de contenidos malformados, recuperación entrada por entrada y entrecomillado del CSV.
- **`db/mapping`** — correspondencia fila ↔ dominio, recorte del objetivo y una fila corrupta que degrada en lugar de lanzar.
- **`store/selectors`** — la lista de Hoy, el resumen de Progreso y los totales del gráfico derivados de una instantánea plana.
- **`components/HabitRow`** — los dos objetivos de pulsación (abrir frente a marcar) y sus etiquetas accesibles, con `@testing-library/react-native`.
- **`utils/id`** — forma del identificador, unicidad en 5 000 generciones y orden por marca de tiempo.

Las pantallas (`features/**`) todavía no tienen pruebas automatizadas: el árbol de navegación y las integraciones con SQLite y notificaciones necesitan un runtime. Todo lo que muestran sale de los selectores y funciones de dominio de arriba, que es donde viven las aserciones.

```bash
npm test              # ejecución única
npm run test:watch    # iterar sobre un archivo
npm run test:coverage # aplica el umbral de cobertura
```

## Scripts

| Script                  | Comando                 | Para qué sirve                                                             |
| ----------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `npm start`             | `expo start`            | levantar el servidor de desarrollo y el QR                                 |
| `npm run android`       | `expo start --android`  | conectar a un dispositivo/emulador Android                                 |
| `npm run ios`           | `expo start --ios`      | conectar a un simulador de iOS                                             |
| `npm run web`           | `expo start --web`      | build web con Metro — posible, pero el objetivo de producto es iOS/Android |
| `npm run lint`          | `expo lint`             | lint con la configuración flat de Expo                                     |
| `npm run typecheck`     | `tsc --noEmit`          | comprobar tipos sin emitir                                                 |
| `npm test`              | `jest`                  | ejecutar la suite de pruebas                                               |
| `npm run test:watch`    | `jest --watch`          | modo watch                                                                 |
| `npm run test:coverage` | `jest --coverage`       | cobertura contra el umbral configurado                                     |
| `npm run format`        | `prettier --write …`    | formatear TS/JS/JSON/MD/YAML                                               |
| `npm run format:check`  | `prettier --check …`    | comprobación de formato apta para CI                                       |
| `npm run check`         | lint → typecheck → test | la puerta antes de commit                                                  |
| `npm run doctor`        | `expo-doctor`           | diagnosticar problemas de dependencias/configuración                       |
| `npm run prebuild`      | `expo prebuild`         | regenerar los proyectos `android/` e `ios/`                                |

## Modelo de privacidad

Esto es lo principal, así que se dice sin rodeos:

- **Sin backend.** No hay ningún servidor en este proyecto que ejecutar, desplegar o comprometer.
- **Sin cuentas ni sesiones de terceros.**
- **Sin analítica, sin publicidad, sin reportes de fallos, sin SDKs de rastreo.** No se envía nada a ningún sitio, ni siquiera diagnósticos.
- **El código de la app no usa permisos de red**, y todas las dependencias de tiempo de ejecución listadas en `package.json` son módulos open-source de Expo/React Native que no hacen reportes propios. La única acción hacia fuera de la app es abrir los enlaces alojados a la política de privacidad y a las condiciones en Ajustes mediante el navegador del sistema; la app en sí nunca descarga ni envía nada.
- **Todos los datos del usuario son un archivo SQLite en el sandbox privado de la app.** Borrar la app borra los datos. La copia de seguridad del sistema operativo (iCloud / Google One) puede incluir ese sandbox — ver [la política de privacidad](./legal/PRIVACY_POLICY.md) y [el modelo de amenazas](./SECURITY.md).
- **Las notificaciones son 100 % locales.** Los recordatorios usan disparadores programados de `expo-notifications` en el dispositivo: sin push, sin tokens de registro FCM o APNs, sin payload remoto y sin extensiones de servicio de notificación.
- **Exportar e importar es la vía de portabilidad de datos.** CSV y JSON hacia fuera, JSON hacia dentro, en el dispositivo.

Las declaraciones para las tiendas están documentadas en [`legal/DATA_SAFETY.md`](./legal/DATA_SAFETY.md); `app.json` ya fija `ITSAppUsesNonExemptEncryption: false` para iOS.

## Hoja de ruta

Deliberadamente corta, y sin un orden estricto:

- Widget / actividad en vivo con los hábitos pendientes del día.
- Hacer que la preferencia guardada de inicio de semana (domingo/lunes) determine también las claves de periodo de las rachas, no solo la franja semanal: hoy la franja la respeta pero las rachas semanales usan semanas ISO con lunes.
- Pruebas a nivel de pantalla dentro de un navegador de pruebas, para cubrir los flujos (crear → marcar → archivar → restaurar desde copia) y no solo las derivaciones.
- Vistas de resumen mensual y anual sobre las estadísticas existentes.
- Plantillas de hábitos para objetivos comunes.
- Localización más allá del inglés, usando los helpers de formato sensibles a locale que ya están en las utilidades de fecha.
- Exportación opcional con cifrado (clave derivada por contraseña) para quien enrute sus copias por almacenamiento en la nube.
- Paso de accesibilidad: etiquetas para lector de pantalla por celda del mapa de calor y una ruta sin movimiento reducido.

## Decisiones que defendería en una entrevista

- **Rachas semanales para hábitos de cuota, con regla de gracia.** Las rachas ingenuas de días consecutivos castigan a un hábito de 3 veces por semana por existir un miércoles. [ADR 0004](./docs/adr/0004-week-based-streaks-for-quota-habits.md).
- **Fechas civiles (`YYYY-MM-DD`) en lugar de instantes UTC.** Un registro de hábito es un día de calendario, no un milisegundo. Guardar instantes hace que el horario de verano o los viajes muevan cumplimientos al día equivocado; la aritmética entera de días sobre números de día derivados de UTC evita ambos problemas.
- **SQLite frente a almacenamiento clave-valor.** Las rachas y la constancia son consultas por rango sobre fechas, y cada registro merece una restricción de unicidad. [ADR 0002](./docs/adr/0002-expo-sqlite-over-async-storage-or-watermelondb.md).
- **Sin backend, asumido como postura de producto permanente.** [ADR 0001](./docs/adr/0001-offline-first-no-backend.md) — incluidos los costes: sin sincronización, sin continuidad entre dispositivos, las copias son responsabilidad del usuario.
- **React Navigation en lugar de Expo Router** para esta build. [ADR 0003](./docs/adr/0003-react-navigation-over-expo-router.md) — Expo Router es la recomendación por defecto; aquí es un intercambio deliberado por una navegación explícita y fácil de testear.
- **Estado derivado frente a contadores almacenados.** Guardar el número de la racha invita a que se separe de la tabla de cumplimientos; recalcularlo desde las filas no puede derivar.
- **La capa de dominio no importa nada del framework.** Eso es lo que hace realista un suelo del 90 % de cobertura en el motor de rachas.

## Capturas de pantalla

| Hoy                                                                         | Progreso                                                                            | Editor de hábitos                                                                 | Ajustes                                                                            |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| <img src="./docs/screenshots/ios-today.png" alt="Pantalla Hoy" width="220"> | <img src="./docs/screenshots/ios-progress.png" alt="Pantalla Progreso" width="220"> | <img src="./docs/screenshots/ios-editor.png" alt="Editor de hábitos" width="220"> | <img src="./docs/screenshots/ios-settings.png" alt="Pantalla Ajustes" width="220"> |
| <!-- ![Hoy en Android](./docs/screenshots/android-today.png) -->            | <!-- ![Progreso en Android](./docs/screenshots/android-progress.png) -->            | <!-- ![Editor en Android](./docs/screenshots/android-editor.png) -->              | <!-- ![Ajustes en Android](./docs/screenshots/android-settings.png) -->            |

Son las pantallas reales: el mismo árbol de componentes, el mismo store, el mismo
esquema SQLite y la misma semilla que publica la app, renderizados por el target
web de React Native con las medidas de un iPhone 16 Pro (1290 × 2796) y capturados
sin interfaz de navegador. Dos consecuencias al mirarlas: los números salen de un
fixture de demostración de tres hábitos y ~60 registros que una instalación limpia
no tiene, y no hay barra de estado del sistema porque un navegador no puede
dibujarla. Para enviar a tienda siguen haciendo falta capturas reales en
simulador y dispositivo; el [manifiesto de capturas](./docs/screenshots/README.md)
dice qué va en cada hueco.

## Documentación

| Documento                                                        | Propósito                                                                         |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)                 | Capas, flujo de datos, modelo de fechas, migraciones, política de errores         |
| [`docs/adr/`](./docs/adr)                                        | Las cuatro decisiones de arriba, en forma Contexto / Decisión / Consecuencias     |
| [`docs/RELEASE_PROCESS.md`](./docs/RELEASE_PROCESS.md)           | Subir versión, etiquetar, construir, enviar, revertir                             |
| [`docs/screenshots/README.md`](./docs/screenshots/README.md)     | Qué imagen va en cada hueco                                                       |
| [`legal/PRIVACY_POLICY.md`](./legal/PRIVACY_POLICY.md)           | Política de recolección cero                                                      |
| [`legal/TERMS_OF_SERVICE.md`](./legal/TERMS_OF_SERVICE.md)       | Condiciones tipo EULA, incluido el descargo de no ser dispositivo médico          |
| [`legal/DATA_SAFETY.md`](./legal/DATA_SAFETY.md)                 | Respuestas para Data Safety de Google Play y las etiquetas de privacidad de Apple |
| [`legal/APP_STORE_CHECKLIST.md`](./legal/APP_STORE_CHECKLIST.md) | Lista previa al envío                                                             |
| [`SECURITY.md`](./SECURITY.md)                                   | Política de reporte + modelo de amenazas                                          |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md)                           | Entorno, convenciones, migraciones, expectativas de PR                            |
| [`CHANGELOG.md`](./CHANGELOG.md)                                 | Historial en formato Keep a Changelog                                             |
| [`README.md`](./README.md)                                       | English version                                                                   |

## Licencia

MIT — ver [LICENSE](./LICENSE). Copyright (c) 2026 Gabriel.
