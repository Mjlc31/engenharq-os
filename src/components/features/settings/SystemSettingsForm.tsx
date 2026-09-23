import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../../lib/supabase';
import { Save, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '../../../lib/storage';

const settingsSchema = z.object({
  company_name: z.string().min(1, 'Razão social é obrigatória'),
  logo_url: z.string().nullable().optional(),
  epi_declaration_text: z.string().nullable().optional(),
  epi_terms_text: z.string().nullable().optional(),
  epi_legal_base_text: z.string().nullable().optional(),
  default_expiration_alert_days: z.number().min(1, 'Mínimo de 1 dia').nullable().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function SystemSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      default_expiration_alert_days: 30,
    }
  });

  const logoUrl = watch('logo_url');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setSettingsId(data.id);
        setValue('company_name', data.company_name || '');
        setValue('logo_url', data.logo_url);
        setValue('epi_declaration_text', data.epi_declaration_text);
        setValue('epi_terms_text', data.epi_terms_text);
        setValue('epi_legal_base_text', data.epi_legal_base_text);
        setValue('default_expiration_alert_days', data.default_expiration_alert_days);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingLogo(true);
    try {
      const url = await uploadImage(e.target.files[0], 'system-assets');
      if (url) setValue('logo_url', url, { shouldDirty: true });
    } catch (err: any) {
      setError('Erro ao enviar a imagem.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const onSubmit = async (values: SettingsFormValues) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      if (settingsId) {
        // Atualiza o existente
        const { error: updateError } = await supabase
          .from('system_settings')
          .update({
            company_name: values.company_name,
            logo_url: values.logo_url,
            epi_declaration_text: values.epi_declaration_text,
            epi_terms_text: values.epi_terms_text,
            epi_legal_base_text: values.epi_legal_base_text,
            default_expiration_alert_days: values.default_expiration_alert_days,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settingsId);

        if (updateError) throw updateError;
      } else {
        // Cria um novo
        const { data, error: insertError } = await supabase
          .from('system_settings')
          .insert({
            company_name: values.company_name,
            logo_url: values.logo_url,
            epi_declaration_text: values.epi_declaration_text,
            epi_terms_text: values.epi_terms_text,
            epi_legal_base_text: values.epi_legal_base_text,
            default_expiration_alert_days: values.default_expiration_alert_days,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (data) setSettingsId(data.id);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border flex justify-between items-center">
        <h3 className="text-lg font-bold">Configurações do Sistema</h3>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm">
            Configurações salvas com sucesso!
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Razão Social da Empresa *</label>
              <input
                {...register('company_name')}
                className={`w-full bg-background border ${errors.company_name ? 'border-red-500' : 'border-border'} rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50`}
                placeholder="Ex: Engenharq LTDA"
              />
              {errors.company_name && <p className="text-red-500 text-xs mt-1">{errors.company_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">Dias de Alerta para Vencimento de CA</label>
              <input
                type="number"
                {...register('default_expiration_alert_days', { valueAsNumber: true })}
                className={`w-full bg-background border ${errors.default_expiration_alert_days ? 'border-red-500' : 'border-border'} rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50`}
                placeholder="Ex: 30"
              />
              {errors.default_expiration_alert_days && <p className="text-red-500 text-xs mt-1">{errors.default_expiration_alert_days.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-2">Logo da Empresa</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-surface-hover text-foreground font-medium rounded-lg cursor-pointer hover:bg-surface-hover/80 transition-colors">
                    {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    {uploadingLogo ? 'Enviando...' : 'Escolher Imagem'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  </label>
                  <p className="text-xs text-muted mt-2">Recomendado: PNG ou JPG com fundo transparente.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Texto de Declaração de EPI</label>
              <textarea
                {...register('epi_declaration_text')}
                className="w-full h-24 bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Texto padrão que aparecerá na ficha de entrega..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">Termos de Responsabilidade</label>
              <textarea
                {...register('epi_terms_text')}
                className="w-full h-24 bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Termos de responsabilidade para uso do EPI..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">Base Legal (NR, CLT)</label>
              <textarea
                {...register('epi_legal_base_text')}
                className="w-full h-24 bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Ex: Conforme NR 06..."
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
