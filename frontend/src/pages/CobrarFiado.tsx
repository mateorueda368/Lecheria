import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

interface ClienteSaldo {
  id: string;
  nombre: string;
  telefono?: string | null;
  totalFiado: number;
  totalPagado: number;
  saldoPendiente: number;
}

export default function CobrarFiado() {
  const { profile } = useAuth();
  const isAdmin = profile?.rol === 'administrador';
  const today = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(today);
  const [clientesSaldos, setClientesSaldos] = useState<ClienteSaldo[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [montoAbono, setMontoAbono] = useState('');
  const [concepto, setConcepto] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchClientesYSaldos = async () => {
    setLoading(true);
    try {
      const [
        { data: clientesData, error: errClientes },
        { data: ventasFiadas, error: errVentas },
        { data: pagos, error: errPagos }
      ] = await Promise.all([
        supabase.from('clientes').select('id, nombre, telefono').order('nombre'),
        supabase.from('ventas_directas').select('cliente_id, total').eq('estado', 'fiada'),
        supabase.from('pagos_clientes').select('cliente_id, monto'),
      ]);

      if (errClientes) throw errClientes;
      if (errVentas) throw errVentas;
      if (errPagos) throw errPagos;

      const saldosMap: { [key: string]: ClienteSaldo } = {};

      (clientesData || []).forEach((c) => {
        saldosMap[c.id] = {
          id: c.id,
          nombre: c.nombre,
          telefono: c.telefono,
          totalFiado: 0,
          totalPagado: 0,
          saldoPendiente: 0,
        };
      });

      (ventasFiadas || []).forEach((v) => {
        if (v.cliente_id && saldosMap[v.cliente_id]) {
          saldosMap[v.cliente_id].totalFiado += Number(v.total);
        }
      });

      (pagos || []).forEach((p) => {
        if (p.cliente_id && saldosMap[p.cliente_id]) {
          saldosMap[p.cliente_id].totalPagado += Number(p.monto);
        }
      });

      const listaCalculada = Object.values(saldosMap)
        .map((item) => ({
          ...item,
          saldoPendiente: Math.max(0, item.totalFiado - item.totalPagado),
        }))
        .filter((item) => item.saldoPendiente > 0)
        .sort((a, b) => b.saldoPendiente - a.saldoPendiente);

      setClientesSaldos(listaCalculada);
    } catch (err: unknown) {
      console.error('Error al obtener saldos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientesYSaldos();
  }, []);

  const clientesFiltrados = clientesSaldos.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.telefono && c.telefono.includes(busqueda))
  );

  const clienteSeleccionado = clientesSaldos.find((c) => c.id === selectedClienteId);
  const montoNum = parseFloat(montoAbono) || 0;
  const totalCarteraPendiente = clientesSaldos.reduce((acc, c) => acc + c.saldoPendiente, 0);

  const handlePagarTodo = () => {
    if (clienteSeleccionado) {
      setMontoAbono(clienteSeleccionado.saldoPendiente.toString());
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (!isAdmin) {
      setMensaje({ type: 'error', text: 'Solo administradores pueden registrar cobros de fiados.' });
      return;
    }

    if (!selectedClienteId || !clienteSeleccionado) {
      setMensaje({ type: 'error', text: 'Por favor selecciona un cliente deudor.' });
      return;
    }

    if (montoNum <= 0) {
      setMensaje({ type: 'error', text: 'Por favor ingresa un monto válido mayor a cero.' });
      return;
    }

    if (montoNum > clienteSeleccionado.saldoPendiente) {
      setMensaje({
        type: 'error',
        text: `El monto ($${montoNum.toLocaleString()}) supera el saldo pendiente ($${clienteSeleccionado.saldoPendiente.toLocaleString()}).`,
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.rpc('registrar_pago_cliente', {
        p_fecha: fecha,
        p_cliente_id: selectedClienteId,
        p_monto: montoNum,
        p_concepto: concepto.trim() || null,
      });

      if (error) {
        setMensaje({ type: 'error', text: error.message || 'Ocurrió un error al registrar el cobro.' });
      } else {
        setMensaje({
          type: 'success',
          text: `¡Cobro Exitoso! Se ingresaron $${montoNum.toLocaleString('es-CO')} COP en efectivo de ${clienteSeleccionado.nombre}.`,
        });
        setMontoAbono('');
        setConcepto('');
        setSelectedClienteId('');
        fetchClientesYSaldos();
      }
    } catch {
      setMensaje({ type: 'error', text: 'Error inesperado de red o servidor.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 text-lg">💵</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Cobro de Fiados (Ingreso a Caja)</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Registra abonos o pagos totales de clientes. Reduce la deuda acumulada e ingresa efectivo a caja física.
          </p>
        </div>

        {/* Total Cartera Badge */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/30 px-4 py-2 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">Cartera pendiente:</span>
          <span className="text-sm font-black text-amber-400">
            ${totalCarteraPendiente.toLocaleString('es-CO')} COP
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-400">Consultando cartera de clientes...</p>
          </div>
        ) : clientesSaldos.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <span className="text-3xl">🎉</span>
            <h3 className="text-base font-bold text-emerald-400">¡Al día! No hay clientes con deuda pendiente</h3>
            <p className="text-xs text-slate-400">Todas las cuentas por cobrar de leche fiada se encuentran canceladas.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Selección de Cliente con Búsqueda */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="cliente" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Seleccionar Cliente ({clientesFiltrados.length} con deuda)
                </label>
                <Link to="/clientes" className="text-xs text-blue-400 hover:underline">
                  Ver detalle completo →
                </Link>
              </div>

              <input
                type="text"
                placeholder="🔍 Filtrar deudor por nombre o teléfono..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-400"
              />

              <select
                id="cliente"
                required
                value={selectedClienteId}
                onChange={(e) => {
                  setSelectedClienteId(e.target.value);
                  setMontoAbono('');
                }}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="">-- Elige un cliente para cobrar --</option>
                {clientesFiltrados.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} — Saldo: ${c.saldoPendiente.toLocaleString('es-CO')} COP
                  </option>
                ))}
              </select>
            </div>

            {/* Ficha del Cliente Seleccionado */}
            {clienteSeleccionado && (
              <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 p-5 rounded-2xl border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in shadow-inner">
                <div>
                  <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest block">
                    Saldo Pendiente de {clienteSeleccionado.nombre}
                  </span>
                  <p className="text-3xl font-black text-white tracking-tight">
                    ${clienteSeleccionado.saldoPendiente.toLocaleString('es-CO')} <span className="text-sm font-semibold text-blue-400">COP</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total fiado: ${clienteSeleccionado.totalFiado.toLocaleString()} | Pagado: ${clienteSeleccionado.totalPagado.toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePagarTodo}
                  className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95"
                >
                  Abonar Totalidad
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Fecha */}
              <div className="space-y-2">
                <label htmlFor="fecha" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Fecha de Cobro
                </label>
                <input
                  type="date"
                  id="fecha"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                />
              </div>

              {/* Monto de Abono */}
              <div className="space-y-2">
                <label htmlFor="monto" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Monto a Recibir ($ COP)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="monto"
                    step="500"
                    min="1"
                    max={clienteSeleccionado?.saldoPendiente}
                    required
                    placeholder="0"
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(e.target.value)}
                    className="w-full pl-5 pr-14 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xl font-black text-emerald-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-700"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                    COP
                  </span>
                </div>
              </div>
            </div>

            {/* Concepto */}
            <div className="space-y-2">
              <label htmlFor="concepto" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Concepto / Recibo (Opcional)
              </label>
              <input
                type="text"
                id="concepto"
                placeholder="Ej. Pago en efectivo por semanas 1 y 2"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all text-sm font-medium"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || !selectedClienteId}
              className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registrando Cobro en Caja...
                </>
              ) : (
                <>
                  <span>Ingresar Dinero a Caja</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Navigation shortcuts */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <Link to="/fiados" className="hover:text-amber-400 transition-colors">
          ¿Registrar nuevo crédito? → <span className="underline font-bold">Venta Fiada</span>
        </Link>
        <Link to="/historial-caja" className="hover:text-slate-300 transition-colors">
          Ver movimientos de caja →
        </Link>
      </div>

    </div>
  );
}
