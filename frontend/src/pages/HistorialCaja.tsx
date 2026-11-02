import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { exportToCSV, printReport } from '../lib/exportUtils';

interface MovimientoCaja {
  id: string;
  fecha: string;
  tipo: string;
  concepto: string | null;
  monto: number;
  created_at: string;
}

const fmtCOP = (n: number) =>
  '$' + Math.abs(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtFecha = (iso: string) => {
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'ingreso_venta', label: 'Ingreso por Venta Directa' },
  { value: 'pago_cliente', label: 'Cobro de Fiado a Cliente' },
  { value: 'pago_quesera', label: 'Liquidación de Quesera' },
  { value: 'egreso_flete', label: 'Egreso por Flete' },
  { value: 'retiro', label: 'Retiro del Administrador' },
  { value: 'correccion', label: 'Corrección Trazable' },
];

const TIPO_LABELS: Record<string, { label: string; badgeClass: string; icon: string }> = {
  ingreso_venta: { label: 'Venta Directa', badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', icon: '💰' },
  pago_cliente:  { label: 'Cobro Fiado',   badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', icon: '💵' },
  pago_quesera:  { label: 'Liq. Quesera',  badgeClass: 'bg-teal-500/10 text-teal-400 border border-teal-500/20', icon: '🧀' },
  egreso_flete:  { label: 'Flete Leche',   badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', icon: '🚚' },
  retiro:        { label: 'Retiro Caja',   badgeClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', icon: '💼' },
  correccion:    { label: 'Corrección',    badgeClass: 'bg-rose-500/10 text-rose-400 border border-rose-500/20', icon: '⚖️' },
};

const PAGE_SIZE = 20;

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
      setError((e as Error).message ?? 'Error al cargar movimientos de caja');
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, tipoFiltro]);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  // Métricas del período
  const totalIngresos = movimientos.reduce((acc, m) => {
    const monto = Number(m.monto);
    if (['ingreso_venta', 'pago_cliente', 'pago_quesera'].includes(m.tipo)) {
      return acc + monto;
    }
    if (m.tipo === 'correccion' && monto > 0) {
      return acc + monto;
    }
    return acc;
  }, 0);

  const totalEgresos = movimientos.reduce((acc, m) => {
    const monto = Number(m.monto);
    if (['egreso_flete', 'retiro'].includes(m.tipo)) {
      return acc + monto;
    }
    if (m.tipo === 'correccion' && monto < 0) {
      return acc + Math.abs(monto);
    }
    return acc;
  }, 0);

  const saldoNeto = totalIngresos - totalEgresos;

  // Paginación
  const totalPaginas = Math.ceil(movimientos.length / PAGE_SIZE);
  const paginados = movimientos.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  // --- Exportar a Excel (CSV) ---
  const handleExportCSV = () => {
    if (movimientos.length === 0) {
      alert('No hay movimientos en el período seleccionado para exportar.');
      return;
    }

    const headers = ['Fecha', 'Hora', 'Tipo Operación', 'Concepto / Detalle', 'Ingreso ($ COP)', 'Egreso ($ COP)', 'Monto Neto'];
    const rows: (string | number)[][] = movimientos.map((m) => {
      const hora = new Date(m.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      const tipoLabel = TIPO_LABELS[m.tipo]?.label || m.tipo;
      const esIngreso = ['ingreso_venta', 'pago_cliente', 'pago_quesera'].includes(m.tipo) ||
        (m.tipo === 'correccion' && Number(m.monto) > 0);
      const montoAbs = Math.abs(Number(m.monto));

      return [
        m.fecha,
        hora,
        tipoLabel,
        m.concepto || 'Sin concepto',
        esIngreso ? montoAbs : 0,
        !esIngreso ? montoAbs : 0,
        esIngreso ? montoAbs : -montoAbs,
      ];
    });

    // Fila totalizadora
    rows.push([]);
    rows.push(['--- TOTALES DEL PERÍODO ---', '', '', '', '', '', '']);
    rows.push(['TOTAL INGRESOS', '', '', '', totalIngresos, '', '']);
    rows.push(['TOTAL EGRESOS', '', '', '', '', totalEgresos, '']);
    rows.push(['FLUJO NETO DE CAJA', '', '', '', '', '', saldoNeto]);

    exportToCSV(`Libro_Caja_${desde}_al_${hasta}`, headers, rows);
  };

  // --- Descargar Reporte en PDF ---
  const handleExportPDF = () => {
    if (movimientos.length === 0) {
      alert('No hay movimientos en el período seleccionado.');
      return;
    }

    const tableHeaders = ['Fecha', 'Hora', 'Tipo', 'Concepto', 'Entradas ($)', 'Salidas ($)'];
    const tableAligns: ('left' | 'center' | 'right')[] = ['left', 'center', 'left', 'left', 'right', 'right'];

    const tableRows = movimientos.map((m) => {
      const hora = new Date(m.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      const meta = TIPO_LABELS[m.tipo] || { label: m.tipo };
      const esIngreso = ['ingreso_venta', 'pago_cliente', 'pago_quesera'].includes(m.tipo) ||
        (m.tipo === 'correccion' && Number(m.monto) > 0);
      const montoFmt = fmtCOP(Number(m.monto));

      return [
        fmtFecha(m.fecha),
        hora,
        meta.label,
        m.concepto || '—',
        esIngreso ? `+${montoFmt}` : '—',
        !esIngreso ? `-${montoFmt}` : '—',
      ];
    });

    // Totales finales
    tableRows.push([
      'TOTALES',
      '',
      `${movimientos.length} movs`,
      'Balance del período',
      `+${fmtCOP(totalIngresos)}`,
      `-${fmtCOP(totalEgresos)}`,
    ]);

    printReport({
      title: 'Libro Diario de Movimientos de Caja',
      subtitle: 'Control Financiero de Efectivo, Ingresos, Egresos y Arqueos',
      periodo: `Del ${desde} al ${hasta}`,
      metrics: [
        { label: 'Total Ingresos', value: `+${fmtCOP(totalIngresos)}`, color: '#0f766e' },
        { label: 'Total Egresos', value: `-${fmtCOP(totalEgresos)}`, color: '#e11d48' },
        { label: 'Flujo Neto', value: `${saldoNeto >= 0 ? '+' : '-'}${fmtCOP(saldoNeto)}`, color: saldoNeto >= 0 ? '#0f766e' : '#e11d48' },
        { label: 'Total Movimientos', value: `${movimientos.length}` },
      ],
      tableHeaders,
      tableRows,
      tableAligns,
      footerNotes: [
        'El presente documento refleja las entradas y salidas de efectivo registradas en la caja física de la lechería.',
        'Los ingresos corresponden a ventas directas cobradas, abonos de clientes y cobros de la quesera.',
        'Los egresos representan fletes de transporte, retiros de utilidad y liquidaciones de caja.',
      ],
      showSignature: true,
      signatureTitle: 'Firma Administrador / Responsable de Caja',
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 text-lg">📑</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Historial de Caja Física</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Libro diario de ingresos, egresos, retiros y reportes contables en Excel y PDF.
          </p>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            disabled={movimientos.length === 0}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar a Excel (CSV)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Excel (CSV)</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={movimientos.length === 0}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Descargar PDF"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>PDF</span>
          </button>

          <Link
            to="/egresos"
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 transition-all"
          >
            - Egreso
          </Link>
          <Link
            to="/cierre-caja"
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
          >
            Arqueo →
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* Tarjetas de Resumen del Período */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Ingresos */}
        <div className="card-dark border-slate-800 p-5 space-y-1 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Ingresos del Período</span>
            <span className="text-sm font-black text-emerald-400">↓ Entradas</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {fmtCOP(totalIngresos)} <span className="text-xs font-semibold text-emerald-400">COP</span>
          </p>
          <p className="text-[11px] text-slate-500">Ventas directas + cobros fiados + quesera</p>
        </div>

        {/* Total Egresos */}
        <div className="card-dark border-slate-800 p-5 space-y-1 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Egresos del Período</span>
            <span className="text-sm font-black text-rose-400">↑ Salidas</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {fmtCOP(totalEgresos)} <span className="text-xs font-semibold text-rose-400">COP</span>
          </p>
          <p className="text-[11px] text-slate-500">Fletes + retiros de caja</p>
        </div>

        {/* Flujo Neto */}
        <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 p-5 rounded-2xl space-y-1 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Flujo Neto del Filtro</span>
            <span className="text-sm font-black text-indigo-400">Flujo</span>
          </div>
          <p className={`text-2xl sm:text-3xl font-black tracking-tight ${saldoNeto >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {saldoNeto >= 0 ? '+' : '-'}{fmtCOP(saldoNeto)} <span className="text-xs font-semibold text-indigo-400">COP</span>
          </p>
          <p className="text-[11px] text-slate-400">Diferencial entre ingresos y egresos</p>
        </div>

      </div>

      {/* Barra de Filtros */}
      <div className="card-dark border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="desde" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Desde:
            </label>
            <input
              type="date"
              id="desde"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="hasta" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Hasta:
            </label>
            <input
              type="date"
              id="hasta"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="tipo" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Tipo:
          </label>
          <select
            id="tipo"
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Movimientos */}
      <div className="card-dark border-slate-800 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Movimientos Registrados ({movimientos.length})
          </h3>
          {totalPaginas > 1 && (
            <span className="text-xs text-slate-500">
              Página {pagina} de {totalPaginas}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-400">Cargando movimientos de caja...</p>
          </div>
        ) : movimientos.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">
            No se encontraron movimientos de caja en el período seleccionado.
          </p>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {paginados.map((m) => {
              const meta = TIPO_LABELS[m.tipo] || { label: m.tipo, badgeClass: 'bg-slate-800 text-slate-400', icon: '💰' };
              const esIngreso = ['ingreso_venta', 'pago_cliente', 'pago_quesera'].includes(m.tipo) ||
                (m.tipo === 'correccion' && Number(m.monto) > 0);

              return (
                <div key={m.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-lg flex-shrink-0">
                      {meta.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                        <span className="text-xs font-bold text-slate-400">{fmtFecha(m.fecha)}</span>
                      </div>
                      <p className="text-xs text-slate-200 mt-1 font-medium">{m.concepto || 'Sin concepto detallado'}</p>
                    </div>
                  </div>

                  <div className="text-right sm:self-center pl-11 sm:pl-0">
                    <span className={`text-base font-black tracking-tight ${esIngreso ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {esIngreso ? '+' : '-'}{fmtCOP(Number(m.monto))}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(m.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <button
              type="button"
              disabled={pagina === 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              ← Anterior
            </button>
            <span className="text-xs text-slate-500 font-medium">
              Página {pagina} de {totalPaginas}
            </span>
            <button
              type="button"
              disabled={pagina === totalPaginas}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
