/**
 * Supabase Client & Cloud Database Bridge
 * Preparado para sincronização com Supabase e hospedagem no Vercel.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

// Chaves configuráveis via variáveis de ambiente (.env)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseConfig: SupabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  isConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
};

/**
 * Executa uma query HTTP direta na API REST do Supabase (PostgREST)
 */
export async function executeSupabaseQuery<T>(
  table: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: any;
    query?: string;
  } = {}
): Promise<{ data: T | null; error: string | null }> {
  if (!supabaseConfig.isConfigured) {
    return {
      data: null,
      error: 'Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env.',
    };
  }

  const endpoint = `${supabaseConfig.url}/rest/v1/${table}${options.query ? `?${options.query}` : ''}`;

  try {
    const response = await fetch(endpoint, {
      method: options.method || 'GET',
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${supabaseConfig.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text();
      return { data: null, error: errText };
    }

    const json = await response.json();
    return { data: json as T, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Falha na conexão com Supabase.' };
  }
}

