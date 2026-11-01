# Etapa Productiva App

Aplicación web para que aprendices del SENA registren empresas para su etapa productiva, les envíen correos personalizados con su hoja de vida **desde su propia cuenta de Gmail** y hagan seguimiento de cada contacto.

> La app **no** se conecta al SGVA, no hace scraping y nunca pide ni guarda la contraseña del SGVA. Las empresas se registran a mano o se importan desde un CSV.

## Estado

| Paso | Funcionalidad | Estado |
| --- | --- | --- |
| 1 | Login con Google, perfil, hoja de vida en PDF, autorización de datos (Ley 1581) | ✅ |
| 2 | CRUD de empresas + importación CSV | ✅ |
| 3 | Plantillas con vista previa | ✅ |
| 4 | Envío por Gmail API con cola y límite diario | ✅ |
| 5 | Panel de seguimiento | ✅ |
| 6 | Recordatorios de seguimiento | ✅ |
| 7 | (Opcional) Detección de respuestas | ⏳ |

## Estructura

```
apps/api        Backend: Express + TypeScript + Prisma (PostgreSQL)
apps/web        Frontend: React + Vite + TypeScript + Tailwind
packages/shared Esquemas Zod y tipos que usan el frontend y el backend
```

Cada módulo del backend (`apps/api/src/modules/*`) tiene sus capas: `*.routes.ts` → `*.controller.ts` → `*.service.ts` → `*.repository.ts`.

## Requisitos

- Node.js 20 o superior
- PostgreSQL 14 o superior. La forma más fácil es Docker (`docker compose up -d db`). Si no tienes Docker, puedes instalar PostgreSQL directamente o usar uno gratuito en la nube (Neon, Supabase) y poner su URL en `DATABASE_URL`.
- Una cuenta de Google para crear el proyecto en Google Cloud

## 1. Configurar Google Cloud

### 1.1 Crear el proyecto y habilitar la Gmail API

1. Entra a <https://console.cloud.google.com/> y crea un proyecto nuevo (por ejemplo, `etapa-productiva`).
2. Ve a **APIs y servicios → Biblioteca**, busca **Gmail API** y pulsa **Habilitar**.

### 1.2 Pantalla de consentimiento OAuth

1. Ve a **APIs y servicios → Pantalla de consentimiento de OAuth** (en consolas nuevas aparece como **Google Auth Platform**).
2. Tipo de usuario: **Externo**.
3. Completa el nombre de la app, el correo de asistencia y el correo de contacto del desarrollador.
4. En **Permisos / Acceso a datos**, agrega:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `.../auth/gmail.send`
5. En **Usuarios de prueba** (Público), agrega los correos de Gmail que van a usar la app.

**Importante sobre el modo "Prueba" (Testing):**
- Solo pueden iniciar sesión los usuarios de prueba que agregues (máximo 100).
- Google caduca la autorización de Gmail **cada 7 días**. Cuando pase, la app mostrará "Volver a conectar con Google" y basta con iniciar sesión otra vez.
- Para quitar estos límites hay que **publicar** la app y pasar la verificación de Google. Como `gmail.send` es un permiso "sensible", Google pedirá una política de privacidad, un dominio verificado y un video que muestre cómo se usa el permiso.

### 1.3 Crear las credenciales

1. Ve a **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**.
2. Tipo de aplicación: **Aplicación web**.
3. **Orígenes de JavaScript autorizados:** `http://localhost:5173`
4. **URIs de redireccionamiento autorizados:** `http://localhost:4000/api/auth/google/callback`
5. Copia el **ID de cliente** y el **Secreto del cliente**.

## 2. Correr el proyecto en local

```bash
npm install
```

npm 11 o superior no ejecuta los scripts de instalación de las dependencias hasta aprobarlos. Prisma y esbuild ya están aprobados en `package.json` (`allowScripts`). Si npm vuelve a advertirlo, corre `npm install-scripts ls`.

Crea el archivo de entorno del backend:

