import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

const PRECIO_LITRO = 2500;

interface Cliente {
  id: string;
  nombre: string;
  telefono?: string;
}

export default function RegistrarFiado() {
  const today = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(today);
  const [jornada, setJornada] = useState<'manana' | 'tarde'>('manana');
  const [litros, setLitros] = useState('');
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState('');
  
  // Modal / Form para nuevo cliente
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const litrosNum = parseFloat(litros) || 0;
  const totalCalculado = litrosNum * PRECIO_LITRO;

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase.from('clientes').select('*').order('nombre');
      if (error) throw error;
      setClientes(data || []);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleCrearCliente = async (e: FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nombre: nuevoNombre.trim(),
          telefono: nuevoTelefono.trim() || null,
          registrado_por: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setClientes((prev) => [...prev, data]);
      setSelectedClienteId(data.id);
      setNuevoNombre('');
      setNuevoTelefono('');
      setMostrarNuevoCliente(false);
    } catch (err: any) {
      alert('Error al crear cliente: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (!selectedClienteId) {
      setMensaje({ type: 'error', text: 'Por favor selecciona un cliente para registrar el fiado.' });
      return;
    }

    if (litrosNum <= 0) {
      setMensaje({ type: 'error', text: 'Por favor ingresa una cantidad de litros válida mayor a cero.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc('registrar_venta_fiada', {
        p_fecha: fecha,
        p_jornada: jornada,
        p_litros: litrosNum,
        p_cliente_id: selectedClienteId,
      });

      if (error) {
        setMensaje({ type: 'error', text: error.message || 'Ocurrió un error al registrar la venta fiada.' });
      } else {
        const clienteSeleccionado = clientes.find((c) => c.id === selectedClienteId);
        setMensaje({
          type: 'success',
          text: `¡Venta Fiada Registrada! Se cargaron $${totalCalculado.toLocaleString()} COP de deuda a ${clienteSeleccionado?.nombre || 'cliente'}.`,
        });
        setLitros('');
      }
    } catch (err: any) {
      setMensaje({ type: 'error', text: 'Error inesperado de red o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 fade-in">
      <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Venta Fiada (Crédito)</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registra una venta a crédito ($2.500/L). No ingresa dinero a caja.
          </p>
        </div>
        <div className="hidden sm:block">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 capitalize">
            Cuenta por Cobrar
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
          <div className="flex items-center justify-between">
            <label htmlFor="cliente" className="block text-sm font-semibold text-slate-700">
              Cliente
            </label>
            <button
              type="button"
              onClick={() => setMostrarNuevoCliente(!mostrarNuevoCliente)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              {mostrarNuevoCliente ? 'Cancelar' : '+ Nuevo Cliente'}
            </button>
          </div>

          {mostrarNuevoCliente ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Agregar Nuevo Cliente</h4>
              <input
                type="text"
                placeholder="Nombre del cliente"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Teléfono (opcional)"
                value={nuevoTelefono}
                onChange={(e) => setNuevoTelefono(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleCrearCliente}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Guardar Cliente
              </button>
            </div>
          ) : (
            <select
              id="cliente"
              required
              value={selectedClienteId}
              onChange={(e) => setSelectedClienteId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors text-slate-700 font-medium outline-none"
            >
              <option value="">-- Seleccionar Cliente --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.telefono ? `(${c.telefono})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Fecha */}
          <div className="space-y-2">
            <label htmlFor="fecha" className="block text-sm font-semibold text-slate-700">
              Fecha
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

          {/* Jornada */}
          <div className="space-y-2">
            <label htmlFor="jornada" className="block text-sm font-semibold text-slate-700">
              Jornada
            </label>
            <select
              id="jornada"
              value={jornada}
              onChange={(e) => setJornada(e.target.value as 'manana' | 'tarde')}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium"
            >
              <option value="manana">Mañana</option>
              <option value="tarde">Tarde</option>
            </select>
          </div>
        </div>

        {/* Litros */}
        <div className="space-y-2">
          <label htmlFor="litros" className="block text-sm font-semibold text-slate-700">
            Litros Fiados
          </label>
          <div className="relative">
            <input
              type="number"
              id="litros"
              step="0.01"
              min="0.1"
              required
              placeholder="Ej. 15"
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
              className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-xl text-slate-900 font-bold"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <span className="text-slate-400 font-medium">L</span>
            </div>
          </div>
        </div>

        {/* Valor Deuda */}
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex justify-between items-center">
          <div>
            <span className="text-xs text-amber-800 uppercase tracking-wider font-semibold">Valor Deuda por Cobrar</span>
            <p className="text-2xl font-black text-amber-700">
              ${totalCalculado.toLocaleString('es-CO')} COP
            </p>
          </div>
          <div className="text-right text-xs text-amber-700">
            <p>$2.500 / L</p>
            <p>Sin ingreso a caja</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-4 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-md shadow-amber-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
        >
          {loading ? 'Guardando Venta Fiada...' : 'Registrar Venta Fiada'}
        </button>
      </form>
    </div>
  );
}
