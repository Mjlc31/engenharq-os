import { supabase } from '../lib/supabase';
import { EpiCatalog, EpiPurchase } from '../types';

export const inventoryService = {
  async fetchCatalog() {
    const { data, error } = await supabase
      .from('epi_catalog')
      .select('*')
      .is('deleted_at', null)
      .order('name');
    if (error) throw error;
    return (data || []) as EpiCatalog[];
  },

  async discardStock(params: {
    catalogId: string;
    quantity: number;
    reason: string;
    notes?: string;
  }) {
    const { data, error } = await supabase.rpc('discard_epi', {
      p_catalog_id: params.catalogId,
      p_quantity: params.quantity,
      p_reason: params.reason,
      p_notes: params.notes || null
    });
    if (error) throw error;
    return data;
  },

  async registerPurchase(params: {
    catalog_id: string;
    site_id?: string;
    quantity: number;
    unit_price: number;
    invoice_number?: string;
    supplier?: string;
    notes?: string;
  }) {
    // Compra, saldo da obra, preço e Kardex numa transação no banco (obra obrigatória)
    const { data, error } = await supabase.rpc('register_stock_entry', {
      p_catalog_id: params.catalog_id,
      p_site_id: params.site_id as string,
      p_quantity: params.quantity,
      p_unit_price: params.unit_price,
      p_invoice_number: params.invoice_number || undefined,
      p_supplier: params.supplier || undefined,
      p_notes: params.notes || undefined
    });
    if (error) throw error;
    return data as unknown as EpiPurchase;
  },

  async fetchPurchases(catalogId?: string) {
    let query = supabase
      .from('epi_purchases')
      .select('*, catalog:epi_catalog(name, code, ca_number), site:construction_sites(name)')
      .order('arrival_date', { ascending: false });

    if (catalogId) {
      query = query.eq('catalog_id', catalogId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as (EpiPurchase & { catalog?: { name: string; code?: string; ca_number?: string }; site?: { name: string } })[];
  }
};
