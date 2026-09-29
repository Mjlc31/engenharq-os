# UX and Bug Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the CPF validation missing bug, normalize Site Codes to prevent duplicates, and add visual Toast feedback to the Map allocation flow.

**Architecture:** 
- Add CPF validation mask and logic directly to `WorkerForm.tsx`.
- Add sanitization to `setSiteCode` in `Sites.tsx`.
- Import `useToast` in `Map.tsx` and use it after successful `supabase` insertions.

**Tech Stack:** React, TypeScript, Supabase, Tailwind CSS.

---

### Task 1: Fix CPF Validation

**Files:**
- Modify: `/Users/arthurdemoraespd/Documents/engenharq-os-main/src/components/features/workers/WorkerForm.tsx`

**Step 1: Write the CPF Validator and Mask**

Add these utility functions to the top or inside `WorkerForm.tsx`:

```typescript
const applyCpfMask = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const isValidCPF = (cpf: string) => {
  const cleanCPF = cpf.replace(/[^\d]+/g, '');
  if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cleanCPF.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cleanCPF.substring(10, 11))) return false;
  return true;
};
```

**Step 2: Implement into Form**

Update the `cpf` onChange handler:
```tsx
onChange={e => setCpf(applyCpfMask(e.target.value))}
```

Update `handleSubmit` to prevent submission if invalid:
```tsx
if (!isValidCPF(cpf)) {
  alert('CPF Inválido. Por favor verifique.'); // or toast if available
  setIsSubmitting(false);
  return;
}
```
Wait, `WorkerForm` has `onSave` which throws to the parent's `toast`. Better to use `useToast` or just throw an error. But `WorkerForm` doesn't use `toast`. Let's just throw an error:
```tsx
if (!isValidCPF(cpf)) {
  setIsSubmitting(false);
  throw new Error('CPF Inválido. Por favor verifique os números digitados.');
}
```

---

### Task 2: Normalize Site Code

**Files:**
- Modify: `/Users/arthurdemoraespd/Documents/engenharq-os-main/src/pages/Sites.tsx`

**Step 1: Sanitize Input**

Find the `siteCode` input in `Sites.tsx`:
```tsx
onChange={e => setSiteCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
```
This forces alphanumeric and uppercase.

---

### Task 3: Add Toast Feedback to Map Allocation

**Files:**
- Modify: `/Users/arthurdemoraespd/Documents/engenharq-os-main/src/pages/Map.tsx`

**Step 1: Import and Use Toast**

```tsx
import { useToast } from '../components/ui/Toast';
```
Inside `MapTracking`:
```tsx
const { toast } = useToast();
```

**Step 2: Update `handleAssignFromMap`**

```tsx
      if (!assignError) {
        const catalogItem = availableEpis.find(e => e.id === selectedEpi);
        if (catalogItem) {
           await supabase.from('epi_catalog').update({ current_stock: Math.max(0, (catalogItem.current_stock || 0) - 1) }).eq('id', selectedEpi);
        }
        toast({ type: 'success', title: 'Sucesso', message: 'EPI alocado com sucesso.' });
      } else {
        toast({ type: 'error', title: 'Erro', message: 'Falha ao alocar EPI.' });
      }
```
Also catch block:
```tsx
    } catch (err: any) {
      console.error(err);
      toast({ type: 'error', title: 'Erro', message: err.message || 'Falha ao alocar EPI.' });
    }
```
