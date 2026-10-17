import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Produccion {
  id: string;
  fecha: string;
  jornada: 'manana' | 'tarde';
  litros: number;
  registrado_por: string;
  created_at: string;
}

export default function HistorialProduccion() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedFecha, setSelectedFecha] = useState(today);
  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchProducciones = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('producciones_leche')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducciones(data || []);
    } catch (err: unknown) {
      console.error('Error al cargar historial:', err);
      setErrorMsg('No se pudo cargar el historial de producción.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducciones();
  }, []);

  const produccionesDelDia = producciones.filter((p) => p.fecha === selectedFecha);
  const prodManana = produccionesDelDia.find((p) => p.jornada === 'manana');
  const prodTarde = produccionesDelDia.find((p) => p.jornada === 'tarde');

  const litrosManana = prodManana ? Number(prodManana.litros) : 0;
  const litrosTarde = prodTarde ? Number(prodTarde.litros) : 0;
  const totalDia = litrosManana + litrosTarde;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 text-lg">🐄</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Historial de Ordeños</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Control de pesaje diario de leche por jornada (Mañana y Tarde) y consolidado de volumen.
          </p>
        </div>

        <Link
          to="/registrar"
          className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-1.5"
        >
          <span>+ Registrar Ordeño</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Selector de Fecha */}
      <div className="card-dark border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <label htmlFor="fecha" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Fecha de Consulta:
          </label>
          <input
            type="date"
            id="fecha"
            value={selectedFecha}
            onChange={(e) => setSelectedFecha(e.target.value)}
            className="px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedFecha(today)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedFecha === today 
                ? 'bg-blue-500 text-slate-950 shadow-md' 
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => {
              const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
              setSelectedFecha(ayer);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-all"
          >
            Ayer
          </button>
        </div>
      </div>

      {/* Resumen del Día Seleccionado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Ordeño Mañana */}
        <div className="card-dark border-slate-800 p-5 space-y-2 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>☀️</span> Mañana
            </span>
            {prodManana ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Registrado
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-slate-400">
                Pendiente
              </span>
            )}
          </div>
          <p className="text-3xl font-black text-white tracking-tight">
            {litrosManana.toLocaleString('es-CO', { minimumFractionDigits: 1 })} <span className="text-sm font-semibold text-amber-400">L</span>
          </p>
        </div>

        {/* Ordeño Tarde */}
        <div className="card-dark border-slate-800 p-5 space-y-2 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🌙</span> Tarde
            </span>
            {prodTarde ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Registrado
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-slate-400">
                Pendiente
              </span>
            )}
          </div>
          <p className="text-3xl font-black text-white tracking-tight">
            {litrosTarde.toLocaleString('es-CO', { minimumFractionDigits: 1 })} <span className="text-sm font-semibold text-indigo-400">L</span>
          </p>
        </div>

        {/* Total Consolidado */}
        <div className="bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 p-5 rounded-2xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Total Producción Día
            </span>
            <span className="text-lg">🥛</span>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">
            {totalDia.toLocaleString('es-CO', { minimumFractionDigits: 1 })} <span className="text-sm font-semibold text-blue-400">L</span>
          </p>
          <p className="text-[11px] text-slate-400">
            {prodManana && prodTarde ? '✅ Jornadas completas' : '⚠️ Jornada pendiente de completar'}
          </p>
        </div>

      </div>

      {/* Historial Completo */}
      <div className="card-dark border-slate-800 p-6 space-y-4 shadow-xl">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Histórico Reciente de Ordeños
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-400">Cargando registros...</p>
          </div>
        ) : producciones.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No hay ordeños registrados en el sistema.</p>
        ) : (
          <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto pr-1">
            {producciones.map((p) => (
              <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 ${
                    p.jornada === 'manana'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {p.jornada === 'manana' ? '☀️ Mañana' : '🌙 Tarde'}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-white block">{p.fecha}</span>
                    <span className="text-[10px] text-slate-500">
                      Registrado: {new Date(p.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-white">
                    {Number(p.litros).toLocaleString('es-CO', { minimumFractionDigits: 1 })} L
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
