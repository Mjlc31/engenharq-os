import { supabase } from './supabase';

export const dataUrlToBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(',');
  const match = arr[0].match(/:(.*?);/);
  if (!match) throw new Error("Invalid Data URL");
  const mime = match[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

export const uploadToStorage = async (dataUrl: string, bucket: string, path: string): Promise<string> => {
  try {
    const blob = dataUrlToBlob(dataUrl);
    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      contentType: blob.type,
      upsert: true
    });
    if (error) {
       if (error.message === 'Failed to fetch') throw new Error('Falha de conexão ao salvar arquivo.');
       throw error;
    }
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrlData.publicUrl;
  } catch (e) {
    console.warn(`Storage upload failed for ${path}`, e);
    throw e;
  }
};
