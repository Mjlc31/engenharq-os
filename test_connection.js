import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase Connection to:', supabaseUrl);
  try {
    // A simple query to check connection, assuming there's at least one public table or just check if auth works
    // A generic way to test connection is to query a table that might exist or just select from auth.users (if allowed) or simply call a lightweight API
    // To avoid table errors, we can just do a select limit 1 from a table we know exists, like 'construction_sites'
    const { data, error } = await supabase.from('construction_sites').select('*').limit(1);
    
    if (error) {
      console.error('Connection tested but received an error from Supabase:');
      console.error(error.message);
    } else {
      console.log('✅ Connection successful!');
      console.log('Sample Data fetched:', data);
    }
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

testConnection();
