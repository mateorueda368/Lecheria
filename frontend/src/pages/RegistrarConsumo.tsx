import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function RegistrarConsumo() {
  const today = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(today);
  const [jornada, setJornada] = useState<'manana' | 'tarde'>('manana');
  const [litros, setLitros] = useState('');
  const [observacion, setObservacion] = useState('');
  const [stockDisponible, setStockDisponible] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingStock, setLoadingStock] = useState(true);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStock = async () => {
    setLoadingStock(true);
    try {
      const { data, error } = await supabase
        .from('movimientos_leche')
        .select('tipo, litros');
      
      if (error) throw error;
      const total = (data || []).reduce((acc, m) => {
        if (m.tipo === 'produccion' || m.tipo === 'correccion') {
          return acc + Number(m.litros);
        }
        return acc - Number(m.litros);
      }, 0);
      setStockDisponible(Math.max(0, total));
    } catch (err) {
      console.error('Error al consultar stock:', err);
    } finally {
      setLoadingStock(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const litrosNum = parseFloat(litros) || 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (litrosNum <= 0) {
      setMensaje({ type: 'error', text: 'Por favor ingresa una cantidad de litros válida mayor a cero.' });
      return;
    }

    if (stockDisponible !== null && litrosNum > stockDisponible) {
      setMensaje({ 
        type: 'error', 
        text: `Stock insuficiente. Solo hay ${stockDisponible.toLocaleString()} L disponibles en el inventario.` 
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc('registrar_consumo', {
        p_fecha: fecha,
        p_jornada: jornada,
        p_litros: litrosNum,
        p_observacion: observacion.trim() || null,
      });

      if (error) {
        setMensaje({ type: 'error', text: error.message || 'Ocurrió un error al registrar el consumo.' });
      } else {
        setMensaje({
          type: 'success',
          text: `¡Éxito! Se registraron ${litrosNum} L de consumo para la finca.`,
        });
        setLitros('');
        setObservacion('');
        fetchStock();
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
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 text-lg">🏡</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Consumo de Finca</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Registra leche destinada al consumo doméstico, terneros o trabajadores. Ajusta volumen sin generar venta ni dinero.
          </p>
        </div>

        {/* Stock Badge */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 font-medium">Stock disponible:</span>
          <span className="text-sm font-extrabold text-white">
            {loadingStock ? '...' : `${stockDisponible?.toLocaleString() ?? 0} L`}
          </span>
        </div>
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
                className="w-full px-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 font-medium focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
              />
            </div>

            {/* Jornada */}
            <div className="space-y-2">
              <label htmlFor="jornada" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Jornada
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setJornada('manana')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    jornada === 'manana'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ☀️ Mañana
                </button>
                <button
                  type="button"
                  onClick={() => setJornada('tarde')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    jornada === 'tarde'
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🌙 Tarde
                </button>
              </div>
            </div>
          </div>

          {/* Litros Input with Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="litros" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Litros de Consumo
              </label>
              <span className="text-[11px] text-slate-500">Salida de volumen</span>
            </div>

            <div className="relative">
              <input
                type="number"
                id="litros"
                step="0.1"
                min="0.1"
                required
                inputMode="decimal"
                placeholder="0.0"
                value={litros}
                onChange={(e) => setLitros(e.target.value)}
                className="w-full pl-5 pr-14 py-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-2xl font-black text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-slate-700"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">
                L
              </span>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Presets:</span>
              {[1, 2, 3, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setLitros(num.toString())}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  {num} L
                </button>
              ))}
            </div>
          </div>

          {/* Observación */}
          <div className="space-y-2">
            <label htmlFor="observacion" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Destino / Observación (Opcional)
            </label>
            <input
              type="text"
              id="observacion"
              placeholder="Ej. Consumo de casa, alimentación terneros, etc."
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all text-sm font-medium"
            />
          </div>

          {/* Banner Informativo */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-3">
            <span className="text-xl">ℹ️</span>
            <p className="text-xs text-purple-300">
              Esta operación descuenta litros del cardex pero <strong>no genera cobro</strong> ni altera la caja física.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-purple-600/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando Consumo...
              </>
            ) : (
              <>
                <span>Registrar Consumo de Finca</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Navigation shortcuts */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <Link to="/produccion" className="hover:text-purple-400 transition-colors">
          Ver historial de producción →
        </Link>
        <Link to="/" className="hover:text-slate-300 transition-colors">
          ← Volver al Dashboard
        </Link>
      </div>

    </div>
  );
}
