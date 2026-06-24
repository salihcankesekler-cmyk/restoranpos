import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ahnusgkdlzdtmxerlthg.supabase.co'
const supabaseAnonKey = 'sb_publishable_DxBWuwcH5u5CdJhCPpAfug_o0gNLNcU'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)