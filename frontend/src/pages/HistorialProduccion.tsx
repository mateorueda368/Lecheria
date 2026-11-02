import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { exportToCSV, printReport } from '../lib/exportUtils';

interface Produccion {
  id: string;
  fecha: string;
  jornada: 'manana' | 'tarde';
  litros: number;
  registrado_por: string;
  created_at: string;
}

interface DiaProduccion {
  fecha: string;
  manana: number;
  tarde: number;
  total: number;
  completo: boolean;
}

export default function HistorialProduccion() {
  const today = new Date().toISOString().split('T')[0];
  
  // Primer día del mes en curso por defecto
  const d = new Date();
  const primerDiaMes = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];

  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(today);
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

  // Ordeños del día puntual seleccionado
  const produccionesDelDia = producciones.filter((p) => p.fecha === selectedFecha);
  const prodManana = produccionesDelDia.find((p) => p.jornada === 'manana');
  const prodTarde = produccionesDelDia.find((p) => p.jornada === 'tarde');

  const litrosManana = prodManana ? Number(prodManana.litros) : 0;
  const litrosTarde = prodTarde ? Number(prodTarde.litros) : 0;
  const totalDia = litrosManana + litrosTarde;

  // Consolidado por días dentro del rango filtrado (desde - hasta)
  const diasFiltrados: DiaProduccion[] = useMemo(() => {
    const mapa: Record<string, { manana: number; tarde: number; hasManana: boolean; hasTarde: boolean }> = {};

    producciones.forEach((p) => {
      if (p.fecha >= desde && p.fecha <= hasta) {
        if (!mapa[p.fecha]) {
          mapa[p.fecha] = { manana: 0, tarde: 0, hasManana: false, hasTarde: false };
        }
        if (p.jornada === 'manana') {
          mapa[p.fecha].manana = Number(p.litros);
          mapa[p.fecha].hasManana = true;
        } else if (p.jornada === 'tarde') {
          mapa[p.fecha].tarde = Number(p.litros);
          mapa[p.fecha].hasTarde = true;
        }
      }
    });

    return Object.entries(mapa)
      .sort(([fA], [fB]) => fB.localeCompare(fA))
      .map(([fecha, vals]) => ({
        fecha,
        manana: vals.manana,
        tarde: vals.tarde,
        total: vals.manana + vals.tarde,
        completo: vals.hasManana && vals.hasTarde,
      }));
  }, [producciones, desde, hasta]);

  // Métricas del rango
  const totalRangoLitros = diasFiltrados.reduce((acc, d) => acc + d.total, 0);
  const totalMananaRango = diasFiltrados.reduce((acc, d) => acc + d.manana, 0);
  const totalTardeRango = diasFiltrados.reduce((acc, d) => acc + d.tarde, 0);
  const cantidadDias = diasFiltrados.length;
  const promedioDiario = cantidadDias > 0 ? totalRangoLitros / cantidadDias : 0;

  // Handlers para presets rápidos de fecha
  const setPreset = (diasAtras: number) => {
    const start = new Date(Date.now() - diasAtras * 86400000).toISOString().split('T')[0];
    setDesde(start);
    setHasta(today);
  };

  // --- Exportar a Excel (CSV) ---
  const handleExportCSV = () => {
    if (diasFiltrados.length === 0) {
      alert('No hay registros de producción en el rango de fechas seleccionado para exportar.');
      return;
    }

    const headers = ['Fecha', 'Litros Mañana (L)', 'Litros Tarde (L)', 'Total Día (L)', 'Estado Jornadas'];
    const rows: (string | number)[][] = diasFiltrados.map((d) => [
      d.fecha,
      d.manana > 0 ? d.manana.toFixed(1) : '0.0',
      d.tarde > 0 ? d.tarde.toFixed(1) : '0.0',
      d.total.toFixed(1),
      d.completo ? 'Completo' : 'Incompleto',
    ]);

    // Fila de resumen final
    rows.push([]);
    rows.push(['--- TOTALES DEL PERÍODO ---', '', '', '', '']);
    rows.push(['Total Litros Mañana', totalMananaRango.toFixed(1) + ' L', '', '', '']);
    rows.push(['Total Litros Tarde', totalTardeRango.toFixed(1) + ' L', '', '', '']);
    rows.push(['TOTAL LITROS PERÍODO', totalRangoLitros.toFixed(1) + ' L', '', '', '']);
    rows.push(['Promedio Producción / Día', promedioDiario.toFixed(1) + ' L/día', '', '', '']);
    rows.push(['Días con Registro', cantidadDias.toString(), '', '', '']);

    exportToCSV(`Reporte_Produccion_Leche_${desde}_al_${hasta}`, headers, rows);
  };

  // --- Generar Reporte PDF Imprimible ---
  const handleExportPDF = () => {
    if (diasFiltrados.length === 0) {
      alert('No hay registros de producción en el rango seleccionado.');
      return;
    }

    const tableHeaders = ['Fecha', 'Ordeño Mañana', 'Ordeño Tarde', 'Total Día', 'Estado'];
    const tableAligns: ('left' | 'center' | 'right')[] = ['left', 'right', 'right', 'right', 'center'];

    const tableRows = diasFiltrados.map((d) => [
      d.fecha,
      `${d.manana.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L`,
      `${d.tarde.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L`,
      `${d.total.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L`,
      d.completo ? 'Completo (M y T)' : 'Parcial',
    ]);

    // Fila totalizadora
    tableRows.push([
      'TOTAL GENERAL',
      `${totalMananaRango.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L`,
      `${totalTardeRango.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L`,
      `${totalRangoLitros.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L`,
      `${cantidadDias} días`,
    ]);

    printReport({
      title: 'Informe Consolidado de Producción de Leche',
      subtitle: 'Registro de Pesaje Diario de Ordeño y Volúmenes',
      periodo: `Del ${desde} al ${hasta}`,
      metrics: [
        { label: 'Total Litros Período', value: `${totalRangoLitros.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L`, color: '#0f766e' },
        { label: 'Promedio Diario', value: `${promedioDiario.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L/día`, color: '#0284c7' },
        { label: 'Total Mañana', value: `${totalMananaRango.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L` },
        { label: 'Total Tarde', value: `${totalTardeRango.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L` },
        { label: 'Días con Ordeño', value: `${cantidadDias} días` },
      ],
      tableHeaders,
      tableRows,
      tableAligns,
      footerNotes: [
        'Los datos reflejan los pesajes directos en cantina por turno de ordeño.',
        'La leche registrada constituye la base de disponibilidad para ventas directas, fiadas, autoconsumo y entregas a quesera.',
      ],
      showSignature: true,
      signatureTitle: 'Firma Administrador / Encargado de Ordeño',
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 text-lg">🐄</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Historial de Ordeños</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Control de pesaje diario de leche por jornada (Mañana y Tarde) y exportación de reportes.
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

      {/* --- SECCIÓN 1: VISTA DIARIA RÁPIDA --- */}
      <div className="card-dark border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <label htmlFor="fecha" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Fecha de Consulta Puntual:
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

      {/* --- SECCIÓN 2: RANGO DE FECHAS Y EXPORTACIÓN --- */}
      <div className="card-dark border-slate-800 p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">📊</span>
              Reporte Consolidado por Rango de Fechas
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtra por período para calcular totales, promedios y exportar a Excel o PDF.
            </p>
          </div>

          {/* Botones de Exportación */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              disabled={diasFiltrados.length === 0}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Descargar archivo .CSV con formato de Excel"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Exportar Excel (CSV)</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={diasFiltrados.length === 0}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Generar e imprimir documento PDF"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>

        {/* Filtros de Rango */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Rápido:</span>
            <button
              onClick={() => setPreset(7)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-all"
            >
              Últimos 7 días
            </button>
            <button
              onClick={() => setPreset(15)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-all"
            >
              15 días (Quincena)
            </button>
            <button
              onClick={() => {
                setDesde(primerDiaMes);
                setHasta(today);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-all"
            >
              Mes Actual
            </button>
          </div>
        </div>

        {/* Tarjetas Métricas del Período */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Litros</span>
            <span className="text-lg sm:text-xl font-black text-emerald-400">
              {totalRangoLitros.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Promedio / Día</span>
            <span className="text-lg sm:text-xl font-black text-blue-400">
              {promedioDiario.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mañana vs Tarde</span>
            <span className="text-xs sm:text-sm font-bold text-slate-200 block mt-1">
              ☀️ {totalMananaRango.toFixed(0)} L | 🌙 {totalTardeRango.toFixed(0)} L
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Días Registrados</span>
            <span className="text-lg sm:text-xl font-black text-amber-400">
              {cantidadDias} <span className="text-xs font-normal text-slate-400">días</span>
            </span>
          </div>
        </div>

        {/* Tabla Consolidada del Rango */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-400">Cargando datos de ordeño...</p>
          </div>
        ) : diasFiltrados.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">
            No hay registros de producción en el rango de fechas seleccionado ({desde} a {hasta}).
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/90 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4 text-right">Mañana</th>
                  <th className="py-3 px-4 text-right">Tarde</th>
                  <th className="py-3 px-4 text-right font-extrabold text-white">Total Día</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {diasFiltrados.map((d) => (
                  <tr key={d.fecha} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-200">{d.fecha}</td>
                    <td className="py-3 px-4 text-right text-amber-400">
                      {d.manana > 0 ? `${d.manana.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-indigo-400">
                      {d.tarde > 0 ? `${d.tarde.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-white text-sm">
                      {d.total.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        d.completo 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {d.completo ? 'Completo' : 'Parcial'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 font-extrabold border-t-2 border-slate-700 text-slate-200">
                <tr>
                  <td className="py-3 px-4 text-white">TOTAL PERÍODO</td>
                  <td className="py-3 px-4 text-right text-amber-300">
                    {totalMananaRango.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L
                  </td>
                  <td className="py-3 px-4 text-right text-indigo-300">
                    {totalTardeRango.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400 text-sm">
                    {totalRangoLitros.toLocaleString('es-CO', { minimumFractionDigits: 1 })} L
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                    {cantidadDias} días
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
