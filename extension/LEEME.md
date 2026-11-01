# Extensión «Etapa Productiva: guardar empresas»

Lleva la lista de empresas que estás viendo en el SGVA (o en cualquier página con una tabla) a la app Etapa Productiva.

- **Tus credenciales no se tocan:** entras al SGVA tú mismo, con tu usuario y contraseña. La extensión no los ve ni los guarda.
- **No navega por ti ni descarga nada en segundo plano:** solo lee la pestaña abierta, y solo cuando pulsas su ícono.
- **Nada se guarda sin tu revisión:** la tabla pasa a la página **Importar empresas** de la app, que muestra la misma vista previa que el CSV (válidas, con errores, duplicadas) y espera a que confirmes.

## Instalarla en Chrome (o Edge)

1. Abre `chrome://extensions` (en Edge: `edge://extensions`).
2. Activa **Modo de desarrollador** (arriba a la derecha).
3. Pulsa **Cargar descomprimida** y elige esta carpeta `extension` del proyecto.
4. Fija la extensión con el ícono de la pieza de rompecabezas → 📌, para tenerla a la vista.

Si cambias algún archivo de esta carpeta, pulsa ↻ **Actualizar** en la tarjeta de la extensión.

## Usarla

1. Arranca la app (`npm run db:local` y `npm run dev`) e inicia sesión en http://localhost:5173.
2. En otra pestaña, entra al SGVA con tu usuario y abre la **lista** de empresas u ofertas.
   - Si la lista tiene varias páginas, elige mostrar el máximo de filas por página.
3. Pulsa el ícono de la extensión y elige la tabla (normalmente la más grande).
4. Pulsa **Enviar a Etapa Productiva**. Se abre la página de importación con la vista previa; revisa y confirma.

## Si no funciona

- **«No encontramos tablas»:** la página no usa tablas HTML. Selecciona la información, cópiala y pégala en la app (*Importar → Pegar una tabla*).
- **La app no muestra la tabla:** verifica que iniciaste sesión en la app. La tabla espera hasta 30 minutos; después de iniciar sesión, entra a *Empresas → Importar*.
- **Columnas no reconocidas:** la app necesita al menos una columna con el **nombre** de la empresa y otra con el **correo**. Si los títulos del SGVA son distintos, avísale a quien mantiene la app para agregar esos nombres en `apps/api/src/modules/empresas/importarCsv.service.ts` (lista `ALIAS`).
