import re

with open('src/pages/Operations.tsx', 'r') as f:
    code = f.read()

helper = """
  const uploadPhoto = async (photoFile?: File) => {
    if (!photoFile) return null;
    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `deliveries/${fileName}`;
      const { error } = await supabase.storage.from('epi-evidence').upload(filePath, photoFile);
      if (error) throw error;
      const { data } = supabase.storage.from('epi-evidence').getPublicUrl(filePath);
      return data.publicUrl;
    } catch(err) {
      console.error(err);
      return null;
    }
  };
"""

code = code.replace("  const selectedCatalog = catalogs.find(c => c.id === selectedCatalogId);", helper + "\n  const selectedCatalog = catalogs.find(c => c.id === selectedCatalogId);")

def replace_process(func_name, code_str):
    pattern = r"const " + func_name + r" = async \(signatureDataUrl: string\) => \{(.*?)\} catch"
    
    def repl(m):
        body = m.group(1)
        body = body.replace("const { error } = await supabase.rpc", "const photoUrl = await uploadPhoto(photoFile);\n      const { error } = await supabase.rpc")
        
        # update assignments
        if "digital_signature_url: signatureDataUrl" in body:
            body = body.replace("digital_signature_url: signatureDataUrl", "digital_signature_url: signatureDataUrl, audit_selfie_url: photoUrl")
        elif "return_signature_url: signatureDataUrl" in body:
            pass # Return signature doesn't strictly need photo, but we could add it.
        
        return f"const {func_name} = async (signatureDataUrl: string, photoFile?: File) => {{{body}}} catch"

    return re.sub(pattern, repl, code_str, flags=re.DOTALL)

code = replace_process("processEntrega", code)
code = replace_process("processReturn", code)
code = replace_process("processLoss", code)
code = replace_process("processReplacement", code)

# Fix signatureDataUrl usage in update
code = code.replace("digital_signature_url: signatureDataUrl\n      }).eq", "digital_signature_url: signatureDataUrl, audit_selfie_url: photoUrl\n      }).eq")

with open('src/pages/Operations.tsx', 'w') as f:
    f.write(code)
print("Operations photo upload patched.")
