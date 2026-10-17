import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

interface Correccion {
  id: string;
  fecha: string;
  modulo: string;
  litros_diferencia: number;
  monto_diferencia: number;
  motivo: string;
  created_at: string;
}

const MODULO_COLORS: Record<string, string> = {
  produccion: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  venta:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
  consumo:    'bg-amber-500/20 text-amber-300 border-amber-500/30',
  quesera:    'bg-teal-500/20 text-teal-300 border-teal-500/30',
  caja:       'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
};

export default function RegistrarCorreccion() {
  const { profile } = useAuth();
  const isAdmin = profile?.rol === 'administrador';
  const today = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(today);
  const [modulo, setModulo] = useState<'produccion' | 'venta' | 'consumo' | 'quesera' | 'caja'>('produccion');
  const [litrosDif, setLitrosDif] = useState('');
  const [montoDif, setMontoDif] = useState('');
  const [motivo, setMotivo] = useState('');

  const [historico, setHistorico] = useState<Correccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCorrecciones = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('correcciones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (err) {
      console.error('Error al cargar correcciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrecciones();
  }, []);

  const litrosNum = parseFloat(litrosDif) || 0;
  const montoNum = parseFloat(montoDif) || 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (!motivo.trim()) {
      setMensaje({ type: 'error', text: 'Por favor ingresa un motivo obligatorio para justificar la corrección.' });
      return;
    }

    if (!isAdmin) {
      if (modulo === 'caja') {
        setMensaje({ type: 'error', text: 'Los trabajadores no pueden realizar ajustes sobre el módulo de caja.' });
        return;
      }
      if (litrosNum === 0) {
        setMensaje({ type: 'error', text: 'Debes ingresar una diferencia en litros (+/-) diferente de cero.' });
        return;
      }
    } else {
      if (litrosNum === 0 && montoNum === 0) {
        setMensaje({ type: 'error', text: 'Ingresa una diferencia en litros o en monto (positiva o negativa).' });
        return;
      }
    }

    setSaving(true);

    try {
      const { error } = await supabase.rpc('registrar_correccion', {
        p_fecha: fecha,
        p_modulo: modulo,
        p_registro_id: null,
        p_litros_diferencia: litrosNum,
        p_monto_diferencia: isAdmin ? montoNum : 0,
        p_motivo: motivo.trim(),
      });

      if (error) {
        setMensaje({ type: 'error', text: error.message || 'Ocurrió un error al registrar la corrección.' });
      } else {
        setMensaje({
          type: 'success',
          text: `¡Corrección registrada! Movimiento compensatorio generado en módulo ${modulo}.`,
        });
        setLitrosDif('');
        setMontoDif('');
        setMotivo('');
        fetchCorrecciones();
      }
    } catch {
      setMensaje({ type: 'error', text: 'Error inesperado de red o servidor.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Correcciones &amp; Ajustes Trazables
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Ajustes de auditoría sin borrar históricos — genera movimientos compensatorios.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border
                         bg-violet-500/15 text-violet-300 border-violet-500/30">
          Auditoría &amp; Trazabilidad
        </span>
      </div>

      {/* Informative Banner for Worker */}
      {!isAdmin && (
        <div className="card-dark p-4 border-indigo-500/30 flex items-start gap-3 bg-indigo-950/20">
          <svg className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-indigo-200 font-semibold">
              Correcciones Operativas Habilitadas
            </p>
            <p className="text-xs text-indigo-300/80 mt-0.5">
              Como trabajador puedes registrar ajustes de litros en producción, ventas, consumo y quesera. Los ajustes financieros en caja son exclusivos del administrador.
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card-dark p-6 space-y-6">
        <h3 className="font-bold text-slate-100 text-lg border-b border-slate-800 pb-3">
          Registrar Nueva Corrección Trazable
        </h3>

        {/* Alert */}
        {mensaje && (
          <div className={`p-4 rounded-xl flex items-start gap-3 border animate-slide-up ${
            mensaje.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-rose-500/10 border-rose-500/30'
          }`}>
            <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${mensaje.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mensaje.type === 'success'
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              }
            </svg>
            <p className={`text-sm font-semibold ${mensaje.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
              {mensaje.text}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {/* Módulo */}
          <div className="space-y-2">
            <label htmlFor="modulo" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Módulo a Corregir
            </label>
            <select
              id="modulo"
              value={modulo}
              onChange={(e) => setModulo(e.target.value as typeof modulo)}
              className="input-dark w-full px-4 py-3 font-semibold capitalize"
            >
              <option value="produccion">Producción (Leche)</option>
              <option value="venta">Venta Directa</option>
              <option value="consumo">Consumo de Finca</option>
              <option value="quesera">Entrega Quesera</option>
              {isAdmin && <option value="caja">Caja Física (Solo Admin)</option>}
            </select>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <label htmlFor="fecha" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Fecha del Registro Original
            </label>
            <input
              type="date"
              id="fecha"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="input-dark w-full px-4 py-3 font-semibold"
            />
          </div>

          {/* Litros */}
          <div className="space-y-2">
            <label htmlFor="litrosDif" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Diferencia Litros (+/-) {isAdmin ? '' : '*'}
            </label>
            <input
              type="number"
              id="litrosDif"
              step="0.01"
              required={!isAdmin}
              placeholder="Ej. -2.5 o +5"
              value={litrosDif}
              onChange={(e) => setLitrosDif(e.target.value)}
              className="input-dark w-full px-4 py-3 font-bold text-lg"
            />
          </div>
        </div>

        {/* Monto */}
        {isAdmin ? (
          <div className="space-y-2">
            <label htmlFor="montoDif" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Diferencia en Caja ($COP) (+/-)
            </label>
            <input
              type="number"
              id="montoDif"
              step="100"
              placeholder="Ej. -5000 o +10000"
              value={montoDif}
              onChange={(e) => setMontoDif(e.target.value)}
              className="input-dark w-full px-4 py-3 font-bold text-lg"
            />
          </div>
        ) : (
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">💰 Ajuste monetario en caja:</span>
              <span className="text-slate-300 font-bold">0 COP</span>
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              Solo Administrador
            </span>
          </div>
        )}

        {/* Motivo */}
        <div className="space-y-2">
          <label htmlFor="motivo" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Motivo Obligatorio *
          </label>
          <textarea
            id="motivo"
            required
            rows={3}
            placeholder="Explica detalladamente por qué se realiza este ajuste…"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="input-dark w-full px-4 py-3 font-medium resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !motivo.trim()}
          className="w-full flex justify-center items-center gap-2 py-4 px-4
                     bg-violet-600 hover:bg-violet-500 active:scale-[0.98]
                     text-white rounded-xl font-bold shadow-lg shadow-violet-900/40
                     transition-all disabled:opacity-50 disabled:pointer-events-none
                     glow-violet"
        >
          {saving
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
            : 'Registrar Corrección Trazable'
          }
        </button>
      </form>

      {/* Historial */}
      <div className="card-dark overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-base">Historial de Auditoría</h3>
          <span className="text-xs text-slate-500 font-medium">{historico.length} registros</span>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-14 w-full" />
            ))}
          </div>
        ) : historico.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500">No hay correcciones registradas.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {historico.map((c) => (
              <div key={c.id} className="p-4 sm:px-6 hover:bg-slate-800/40 transition-colors space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-200 text-sm">{c.fecha}</span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                      MODULO_COLORS[c.modulo] ?? 'bg-slate-700 text-slate-300 border-slate-600'
                    }`}>
                      {c.modulo}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <p className="text-sm text-slate-300 font-medium">
                  <span className="text-slate-500 font-semibold">Motivo: </span>{c.motivo}
                </p>
                <div className="flex gap-4 text-xs font-bold pt-0.5">
                  {Number(c.litros_diferencia) !== 0 && (
                    <span className={Number(c.litros_diferencia) > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      Leche: {Number(c.litros_diferencia) > 0 ? `+${c.litros_diferencia}` : c.litros_diferencia} L
                    </span>
                  )}
                  {Number(c.monto_diferencia) !== 0 && (
                    <span className={Number(c.monto_diferencia) > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      Caja: {Number(c.monto_diferencia) > 0
                        ? `+$${Number(c.monto_diferencia).toLocaleString('es-CO')}`
                        : `-$${Math.abs(Number(c.monto_diferencia)).toLocaleString('es-CO')}`
                      } COP
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
