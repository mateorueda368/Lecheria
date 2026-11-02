import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

interface EntregaQuesera {
  id: string;
  fecha: string;
  jornada: string;
  litros: number;
  precio_unitario: number;
  total: number;
  estado: string;
}

export default function LiquidacionQuesera() {
  const { profile } = useAuth();
  const isAdmin = profile?.rol === 'administrador';
  const today = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(today);
  const [entregasPendientes, setEntregasPendientes] = useState<EntregaQuesera[]>([]);
  const [montoCobro, setMontoCobro] = useState('');
  const [concepto, setConcepto] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchEntregas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('entregas_quesera')
        .select('*')
        .eq('estado', 'pendiente')
        .order('fecha', { ascending: false });

      if (error) throw error;
      setEntregasPendientes(data || []);
    } catch (err) {
      console.error('Error al cargar entregas quesera:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntregas();
  }, []);

  const totalLitrosPendientes = entregasPendientes.reduce((acc, item) => acc + Number(item.litros), 0);
  const totalMontoPendiente = entregasPendientes.reduce((acc, item) => acc + Number(item.total), 0);
  const montoNum = parseFloat(montoCobro) || 0;

  const handleCobrarTodo = () => {
    setMontoCobro(totalMontoPendiente.toString());
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (!isAdmin) {
      setMensaje({ type: 'error', text: 'Solo administradores pueden registrar cobros de liquidación a la quesera.' });
      return;
    }

    if (montoNum <= 0) {
      setMensaje({ type: 'error', text: 'Por favor ingresa un monto válido mayor a cero.' });
      return;
    }

    if (montoNum > totalMontoPendiente) {
      setMensaje({
        type: 'error',
        text: `El monto ($${montoNum.toLocaleString()}) supera el acumulado pendiente de la quesera ($${totalMontoPendiente.toLocaleString()}).`,
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.rpc('registrar_pago_quesera', {
        p_fecha: fecha,
        p_monto: montoNum,
        p_concepto: concepto.trim() || null,
      });

      if (error) {
        setMensaje({ type: 'error', text: error.message || 'Ocurrió un error al registrar el pago de la quesera.' });
      } else {
        setMensaje({
          type: 'success',
          text: `¡Liquidación Cobrada! Se ingresaron $${montoNum.toLocaleString('es-CO')} COP en efectivo a la caja física.`,
        });
        setMontoCobro('');
        setConcepto('');
        fetchEntregas();
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
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 text-lg">💰</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Liquidación de Quesera (Cobro)</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Registra el desembolso periódico recibido del convenio quesero. Marca entregas como pagadas e ingresa el dinero a caja.
          </p>
        </div>

        <span className="self-start sm:self-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 uppercase tracking-wider">
          Módulo Exclusivo Admin
        </span>
      </div>

      {mensaje && (
        <div className={`p-4 rounded-xl flex items-start gap-3 border animate-fade-in ${
          mensaje.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <span className="text-lg">{mensaje.type === 'success' ? '✅' : '⚠️'}</span>
          <p className="text-xs sm:text-sm font-medium">{mensaje.text}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Acumulado Pendiente $ */}
        <div className="bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-900 p-6 rounded-2xl border border-teal-500/30 shadow-xl flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Total Pendiente por Cobrar</span>
            <span className="text-2xl">🧀</span>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              ${totalMontoPendiente.toLocaleString('es-CO')} <span className="text-sm font-semibold text-teal-400">COP</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Equivalente a {totalLitrosPendientes.toLocaleString()} Litros de leche entregados
            </p>
          </div>
          {totalMontoPendiente > 0 && (
            <button
              type="button"
              onClick={handleCobrarTodo}
              className="mt-2 py-2 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all self-start shadow-md shadow-teal-500/20 active:scale-95"
            >
              Cobrar Liquidación Total ($ {totalMontoPendiente.toLocaleString()})
            </button>
          )}
        </div>

        {/* Despachos */}
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entregas por Liquidar</span>
            <span className="text-2xl">📋</span>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {entregasPendientes.length} <span className="text-sm font-semibold text-slate-400">Despachos</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">Convenio a $1.950 por litro</p>
          </div>
          <Link
            to="/quesera"
            className="text-xs text-teal-400 hover:text-teal-300 font-bold self-start mt-2"
          >
            + Registrar nueva entrega de hoy →
          </Link>
        </div>

      </div>

      {/* Formulario de Cobro */}
      {loading ? (
        <div className="card-dark border-slate-800 p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400">Consultando entregas y liquidación de quesera...</p>
        </div>
      ) : totalMontoPendiente > 0 ? (
        <div className="card-dark border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            Registrar Pago Recibido de la Quesera
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Fecha */}
              <div className="space-y-2">
                <label htmlFor="fecha" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Fecha del Recibo
                </label>
                <input
                  type="date"
                  id="fecha"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 font-medium focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all text-sm"
                />
              </div>

              {/* Monto */}
              <div className="space-y-2">
                <label htmlFor="monto" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Monto Recibido ($ COP)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="monto"
                    step="any"
                    min="1"
                    max={totalMontoPendiente}
                    required
                    placeholder="0"
                    value={montoCobro}
                    onChange={(e) => setMontoCobro(e.target.value)}
                    className="w-full pl-5 pr-14 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xl font-black text-teal-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder:text-slate-700"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                    COP
                  </span>
                </div>
              </div>
            </div>

            {/* Concepto */}
            <div className="space-y-2">
              <label htmlFor="concepto" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Concepto / Referencia Quincenal
              </label>
              <input
                type="text"
                id="concepto"
                placeholder="Ej. Liquidación quincena 1 (marzo) recibida en efectivo"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-all text-sm font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-teal-500/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Liquidando y Actualizando Caja...
                </>
              ) : (
                <>
                  <span>Ingresar Liquidación a Caja Física</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-2">
          <span className="text-3xl">✅</span>
          <h3 className="text-base font-bold text-teal-400">Liquidación al día</h3>
          <p className="text-xs text-slate-400">No hay entregas pendientes de cobro con la quesera en este momento.</p>
        </div>
      )}

      {/* Lista de Entregas Pendientes */}
      {entregasPendientes.length > 0 && (
        <div className="card-dark border-slate-800 p-6 space-y-4 shadow-xl">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Detalle de Entregas Pendientes ({entregasPendientes.length})
          </h3>

          <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto pr-1">
            {entregasPendientes.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                    item.jornada === 'manana' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    {item.jornada === 'manana' ? '☀️ Mañana' : '🌙 Tarde'}
                  </span>
                  <span className="text-xs font-bold text-slate-200">{item.fecha}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-white block">
                    ${Number(item.total).toLocaleString('es-CO')} COP
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {Number(item.litros).toLocaleString()} Litros
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation shortcuts */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <Link to="/historial-caja" className="hover:text-teal-400 transition-colors">
          Ver historial de movimientos de caja →
        </Link>
        <Link to="/" className="hover:text-slate-300 transition-colors">
          ← Volver al Dashboard
        </Link>
      </div>

    </div>
  );
}
