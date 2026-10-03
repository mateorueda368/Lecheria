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

      if (error) {
        throw error;
      }

      setProducciones(data || []);
    } catch (err: any) {
      console.error('Error al cargar historial:', err);
      setErrorMsg('No se pudo cargar el historial de producción.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducciones();
  }, []);

  // Filtrar registros para la fecha seleccionada
  const produccionesDelDia = producciones.filter((p) => p.fecha === selectedFecha);
  const prodManana = produccionesDelDia.find((p) => p.jornada === 'manana');
  const prodTarde = produccionesDelDia.find((p) => p.jornada === 'tarde');

  const litrosManana = prodManana ? Number(prodManana.litros) : 0;
  const litrosTarde = prodTarde ? Number(prodTarde.litros) : 0;
  const totalDia = litrosManana + litrosTarde;

  return (
    <div className="space-y-6 max-w-4xl mx-auto fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Resumen de Producción</h1>
          <p className="text-sm text-slate-500 mt-1">
            Consulta los litros producidos y la disponibilidad diaria.
          </p>
        </div>

        <Link
          to="/registrar"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-md shadow-blue-500/20 transition-all active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Registrar Producción
        </Link>
      </div>

      {/* Selector de Fecha */}
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label htmlFor="select-fecha" className="text-sm font-semibold text-slate-700">
          Fecha de consulta:
        </label>
        <input
          id="select-fecha"
          type="date"
          value={selectedFecha}
          onChange={(e) => setSelectedFecha(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Tarjetas de Resumen del Día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Mañana */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              🌅 Mañana
            </span>
            {prodManana ? (
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                Registrado
              </span>
            ) : (
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-medium">
                Pendiente
              </span>
            )}
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {prodManana ? `${litrosManana.toLocaleString()} L` : '0 L'}
            </span>
            <p className="text-xs text-slate-500 mt-1">Ordeño mañana</p>
          </div>
        </div>

        {/* Tarde */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              🌇 Tarde
            </span>
            {prodTarde ? (
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                Registrado
              </span>
            ) : (
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-medium">
                Pendiente
              </span>
            )}
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {prodTarde ? `${litrosTarde.toLocaleString()} L` : '0 L'}
            </span>
            <p className="text-xs text-slate-500 mt-1">Ordeño tarde</p>
          </div>
        </div>

        {/* Total del Día */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white shadow-md shadow-blue-500/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-100 bg-white/20 px-2.5 py-1 rounded-full">
              📊 Total Día
            </span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold">
              {totalDia.toLocaleString()} L
            </span>
            <p className="text-xs text-blue-100 mt-1">Suma acumulada del día</p>
          </div>
        </div>
      </div>

      {/* Historial Reciente */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-lg">Historial Reciente de Ordeños</h2>
          <button
            onClick={fetchProducciones}
            disabled={loading}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center gap-1"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-700 text-sm font-medium border-b border-red-100">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mb-2"></div>
            <p className="text-sm">Cargando historial de producciones...</p>
          </div>
        ) : producciones.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-3">
            <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              🥛
            </div>
            <p className="text-sm font-medium">Aún no hay registros de producción almacenados.</p>
            <Link
              to="/registrar"
              className="inline-block text-sm font-semibold text-blue-600 hover:underline"
            >
              Registrar la primera producción →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {producciones.map((prod) => (
              <div
                key={prod.id}
                className="p-4 sm:px-6 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      prod.jornada === 'manana' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {prod.jornada === 'manana' ? '🌅' : '🌇'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">
                        {prod.fecha}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${
                          prod.jornada === 'manana'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        }`}
                      >
                        {prod.jornada}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Registrado: {new Date(prod.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xl font-bold text-slate-900">
                    {Number(prod.litros).toLocaleString()} L
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
