import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

interface ExistingRecord {
  jornada: 'manana' | 'tarde';
  litros: number;
}

export default function RegistrarProduccion() {
  const { profile } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(today);
  const [jornada, setJornada] = useState<'manana' | 'tarde'>('manana');
  const [litros, setLitros] = useState('');
  
  const [existingRecords, setExistingRecords] = useState<{ manana?: number; tarde?: number }>({});
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const directPresets = [50, 80, 100, 120, 150];

  // Fetch status of today's morning & afternoon milking
  const fetchStatus = useCallback(async (selectedDate: string) => {
    setLoadingStatus(true);
    try {
      const { data, error } = await supabase
        .from('producciones_leche')
        .select('jornada, litros')
        .eq('fecha', selectedDate);

      if (error) throw error;

      const records: { manana?: number; tarde?: number } = {};
      (data as ExistingRecord[] || []).forEach(r => {
        if (r.jornada === 'manana') records.manana = Number(r.litros);
        if (r.jornada === 'tarde') records.tarde = Number(r.litros);
      });

      setExistingRecords(records);

      // Auto-suggest shift: if morning is recorded and afternoon is not, suggest afternoon
      if (records.manana !== undefined && records.tarde === undefined) {
        setJornada('tarde');
      } else if (records.manana === undefined) {
        setJornada('manana');
      }
    } catch (err) {
      console.error('Error al consultar estado de ordeño:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus(fecha);
  }, [fecha, fetchStatus]);

  const handleSetPreset = (val: number) => {
    setLitros(val.toString());
  };

  const handleAddPreset = (delta: number) => {
    const current = parseFloat(litros) || 0;
    setLitros((current + delta).toString());
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    
    const litrosNum = parseFloat(litros);
    if (isNaN(litrosNum) || litrosNum <= 0) {
      setMensaje({ type: 'error', text: 'Por favor ingresa una cantidad de litros válida mayor a cero.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc('registrar_produccion', {
        p_fecha: fecha,
        p_jornada: jornada,
        p_litros: litrosNum,
      });

      if (error) {
        if (error.message.includes('Ya existe') || error.message.includes('producciones_leche_fecha_jornada_uk')) {
          setMensaje({ type: 'error', text: `Ya existe un registro para la jornada ${jornada === 'manana' ? 'Mañana' : 'Tarde'} del ${fecha}.` });
        } else {
          setMensaje({ type: 'error', text: error.message || 'Ocurrió un error al registrar la producción.' });
        }
      } else {
        setMensaje({ type: 'success', text: `¡Registrado exitosamente! ${litrosNum} L en jornada ${jornada === 'manana' ? 'Mañana' : 'Tarde'}.` });
        setLitros('');
        fetchStatus(fecha);
      }
    } catch (err: unknown) {
      setMensaje({ type: 'error', text: (err as Error).message || 'Error inesperado de conexión.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🐄</span>
            <h1 className="text-xl font-black text-white tracking-tight">Registro de Ordeño</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Ingresa los litros de leche obtenidos en el ordeño de la finca.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
          {profile?.rol || 'Trabajador'}
        </span>
      </div>

      {/* Live Status of Selected Date */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-lg space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Estado de Ordeños ({fecha}):
          </span>
          {loadingStatus && <span className="text-[10px] text-slate-500 animate-pulse">Consultando...</span>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Status Mañana */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            existingRecords.manana !== undefined
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-base">☀️</span>
              <div>
                <p className="text-xs font-bold">Mañana</p>
                <p className="text-[11px] font-mono">
                  {existingRecords.manana !== undefined ? `${existingRecords.manana} L` : 'Sin registrar'}
                </p>
              </div>
            </div>
            {existingRecords.manana !== undefined && <span className="text-xs font-bold text-emerald-400">✓</span>}
          </div>

          {/* Status Tarde */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            existingRecords.tarde !== undefined
              ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-300'
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-base">🌙</span>
              <div>
                <p className="text-xs font-bold">Tarde</p>
                <p className="text-[11px] font-mono">
                  {existingRecords.tarde !== undefined ? `${existingRecords.tarde} L` : 'Sin registrar'}
                </p>
              </div>
            </div>
            {existingRecords.tarde !== undefined && <span className="text-xs font-bold text-indigo-400">✓</span>}
          </div>
        </div>
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-5 shadow-2xl">
        
        {mensaje && (
          <div className={`p-4 rounded-xl flex items-start gap-3 border ${
            mensaje.type === 'success' 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            <span className="text-lg">{mensaje.type === 'success' ? '✅' : '⚠️'}</span>
            <p className="text-xs font-semibold leading-relaxed">
              {mensaje.text}
            </p>
          </div>
        )}

        {/* Date & Shift Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <div className="space-y-1.5">
            <label htmlFor="fecha" className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">
              Fecha de Ordeño
            </label>
            <input
              type="date"
              id="fecha"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm text-slate-100 font-semibold outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">
              Jornada
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setJornada('manana')}
                className={`py-3 px-3 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-center gap-1.5 ${
                  jornada === 'manana'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <span>☀️</span> Mañana {existingRecords.manana !== undefined && '✓'}
              </button>

              <button
                type="button"
                onClick={() => setJornada('tarde')}
                className={`py-3 px-3 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-center gap-1.5 ${
                  jornada === 'tarde'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <span>🌙</span> Tarde {existingRecords.tarde !== undefined && '✓'}
              </button>
            </div>
          </div>

        </div>

        {/* Liters Input & Touch Presets */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor="litros" className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">
              Litros Producidos
            </label>
            {litros && (
              <button 
                type="button" 
                onClick={() => setLitros('')} 
                className="text-[11px] font-bold text-slate-400 hover:text-rose-400 transition-colors"
              >
                Limpiar
              </button>
            )}
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
              className="w-full pl-5 pr-14 py-4 bg-slate-950 border border-slate-700/80 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-2xl text-emerald-400 font-black tracking-tight outline-none"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <span className="text-slate-400 font-black text-sm">LITROS</span>
            </div>
          </div>

          {/* Direct Presets */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Valores Frecuentes:</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {directPresets.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSetPreset(p)}
                  className="py-2.5 rounded-xl bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 text-xs font-black transition-all active:scale-95"
                >
                  {p} L
                </button>
              ))}
            </div>

            {/* Incremental Presets */}
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1">
              <span>Sumar Incrementos:</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleAddPreset(1)}
                className="py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold hover:text-emerald-400"
              >
                +1 L
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(5)}
                className="py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold hover:text-emerald-400"
              >
                +5 L
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(10)}
                className="py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold hover:text-emerald-400"
              >
                +10 L
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(20)}
                className="py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold hover:text-emerald-400"
              >
                +20 L
              </button>
            </div>
          </div>

        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 rounded-xl font-black text-sm shadow-xl shadow-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
              <span>Guardando Ordeño...</span>
            </div>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Confirmar Registro de Ordeño</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}
