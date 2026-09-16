const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL="(.*?)"/)[1];
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY="(.*?)"/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@engenharq.com',
    password: 'admin' 
  });
  
  if (authError) {
    console.log("Auth error:", authError);
    return;
  }
  
  console.log("Logged in:", session.user.id, session.user.role);

  const { error } = await supabase.from('companies').insert([{
    legal_name: 'Engenharq LTDA',
    cnpj: '03.722.728/0001-15'
  }]);
  
  console.log("Insert result error:", error);
}

run();
