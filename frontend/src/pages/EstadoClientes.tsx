import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { exportToCSV, printReport } from '../lib/exportUtils';

// --- Types ---
interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  created_at: string;
}

interface VentaFiada {
  id: string;
  fecha: string;
  jornada: string;
  litros: number;
  total: number;
}

interface PagoCliente {
  id: string;
  fecha: string;
  monto: number;
  concepto: string | null;
}

interface ClienteSaldo extends Cliente {
  totalFiado: number;
  totalPagado: number;
  saldoPendiente: number;
}

interface DetalleCliente {
  ventas: VentaFiada[];
  pagos: PagoCliente[];
}

const fmtCOP = (n: number) =>
  '$' + Math.abs(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtFecha = (iso: string) => {
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

export default function EstadoClientes() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  const [clientes, setClientes] = useState<ClienteSaldo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Detalle del cliente seleccionado
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetalleCliente | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { data: clientesData, error: e1 },
        { data: ventas, error: e2 },
        { data: pagos, error: e3 },
      ] = await Promise.all([
        supabase.from('clientes').select('id, nombre, telefono, created_at').order('nombre'),
        supabase.from('ventas_directas').select('cliente_id, total').eq('estado', 'fiada'),
        supabase.from('pagos_clientes').select('cliente_id, monto'),
      ]);

      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      const saldoMap: Record<string, ClienteSaldo> = {};
      (clientesData ?? []).forEach((c) => {
        saldoMap[c.id] = { ...c, totalFiado: 0, totalPagado: 0, saldoPendiente: 0 };
      });

      (ventas ?? []).forEach((v) => {
        if (v.cliente_id && saldoMap[v.cliente_id]) {
          saldoMap[v.cliente_id].totalFiado += Number(v.total);
        }
      });

      (pagos ?? []).forEach((p) => {
        if (p.cliente_id && saldoMap[p.cliente_id]) {
          saldoMap[p.cliente_id].totalPagado += Number(p.monto);
        }
      });

      const lista = Object.values(saldoMap)
        .map((c) => ({ ...c, saldoPendiente: Math.max(0, c.totalFiado - c.totalPagado) }))
        .sort((a, b) => b.saldoPendiente - a.saldoPendiente);

      setClientes(lista);
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDetalle = useCallback(async (clienteId: string) => {
    setLoadingDetalle(true);
    try {
      const [
        { data: ventas, error: e1 },
        { data: pagos, error: e2 },
      ] = await Promise.all([
        supabase
          .from('ventas_directas')
          .select('id, fecha, jornada, litros, total')
          .eq('cliente_id', clienteId)
          .eq('estado', 'fiada')
          .order('fecha', { ascending: false }),
        supabase
          .from('pagos_clientes')
          .select('id, fecha, monto, concepto')
          .eq('cliente_id', clienteId)
          .order('fecha', { ascending: false }),
      ]);

      if (e1) throw e1;
      if (e2) throw e2;

      setDetalle({ ventas: ventas ?? [], pagos: pagos ?? [] });
    } catch (e: unknown) {
      console.error('Error detalle:', e);
    } finally {
      setLoadingDetalle(false);
    }
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const handleSelectCliente = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setDetalle(null);
    } else {
      setSelectedId(id);
      setDetalle(null);
      fetchDetalle(id);
    }
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.telefono && c.telefono.includes(busqueda))
  );

  // Totales globales
  const totalDeuda = clientes.reduce((acc, c) => acc + c.saldoPendiente, 0);
  const totalFiadoGeneral = clientes.reduce((acc, c) => acc + c.totalFiado, 0);
  const totalPagadoGeneral = clientes.reduce((acc, c) => acc + c.totalPagado, 0);
  const clientesConDeuda = clientes.filter((c) => c.saldoPendiente > 0).length;
  const mayorDeudor = clientes[0]?.saldoPendiente > 0 ? clientes[0] : null;

  // --- Exportar Cartera General a Excel (CSV) ---
  const handleExportCarteraCSV = () => {
    if (clientes.length === 0) {
      alert('No hay clientes para exportar.');
      return;
    }

    const headers = ['Nombre Cliente', 'Teléfono', 'Total Fiado Histórico ($ COP)', 'Total Pagado ($ COP)', 'Saldo Pendiente ($ COP)', 'Estado'];
    const rows: (string | number)[][] = clientes.map((c) => [
      c.nombre,
      c.telefono || 'Sin teléfono',
      c.totalFiado,
      c.totalPagado,
      c.saldoPendiente,
      c.saldoPendiente > 0 ? 'Con Deuda' : 'Al Día',
    ]);

    rows.push([]);
    rows.push(['--- RESUMEN GENERAL DE CARTERA ---', '', '', '', '', '']);
    rows.push(['TOTAL CARTERA POR COBRAR', '', totalFiadoGeneral, totalPagadoGeneral, totalDeuda, '']);
    rows.push(['Clientes con Saldo Deudor', clientesConDeuda.toString(), '', '', '', '']);

    exportToCSV(`Cartera_Clientes_${today}`, headers, rows);
  };

  // --- Descargar Informe de Cartera en PDF ---
  const handleExportCarteraPDF = () => {
    if (clientes.length === 0) {
      alert('No hay clientes registrados.');
      return;
    }

    const tableHeaders = ['Cliente', 'Teléfono', 'Total Fiado', 'Total Pagado', 'Saldo Pendiente', 'Estado'];
    const tableAligns: ('left' | 'center' | 'right' | 'right' | 'right' | 'center')[] = ['left', 'center', 'right', 'right', 'right', 'center'];

    const tableRows = clientes.map((c) => [
      c.nombre,
      c.telefono || '—',
      `$${c.totalFiado.toLocaleString('es-CO')}`,
      `$${c.totalPagado.toLocaleString('es-CO')}`,
      `$${c.saldoPendiente.toLocaleString('es-CO')}`,
      c.saldoPendiente > 0 ? '⚠️ Pendiente' : '✅ Al día',
    ]);

    // Fila total
    tableRows.push([
      'TOTAL GENERAL',
      `${clientes.length} clientes`,
      `$${totalFiadoGeneral.toLocaleString('es-CO')}`,
      `$${totalPagadoGeneral.toLocaleString('es-CO')}`,
      `$${totalDeuda.toLocaleString('es-CO')} COP`,
      `${clientesConDeuda} deudores`,
    ]);

    printReport({
      title: 'Informe Consolidado de Cartera y Fiados',
      subtitle: 'Balance General de Cuentas por Cobrar de Leche',
      periodo: `Corte al ${today}`,
      metrics: [
        { label: 'Cartera Total Pendiente', value: `$${totalDeuda.toLocaleString('es-CO')} COP`, color: '#e11d48' },
        { label: 'Clientes con Deuda', value: `${clientesConDeuda} clientes`, color: '#d97706' },
        { label: 'Clientes al Día', value: `${clientes.length - clientesConDeuda} clientes`, color: '#0f766e' },
        { label: 'Total Clientes', value: `${clientes.length}` },
      ],
      tableHeaders,
      tableRows,
      tableAligns,
      footerNotes: [
        'El presente informe refleja el saldo neto adeudado por concepto de leche suministrada a crédito.',
        'Los abonos realizados por los clientes se imputan al saldo global del cliente ingresando inmediatamente a caja.',
      ],
      showSignature: true,
      signatureTitle: 'Firma Responsable de Cartera / Cobranza',
    });
  };

  // --- Extracto de Cuenta Individual en PDF para un Cliente ---
  const handleExportExtractoClientePDF = (c: ClienteSaldo) => {
    if (!detalle) return;

    const tableHeaders = ['Fecha', 'Concepto / Operación', 'Tipo', 'Litros', 'Monto ($ COP)'];
    const tableAligns: ('left' | 'left' | 'center' | 'right' | 'right')[] = ['left', 'left', 'center', 'right', 'right'];

    // Combinar ventas y pagos cronológicamente
    const movs: { fecha: string; concepto: string; tipo: string; litros: string; monto: number; isCargo: boolean }[] = [];

    detalle.ventas.forEach((v) => {
      movs.push({
        fecha: v.fecha,
        concepto: `Venta a crédito (${v.jornada === 'manana' ? 'Mañana' : 'Tarde'})`,
        tipo: 'Cargo (Fiado)',
        litros: `${Number(v.litros).toFixed(1)} L`,
        monto: Number(v.total),
        isCargo: true,
      });
    });

    detalle.pagos.forEach((p) => {
      movs.push({
        fecha: p.fecha,
        concepto: p.concepto || 'Abono a deuda de leche',
        tipo: 'Abono (Pago)',
        litros: '—',
        monto: Number(p.monto),
        isCargo: false,
      });
    });

    // Ordenar por fecha descendente
    movs.sort((a, b) => b.fecha.localeCompare(a.fecha));

    const tableRows = movs.map((m) => [
      fmtFecha(m.fecha),
      m.concepto,
      m.tipo,
      m.litros,
      m.isCargo ? `+$${m.monto.toLocaleString('es-CO')}` : `-$${m.monto.toLocaleString('es-CO')}`,
    ]);

    tableRows.push([
      'SALDO PENDIENTE ACTUAL',
      '',
      '',
      '',
      `$${c.saldoPendiente.toLocaleString('es-CO')} COP`,
    ]);

    printReport({
      title: `EXTRACTO DE CUENTA — ${c.nombre.toUpperCase()}`,
      subtitle: 'Comprobante Individual de Compras Fiadas y Abonos',
      periodo: `Corte al ${today}`,
      metrics: [
        { label: 'Saldo Pendiente', value: `$${c.saldoPendiente.toLocaleString('es-CO')} COP`, color: c.saldoPendiente > 0 ? '#e11d48' : '#0f766e' },
        { label: 'Total Fiado Histórico', value: `$${c.totalFiado.toLocaleString('es-CO')}` },
        { label: 'Total Pagado', value: `$${c.totalPagado.toLocaleString('es-CO')}` },
        { label: 'Teléfono', value: c.telefono || 'Sin registrar' },
      ],
      tableHeaders,
      tableRows,
      tableAligns,
      footerNotes: [
        `Comprobante individual para el cliente ${c.nombre}.`,
        'Certifica las entregas de leche recibidas a crédito y los abonos entregados a la lechería.',
      ],
      showSignature: true,
      signatureTitle: 'Firma del Cliente / Recibí Conforme',
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 text-lg">👥</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Estado de Clientes y Fiados</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Control de cuentas por cobrar, historial de compras fiadas y reportes de cartera.
          </p>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCarteraCSV}
            disabled={clientes.length === 0}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
            title="Exportar cartera a Excel"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Excel (CSV)</span>
          </button>

          <button
            onClick={handleExportCarteraPDF}
            disabled={clientes.length === 0}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-950/40 disabled:opacity-50"
            title="Descargar informe de cartera en PDF"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Informe PDF</span>
          </button>

          <Link
            to="/fiados"
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 transition-all"
          >
            + Venta Fiada
          </Link>
          <Link
            to="/cobrar-fiado"
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20"
          >
            Cobrar Abono →
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Cartera Total */}
        <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 p-5 rounded-2xl border border-amber-500/30 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Cartera Total Pendiente</span>
            <span className="text-base font-black text-amber-400">📋</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {fmtCOP(totalDeuda)} <span className="text-xs font-semibold text-amber-400">COP</span>
          </p>
          <p className="text-[11px] text-slate-400">{clientesConDeuda} clientes con saldo pendiente</p>
        </div>

        {/* Clientes Registrados */}
        <div className="card-dark border-slate-800 p-5 space-y-1 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes en Catálogo</span>
            <span className="text-base font-black text-slate-400">👥</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {clientes.length} <span className="text-xs font-semibold text-slate-400">Clientes</span>
          </p>
          <p className="text-[11px] text-slate-500">{clientes.length - clientesConDeuda} clientes con saldo en $0</p>
        </div>

        {/* Mayor Deudor */}
        <div className="card-dark border-slate-800 p-5 space-y-1 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Mayor Deuda Actual</span>
            <span className="text-base font-black text-rose-400">⚠️</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
            {mayorDeudor ? mayorDeudor.nombre : 'Ninguno'}
          </p>
          <p className="text-xs font-bold text-rose-400">
            {mayorDeudor ? `${fmtCOP(mayorDeudor.saldoPendiente)} COP` : 'Sin deudas'}
          </p>
        </div>

      </div>

      {/* Buscador */}
      <div className="card-dark border-slate-800 p-4 shadow-xl">
        <input
          type="text"
          placeholder="🔍 Buscar cliente por nombre o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all font-medium"
        />
      </div>

      {/* Listado de Clientes */}
      <div className="card-dark border-slate-800 p-6 space-y-4 shadow-xl">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Clientes Registrados ({clientesFiltrados.length})
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-400">Cargando cuentas de clientes...</p>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">
            No se encontraron clientes que coincidan con la búsqueda.
          </p>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {clientesFiltrados.map((c) => {
              const isSelected = selectedId === c.id;
              const conDeuda = c.saldoPendiente > 0;

              return (
                <div key={c.id} className="py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                        conDeuda ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {c.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{c.nombre}</h4>
                        <span className="text-[11px] text-slate-500">
                          {c.telefono ? `📞 ${c.telefono}` : 'Sin teléfono'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pl-13 sm:pl-0">
                      <div className="text-right">
                        <span className={`text-base font-black tracking-tight ${conDeuda ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {fmtCOP(c.saldoPendiente)} COP
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Total fiado: {fmtCOP(c.totalFiado)} | Pagado: {fmtCOP(c.totalPagado)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {conDeuda && (
                          <button
                            type="button"
                            onClick={() => navigate('/cobrar-fiado')}
                            className="px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-bold transition-all"
                          >
                            Cobrar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSelectCliente(c.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-all"
                        >
                          {isSelected ? 'Cerrar ▲' : 'Detalle ▼'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Panel Desplegable de Detalle (Ventas y Pagos) */}
                  {isSelected && (
                    <div className="mt-3 p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-xs font-bold text-white block">Movimientos de {c.nombre}</span>
                          <span className="text-[10px] text-slate-400">Saldo actual adeudado: {fmtCOP(c.saldoPendiente)}</span>
                        </div>

                        {/* Botón Imprimir Extracto del Cliente */}
                        <button
                          type="button"
                          onClick={() => handleExportExtractoClientePDF(c)}
                          disabled={!detalle || (detalle.ventas.length === 0 && detalle.pagos.length === 0)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-950/40 disabled:opacity-50"
                          title="Descargar extracto individual de cuenta en PDF para el cliente"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          <span>Extracto Individual (PDF)</span>
                        </button>
                      </div>

                      {loadingDetalle ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          Cargando movimientos de {c.nombre}...
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Ventas Fiadas */}
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                              Ventas a Crédito ({detalle?.ventas.length ?? 0})
                            </span>
                            {(detalle?.ventas.length ?? 0) === 0 ? (
                              <p className="text-[11px] text-slate-500">Sin ventas fiadas registradas.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {detalle?.ventas.map((v) => (
                                  <div key={v.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                                    <span className="text-slate-300 font-medium">{fmtFecha(v.fecha)} ({v.jornada === 'manana' ? '☀️' : '🌙'})</span>
                                    <div className="text-right">
                                      <span className="text-amber-400 font-bold block">{fmtCOP(Number(v.total))}</span>
                                      <span className="text-[10px] text-slate-500">{Number(v.litros)} L</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Pagos Realizados */}
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                              Abonos y Pagos ({detalle?.pagos.length ?? 0})
                            </span>
                            {(detalle?.pagos.length ?? 0) === 0 ? (
                              <p className="text-[11px] text-slate-500">Sin pagos registrados aún.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {detalle?.pagos.map((p) => (
                                  <div key={p.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                                    <div>
                                      <span className="text-slate-300 font-medium block">{fmtFecha(p.fecha)}</span>
                                      <span className="text-[10px] text-slate-500">{p.concepto || 'Abono'}</span>
                                    </div>
                                    <span className="text-emerald-400 font-bold">{fmtCOP(Number(p.monto))}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
