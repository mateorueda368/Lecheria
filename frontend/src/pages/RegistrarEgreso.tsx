import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

export default function RegistrarEgreso() {
  const today = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(today);
  const [tipo, setTipo] = useState<'egreso_flete' | 'retiro'>('egreso_flete');
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const montoNum = parseFloat(monto) || 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (montoNum <= 0) {
      setMensaje({ type: 'error', text: 'Por favor ingresa un monto válido mayor a cero.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc('registrar_egreso_caja', {
        p_fecha: fecha,
        p_tipo: tipo,
        p_monto: montoNum,
        p_concepto: concepto.trim() || null,
      });

      if (error) {
        setMensaje({ type: 'error', text: error.message || 'Ocurrió un error al registrar el egreso.' });
      } else {
        const nombreTipo = tipo === 'egreso_flete' ? 'Pago de Flete' : 'Retiro de Caja';
        setMensaje({
          type: 'success',
          text: `¡Éxito! Se registraron $${montoNum.toLocaleString()} COP de salida de caja por ${nombreTipo}.`,
        });
        setMonto('');
        setConcepto('');
      }
    } catch (err: any) {
      setMensaje({ type: 'error', text: 'Error inesperado de red o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 fade-in">
      <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Egresos y Retiros de Caja</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registra salidas de efectivo por fletes o retiros del administrador.
          </p>
        </div>
        <div className="hidden sm:block">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 capitalize">
            Salida de Caja
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
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
          {/* Tipo de Salida */}
          <div className="space-y-2 sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700">
              Tipo de Egreso
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('egreso_flete')}
                className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  tipo === 'egreso_flete'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                🚚 Flete de Leche
              </button>
              <button
                type="button"
                onClick={() => setTipo('retiro')}
                className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  tipo === 'retiro'
                    ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                💼 Retiro / Mantenimiento
              </button>
            </div>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <label htmlFor="fecha" className="block text-sm font-semibold text-slate-700">
              Fecha
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
            <label htmlFor="monto" className="block text-sm font-semibold text-slate-700">
              Monto del Egreso ($ COP)
            </label>
            <input
              type="number"
              id="monto"
              step="100"
              min="1"
              required
              placeholder="Ej. 50000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-lg text-slate-900 font-bold"
            />
          </div>
        </div>

        {/* Concepto / Nota */}
        <div className="space-y-2">
          <label htmlFor="concepto" className="block text-sm font-semibold text-slate-700">
            Concepto / Motivo (Opcional)
          </label>
          <input
            type="text"
            id="concepto"
            placeholder={tipo === 'egreso_flete' ? 'Ej. Pago camión de transporte quincenal' : 'Ej. Entrega a administrador / insumos'}
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-4 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-md shadow-rose-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
        >
          {loading ? 'Guardando Egreso...' : 'Registrar Salida de Caja'}
        </button>
      </form>
    </div>
  );
}