```bash
cp apps/api/.env.example apps/api/.env
```

Completa `apps/api/.env`:
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`: los del paso 1.3.
- `JWT_SECRET` y `TOKEN_ENCRYPTION_KEY`: genéralos con los comandos que aparecen en el mismo archivo.
- `DATABASE_URL`: déjalo así si usas el `docker-compose.yml`.

Levanta la base de datos y aplica las migraciones. Con Docker:

```bash
npm run db:up
```

**Sin Docker:** `npm run db:local` descarga PostgreSQL desde npm y lo deja corriendo en el puerto 5433, con los datos en `apps/api/.pgdata`. Déjalo abierto en su propia terminal y usa esta URL en el `.env`:
`DATABASE_URL="postgresql://etapa:etapa@localhost:5433/etapa_productiva?schema=public"`

```bash
npm run db:local
```

```bash
npm run db:migrate
```

Arranca el backend (puerto 4000) y el frontend (puerto 5173):

```bash
npm run dev
```

Abre <http://localhost:5173> y entra con una de las cuentas de prueba.

### Otros comandos

| Comando | Qué hace |
| --- | --- |
| `npm run typecheck` | Revisa los tipos de los tres paquetes |
| `npm test` | Corre las pruebas del backend |
| `npm run build` | Compila el backend (`apps/api/dist`) y el frontend (`apps/web/dist`) |
| `npm run db:studio` | Abre Prisma Studio para ver la base de datos |

## Importar empresas

En **Empresas → Importar empresas** hay tres formas de traerlas. Todas pasan por la misma vista previa y nada se guarda hasta que confirmas:

- **Archivo CSV:** las reglas están abajo.
- **Pegar una tabla:** selecciona la tabla en el SGVA, otra página o Excel, con los títulos de las columnas incluidos. Cópiala y pégala en la zona indicada.
- **Extensión del navegador:** con tu sesión del SGVA abierta, un clic lleva la tabla de empresas a la app. La extensión no usa tus credenciales ni navega por ti. Instrucciones en [`extension/LEEME.md`](extension/LEEME.md).

Si ninguna columna se llama «correo», la app usa la que tenga correos en la mayoría de sus filas.

### Archivo CSV

Puedes descargar una plantilla desde la misma página. Reglas:

- **Columnas obligatorias:** `nombre` y `correo`. **Opcionales:** `nit`, `sector`, `ciudad`, `sitio_web` y `notas`. También se reconocen variantes como «Razón social», «Correo electrónico», «Municipio» o «Página web», sin importar tildes ni mayúsculas.
- **Separador:** coma o punto y coma (el de Excel en español). Se detecta solo.
- **Codificación:** UTF-8 o Windows-1252 (el formato antiguo de Excel).
- **Límites:** 1 MB y 2000 filas.

La importación tiene dos pasos. Primero el sistema revisa cada fila sin guardar nada y la clasifica:

- **Válida.**
- **Con errores:** por ejemplo, un correo inválido o sin nombre.
- **Duplicada:** el correo ya está registrado o se repite en el archivo.

También muestra avisos, sin bloquear la fila, cuando un NIT se repite o el correo es personal (Gmail, Hotmail…). Luego tú confirmas y solo se guardan las filas válidas.

## Envío de correos

En **Empresas**, selecciona una o varias y pulsa **Enviar correo**. Eliges la plantilla, revisas la vista previa y los correos quedan **programados**; no salen todos de golpe.

- **Horario:** de lunes a viernes, entre 8:00 a. m. y 6:00 p. m. (hora de Colombia).
- **Límite diario:** 15 por defecto, configurable en *Mi perfil*. Cuando se llena, los demás pasan al siguiente día hábil.
- **Espera aleatoria entre correos:** de 2 a 10 minutos por defecto.
- **Revisión antes de cada envío:** si la empresa quedó marcada como «rechazado» o «no contactar» mientras esperaba, el correo se cancela.
- **Adjunto:** cada correo lleva tu hoja de vida en PDF y sale desde tu propia cuenta de Gmail.
- **Errores de Gmail:**
  - Límite de velocidad o falla temporal: se reintenta con espera creciente, hasta 5 intentos.
  - Cuota diaria de Gmail agotada: se pasa al día siguiente.
  - Permiso revocado: la cola se pausa hasta que vuelvas a iniciar sesión.
  - Destinatario rechazado: queda con error y puedes reintentarlo desde **Envíos**.

Para ver cómo llega un correo sin esperar a la cola, abre una plantilla y pulsa **Enviarme una prueba**. Se envía de inmediato a tu propio correo, con «[Prueba]» en el asunto y tu hoja de vida adjunta. El límite es de 5 pruebas cada 15 minutos.

La cola la procesa el mismo servidor del API, que la revisa cada minuto. Para probar sin enviar correos reales, pon `GMAIL_MODO=simulado` en `apps/api/.env`: los envíos se marcan como enviados y solo se imprimen en la consola.

## Panel de seguimiento

**Seguimiento** es la página de inicio.

- **Contadores por estado:** también sirven de filtro.
- **Búsqueda y filtros:** por ciudad y por sector.
- **Orden:** por defecto aparecen primero las empresas contactadas hace más tiempo.
- **Columnas de la tabla:** fecha del último correo, fecha de seguimiento («Sin respuesta · revisar» cuando ya pasaron los días configurados) y número de correos enviados.
- **Cambio de estado:** desde el selector de cada fila, o para varias empresas a la vez. «En cola» no se puede poner a mano: lo asigna la app al programar un correo.
- **Correos en cola:** al marcar una empresa como respondió, rechazado, no contactar, enviado o sin contactar, los correos que tenía en cola **se cancelan**.
- **Historial:** muestra los datos de la empresa, sus notas y todos los correos que se le enviaron.

### Recordatorios de seguimiento

Una empresa **espera seguimiento** cuando está en estado «Enviado» y pasaron los días configurados en *Mi perfil* (7 por defecto) desde el último correo sin que marcaras una respuesta.

- **Dónde se ven:** el menú muestra una insignia con cuántas hay, y el panel muestra un aviso con el botón «Ver cuáles».
- **Qué puedes hacer con cada una, o con varias a la vez:**
  - **Escribir de nuevo:** abre el envío con «Reenviar» activado y elige una plantilla cuyo nombre diga «Seguimiento», si existe. En *Plantillas* puedes crear una sugerida. Si ya le escribiste 2 veces o más, la app recomienda no insistir.
  - **Posponer:** no vuelve a avisar hasta dentro de los mismos días configurados.
  - **Cambiar el estado:** por ejemplo, a «Rechazado» si no hubo respuesta.
- **Al enviar un correo nuevo:** el ciclo vuelve a empezar y se borra cualquier aplazamiento.
- **Si cambias los días en tu perfil:** se recalculan las fechas de todas las empresas.

## Seguridad y datos personales

- **Tokens OAuth cifrados** con AES-256-GCM (`apps/api/src/lib/crypto.ts`). La clave está en `TOKEN_ENCRYPTION_KEY` y nunca se guarda en la base de datos. Si la pierdes o la cambias, los usuarios solo tienen que volver a iniciar sesión.
- **Ningún token de Google llega al navegador.** La sesión es un JWT en una cookie `httpOnly`.
- **Permisos mínimos:** solo `gmail.send`. La app no puede leer el correo del usuario.
- **Hojas de vida privadas:** se guardan en `apps/api/storage/` (fuera de git), solo las descarga su dueño y se valida que el archivo sea realmente un PDF.
- **Ley 1581 de 2012:** antes de usar la app, el usuario acepta la autorización de tratamiento de datos. Desde su perfil puede actualizar sus datos o **eliminar su cuenta**, lo que borra toda su información y revoca el acceso a Gmail. El texto de la autorización (`apps/web/src/pages/AutorizacionDatosPage.tsx`) es una base: ajústalo con los datos del responsable antes de publicar la app.
