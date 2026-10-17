import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PRECIO_LITRO = 2500;

interface Cliente {
  id: string;
  nombre: string;
  telefono?: string | null;
}

export default function RegistrarFiado() {
  const today = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(today);
  const [jornada, setJornada] = useState<'manana' | 'tarde'>('manana');
  const [litros, setLitros] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  
  // Stock
  const [stockDisponible, setStockDisponible] = useState<number | null>(null);

  // Nuevo Cliente Modal/Inline
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [creandoCliente, setCreandoCliente] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchClientes = async () => {
    setLoadingClientes(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, telefono')
        .order('nombre');
      
      if (error) throw error;
      setClientes(data || []);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    } finally {
      setLoadingClientes(false);
    }
  };

  const fetchStock = async () => {
    try {
      const { data, error } = await supabase
        .from('movimientos_leche')
        .select('tipo, litros');
      
      if (error) throw error;
      const total = (data || []).reduce((acc, m) => {
        if (m.tipo === 'produccion' || m.tipo === 'correccion') {
          return acc + Number(m.litros);
        }
        return acc - Number(m.litros);
      }, 0);
      setStockDisponible(Math.max(0, total));
    } catch (err) {
      console.error('Error al consultar stock:', err);
    }
  };

  useEffect(() => {
    fetchClientes();
    fetchStock();
  }, []);

  const litrosNum = parseFloat(litros) || 0;
  const totalCalculado = litrosNum * PRECIO_LITRO;

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
    (c.telefono && c.telefono.includes(busquedaCliente))
  );

  const handleCrearCliente = async (e: FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;

    setCreandoCliente(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nombre: nuevoNombre.trim(),
          telefono: nuevoTelefono.trim() || null,
          registrado_por: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setClientes((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setSelectedClienteId(data.id);
        setMostrarNuevoCliente(false);
        setNuevoNombre('');
        setNuevoTelefono('');
        setMensaje({ type: 'success', text: `Cliente "${data.nombre}" registrado exitosamente.` });
      }
    } catch (err: unknown) {
      setMensaje({ type: 'error', text: (err as Error).message || 'Error al crear cliente.' });
    } finally {
      setCreandoCliente(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (!selectedClienteId) {
      setMensaje({ type: 'error', text: 'Por favor selecciona un cliente para cargar la deuda.' });
      return;
    }

    if (litrosNum <= 0) {
      setMensaje({ type: 'error', text: 'Por favor ingresa una cantidad de litros válida mayor a cero.' });
      return;
    }

    if (stockDisponible !== null && litrosNum > stockDisponible) {
      setMensaje({ 
        type: 'error', 
        text: `Stock insuficiente. Solo hay ${stockDisponible.toLocaleString()} L disponibles en el inventario.` 
      });
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
          text: `¡Venta Fiada Registrada! Se cargaron $${totalCalculado.toLocaleString('es-CO')} COP a la cuenta de ${clienteSeleccionado?.nombre || 'cliente'}.`,
        });
        setLitros('');
        fetchStock();
      }
    } catch {
      setMensaje({ type: 'error', text: 'Error inesperado de red o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 text-lg">📋</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Venta Fiada (Crédito)</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Registra entregas a crédito a clientes ($2.500/L). Descuenta volumen y acumula deuda pendiente sin tocar caja física.
          </p>
        </div>

        {/* Stock Badge */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 font-medium">Stock disponible:</span>
          <span className="text-sm font-extrabold text-white">
            {stockDisponible !== null ? `${stockDisponible.toLocaleString()} L` : '...'}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Seleccionar Cliente con Buscador y botón para nuevo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="cliente" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Cliente Deudor
              </label>
              <button
                type="button"
                onClick={() => setMostrarNuevoCliente(!mostrarNuevoCliente)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                {mostrarNuevoCliente ? '✕ Cancelar' : '+ Crear nuevo cliente'}
              </button>
            </div>

            {/* Modal/Panel de Nuevo Cliente */}
            {mostrarNuevoCliente && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-3 animate-fade-in">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Registrar Nuevo Cliente
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nombre completo *"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    className="px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <input
                    type="text"
                    placeholder="Teléfono (opcional)"
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    className="px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  disabled={creandoCliente || !nuevoNombre.trim()}
                  onClick={handleCrearCliente}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {creandoCliente ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            )}

            {/* Dropdown y buscador */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="🔍 Filtrar por nombre o teléfono..."
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />

              <select
                id="cliente"
                required
                value={selectedClienteId}
                onChange={(e) => setSelectedClienteId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              >
                <option value="">-- Selecciona un cliente ({clientesFiltrados.length} disponibles) --</option>
                {clientesFiltrados.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.telefono ? `(${c.telefono})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Fecha */}
            <div className="space-y-2">
              <label htmlFor="fecha" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Fecha
              </label>
              <input
                type="date"
                id="fecha"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
              />
            </div>

            {/* Jornada */}
            <div className="space-y-2">
              <label htmlFor="jornada" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Jornada
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setJornada('manana')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    jornada === 'manana'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ☀️ Mañana
                </button>
                <button
                  type="button"
                  onClick={() => setJornada('tarde')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    jornada === 'tarde'
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🌙 Tarde
                </button>
              </div>
            </div>
          </div>

          {/* Litros Input with Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="litros" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Litros Fiados
              </label>
              <span className="text-[11px] text-slate-500">$2.500 COP / L</span>
            </div>

            <div className="relative">
              <input
                type="number"
                id="litros"
                step="0.1"
                min="0.1"
                required
                placeholder="0.0"
                value={litros}
                onChange={(e) => setLitros(e.target.value)}
                className="w-full pl-5 pr-14 py-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-2xl font-black text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-slate-700"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">
                L
              </span>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Presets:</span>
              {[1, 2, 5, 10, 15].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setLitros(num.toString())}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  {num} L
                </button>
              ))}
            </div>
          </div>

          {/* Cálculo del Total */}
          <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 p-5 rounded-2xl border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
            <div>
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest block">
                Deuda a Registrar
              </span>
              <p className="text-3xl font-black text-white tracking-tight">
                ${totalCalculado.toLocaleString('es-CO')} <span className="text-sm font-semibold text-amber-400">COP</span>
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 border-t sm:border-t-0 sm:border-l border-slate-800/80 pt-2 sm:pt-0 sm:pl-4">
              <p className="font-semibold text-slate-300">{litrosNum || 0} Litros × $2.500</p>
              <p className="text-[11px] text-amber-400/80">⚠️ No entra dinero a caja física</p>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || loadingClientes}
            className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Registrando Deuda...
              </>
            ) : (
              <>
                <span>Registrar Venta Fiada</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Navigation shortcuts */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <Link to="/cobrar-fiado" className="hover:text-amber-400 transition-colors">
          ¿Cliente va a abonar? → <span className="underline font-bold">Cobrar Fiado</span>
        </Link>
        <Link to="/clientes" className="hover:text-slate-300 transition-colors">
          Ver saldos acumulados →
        </Link>
      </div>

    </div>
  );
}
