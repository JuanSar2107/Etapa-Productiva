import { useEffect, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from 'react';

type Variante = 'primario' | 'secundario' | 'peligro';

const estilosBoton: Record<Variante, string> = {
  primario: 'bg-marca-600 text-white hover:bg-marca-700 disabled:bg-marca-600/50',
  secundario: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  peligro: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50',
};

export function Boton({
  variante = 'primario',
  cargando,
  className = '',
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; cargando?: boolean }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${estilosBoton[variante]} ${className}`}
      disabled={disabled || cargando}
      {...props}
    >
      {cargando && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function Campo({
  etiqueta,
  error,
  ayuda,
  id,
  ...props
}: ComponentProps<'input'> & { etiqueta: string; error?: string; ayuda?: string; id: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {etiqueta}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-marca-600/40 ${
          error ? 'border-red-400' : 'border-slate-300'
        }`}
        {...props}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : ayuda && <p className="text-xs text-slate-500">{ayuda}</p>}
    </div>
  );
}

export function CampoTexto({
  etiqueta,
  error,
  id,
  ...props
}: ComponentProps<'textarea'> & { etiqueta: string; error?: string; id: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {etiqueta}
      </label>
      <textarea
        id={id}
        rows={3}
        aria-invalid={!!error}
        className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-marca-600/40 ${
          error ? 'border-red-400' : 'border-slate-300'
        }`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Modal({ titulo, abierto, onCerrar, children }: { titulo: string; abierto: boolean; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [abierto, onCerrar]);

  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-xl leading-none text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tarjeta({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <h2 className="text-base font-semibold">{titulo}</h2>
      {descripcion && <p className="mt-1 text-sm text-slate-500">{descripcion}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const estilosAlerta = {
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  exito: 'bg-marca-50 text-marca-700 ring-marca-100',
  aviso: 'bg-amber-50 text-amber-800 ring-amber-200',
  error: 'bg-red-50 text-red-700 ring-red-200',
};

export function Alerta({ tipo = 'info', children }: { tipo?: keyof typeof estilosAlerta; children: ReactNode }) {
  return <div className={`rounded-lg px-4 py-3 text-sm ring-1 ${estilosAlerta[tipo]}`}>{children}</div>;
}

export function Cargando() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <span className="size-8 animate-spin rounded-full border-4 border-marca-600 border-t-transparent" />
    </div>
  );
}
