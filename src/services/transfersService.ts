import { supabase } from '../lib/supabase';
import { SiteTransfer } from '../types';

export const transfersService = {
  async fetchTransfers() {
    const { data, error } = await supabase
      .from('site_transfers')
      .select(`
        *,
        catalog:epi_catalog(id, name, code, ca_number, current_stock),
        origin_site:construction_sites!origin_site_id(id, name, city),
        destination_site:construction_sites!destination_site_id(id, name, city)
      `)
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return (data || []) as any[];
  },

  async sendTransfer(params: {
    catalog_id: string;
    origin_site_id: string;
    destination_site_id: string;
    quantity: number;
    sender_id: string;
    sender_name: string;
    notes?: string;
  }) {
    const { data, error } = await supabase.rpc('transfer_epi_send', {
      p_catalog_id: params.catalog_id,
      p_origin_site_id: params.origin_site_id,
      p_destination_site_id: params.destination_site_id,
      p_quantity: params.quantity,
      p_sender_id: params.sender_id,
      p_sender_name: params.sender_name,
      p_notes: params.notes || null
    });

    if (error) throw error;
    return data as string; // transfer_id
  },

  async receiveTransfer(params: {
    transfer_id: string;
    receiver_id: string;
    receiver_name: string;
  }) {
    const { data, error } = await supabase.rpc('transfer_epi_receive', {
      p_transfer_id: params.transfer_id,
      p_receiver_id: params.receiver_id,
      p_receiver_name: params.receiver_name
    });

    if (error) throw error;
    return data as boolean;
  },

  async fetchSiteInventory(siteId?: string) {
    let query = supabase
      .from('site_inventory')
      .select('*, catalog:epi_catalog(name, code, ca_number, category), site:construction_sites(name)')
      .order('quantity', { ascending: false });

    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
};
