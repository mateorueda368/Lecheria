import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'trabajador' | 'administrador'>('trabajador');
  const [loadingForm, setLoadingForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingForm(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nombre: nombre.trim() || email.split('@')[0],
            rol,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message || 'Error al crear la cuenta.');
      } else if (data.session) {
        // Ingreso automático
      } else {
        setSuccessMsg('¡Cuenta registrada exitosamente! Ya puedes iniciar sesión.');
        setIsRegistering(false);
        setPassword('');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg('Correo o contraseña incorrectos. Verifica tus credenciales.');
      }
    }

    setLoadingForm(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4 relative z-10">
        
        {/* Logo */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-950/50 flex items-center justify-center">
          <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            Sistema de Gestión Lechería
          </h2>
          <p className="mt-1 text-xs text-slate-400 font-medium">
            Control de pesaje, ventas directas, fiados y arqueo de caja
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="card-dark border-slate-800/80 py-8 px-6 sm:px-10 shadow-2xl backdrop-blur-xl">
          
          {/* Tab Selector: Iniciar Sesión / Registrar */}
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => { setIsRegistering(false); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !isRegistering
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setIsRegistering(true); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                isRegistering
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            
            {errorMsg && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs font-semibold animate-fade-in">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs font-semibold animate-fade-in">
                <span>✅</span>
                <span>{successMsg}</span>
              </div>
            )}

            {isRegistering && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="nombre" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Nombre Completo
                  </label>
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm font-medium"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="rol" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Rol en la Lechería
                  </label>
                  <select
                    id="rol"
                    value={rol}
                    onChange={(e) => setRol(e.target.value as typeof rol)}
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm font-semibold capitalize"
                  >
                    <option value="trabajador">Trabajador (Operación Diaria)</option>
                    <option value="administrador">Administrador (Caja &amp; Control Total)</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm font-medium"
                placeholder="usuario@lecheria.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm font-medium"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <button
              type="submit"
              disabled={loadingForm}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loadingForm ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  {isRegistering ? 'Creando Cuenta...' : 'Iniciando Sesión...'}
                </>
              ) : (
                <>
                  <span>{isRegistering ? 'Completar Registro' : 'Ingresar al Sistema'}</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-500">
          Acceso seguro mediante autenticación Supabase y Row Level Security
        </p>
      </div>

    </div>
  );
}
