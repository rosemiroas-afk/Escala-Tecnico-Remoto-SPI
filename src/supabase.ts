import { createClient } from '@supabase/supabase-js';

// ✅ CORRETO: Endereço completo apontando direto para o seu servidor exclusivo
const SUPABASE_URL = 'https://hdxgkrqpuuxfqlhxbziy.supabase.co'; 

// Chave pública (anon key) validada e sem cortes
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeGdrcnFwdXV4ZnFsaHhiaXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzA0NTMsImV4cCI6MjEwODk0NjQ1M30.kR9vks1giK7W1gVHYRPhLXb812OWWRwhUpjABnIPEas';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);