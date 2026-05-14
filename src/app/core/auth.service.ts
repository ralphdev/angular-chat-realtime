import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Profile } from '@shared/models/database';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  // ─── Private state ────────────────────────────────────────
  private readonly _state = signal<AuthState>({
    session: null,
    profile: null,
    loading: true,
    error: null,
  });

  // ─── Public signals ───────────────────────────────────────
  readonly session = computed(() => this._state().session);
  readonly profile = computed(() => this._state().profile);
  readonly loading = computed(() => this._state().loading);
  readonly error = computed(() => this._state().error);
  readonly isAuthenticated = computed(() => !!this._state().session);
  readonly currentUser = computed(() => this._state().session?.user ?? null);

  constructor() {
    this.initSession();
    this.listenToAuthChanges();
  }

  // ─── Init ─────────────────────────────────────────────────

  private async initSession(): Promise<void> {

    const { data } = await this.supabase.client.auth.getSession();

    if (data.session) {
      await this.setSession(data.session);
    } else {
      this.patch({ loading: false });
    }
  }

  private listenToAuthChanges(): void {
    this.supabase.client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await this.setSession(session);
        void this.router.navigate(['/chat']);
      } else if (event === 'SIGNED_OUT') {
        this.patch({ session: null, profile: null, loading: false });
        void this.router.navigate(['/auth']);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        this.patch({ session });
      }
    });
  }

  private async setSession(session: Session): Promise<void> {
    this.patch({ session, loading: true });
    const profile = await this.fetchProfile(session.user.id);
    this.patch({ profile, loading: false });
  }

  private async fetchProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[AuthService] fetchProfile error:', error.message);
      return null;
    }
    return data;
  }

  // ─── Auth actions ──────────────────────────────────────────

  async signUp(email: string, password: string, username: string): Promise<void> {
    this.patch({ loading: true, error: null });

    const { error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (error) {
      this.patch({ loading: false, error: error.message });
      throw error;
    }
    // Profile is created automatically via DB trigger
    this.patch({ loading: false });
  }

  async signIn(email: string, password: string): Promise<void> {
    this.patch({ loading: true, error: null });

    const { error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      this.patch({ loading: false, error: error.message });
      throw error;
    }
  }

  async signOut(): Promise<void> {
    this.patch({ loading: true });
    await this.supabase.client.auth.signOut();
  }

  clearError(): void {
    this.patch({ error: null });
  }

  // ─── Helpers ──────────────────────────────────────────────

  private patch(partial: Partial<AuthState>): void {
    this._state.update((s) => ({ ...s, ...partial }));
  }
}
