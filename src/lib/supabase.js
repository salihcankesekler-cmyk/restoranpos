import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ahnusgkdlzdtmxerlthg.supabase.co'
const supabaseAnonKey = 'sb_publishable_...'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)