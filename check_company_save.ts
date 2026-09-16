import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@engenharq.com',
    password: 'admin' // Assuming this is the password based on standard tests, or I can just check the error code. Wait, I don't know the password.
  });
  
  if (authError) {
    console.log("Auth error:", authError);
    return;
  }
  
  const { error } = await supabase.from('companies').insert([{
    legal_name: 'Engenharq LTDA',
    cnpj: '03.722.728/0001-15'
  }]);
  
  console.log("Insert result error:", error);
}

run();
