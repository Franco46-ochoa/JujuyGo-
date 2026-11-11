import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

const supabaseUrl = environment.supabaseUrl?.trim() ?? '';
const supabaseAnonKey = environment.supabaseAnonKey?.trim() ?? '';

export const supabaseClient: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient | null>(
  'SUPABASE_CLIENT',
  {
    providedIn: 'root',
    factory: () => supabaseClient,
  },
);
