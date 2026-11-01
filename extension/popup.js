// Ventana que se abre al pulsar el ícono de la extensión.
// 1) Lee las tablas de la pestaña actual (solo cuando el usuario pulsa el ícono: permiso activeTab).
// 2) Guarda la tabla elegida y abre la página de importación de la app, donde puente.js la entrega.

const URL_APP = 'http://localhost:5173';
const MAX_FILAS = 2000;
const MAX_COLUMNAS = 50;
const MAX_CELDA = 2000;

/**
 * Se ejecuta DENTRO de la página visitada, así que debe ser autocontenida.
 * Devuelve las tablas con datos (ignora las tablas de diseño que contienen otras tablas).
 */
function extraerTablas(maxFilas, maxColumnas, maxCelda) {
  const texto = (celda) => (celda.innerText ?? celda.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, maxCelda);
  const filaATexto = (tr) => [...tr.cells].slice(0, maxColumnas).map(texto);

  return [...document.querySelectorAll('table')]
    .filter((t) => !t.querySelector('table'))
    .map((t) => {
      const filas = [...t.rows].filter((tr) => tr.cells.length > 0);
      // El encabezado es la fila de <thead> o la primera fila.
      const filaEncabezado = t.tHead?.rows[t.tHead.rows.length - 1] ?? filas[0];
      const datos = filas.filter((tr) => tr !== filaEncabezado && !t.tHead?.contains(tr));
      return {
        encabezado: filaEncabezado ? filaATexto(filaEncabezado) : [],
        filas: datos.slice(0, maxFilas).map(filaATexto),
        totalFilas: datos.length,
      };
    })
    .filter((t) => t.encabezado.length >= 2 && t.filas.length > 0);
}

const $ = (id) => document.getElementById(id);

function mostrarEstado(html, esError = false) {
  $('estado').innerHTML = `<p class="${esError ? 'error' : ''}">${html}</p>`;
}

async function leerTablasDeLaPestana(tabId) {
  const args = [MAX_FILAS, MAX_COLUMNAS, MAX_CELDA];
  let resultados;
  try {
    // Algunas páginas (como las de sistemas antiguos) muestran las tablas dentro de marcos (iframes).
    resultados = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: extraerTablas, args });
  } catch {
    resultados = await chrome.scripting.executeScript({ target: { tabId }, func: extraerTablas, args });
  }
  return resultados.flatMap((r) => r.result ?? []).sort((a, b) => b.filas.length - a.filas.length);
}

// ---- Solicitudes guardadas desde el detalle del SGVA (ver sgva.js) ----

const CLAVE_LISTA = 'solicitudesSgva';
const COLUMNAS_SGVA = [
  'Empresa',
  'Departamento',
  'Ciudad',
  'Persona de contacto',
  'Dirección',
  'Teléfono',
  'Correo electrónico',
  'Programa',
  'Aprendices requeridos',
  'Fecha de cierre',
  'Notas',
];

async function enviarTabla(tabla) {
  await chrome.storage.local.set({ tablaPendiente: { tabla, creada: Date.now() } });
  await chrome.tabs.create({ url: `${URL_APP}/empresas/importar` });
  window.close();
}

function mostrarSolicitudesGuardadas(lista) {
  mostrarEstado(
    `Tienes <strong>${lista.length}</strong> ${lista.length === 1 ? 'solicitud guardada' : 'solicitudes guardadas'} del SGVA:`,
  );
  const ul = document.createElement('ul');
  ul.style.cssText = 'margin: 0 0 8px; padding-left: 18px; max-height: 180px; overflow: auto;';
  for (const s of lista) {
    const li = document.createElement('li');
    // Datos de la página: siempre como texto, nunca como HTML.
    li.textContent = `${s.Empresa} — ${s.Ciudad || 'sin ciudad'}${s['Correo electrónico'] ? '' : ' (sin correo)'}`;
    ul.appendChild(li);
  }
  $('tablas').replaceChildren(ul);

  const boton = $('enviar');
  boton.hidden = false;
  boton.addEventListener('click', async () => {
    boton.disabled = true;
    await chrome.storage.local.remove(CLAVE_LISTA);
    await enviarTabla({ encabezado: COLUMNAS_SGVA, filas: lista.map((s) => COLUMNAS_SGVA.map((c) => s[c] ?? '')) });
  });

  const vaciar = document.createElement('button');
  vaciar.textContent = 'Vaciar lista';
  vaciar.style.cssText = 'background: #fff; color: #334155; border: 1px solid #cbd5e1;';
  vaciar.addEventListener('click', async () => {
    await chrome.storage.local.remove(CLAVE_LISTA);
    window.close();
  });
  boton.insertAdjacentElement('afterend', vaciar);
}

