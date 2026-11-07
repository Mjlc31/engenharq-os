import { supabase } from './supabase';

// Assinatura vai como arquivo para o bucket de evidências (sem update/delete); o banco guarda só a URL.
// Base64 na linha inchava as tabelas em ~20 KB por registro. Lança erro: entrega sem assinatura salva não segue.
export async function uploadSignature(dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `signatures/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage.from('epi-receipts').upload(path, blob, { contentType: 'image/png' });
  if (error) throw error;
  return supabase.storage.from('epi-receipts').getPublicUrl(path).data.publicUrl;
}

export async function uploadImage(file: File, bucket: string): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    return null;
  }
}
