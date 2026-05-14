import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '@env/environment';
import { Database } from '@shared/models/database.types';

@Injectable({ providedIn: 'root' })
export class SupabaseService {

  readonly client: SupabaseClient<Database>;

  constructor() {
    this.client = createClient<Database>(environment.supabase.url, environment.supabase.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
}
