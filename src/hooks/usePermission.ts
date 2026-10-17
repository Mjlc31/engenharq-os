import { useAuth } from '../components/AuthProvider';
import { rbacService } from '../services/rbacService';

export function usePermission(moduleKey: string, actionKey: string = 'view') {
  const { role, permissions } = useAuth();
  
  if (role === 'ADMIN') return true;
  return rbacService.hasPermission(permissions || undefined, moduleKey, actionKey);
}
