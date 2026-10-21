/**
 * Validadores e Máscaras Compartilhadas do EngenharQ OS
 * Focado na integridade dos dados cadastrais (NR-6 e SST).
 */

/**
 * Remove todos os caracteres não numéricos.
 */
export function cleanDigits(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
}

/**
 * Validação algorítmica de CPF (Dígitos Verificadores da Receita Federal).
 */
export function isValidCPF(cpf: string | null | undefined): boolean {
  if (!cpf) return false;
  const cleanCpf = cleanDigits(cpf);

  if (cleanCpf.length !== 11) return false;
  // Rejeita sequências repetidas (000.000.000-00, 111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

  let sum = 0;
  let remainder: number;

  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(9, 10), 10)) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(10, 11), 10)) return false;

  return true;
}

/**
 * Aplica máscara de CPF no formato 000.000.000-00 em tempo de digitação.
 */
export function applyCpfMask(value: string | null | undefined): string {
  if (!value) return '';
  return cleanDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Sanitiza códigos alfanuméricos de obras e itens (apenas letras e números em maiúsculas).
 */
export function sanitizeAlphaNumericCode(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}
