/**
 * SmartCard BUS - Cliente Híbrido Supabase (PostgreSQL Cloud / PostgREST)
 *
 * Permite sincronizar usuários, passes, transações e pagamentos diretamente
 * com o Supabase quando EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY
 * estiverem configurados no .env ou na Vercel.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

class SupabaseService {
  private customUrl = '';
  private customAnonKey = '';

  public setCredentials(url: string, anonKey: string) {
    this.customUrl = url.trim().replace(/\/+$/, '');
    this.customAnonKey = anonKey.trim();
  }

  public getConfig(): SupabaseConfig {
    const envUrl =
      (typeof process !== 'undefined' &&
        (process.env?.EXPO_PUBLIC_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
      '';
    const envKey =
      (typeof process !== 'undefined' &&
        (process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) ||
      '';

    return {
      url: (this.customUrl || envUrl).replace(/\/+$/, ''),
      anonKey: this.customAnonKey || envKey,
    };
  }

  public isConfigured(): boolean {
    const { url, anonKey } = this.getConfig();
    return Boolean(url && anonKey && url.startsWith('http'));
  }

  private getHeaders(extra?: Record<string, string>): Record<string, string> {
    const { anonKey } = this.getConfig();
    return {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...extra,
    };
  }

  public async upsertRecord<T extends Record<string, unknown>>(
    table: string,
    payload: T,
    onConflict = 'id'
  ): Promise<{ ok: boolean; data?: T[]; error?: string }> {
    if (!this.isConfigured() || typeof fetch === 'undefined') {
      return { ok: false, error: 'Supabase não configurado no ambiente atual' };
    }
    const { url } = this.getConfig();
    try {
      const response = await fetch(
        `${url}/rest/v1/${encodeURIComponent(table)}?on_conflict=${encodeURIComponent(onConflict)}`,
        {
          method: 'POST',
          headers: this.getHeaders({
            Prefer: 'resolution=merge-duplicates,return=representation',
          }),
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const text = await response.text();
        return { ok: false, error: text || `HTTP ${response.status}` };
      }
      const data = (await response.json()) as T[];
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Falha de conexão com Supabase' };
    }
  }

  public async selectRecords<T = Record<string, unknown>>(
    table: string,
    queryParams = 'select=*&limit=50'
  ): Promise<{ ok: boolean; data: T[]; error?: string }> {
    if (!this.isConfigured() || typeof fetch === 'undefined') {
      return { ok: false, data: [], error: 'Supabase não configurado' };
    }
    const { url } = this.getConfig();
    try {
      const response = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        return { ok: false, data: [], error: `HTTP ${response.status}` };
      }
      const data = (await response.json()) as T[];
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, data: [], error: err?.message || 'Erro ao consultar Supabase' };
    }
  }
}

export const supabaseService = new SupabaseService();

