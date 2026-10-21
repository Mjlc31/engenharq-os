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

  async createEpi(payload: {
    name: string;
    category: string;
    brand?: string;
    model?: string;
    ca_number?: string;
    ca_validity?: string;
    lifespan_days?: number;
    minimum_stock?: number;
    current_stock?: number;
    unit_price?: number;
    observations?: string;
    image_url?: string;
    initial_stock?: number;
    supplier?: string;
    invoice_number?: string;
    site_id?: string;
  }) {
    const unitPrice = payload.unit_price || 0;
    const initialStock = payload.initial_stock || payload.current_stock || 0;

    // 1. Inserir no catálogo
    const { data: newCatalog, error: catError } = await supabase
      .from('epi_catalog')
      .insert({
        name: payload.name,
        category: payload.category,
        brand: payload.brand || null,
        model: payload.model || null,
        ca_number: payload.ca_number || null,
        ca_validity: payload.ca_validity || null,
        lifespan_days: payload.lifespan_days || 180,
        minimum_stock: payload.minimum_stock || 0,
        current_stock: initialStock,
        unit_price: unitPrice,
        observations: payload.observations || null,
        image_url: payload.image_url || null,
        status: 'ACTIVE'
      })
      .select()
      .single();

    if (catError) throw catError;

    // 2. Se houver estoque inicial e valor, registrar na tabela de compras
    if (initialStock > 0 && newCatalog) {
      await supabase.from('epi_purchases').insert({
        catalog_id: newCatalog.id,
        site_id: payload.site_id || null,
        quantity: initialStock,
        unit_price: unitPrice,
        invoice_number: payload.invoice_number || 'INICIAL',
        supplier: payload.supplier || 'ESTOQUE INICIAL',
        notes: 'Cadastro inicial de EPI com lote inicial.'
      });
    }

    return newCatalog as EpiCatalog;
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
    // 1. Inserir compra
    const { data, error } = await supabase
      .from('epi_purchases')
      .insert({
        catalog_id: params.catalog_id,
        site_id: params.site_id || null,
        quantity: params.quantity,
        unit_price: params.unit_price,
        invoice_number: params.invoice_number || null,
        supplier: params.supplier || null,
        notes: params.notes || null
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Atualizar estoque do catálogo e preço unitário
    const { data: currentCat } = await supabase
      .from('epi_catalog')
      .select('current_stock')
      .eq('id', params.catalog_id)
      .single();

    const newStock = (currentCat?.current_stock || 0) + params.quantity;

    await supabase
      .from('epi_catalog')
      .update({
        current_stock: newStock,
        unit_price: params.unit_price
      })
      .eq('id', params.catalog_id);

    // 3. Se houver obra vinculada, atualizar site_inventory
    if (params.site_id) {
      const { data: existingSiteInv } = await supabase
        .from('site_inventory')
        .select('quantity')
        .eq('site_id', params.site_id)
        .eq('catalog_id', params.catalog_id)
        .maybeSingle();

      const currentSiteQty = existingSiteInv?.quantity || 0;
      await supabase.from('site_inventory').upsert({
        site_id: params.site_id,
        catalog_id: params.catalog_id,
        quantity: currentSiteQty + params.quantity,
        updated_at: new Date().toISOString()
      }, { onConflict: 'site_id,catalog_id' });
    }

    return data as EpiPurchase;
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
