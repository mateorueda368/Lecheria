import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

// --- Helpers ---
const fmtCOP = (n: number) =>
  '$' + Math.abs(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtFecha = (iso: string) => {
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

export default function EstadoClientes() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState<ClienteSaldo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Totales globales
  const totalDeuda = clientes.reduce((acc, c) => acc + c.saldoPendiente, 0);
  const clientesConDeuda = clientes.filter((c) => c.saldoPendiente > 0).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Cargando clientes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-rose-600 font-semibold">⚠️ {error}</p>
        <button onClick={fetchClientes} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Estado de Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Saldos de fiados y historial de pagos por cliente.
          </p>
        </div>
        <button
          onClick={() => navigate('/fiados')}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          + Nueva Venta Fiada
        </button>
      </div>

      {/* Resumen global */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Clientes</p>
          <p className="text-2xl font-black text-slate-800">{clientes.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Con Deuda</p>
          <p className="text-2xl font-black text-amber-800">{clientesConDeuda}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Deuda Total</p>
          <p className="text-2xl font-black text-rose-800">{fmtCOP(totalDeuda)}</p>
        </div>
      </div>

      {/* Lista de clientes */}
      {clientes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium">No hay clientes registrados aún.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {clientes.map((cliente) => {
            const isOpen = selectedId === cliente.id;
            const tieneDeuda = cliente.saldoPendiente > 0;

            return (
              <div
                key={cliente.id}
                className={`rounded-xl border transition-all ${
                  isOpen ? 'border-blue-300 shadow-md' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Fila principal — clic para expandir */}
                <button
                  onClick={() => handleSelectCliente(cliente.id)}
                  className="w-full flex items-center justify-between px-4 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      tieneDeuda ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{cliente.nombre}</p>
                      {cliente.telefono && (
                        <p className="text-xs text-slate-400">{cliente.telefono}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-400">Fiado total</p>
                      <p className="text-sm font-semibold text-slate-600">{fmtCOP(cliente.totalFiado)}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-400">Pagado</p>
                      <p className="text-sm font-semibold text-emerald-600">{fmtCOP(cliente.totalPagado)}</p>
                    </div>
                    <div className="text-right min-w-[90px]">
                      <p className="text-xs text-slate-400">Saldo</p>
                      <p className={`text-base font-black ${tieneDeuda ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {tieneDeuda ? fmtCOP(cliente.saldoPendiente) : '✅ Al día'}
                      </p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Detalle expandible */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 bg-slate-50 rounded-b-xl">
                    {loadingDetalle ? (
                      <div className="flex items-center gap-2 py-4 text-slate-400 text-sm">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Cargando historial...
                      </div>
                    ) : detalle ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Ventas fiadas */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            📋 Ventas Fiadas ({detalle.ventas.length})
                          </h3>
                          {detalle.ventas.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">Sin ventas fiadas.</p>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {detalle.ventas.map((v) => (
                                <div key={v.id} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-slate-200 text-sm">
                                  <span className="text-slate-500">{fmtFecha(v.fecha)} · {v.jornada === 'manana' ? '☀️' : '🌙'} {v.litros}L</span>
                                  <span className="font-semibold text-rose-700">{fmtCOP(v.total)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Pagos recibidos */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            ✅ Pagos Recibidos ({detalle.pagos.length})
                          </h3>
                          {detalle.pagos.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">Sin pagos registrados.</p>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {detalle.pagos.map((p) => (
                                <div key={p.id} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-slate-200 text-sm">
                                  <span className="text-slate-500">{fmtFecha(p.fecha)}{p.concepto ? ` · ${p.concepto}` : ''}</span>
                                  <span className="font-semibold text-emerald-700">{fmtCOP(p.monto)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Acciones */}
                        {tieneDeuda && (
                          <div className="sm:col-span-2 pt-2 flex justify-end">
                            <button
                              onClick={() => navigate('/cobrar-fiado')}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
                            >
                              💰 Registrar Cobro
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
