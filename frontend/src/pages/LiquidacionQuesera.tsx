import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);

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
          text: `¡Liquidación Cobrada! Se ingresaron $${montoNum.toLocaleString()} COP a la caja física.`,
        });
        setMontoCobro('');
        setConcepto('');
        fetchEntregas();
      }
    } catch (err: any) {
      setMensaje({ type: 'error', text: 'Error inesperado de red o servidor.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Liquidación y Pago de Quesera</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta el saldo acumulado a $1.950/L y registra los cobros recibidos.
          </p>
        </div>
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 capitalize">
            Convenio $1.950 / L
          </span>
        </div>
      </div>

      {/* Tarjetas de Resumen de Liquidación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Litros Pendientes</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">
              {totalLitrosPendientes.toLocaleString()} L
            </span>
            <span className="text-xs text-slate-400 font-medium">Por liquidar</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-sky-600 to-blue-700 rounded-xl p-5 text-white shadow-md shadow-sky-500/10">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-100">Saldo a Favor Acumulado</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black">
              ${totalMontoPendiente.toLocaleString('es-CO')} COP
            </span>
            <span className="text-xs text-sky-100 font-medium">Pendiente de cobro</span>
          </div>
        </div>
      </div>

      {/* Formulario de Cobro de Liquidación */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
        <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">
          Registrar Cobro de Liquidación
        </h3>

        {mensaje && (
          <div className={`p-4 rounded-lg flex items-start gap-3 ${mensaje.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            <div className={`flex-shrink-0 w-5 h-5 mt-0.5 ${mensaje.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {mensaje.type === 'success' ? (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className={`text-sm font-medium ${mensaje.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
              {mensaje.text}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Fecha */}
          <div className="space-y-2">
            <label htmlFor="fecha" className="block text-sm font-semibold text-slate-700">
              Fecha de Cobro
            </label>
            <input
              type="date"
              id="fecha"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium"
            />
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="monto" className="block text-sm font-semibold text-slate-700">
                Monto Recibido ($ COP)
              </label>
              <button
                type="button"
                onClick={() => setMontoCobro(totalMontoPendiente.toString())}
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                Cobrar Total Acumulado
              </button>
            </div>
            <input
              type="number"
              id="monto"
              step="100"
              min="1"
              required
              placeholder="Ej. 390000"
              value={montoCobro}
              onChange={(e) => setMontoCobro(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-lg text-slate-900 font-bold"
            />
          </div>
        </div>

        {/* Concepto */}
        <div className="space-y-2">
          <label htmlFor="concepto" className="block text-sm font-semibold text-slate-700">
            Concepto / Nota (Opcional)
          </label>
          <input
            type="text"
            id="concepto"
            placeholder="Ej. Pago quincena 1 a 15 del mes"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium"
          />
        </div>

        <button
          type="submit"
          disabled={saving || totalMontoPendiente <= 0}
          className="w-full flex justify-center items-center gap-2 py-4 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold shadow-md shadow-sky-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
        >
          {saving ? 'Registrando Liquidación...' : 'Registrar Cobro e Ingresar a Caja'}
        </button>
      </form>

      {/* Lista de Entregas Pendientes */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">Entregas Pendientes en este Período</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent mb-2"></div>
            <p className="text-sm">Cargando entregas a quesera...</p>
          </div>
        ) : entregasPendientes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-sm font-medium">No hay entregas pendientes de cobro.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entregasPendientes.map((item) => (
              <div key={item.id} className="p-4 sm:px-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{item.fecha}</span>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded capitalize font-medium">
                      {item.jornada}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {Number(item.litros).toLocaleString()} L × $1.950
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-lg font-bold text-slate-900">
                    ${Number(item.total).toLocaleString()} COP
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
