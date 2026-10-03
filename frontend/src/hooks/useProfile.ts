import { useAuth } from '../auth/AuthContext';
import type { UserProfile } from '../auth/AuthContext';

/**
 * Hook de conveniencia para acceder al perfil del usuario autenticado.
 * Devuelve el objeto UserProfile desde AuthContext (ya cargado automáticamente
 * en AuthProvider mediante fetchProfile al detectar sesión activa).
 *
 * @returns {{ profile: UserProfile | null; rol: string | null; isAdmin: boolean; nombre: string | null }}
 */
export function useProfile(): {
  profile: UserProfile | null;
  rol: 'trabajador' | 'administrador' | null;
  isAdmin: boolean;
  nombre: string | null;
} {
  const { profile } = useAuth();

  return {
    profile,
    rol: profile?.rol ?? null,
    isAdmin: profile?.rol === 'administrador',
    nombre: profile?.nombre ?? null,
  };
}
