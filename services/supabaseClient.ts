import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://feeedbgjbzpmwapvmahf.supabase.co';
const supabaseAnonKey = 'sb_publishable_9Fxs7EP5t46lyAJU8ketYg_6G0pjsBN';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);