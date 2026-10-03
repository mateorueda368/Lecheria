import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

const PRECIO_QUESERA = 1950;

export default function RegistrarQuesera() {
  const today = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(today);
  const [jornada, setJornada] = useState<'manana' | 'tarde'>('manana');
  const [litros, setLitros] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const litrosNum = parseFloat(litros) || 0;
  const totalCalculado = litrosNum * PRECIO_QUESERA;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (litrosNum <= 0) {
      setMensaje({ type: 'error', text: 'Por favor ingresa una cantidad de litros válida mayor a cero.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc('registrar_entrega_quesera', {
        p_fecha: fecha,
        p_jornada: jornada,
        p_litros: litrosNum,
      });

      if (error) {
        setMensaje({ type: 'error', text: error.message || 'Ocurrió un error al registrar la entrega a quesera.' });
      } else {
        setMensaje({
          type: 'success',
          text: `¡Entrega Registrada! Se despacharon ${litrosNum} L a la quesera por un valor de $${totalCalculado.toLocaleString()} COP (Pendiente de cobro).`,
        });
        setLitros('');
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Entrega a Quesera</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registra leche enviada a la quesera a precio de convenio ($1.950/L).
          </p>
        </div>
        <div className="hidden sm:block">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 capitalize">
            $1.950 / L
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

          {/* Jornada */}
          <div className="space-y-2">
            <label htmlFor="jornada" className="block text-sm font-semibold text-slate-700">
              Jornada
            </label>
            <select
              id="jornada"
              value={jornada}
              onChange={(e) => setJornada(e.target.value as 'manana' | 'tarde')}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium"
            >
              <option value="manana">Mañana</option>
              <option value="tarde">Tarde</option>
            </select>
          </div>
        </div>

        {/* Litros */}
        <div className="space-y-2">
          <label htmlFor="litros" className="block text-sm font-semibold text-slate-700">
            Litros Enviados a Quesera
          </label>
          <div className="relative">
            <input
              type="number"
              id="litros"
              step="0.01"
              min="0.1"
              required
              placeholder="Ej. 100"
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
              className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-xl text-slate-900 font-bold"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <span className="text-slate-400 font-medium">L</span>
            </div>
          </div>
        </div>

        {/* Resumen Acumulado */}
        <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 flex justify-between items-center">
          <div>
            <span className="text-xs text-sky-800 uppercase tracking-wider font-semibold">Valor Acumulado a Liquidar</span>
            <p className="text-2xl font-black text-sky-700">
              ${totalCalculado.toLocaleString('es-CO')} COP
            </p>
          </div>
          <div className="text-right text-xs text-sky-700">
            <p>Convenio: $1.950 / L</p>
            <p>Liquidación quincenal</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-4 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold shadow-md shadow-sky-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
        >
          {loading ? 'Guardando Entrega...' : 'Registrar Entrega a Quesera'}
        </button>
      </form>
    </div>
  );
}
