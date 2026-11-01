// Se ejecuta solo en las páginas del SGVA. No inicia sesión, no navega y no pulsa nada por el
// usuario: cuando ÉL abre el detalle de una solicitud («Ver - Aplicar»), agrega un botón
// «Guardar en Etapa Productiva» que copia los datos visibles a una lista de la extensión.

// Puede cargarse dos veces (como content script y desde el popup): solo se activa una.
(() => {
if (window.__epSgvaActivo) return;
window.__epSgvaActivo = true;
console.info('[Etapa Productiva] Listo para guardar solicitudes del SGVA');

const CLAVE_LISTA = 'solicitudesSgva';
const ID_BOTON = 'ep-guardar-solicitud';

/** Títulos tal como aparecen en el detalle de la solicitud del SGVA. */
const ETIQUETAS = [
  'Departamento',
  'Ciudad',
  'Persona de contacto',
  'Dirección',
  'Teléfono',
  'Correo electrónico',
  'Perfil',
  'Funciones a desarrollar',
  'Aprendices requeridos',
  'Aprendices aplicados',
  'Fecha de creación',
  'Fecha de cierre',
];

const limpiar = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
const mismoTexto = (a, b) => limpiar(a).toLowerCase() === limpiar(b).toLowerCase();

// ---- 1. Recordar la tarjeta en la que el usuario pulsó «Ver - Aplicar» ----

let ultimaTarjeta = null;

/** Sube desde el botón hasta el contenedor que tiene una sola vez «Aprendices requeridos»: la tarjeta. */
function buscarTarjeta(elemento) {
  for (let n = elemento.parentElement; n && n !== document.body; n = n.parentElement) {
    const veces = (n.innerText.match(/Aprendices requeridos/gi) ?? []).length;
    if (veces === 1) return n;
    if (veces > 1) return null;
  }
  return null;
}

function datosDeTarjeta(tarjeta) {
  const lineas = tarjeta.innerText.split('\n').map(limpiar).filter(Boolean);
  const [empresa, ubicacion = ''] = lineas;
  const [departamento, ciudad] = ubicacion.split(/\s+-\s+/);
  return { empresa, departamento, ciudad };
}

document.addEventListener(
  'click',
  (ev) => {
    // «Ver - Aplicar» puede ser un botón, un enlace o un div con onclick: subimos desde lo
    // que se pulsó hasta el elemento cuyo texto es exactamente ese.
    let boton = ev.target instanceof Element ? ev.target : null;
    while (boton && boton !== document.body && !/^ver\s*-\s*aplicar$/i.test(limpiar(boton.innerText || boton.value))) {
      boton = boton.parentElement;
    }
    if (!boton || boton === document.body) return;
    const tarjeta = buscarTarjeta(boton);
    ultimaTarjeta = tarjeta ? datosDeTarjeta(tarjeta) : null;
  },
  true,
);

/** Si no vimos el clic, buscamos la única tarjeta con la misma ciudad y fechas que el detalle. */
function tarjetaPorDatos(d) {
  const valor = (texto, etiqueta) => limpiar(new RegExp(`${etiqueta}\\s*:?\\s*([^\\n]*)`, 'i').exec(texto)?.[1]);
  const candidatas = [...document.querySelectorAll('div, li, article, section, td')]
    .filter((n) => esVisible(n) && !esDetalle(n) && (n.innerText.match(/Aprendices requeridos/gi) ?? []).length === 1)
    // Nos quedamos con los contenedores más pequeños (la tarjeta, no la fila que la contiene).
    .filter((n, _, todas) => !todas.some((otra) => otra !== n && n.contains(otra)))
    .filter((n) => {
      const t = datosDeTarjeta(n);
      return (
        mismoTexto(t.ciudad, d.Ciudad) &&
        mismoTexto(valor(n.innerText, 'Fecha de cierre'), d['Fecha de cierre']) &&
        mismoTexto(valor(n.innerText, 'Fecha de creación'), d['Fecha de creación']) &&
        mismoTexto(valor(n.innerText, 'Aprendices requeridos'), d['Aprendices requeridos'])
      );
    });
  const nombres = new Set(candidatas.map((n) => datosDeTarjeta(n).empresa));
  return nombres.size === 1 ? [...nombres][0] : '';
}

// ---- 2. Leer el detalle de la solicitud ----

/** Toma el texto entre cada «Etiqueta:» y la siguiente etiqueta. */
function leerDetalle(contenedor) {
  const texto = contenedor.innerText.replace(/ /g, ' ');
  const posiciones = ETIQUETAS.map((etiqueta) => {
    // Primero con «:»; si el SGVA no lo pone, la etiqueta al inicio de una línea.
    const m = new RegExp(`${etiqueta}\\s*:`, 'i').exec(texto) ?? new RegExp(`(^|\\n)\\s*${etiqueta}\\s*(?=\\n|\\S)`, 'i').exec(texto);
    return m ? { etiqueta, inicio: m.index, fin: m.index + m[0].length } : null;
  })
    .filter(Boolean)
    .sort((a, b) => a.inicio - b.inicio);

  const datos = {};
  posiciones.forEach((p, i) => {
    const hasta = posiciones[i + 1]?.inicio ?? texto.length;
    // El último valor trae pegados los textos de los botones (Aplicar, Cerrar y el nuestro).
    datos[p.etiqueta] = limpiar(texto.slice(p.fin, hasta).replace(/(\s*(Aplicar|Cerrar|Guardar en Etapa Productiva|✓[^\n]*))+\s*$/, ''));
  });

  // El programa es el título que va antes de la primera etiqueta.
  const antes = texto.slice(0, posiciones[0]?.inicio ?? 0).split('\n').map(limpiar);
  datos.Programa = antes.filter((l) => l && !/detalle de la solicitud|^[×x]$/i.test(l)).pop() ?? '';
  return datos;
}

function armarSolicitud(contenedor) {
  const d = leerDetalle(contenedor);
  let empresa = ultimaTarjeta && mismoTexto(ultimaTarjeta.ciudad, d.Ciudad) ? ultimaTarjeta.empresa : '';
  if (!empresa) empresa = tarjetaPorDatos(d);
  if (!empresa) {
    // No sabemos de qué tarjeta vino (por ejemplo, se abrió de otra forma): se lo preguntamos.
    empresa = limpiar(window.prompt('¿Cuál es el nombre de la empresa de esta solicitud?', ultimaTarjeta?.empresa ?? ''));
    if (!empresa) return null;
  }

  const notas = [
    d.Perfil && `Perfil: ${d.Perfil}`,
    d['Funciones a desarrollar'] && `Funciones: ${d['Funciones a desarrollar']}`,
    d['Aprendices aplicados'] && `Aprendices aplicados (al guardar): ${d['Aprendices aplicados']}`,
    'Fuente: SGVA',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    Empresa: empresa,
    Departamento: d.Departamento,
    Ciudad: d.Ciudad,
    'Persona de contacto': d['Persona de contacto'],
    Dirección: d['Dirección'],
    Teléfono: d['Teléfono'],
    'Correo electrónico': d['Correo electrónico'],
    Programa: d.Programa,
    'Aprendices requeridos': d['Aprendices requeridos'],
    'Fecha de cierre': d['Fecha de cierre'],
    Notas: notas,
  };
}

// ---- 3. Botón «Guardar en Etapa Productiva» dentro del detalle ----

async function guardar(contenedor, boton) {
  const solicitud = armarSolicitud(contenedor);
  if (!solicitud) return;
  const { [CLAVE_LISTA]: lista = [] } = await chrome.storage.local.get(CLAVE_LISTA);
  const clave = (s) => [s['Correo electrónico'], s.Ciudad, s.Programa].map((v) => limpiar(v).toLowerCase()).join('|');
  const sinRepetir = lista.filter((s) => clave(s) !== clave(solicitud));
  sinRepetir.push(solicitud);
  await chrome.storage.local.set({ [CLAVE_LISTA]: sinRepetir });

  boton.textContent = `✓ Guardada (${sinRepetir.length} en tu lista)`;
  boton.disabled = true;
  boton.style.background = '#64748b';
}

function crearBoton(contenedor) {
  const boton = document.createElement('button');
  boton.id = ID_BOTON;
  boton.type = 'button';
  boton.textContent = 'Guardar en Etapa Productiva';
  Object.assign(boton.style, {
    background: '#2e7d32',
    color: '#fff',
    border: '0',
    borderRadius: '999px',
    padding: '6px 16px',
    margin: '0 4px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  });
  boton.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    guardar(contenedor, boton);
  });
  return boton;
}

const esVisible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const esDetalle = (n) =>
  /Persona de contacto/i.test(n.innerText) && /Correo electr[oó]nico/i.test(n.innerText) && /Fecha de cierre/i.test(n.innerText);

/**
 * El contenedor del detalle: subimos desde el botón «Cerrar» visible (o desde el título)
 * hasta el primer elemento que tiene los datos de la solicitud. Las tarjetas de la lista
 * no tienen «Persona de contacto», así que no se confunden con el detalle.
 */
function buscarDetalleAbierto() {
  const puntosDePartida = [...document.querySelectorAll('button, a, input[type=button], h1, h2, h3, h4, h5, h6, p, span, div, strong, label')].filter(
    (el) =>
      esVisible(el) &&
      (/^cerrar$/i.test(limpiar(el.innerText || el.value)) ||
        (el.childElementCount <= 1 && /^detalle de la solicitud/i.test(limpiar(el.textContent)))),
  );
  for (const inicio of puntosDePartida) {
    for (let n = inicio.parentElement; n && n !== document.body; n = n.parentElement) {
      if (esDetalle(n)) return n;
    }
  }
  return null;
}

/** Identifica qué solicitud se está viendo, para saber si el detalle cambió. */
function firmaDe(contenedor) {
  const d = leerDetalle(contenedor);
  return [d['Correo electrónico'], d.Ciudad, d.Programa].map((v) => limpiar(v).toLowerCase()).join('|');
}

function revisar() {
  const contenedor = buscarDetalleAbierto();
  if (!contenedor) return;

  // El SGVA reutiliza la misma ventana para todas las solicitudes: si ya tiene nuestro botón
  // pero ahora muestra otra solicitud, lo dejamos listo para guardar la nueva.
  const existente = contenedor.querySelector(`#${ID_BOTON}`);
  const firma = firmaDe(contenedor);
  if (existente) {
    if (existente.dataset.firma !== firma) {
      existente.dataset.firma = firma;
      existente.textContent = 'Guardar en Etapa Productiva';
      existente.disabled = false;
      existente.style.background = '#2e7d32';
    }
    return;
  }

  const boton = crearBoton(contenedor);
  boton.dataset.firma = firma;
  const cerrar = [...contenedor.querySelectorAll('button, a, input[type=button]')].find((b) =>
    /^cerrar$/i.test(limpiar(b.innerText || b.value)),
  );
  if (cerrar) cerrar.insertAdjacentElement('afterend', boton);
  else contenedor.appendChild(boton);
}

// El detalle se abre y se llena sin recargar la página: vigilamos los cambios del documento.
let pendiente = null;
new MutationObserver(() => {
  clearTimeout(pendiente);
  pendiente = setTimeout(revisar, 200);
}).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

revisar();
})();
