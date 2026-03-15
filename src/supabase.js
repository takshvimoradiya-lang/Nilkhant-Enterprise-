import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "Phttps://mqzwjuenpvknzvntsmpu.supabase.co";
const supabaseKey = "sb_publishable_OaCpx_WhO0loeGZlF55k7Q_zdq9Uwr-";

export const supabase = createClient(supabaseUrl, supabaseKey);
