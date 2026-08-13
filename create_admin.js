import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ozsmevkqcytrtpnpoekp.supabase.co';
const supabaseKey = 'sb_publishable_lbJ_2yt52WBnUO4kXb1rdA_Arh0WJ39';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDB() {
  console.log('Fetching table schema...');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Users fetch success, table exists.');
  }
}
testDB();
