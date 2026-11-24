import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

export default function RegistrarEgreso() {
  const { profile } = useAuth();
  const isAdmin = profile?.rol === 'administrador';
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

    if (!isAdmin) {
      setMensaje({ type: 'error', text: 'Solo administradores pueden registrar egresos o retiros de caja.' });
      return;
    }

    if (montoNum <= 0) {
      setMensaje({ type: 'error', text: 'Por favor ingresa un monto válido mayor a cero.' });
      return;
    }

    if (!concepto.trim()) {
      setMensaje({ type: 'error', text: 'El concepto o motivo es obligatorio para garantizar trazabilidad del egreso.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc('registrar_egreso_caja', {
        p_fecha: fecha,
        p_tipo: tipo,
        p_monto: montoNum,
        p_concepto: concepto.trim(),
      });

      if (error) {
        setMensaje({ type: 'error', text: error.message || 'Ocurrió un error al registrar el egreso.' });
      } else {
        const nombreTipo = tipo === 'egreso_flete' ? 'Pago de Flete' : 'Retiro del Administrador';
        setMensaje({
          type: 'success',
          text: `¡Éxito! Se registraron $${montoNum.toLocaleString('es-CO')} COP de salida de caja por ${nombreTipo}.`,
        });
        setMonto('');
        setConcepto('');
      }
    } catch {
      setMensaje({ type: 'error', text: 'Error inesperado de red o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 text-lg">💸</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Egresos y Retiros de Caja</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Registra pagos de fletes de leche o retiros de efectivo realizados por el administrador.
          </p>
        </div>

        <span className="self-start sm:self-center px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
          Salida de Caja Física
        </span>
      </div>

      {/* Main Card */}
      <div className="card-dark border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
        
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

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Tipo de Egreso */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tipo de Operación
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('egreso_flete')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  tipo === 'egreso_flete'
                    ? 'bg-rose-500/20 border-rose-500/50 text-white shadow-lg shadow-rose-950/40'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-2xl">🚚</span>
                <div>
                  <span className="font-bold text-sm block">Pago de Flete</span>
                  <span className="text-[11px] text-slate-400">Transporte y logística</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipo('retiro')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  tipo === 'retiro'
                    ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-lg shadow-purple-950/40'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-2xl">💼</span>
                <div>
                  <span className="font-bold text-sm block">Retiro / Gastos</span>
                  <span className="text-[11px] text-slate-400">Retiro administrativo o insumos</span>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Fecha */}
            <div className="space-y-2">
              <label htmlFor="fecha" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Fecha
              </label>
              <input
                type="date"
                id="fecha"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm"
              />
            </div>

            {/* Monto */}
            <div className="space-y-2">
              <label htmlFor="monto" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Monto a Retirar ($ COP)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="monto"
                  step="any"
                  min="1"
                  required
                  inputMode="numeric"
                  placeholder="0"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full pl-5 pr-14 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xl font-black text-rose-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all placeholder:text-slate-700"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                  COP
                </span>
              </div>
            </div>
          </div>

          {/* Quick Amount Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sugeridos:</span>
            {[20000, 50000, 100000, 200000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setMonto(val.toString())}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                ${(val / 1000).toLocaleString()}k
              </button>
            ))}
          </div>

          {/* Concepto Obligatorio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="concepto" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Concepto / Motivo <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-slate-500">Obligatorio para auditoría</span>
            </div>
            <input
              type="text"
              id="concepto"
              required
              placeholder={tipo === 'egreso_flete' ? 'Ej. Pago camión recolector ruta norte' : 'Ej. Compra de sal mineral / Retiro utilidades'}
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-all text-sm font-medium"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-rose-600/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registrando Salida...
              </>
            ) : (
              <>
                <span>Registrar Salida de Caja</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Navigation shortcuts */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <Link to="/historial-caja" className="hover:text-rose-400 transition-colors">
          Ver historial de movimientos de caja →
        </Link>
        <Link to="/cierre-caja" className="hover:text-slate-300 transition-colors">
          Ir a Cierre de Caja →
        </Link>
      </div>

    </div>
  );
}
