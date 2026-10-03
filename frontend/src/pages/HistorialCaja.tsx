import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// --- Types ---
interface MovimientoCaja {
  id: string;
  fecha: string;
  tipo: string;
  concepto: string | null;
  monto: number;
  created_at: string;
}

// --- Helpers ---
const fmtCOP = (n: number) =>
  '$' + Math.abs(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtFecha = (iso: string) => {
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'ingreso_venta', label: 'Ingreso por Venta' },
  { value: 'pago_cliente', label: 'Cobro de Fiado' },
  { value: 'pago_quesera', label: 'Liquidación Quesera' },
  { value: 'egreso_flete', label: 'Egreso / Flete' },
  { value: 'retiro', label: 'Retiro' },
  { value: 'correccion', label: 'Corrección' },
];

const TIPO_LABELS: Record<string, { label: string; color: string }> = {
  ingreso_venta: { label: 'Venta Directa', color: 'bg-emerald-100 text-emerald-800' },
  pago_cliente:  { label: 'Cobro Fiado',   color: 'bg-blue-100 text-blue-800' },
  pago_quesera:  { label: 'Liq. Quesera',  color: 'bg-teal-100 text-teal-800' },
  egreso_flete:  { label: 'Egreso/Flete',  color: 'bg-amber-100 text-amber-800' },
  retiro:        { label: 'Retiro',        color: 'bg-rose-100 text-rose-800' },
  correccion:    { label: 'Corrección',    color: 'bg-purple-100 text-purple-800' },
};

// Para correcciones, el signo del monto determina si es ingreso o egreso.
// Se evalúa en el render; aquí solo los tipos fijos positivos.
const TIPOS_INGRESO = new Set(['ingreso_venta', 'pago_cliente', 'pago_quesera']);
const PAGE_SIZE = 25;

export default function HistorialCaja() {
  const today = new Date().toISOString().split('T')[0];
  const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [desde, setDesde] = useState(hace30);
  const [hasta, setHasta] = useState(today);
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);

  const fetchMovimientos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('movimientos_caja')
        .select('id, fecha, tipo, concepto, monto, created_at')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('created_at', { ascending: false });

      if (tipoFiltro) {
        query = query.eq('tipo', tipoFiltro);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setMovimientos(data ?? []);
      setPagina(1);
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, tipoFiltro]);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  // Métricas del período
  const totalIngresos = movimientos
    .filter((m) => TIPOS_INGRESO.has(m.tipo))
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const totalEgresos = movimientos
    .filter((m) => !TIPOS_INGRESO.has(m.tipo))
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const saldoNeto = totalIngresos - totalEgresos;

  // Paginación
  const totalPaginas = Math.ceil(movimientos.length / PAGE_SIZE);
  const paginados = movimientos.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Historial de Caja</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulta y filtra todos los movimientos de dinero registrados.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo</label>
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPIs del período */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Ingresos</p>
            <p className="text-xl font-black text-emerald-800">{fmtCOP(totalIngresos)}</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Egresos</p>
            <p className="text-xl font-black text-rose-800">{fmtCOP(totalEgresos)}</p>
          </div>
          <div className={`border rounded-xl p-4 text-center ${saldoNeto >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${saldoNeto >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
              Saldo Neto
            </p>
            <p className={`text-xl font-black ${saldoNeto >= 0 ? 'text-blue-800' : 'text-amber-800'}`}>
              {saldoNeto >= 0 ? '+' : '-'}{fmtCOP(saldoNeto)}
            </p>
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Cargando movimientos...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-rose-600 font-semibold">⚠️ {error}</p>
          <button onClick={fetchMovimientos} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
            Reintentar
          </button>
        </div>
      ) : movimientos.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium">No hay movimientos en este período.</p>
          <p className="text-sm mt-1">Ajusta el rango de fechas o el tipo de filtro.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Concepto</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginados.map((mov) => {
                  // Para correcciones: positivo = ingreso, negativo = egreso
                  const esIngreso = mov.tipo === 'correccion'
                    ? Number(mov.monto) >= 0
                    : TIPOS_INGRESO.has(mov.tipo);
                  const tipoInfo = TIPO_LABELS[mov.tipo] ?? { label: mov.tipo, color: 'bg-slate-100 text-slate-700' };
                  return (
                    <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-medium">
                        {fmtFecha(mov.fecha)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${tipoInfo.color}`}>
                          {tipoInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                        {mov.concepto ?? '—'}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${esIngreso ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {esIngreso ? '+' : '−'}{fmtCOP(mov.monto)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {movimientos.length} registros · Página {pagina} de {totalPaginas}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={pagina === 1}
                  onClick={() => setPagina((p) => p - 1)}
                  className="px-3 py-1.5 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
                >
                  ← Anterior
                </button>
                <button
                  disabled={pagina === totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                  className="px-3 py-1.5 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
