import { useSearchParams } from 'react-router-dom';

// Situação lida/escrita em ?situacao= para que links do Dashboard abram a tela já filtrada.
export function useSituacaoParam<T extends string>(allowed: readonly T[], fallback: T): [T, (value: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('situacao') as T | null;
  const value = raw && allowed.includes(raw) ? raw : fallback;
  const setValue = (next: T) => {
    const updated = new URLSearchParams(params);
    if (next === fallback) updated.delete('situacao');
    else updated.set('situacao', next);
    setParams(updated, { replace: true });
  };
  return [value, setValue];
}
