import { useState } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Layout() {
  const { user, profile, loading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <span className="absolute text-emerald-400 font-bold text-lg">L</span>
          </div>
          <p className="text-slate-400 text-sm font-medium animate-pulse">Cargando Lechería...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = profile?.rol === 'administrador';

  const opNavItems = [
    { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3' },
    { to: '/registrar', label: 'Registrar Ordeño', icon: 'M12 4v16m8-8H4' },
    { to: '/produccion', label: 'Historial Ordeños', icon: 'M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6' },
    { to: '/venta-directa', label: 'Venta Directa', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2' },
    { to: '/fiados', label: 'Venta Fiada', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586' },
    { to: '/consumo', label: 'Consumo Finca', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3' },
    { to: '/quesera', label: 'Entrega Quesera', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5' },
  ];

  const adminNavItems = [
    { to: '/cobrar-fiado', label: 'Cobrar Fiado', short: 'Cobrar', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2' },
    { to: '/clientes', label: 'Clientes & Saldos', short: 'Clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7' },
    { to: '/liquidacion-quesera', label: 'Liquidaciones Quesera', short: 'Liquidaciones', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01' },
    { to: '/egresos', label: 'Registrar Egreso', short: 'Egresos', icon: 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' },
    { to: '/cierre-caja', label: 'Cierre de Caja', short: 'Cierre', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6' },
    { to: '/historial-caja', label: 'Historial Caja', short: 'Hist. Caja', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10' },
    { to: '/correcciones', label: 'Correcciones Trazables', short: 'Correcciones', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white pb-20 sm:pb-6">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-2">
            
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-md shadow-emerald-950/40 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  LECHERÍA
                </span>
                <span className="block text-[9px] font-semibold text-emerald-400 leading-none tracking-widest uppercase">
                  Gestión Operativa
                </span>
              </div>
            </NavLink>

            {/* Desktop Full Navigation Menu */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/registrar"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                Ordeño
              </NavLink>

              <NavLink
                to="/produccion"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                Historial Ordeños
              </NavLink>

              <NavLink
                to="/venta-directa"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                Ventas
              </NavLink>

              <NavLink
                to="/fiados"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                Fiados
              </NavLink>

              <NavLink
                to="/quesera"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                Quesera
              </NavLink>

              {isAdmin && adminNavItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      isActive ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'text-indigo-300 hover:text-white hover:bg-indigo-950/40'
                    }`
                  }
                >
                  {item.short}
                </NavLink>
              ))}
            </nav>

            {/* User & Role Badge & Actions */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
                <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-bold text-slate-200 leading-tight">
                    {profile?.nombre || user.email?.split('@')[0]}
                  </span>
                  <span className={`text-[9px] font-extrabold uppercase tracking-wider ${isAdmin ? 'text-indigo-400' : 'text-emerald-400'}`}>
                    {isAdmin ? 'Administrador' : 'Trabajador'}
                  </span>
                </div>
              </div>

              {/* Menu Button for all screens below lg */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden px-3 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700"
              >
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Módulos</span>
              </button>

              <button
                onClick={signOut}
                title="Cerrar sesión"
                className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-extrabold text-rose-300 hover:text-rose-100 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 transition-all flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                </svg>
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Outlet />
      </main>

      {/* Full Drawer Navigation Modal */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xs bg-slate-900 h-full shadow-2xl border-l border-slate-800 p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-100">{profile?.nombre || user.email}</p>
                  <p className={`text-[10px] font-extrabold uppercase tracking-wider ${isAdmin ? 'text-indigo-400' : 'text-emerald-400'}`}>
                    Rol: {isAdmin ? 'Administrador' : 'Trabajador'}
                  </p>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="py-4 space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider mb-2">Operación Diaria</p>
                  <div className="space-y-1">
                    {opNavItems.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`
                        }
                      >
                        <svg className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                        </svg>
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>

                {isAdmin && (
                  <div>
                    <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-2">Administración & Caja</p>
                    <div className="space-y-1">
                      {adminNavItems.map(item => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                              isActive
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`
                          }
                        >
                          <svg className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                          </svg>
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={signOut}
              className="w-full py-3 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/60 flex items-center justify-center gap-2"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}

      {/* Mobile Floating Bottom Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 z-30 flex justify-around items-center py-2 px-1 shadow-2xl">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-bold transition-all py-1 px-2.5 rounded-xl ${
              isActive ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3" />
          </svg>
          Inicio
        </NavLink>

        <NavLink
          to="/registrar"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-bold transition-all py-1 px-2.5 rounded-xl ${
              isActive ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ordeño
        </NavLink>

        <NavLink
          to="/venta-directa"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-bold transition-all py-1 px-2.5 rounded-xl ${
              isActive ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2" />
          </svg>
          Ventas
        </NavLink>

        {isAdmin ? (
          <NavLink
            to="/cierre-caja"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-bold transition-all py-1 px-2.5 rounded-xl ${
                isActive ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6" />
            </svg>
            Cierre
          </NavLink>
        ) : (
          <NavLink
            to="/quesera"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-bold transition-all py-1 px-2.5 rounded-xl ${
                isActive ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5" />
            </svg>
            Quesera
          </NavLink>
        )}

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 py-1 px-2.5"
        >
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Módulos
        </button>
      </nav>
    </div>
  );
}
