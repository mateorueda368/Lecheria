import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

// --- Types ---
interface DashboardData {
  stock_leche: number;
  produccion_hoy: number;
  prod_manana: number;
  prod_tarde: number;
  caja_esperada: number;
  ventas_hoy_monto: number;
  ventas_hoy_litros: number;
  fiados_pendientes: number;
  quesera_hoy: number;
  ultimo_cierre_fecha: string | null;
  ultimo_cierre_monto: number | null;
  movimientos_recientes: MovimientoCaja[];
}

interface MovimientoCaja {
  id: string;
  fecha: string;
  concepto: string;
  tipo: string;
  monto: number;
}

// --- Helpers ---
const fmt = (n: number, decimals = 1) =>
  n.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtCOP = (n: number) =>
  '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtFecha = (iso: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export default function Dashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const navigate = useNavigate();

  const isAdmin = profile?.rol === 'administrador';

  const fetchData = useCallback(async () => {
    try {
      const { data: res, error: err } = await supabase.rpc('get_dashboard_resumen');
      if (err) throw err;
      setData(res as DashboardData);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error al cargar el resumen del dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const todayStr = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
        <p className="text-slate-400 font-medium text-sm animate-pulse">Cargando tablero operativo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 text-2xl">
          ⚠️
        </div>
        <h3 className="text-lg font-bold text-slate-100">Error al consultar datos</h3>
        <p className="text-slate-400 text-xs text-center max-w-sm">{error}</p>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-500/20"
        >
          Reintentar consulta
        </button>
      </div>
    );
  }

  if (!data) return null;

  const stockLeche = Number(data.stock_leche ?? 0);
  const cajaEsperada = Number(data.caja_esperada ?? 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 p-5 rounded-2xl border border-slate-800/80 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Hola, {profile?.nombre || 'Usuario'}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
              isAdmin 
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {isAdmin ? 'Administrador' : 'Trabajador'}
            </span>
          </div>
          <p className="text-slate-400 text-xs capitalize flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            {todayStr}
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          {lastUpdated && (
            <span className="text-[11px] text-slate-500 font-medium">
              {lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-2 rounded-xl transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refrescar
          </button>
        </div>
      </div>

      {/* ── SECCIÓN 1: INVENTARIO DE LECHE ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Control de Volumen de Leche
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Stock Actual Card */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/80 p-4 rounded-2xl border border-emerald-500/20 flex flex-col justify-between gap-3 shadow-lg relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock Disponible</span>
              <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-lg">🥛</span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {fmt(stockLeche)} <span className="text-sm font-semibold text-emerald-400">L</span>
              </p>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(5, stockLeche))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Producción Hoy Card */}
          <div 
            onClick={() => navigate('/registrar')}
            className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all flex flex-col justify-between gap-3 shadow-lg group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Producción Hoy</span>
              <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 text-lg">🐄</span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {fmt(Number(data.produccion_hoy ?? 0))} <span className="text-sm font-semibold text-blue-400">L</span>
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                ☀️ {fmt(Number(data.prod_manana ?? 0))} L | 🌙 {fmt(Number(data.prod_tarde ?? 0))} L
              </p>
            </div>
          </div>

          {/* Quesera Hoy Card */}
          <div 
            onClick={() => navigate('/quesera')}
            className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all flex flex-col justify-between gap-3 shadow-lg group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quesera Hoy</span>
              <span className="p-1.5 rounded-xl bg-teal-500/10 text-teal-400 text-lg">🧀</span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {fmt(Number(data.quesera_hoy ?? 0))} <span className="text-sm font-semibold text-teal-400">L</span>
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">$1.950/L Acumulado</p>
            </div>
          </div>

          {/* Ventas Hoy Card */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between gap-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ventas Hoy (Vol)</span>
              <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 text-lg">📦</span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {fmt(Number(data.ventas_hoy_litros ?? 0))} <span className="text-sm font-semibold text-amber-400">L</span>
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Directas + Fiadas</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── SECCIÓN 2: ESTADO DE CAJA ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Flujo Financiero & Caja
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Caja Esperada Card */}
          <div 
            onClick={() => isAdmin && navigate('/cierre-caja')}
            className={`p-5 rounded-2xl border transition-all shadow-xl flex flex-col justify-between gap-4 ${
              isAdmin ? 'cursor-pointer hover:border-indigo-500/50' : ''
            } ${
              cajaEsperada < 0 
                ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/30' 
                : 'bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Caja Física Esperada</span>
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 text-xl font-bold">💵</span>
            </div>
            <div>
              <p className="text-3xl font-black text-white tracking-tight">
                {fmtCOP(cajaEsperada)}
              </p>
              <p className="text-xs text-indigo-300 font-medium mt-1">
                {cajaEsperada < 0 ? '⚠️ Alerta de descuadre negativo' : 'Base + Ingresos - Egresos'}
              </p>
            </div>
          </div>

          {/* Ventas Hoy ($) */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Ventas Cobradas Hoy</span>
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xl font-bold">💳</span>
            </div>
            <div>
              <p className="text-3xl font-black text-emerald-400 tracking-tight">
                {fmtCOP(Number(data.ventas_hoy_monto ?? 0))}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">Ingreso en efectivo directo</p>
            </div>
          </div>

          {/* Fiados Pendientes */}
          <div 
            onClick={() => isAdmin && navigate('/cobrar-fiado')}
            className={`p-5 rounded-2xl bg-slate-900/90 border border-amber-500/20 transition-all flex flex-col justify-between gap-4 shadow-lg ${
              isAdmin ? 'hover:border-amber-500/40 cursor-pointer' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Cuentas Fiadas Pendientes</span>
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 text-xl font-bold">📋</span>
            </div>
            <div>
              <p className="text-3xl font-black text-amber-400 tracking-tight">
                {fmtCOP(Number(data.fiados_pendientes ?? 0))}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-slate-400 font-medium">Por cobrar a clientes</span>
                {isAdmin && <span className="text-[11px] font-bold text-amber-400 hover:underline">Cobrar →</span>}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── SECCIÓN 3: ACCESOS RÁPIDOS ADAPTATIVOS ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">⚡ Módulos Operativos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          
          <button
            onClick={() => navigate('/registrar')}
            className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-950/20 transition-all flex flex-col items-center gap-2 text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              🐄
            </div>
            <span className="text-xs font-bold text-slate-200">Registrar Ordeño</span>
          </button>

          <button
            onClick={() => navigate('/venta-directa')}
            className="p-3.5 rounded-xl bg-slate-900 border border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-950/20 transition-all flex flex-col items-center gap-2 text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              💰
            </div>
            <span className="text-xs font-bold text-slate-200">Venta Directa</span>
          </button>

          <button
            onClick={() => navigate('/fiados')}
            className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-950/20 transition-all flex flex-col items-center gap-2 text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              📋
            </div>
            <span className="text-xs font-bold text-slate-200">Venta Fiada</span>
          </button>

          <button
            onClick={() => navigate('/quesera')}
            className="p-3.5 rounded-xl bg-slate-900 border border-teal-500/30 hover:border-teal-500/60 hover:bg-teal-950/20 transition-all flex flex-col items-center gap-2 text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              🧀
            </div>
            <span className="text-xs font-bold text-slate-200">Entrega Quesera</span>
          </button>

          {isAdmin ? (
            <button
              onClick={() => navigate('/cierre-caja')}
              className="p-3.5 rounded-xl bg-slate-900 border border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-950/20 transition-all flex flex-col items-center gap-2 text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                🔒
              </div>
              <span className="text-xs font-bold text-slate-200">Cierre de Caja</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/consumo')}
              className="p-3.5 rounded-xl bg-slate-900 border border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-950/20 transition-all flex flex-col items-center gap-2 text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                🏡
              </div>
              <span className="text-xs font-bold text-slate-200">Consumo Finca</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => navigate('/correcciones')}
              className="p-3.5 rounded-xl bg-slate-900 border border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-950/20 transition-all flex flex-col items-center gap-2 text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                ✏️
              </div>
              <span className="text-xs font-bold text-slate-200">Correcciones</span>
            </button>
          )}

        </div>
      </section>

      {/* ── SECCIÓN 4: ÚLTIMOS MOVIMIENTOS ── */}
      <section className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            🕒 Movimientos Recientes de Caja
          </h2>
          {isAdmin && (
            <button
              onClick={() => navigate('/historial-caja')}
              className="text-xs text-emerald-400 hover:underline font-bold"
            >
              Ver historial completo →
            </button>
          )}
        </div>

        {data.movimientos_recientes.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <p className="text-2xl mb-1">📭</p>
            <p>No se han registrado movimientos de dinero aún.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800/80">
                  <th className="py-2.5 px-3 font-extrabold uppercase">Fecha</th>
                  <th className="py-2.5 px-3 font-extrabold uppercase">Concepto</th>
                  <th className="py-2.5 px-3 font-extrabold uppercase text-right">Monto ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {data.movimientos_recientes.map((mov) => {
                  const esIngreso = ['ingreso_venta', 'pago_cliente', 'pago_quesera'].includes(mov.tipo);
                  return (
                    <tr key={mov.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{fmtFecha(mov.fecha)}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">{mov.concepto ?? mov.tipo}</td>
                      <td className={`py-2.5 px-3 text-right font-black ${esIngreso ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {esIngreso ? '+' : '-'}{fmtCOP(Math.abs(mov.monto))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Footer / Cierre Info */}
      {data.ultimo_cierre_fecha && (
        <div className="flex items-center gap-3 bg-slate-900/60 rounded-xl px-4 py-3 border border-slate-800 text-xs text-slate-400">
          <span className="text-lg">🔒</span>
          <span>
            Último cierre oficial: <strong className="text-slate-200">{fmtFecha(data.ultimo_cierre_fecha)}</strong>
            {data.ultimo_cierre_monto !== null && (
              <> · Base dejada: <strong className="text-emerald-400">{fmtCOP(data.ultimo_cierre_monto)}</strong></>
            )}
          </span>
        </div>
      )}

    </div>
  );
}
