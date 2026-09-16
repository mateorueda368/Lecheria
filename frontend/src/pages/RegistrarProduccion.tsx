import { useState, FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

export default function RegistrarProduccion() {
  const { rol } = useAuth();
  
  // Obtener fecha actual en formato YYYY-MM-DD para el valor por defecto
  const today = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(today);
  const [jornada, setJornada] = useState<'manana' | 'tarde'>('manana');
  const [litros, setLitros] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    
    const litrosNum = parseFloat(litros);
    if (isNaN(litrosNum) || litrosNum <= 0) {
      setMensaje({ type: 'error', text: 'Por favor ingresa una cantidad de litros válida mayor a cero.' });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('registrar_produccion', {
        p_fecha: fecha,
        p_jornada: jornada,
        p_litros: litrosNum,
      });

      if (error) {
        // Manejo de errores específicos
        if (error.message.includes('Ya existe una producción')) {
          setMensaje({ type: 'error', text: `Error: Ya existe un registro para la ${jornada} del ${fecha}.` });
        } else {
          setMensaje({ type: 'error', text: error.message || 'Ocurrió un error al registrar la producción.' });
        }
      } else {
        setMensaje({ type: 'success', text: `¡Éxito! Se registraron ${litrosNum} litros para la ${jornada}.` });
        // Reiniciar litros, mantener fecha y jornada para facilidad de uso
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
      <div className="pb-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Registro de Producción</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ingresa los litros de leche obtenidos en el ordeño.
          </p>
        </div>
        <div className="hidden sm:block">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">
            Rol: {rol}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
        
        {mensaje && (
          <div className={`p-4 rounded-lg flex items-start gap-3 ${mensaje.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className={`flex-shrink-0 w-5 h-5 mt-0.5 ${mensaje.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
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
            <p className={`text-sm font-medium ${mensaje.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {mensaje.text}
            </p>
          </div>
        )}

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
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm outline-none text-slate-700 font-medium"
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
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm outline-none text-slate-700 font-medium"
            >
              <option value="manana">Mañana</option>
              <option value="tarde">Tarde</option>
            </select>
          </div>
        </div>

        {/* Litros */}
        <div className="space-y-2">
          <label htmlFor="litros" className="block text-sm font-semibold text-slate-700">
            Litros Producidos
          </label>
          <div className="relative">
            <input
              type="number"
              id="litros"
              step="0.01"
              min="0.1"
              required
              placeholder="Ej. 120.5"
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
              className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm outline-none text-xl text-slate-900 font-bold"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <span className="text-slate-400 font-medium">L</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Guardando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Registrar Producción
            </>
          )}
        </button>
      </form>
    </div>
  );
}
