import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hdxgkrqpuuxfqlhxbziy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeGdrcnFwdXV4ZnFsaHhiaXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNDUzODksImV4cCI6MjExMTcyMTM4OX0.V2S547y3nZ5-kI4s2Wk6ZzZ9w0uS593Y3n1_9-QnL1Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
