import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mqzwjuenpvknzvntsmpu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xendqdWVucHZrbnp2bnRzbXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MjA5MDMsImV4cCI6MjA4OTA5NjkwM30.w80pXOroZLQ1O0bSyVmrc-xHdduAnZRVItkVOmTJOWw";

export const supabase = createClient(supabaseUrl, supabaseKey);