async function iniciar() {
  const { [CLAVE_LISTA]: guardadas = [] } = await chrome.storage.local.get(CLAVE_LISTA);
  if (guardadas.length > 0) return mostrarSolicitudesGuardadas(guardadas);

  const [pestana] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!pestana?.id || !/^https?:/.test(pestana.url ?? '')) {
    return mostrarEstado('Abre la página con la lista de empresas (por ejemplo, en el SGVA) y vuelve a pulsar el ícono.', true);
  }
  if (pestana.url.startsWith(URL_APP)) {
    return mostrarEstado(
      'Aún no tienes solicitudes guardadas. En el SGVA abre «Ver - Aplicar» y pulsa «Guardar en Etapa Productiva»; ' +
        'luego pulsa este ícono (en el SGVA o aquí) para enviarlas.',
      true,
    );
  }

  let tablas;
  try {
    tablas = await leerTablasDeLaPestana(pestana.id);
  } catch (err) {
    return mostrarEstado(`No se pudo leer esta página: ${err.message}`, true);
  }
  if (tablas.length === 0 && new URL(pestana.url).hostname === 'caprendizaje.sena.edu.co') {
    // Por si Chrome no cargó sgva.js solo (acceso al sitio restringido o pestaña abierta antes
    // de instalar la extensión): al pulsar el ícono, activeTab nos deja activarlo en esta pestaña.
    await chrome.scripting.executeScript({ target: { tabId: pestana.id, allFrames: true }, files: ['sgva.js'] }).catch(() => {});
    return mostrarEstado(
      'En el SGVA las empresas se muestran como tarjetas. Pulsa <strong>«Ver - Aplicar»</strong> en una solicitud y, en el ' +
        'detalle, pulsa <strong>«Guardar en Etapa Productiva»</strong>. Repite con las que te interesen y vuelve aquí para enviarlas.',
    );
  }
  if (tablas.length === 0) {
    return mostrarEstado(
      'No encontramos tablas con datos en esta página. Asegúrate de estar viendo la <strong>lista</strong> de empresas. ' +
        'Si la página no usa tablas, selecciona la información, cópiala y pégala en la app (Importar → Pegar una tabla).',
      true,
    );
  }

  mostrarEstado(
    tablas.length === 1
      ? 'Encontramos esta tabla:'
      : `Encontramos ${tablas.length} tablas. Elige la de las empresas (normalmente la más grande):`,
  );
  $('tablas').innerHTML = tablas
    .map(
      (t, i) => `
      <label class="tabla">
        <input type="radio" name="tabla" value="${i}" ${i === 0 ? 'checked' : ''} />
        <strong>${t.filas.length} filas</strong>${t.totalFilas > t.filas.length ? ` (de ${t.totalFilas})` : ''}
        <span class="columnas"></span>
      </label>`,
    )
    .join('');
  // Los títulos de columna vienen de la página: se insertan como texto, nunca como HTML.
  $('tablas')
    .querySelectorAll('.columnas')
    .forEach((el, i) => (el.textContent = `Columnas: ${tablas[i].encabezado.join(' · ')}`));

  const boton = $('enviar');
  boton.hidden = false;
  boton.addEventListener('click', async () => {
    const elegida = tablas[Number(document.querySelector('input[name=tabla]:checked').value)];
    boton.disabled = true;
    await enviarTabla({ encabezado: elegida.encabezado, filas: elegida.filas });
  });
}

iniciar();
