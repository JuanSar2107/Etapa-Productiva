// Se ejecuta en las páginas de la app (http://localhost:5173) y le entrega la tabla que
// guardó la ventana de la extensión. La página la valida, muestra la vista previa y el
// usuario confirma; la extensión nunca guarda nada en la app por su cuenta.

const MENSAJES = { pedirTabla: 'EP_PEDIR_TABLA', tabla: 'EP_TABLA', recibida: 'EP_TABLA_RECIBIDA' };
const VIGENCIA_MS = 30 * 60 * 1000; // si no se importa en 30 minutos, se descarta

async function entregarTabla() {
  const { tablaPendiente } = await chrome.storage.local.get('tablaPendiente');
  if (!tablaPendiente) return;
  if (Date.now() - tablaPendiente.creada > VIGENCIA_MS) {
    await chrome.storage.local.remove('tablaPendiente');
    return;
  }
  window.postMessage({ tipo: MENSAJES.tabla, tabla: tablaPendiente.tabla }, window.location.origin);
}

window.addEventListener('message', (ev) => {
  if (ev.source !== window) return;
  if (ev.data?.tipo === MENSAJES.pedirTabla) entregarTabla();
  if (ev.data?.tipo === MENSAJES.recibida) chrome.storage.local.remove('tablaPendiente');
});

// Por si la página ya pidió la tabla antes de que este script cargara.
if (window.location.pathname.startsWith('/empresas/importar')) entregarTabla();
