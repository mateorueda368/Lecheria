import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

interface ClienteSaldo {
  id: string;
  nombre: string;
  telefono?: string;
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchClientesYSaldos = async () => {
    setLoading(true);
    try {
      // 1. Cargar lista de clientes
      const { data: clientesData, error: errClientes } = await supabase.from('clientes').select('*');
      if (errClientes) throw errClientes;

      // 2. Cargar ventas fiadas
      const { data: ventasFiadas, error: errVentas } = await supabase
        .from('ventas_directas')
        .select('cliente_id, total')
        .eq('estado', 'fiada');
      if (errVentas) throw errVentas;

      // 3. Cargar pagos anteriores
      const { data: pagos, error: errPagos } = await supabase
        .from('pagos_clientes')
        .select('cliente_id, monto');
      if (errPagos) throw errPagos;

      // Calcular saldos por cliente
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

      const listaCalculada = Object.values(saldosMap).map((item) => ({
        ...item,
        saldoPendiente: item.totalFiado - item.totalPagado,
      }));

      setClientesSaldos(listaCalculada);
    } catch (err: any) {
      console.error('Error al obtener saldos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientesYSaldos();
  }, []);

  const clienteSeleccionado = clientesSaldos.find((c) => c.id === selectedClienteId);
  const montoNum = parseFloat(montoAbono) || 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (!selectedClienteId || !clienteSeleccionado) {
      setMensaje({ type: 'error', text: 'Por favor selecciona un cliente.' });
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
        setMensaje({ type: 'error', text: error.message || 'Ocurrió un error al registrar el pago.' });
      } else {
        setMensaje({
          type: 'success',
          text: `¡Cobro Exitoso! Se ingresaron $${montoNum.toLocaleString()} COP en caja recibidos de ${clienteSeleccionado.nombre}.`,
        });
        setMontoAbono('');
        setConcepto('');
        setSelectedClienteId('');
        fetchClientesYSaldos();
      }
    } catch (err: any) {
      setMensaje({ type: 'error', text: 'Error inesperado de red o servidor.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 fade-in">
      <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cobro de Fiados (Ingreso a Caja)</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registra el recaudo en efectivo de deudas de clientes.
          </p>
        </div>
        <div className="hidden sm:block">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 capitalize">
            Ingreso a Caja
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
        {mensaje && (
          <div className={`p-4 rounded-lg flex items-start gap-3 ${mensaje.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            <div className={`flex-shrink-0 w-5 h-5 mt-0.5 ${mensaje.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {mensaje.type === 'success' ? (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className={`text-sm font-medium ${mensaje.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
              {mensaje.text}
            </p>
          </div>
        )}

        {/* Cliente */}
        <div className="space-y-2">
          <label htmlFor="cliente" className="block text-sm font-semibold text-slate-700">
            Seleccionar Cliente con Deuda
          </label>
          {loading ? (
            <div className="p-3 text-sm text-slate-400 font-medium bg-slate-50 rounded-lg animate-pulse">
              Cargando saldos de clientes...
            </div>
          ) : (
            <select
              id="cliente"
              required
              value={selectedClienteId}
              onChange={(e) => {
                setSelectedClienteId(e.target.value);
                setMontoAbono('');
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium"
            >
              <option value="">-- Selecciona un cliente --</option>
              {clientesSaldos
                .filter((c) => c.saldoPendiente > 0)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} (Deuda: ${c.saldoPendiente.toLocaleString()} COP)
                  </option>
                ))}
            </select>
          )}
        </div>

        {/* Información del Cliente Seleccionado */}
        {clienteSeleccionado && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-amber-800 uppercase">Estado de Cuenta</span>
              <button
                type="button"
                onClick={() => setMontoAbono(clienteSeleccionado.saldoPendiente.toString())}
                className="text-xs font-bold text-amber-700 underline"
              >
                Pagar Deuda Total
              </button>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium text-slate-700">{clienteSeleccionado.nombre}</span>
              <span className="text-2xl font-black text-amber-800">
                ${clienteSeleccionado.saldoPendiente.toLocaleString()} COP
              </span>
            </div>
          </div>
        )}

        {/* Fecha y Monto */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Fecha */}
          <div className="space-y-2">
            <label htmlFor="fecha" className="block text-sm font-semibold text-slate-700">
              Fecha de Cobro
            </label>
            <input
              type="date"
              id="fecha"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium"
            />
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <label htmlFor="monto" className="block text-sm font-semibold text-slate-700">
              Monto a Recibir ($ COP)
            </label>
            <input
              type="number"
              id="monto"
              step="100"
              min="1"
              required
              placeholder="Ej. 25000"
              value={montoAbono}
              onChange={(e) => setMontoAbono(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-lg text-slate-900 font-bold"
            />
          </div>
        </div>

        {/* Concepto / Nota */}
        <div className="space-y-2">
          <label htmlFor="concepto" className="block text-sm font-semibold text-slate-700">
            Concepto / Nota (Opcional)
          </label>
          <input
            type="text"
            id="concepto"
            placeholder="Ej. Abono parcial ordeño quincena"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !selectedClienteId}
          className="w-full flex justify-center items-center gap-2 py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-md shadow-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
        >
          {saving ? 'Registrando Ingreso...' : 'Registrar Cobro e Ingresar a Caja'}
        </button>
      </form>
    </div>
  );
}
