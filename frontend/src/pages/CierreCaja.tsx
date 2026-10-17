import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

interface CierreHistorico {
  id: string;
  fecha: string;
  caja_esperada: number;
  caja_fisica: number;
  diferencia: number;
  base_siguiente: number;
  retiro_cierre: number;
  observaciones?: string;
  created_at: string;
}

const fmtCOP = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0 });

export default function CierreCaja() {
  const { profile } = useAuth();
  const isAdmin = profile?.rol === 'administrador';
  const today = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(today);
  const [baseAnterior, setBaseAnterior] = useState(0);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalEgresos, setTotalEgresos] = useState(0);

  const [cajaFisicaInput, setCajaFisicaInput] = useState('');
  const [baseSiguienteInput, setBaseSiguienteInput] = useState('200000');
  const [observaciones, setObservaciones] = useState('');

  const [historicoCierres, setHistoricoCierres] = useState<CierreHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDatosCaja = async () => {
    setLoading(true);
    try {
      const { data: ultCierre } = await supabase
        .from('cierres_caja')
        .select('base_siguiente, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const baseUlt = ultCierre ? Number(ultCierre.base_siguiente) : 0;
      setBaseAnterior(baseUlt);

      let query = supabase.from('movimientos_caja').select('tipo, monto, concepto');
      if (ultCierre?.created_at) {
        query = query.gt('created_at', ultCierre.created_at);
      }

      const { data: movimientos } = await query;

      let ingresos = 0;
      let egresos = 0;
      (movimientos || []).forEach((m) => {
        const montoNum = Number(m.monto);
        if (['ingreso_venta', 'pago_cliente', 'pago_quesera'].includes(m.tipo) || (m.tipo === 'correccion' && montoNum > 0)) {
          ingresos += montoNum;
        } else if (
          (m.tipo === 'egreso_flete' || (m.tipo === 'retiro' && (!m.concepto || !m.concepto.toLowerCase().includes('cierre de caja')))) ||
          (m.tipo === 'correccion' && montoNum < 0)
        ) {
          egresos += Math.abs(montoNum);
        }
      });

      setTotalIngresos(ingresos);
      setTotalEgresos(egresos);

      const { data: cierres } = await supabase
        .from('cierres_caja')
        .select('*')
        .order('created_at', { ascending: false });

      setHistoricoCierres(cierres || []);
    } catch (err) {
      console.error('Error al calcular datos de caja:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatosCaja();
  }, []);

  const cajaEsperada     = baseAnterior + totalIngresos - totalEgresos;
  const cajaFisicaNum    = parseFloat(cajaFisicaInput) || 0;
  const baseSiguienteNum = parseFloat(baseSiguienteInput) || 0;
  const diferencia       = cajaFisicaNum - cajaEsperada;
  const retiroCalculado  = cajaFisicaNum > baseSiguienteNum ? cajaFisicaNum - baseSiguienteNum : 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (!isAdmin) {
      setMensaje({ type: 'error', text: 'Solo administradores pueden realizar el cierre de caja.' });
      return;
    }

    if (cajaFisicaInput === '') {
      setMensaje({ type: 'error', text: 'Por favor ingresa el dinero físico contado.' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('realizar_cierre_caja', {
        p_fecha: fecha,
        p_caja_fisica: cajaFisicaNum,
        p_base_siguiente: baseSiguienteNum,
        p_observaciones: observaciones.trim() || null,
      });

      if (error) {
        setMensaje({ type: 'error', text: error.message || 'Error al realizar el cierre de caja.' });
      } else {
        setMensaje({
          type: 'success',
          text: `¡Cierre exitoso! Base siguiente: ${fmtCOP(baseSiguienteNum)} — Retiro: ${fmtCOP(retiroCalculado)} COP.`,
        });
        setCajaFisicaInput('');
        setObservaciones('');
        fetchDatosCaja();
      }
    } catch {
      setMensaje({ type: 'error', text: 'Error inesperado de red o servidor.' });
    } finally {
      setSaving(false);
    }
  };

  /* ──────────────────────────── JSX ──────────────────────────── */
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Control y Cierre de Caja</h1>
          <p className="mt-1 text-sm text-slate-400">
            Arqueo físico de dinero vs. caja esperada y entrega de retiros.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border
                         bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
          Control Financiero
        </span>
      </div>

      {/* Admin guard */}
      {!isAdmin && (
        <div className="card-dark border-amber-500/30 p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-amber-300 font-medium">
            Solo administradores pueden realizar el cierre de caja. Puedes ver el historial.
          </p>
        </div>
      )}

      {/* Métricas en tiempo real */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-dark-2 p-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Base Anterior</span>
          <p className="text-xl font-bold text-slate-200 mt-1">{fmtCOP(baseAnterior)}</p>
        </div>
        <div className="card-gradient-emerald rounded-xl p-4">
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">(+) Ingresos</span>
          <p className="text-xl font-bold text-emerald-300 mt-1">+{fmtCOP(totalIngresos)}</p>
        </div>
        <div className="card-gradient-rose rounded-xl p-4">
          <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider">(-) Egresos</span>
          <p className="text-xl font-bold text-rose-300 mt-1">-{fmtCOP(totalEgresos)}</p>
        </div>
        <div className="rounded-xl p-4 bg-gradient-to-br from-emerald-600/90 to-teal-600/80 shadow-lg">
          <span className="text-[10px] font-black text-emerald-100 uppercase tracking-wider">(=) Caja Esperada</span>
          <p className="text-2xl font-black text-white mt-1">{fmtCOP(cajaEsperada)}</p>
        </div>
      </div>

      {/* Formulario de arqueo */}
      {isAdmin && (
        <form onSubmit={handleSubmit} className="card-dark p-6 space-y-6">
          <h3 className="font-bold text-slate-100 text-lg border-b border-slate-800 pb-3">
            Arqueo Físico de Dinero
          </h3>

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
            <div className="space-y-2">
              <label htmlFor="fecha" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Fecha de Cierre
              </label>
              <input
                type="date" id="fecha" required
                value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="input-dark w-full px-4 py-3 font-semibold"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="cajaFisica" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Dinero Físico Contado ($)
              </label>
              <input
                type="number" id="cajaFisica" step="100" min="0" required
                placeholder="Ej. 350000"
                value={cajaFisicaInput} onChange={(e) => setCajaFisicaInput(e.target.value)}
                className="input-dark w-full px-4 py-3 font-bold text-lg"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="baseSiguiente" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Base Siguiente Período ($)
              </label>
              <input
                type="number" id="baseSiguiente" step="100" min="0" required
                placeholder="200000"
                value={baseSiguienteInput} onChange={(e) => setBaseSiguienteInput(e.target.value)}
                className="input-dark w-full px-4 py-3 font-bold text-lg"
              />
            </div>
          </div>

          {/* Diferencia y retiro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`rounded-xl p-4 flex justify-between items-center border ${
              diferencia === 0
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : diferencia > 0
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-rose-500/10 border-rose-500/30'
            }`}>
              <div>
                <span className={`text-[10px] uppercase font-black tracking-wider ${
                  diferencia === 0 ? 'text-emerald-400' : diferencia > 0 ? 'text-blue-400' : 'text-rose-400'
                }`}>Diferencia de Caja</span>
                <p className={`text-2xl font-black mt-0.5 ${
                  diferencia === 0 ? 'text-emerald-300' : diferencia > 0 ? 'text-blue-300' : 'text-rose-300'
                }`}>
                  {diferencia > 0 ? `+${fmtCOP(diferencia)}` : fmtCOP(diferencia)}
                </p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-slate-900/60 ${
                diferencia === 0 ? 'text-emerald-300' : diferencia > 0 ? 'text-blue-300' : 'text-rose-300'
              }`}>
                {diferencia === 0 ? '✓ Cuadre Perfecto' : diferencia > 0 ? 'Sobrante' : '⚠ Descuadre'}
              </span>
            </div>

            <div className="card-gradient-purple rounded-xl p-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-violet-400">Retiro al Cierre</span>
                <p className="text-2xl font-black text-violet-200 mt-0.5">{fmtCOP(retiroCalculado)}</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Entregar a Admin
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="observaciones" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Observaciones (Opcional)
            </label>
            <input
              type="text" id="observaciones"
              placeholder="Ej. Cuadre diario quincenal realizado por administración"
              value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
              className="input-dark w-full px-4 py-3 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={saving || loading || cajaFisicaInput === ''}
            className="w-full flex justify-center items-center gap-2 py-4 px-4
                       bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]
                       text-white rounded-xl font-bold shadow-lg shadow-emerald-900/40
                       transition-all disabled:opacity-50 disabled:pointer-events-none
                       glow-emerald"
          >
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
              : 'Confirmar y Realizar Cierre de Caja'
            }
          </button>
        </form>
      )}

      {/* Historial */}
      <div className="card-dark overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-base">Historial de Cierres de Caja</h3>
          <span className="text-xs text-slate-500 font-medium">{historicoCierres.length} registros</span>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14 w-full" />)}
          </div>
        ) : historicoCierres.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-500">Aún no se han realizado cierres de caja.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {historicoCierres.map((cierre) => (
              <div key={cierre.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-200 text-sm">{cierre.fecha}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      cierre.diferencia === 0
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : cierre.diferencia > 0
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}>
                      Dif: {fmtCOP(cierre.diferencia)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Esperada: {fmtCOP(cierre.caja_esperada)} · Físico: {fmtCOP(cierre.caja_fisica)}
                  </p>
                  {cierre.observaciones && (
                    <p className="text-xs text-slate-400 mt-0.5 italic">{cierre.observaciones}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-slate-400 block">Base Sig: {fmtCOP(cierre.base_siguiente)}</span>
                  <span className="text-xs font-bold text-violet-400 block">Retiro: {fmtCOP(cierre.retiro_cierre)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
