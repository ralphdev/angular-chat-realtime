import { Injectable, inject } from '@angular/core';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import { SupabaseService } from '@core/supabase.service';
import { Message, OnlineUser } from '@shared/models/database';

const BUCKET = 'chat-images';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;


@Injectable()
export class ChatService {

  private readonly supabase = inject(SupabaseService);
  private channel: RealtimeChannel | null = null;

  // ─── Messages ─────────────────────────────────────────────
  async fetchRecentMessages(limit = 50): Promise<Message[]> {

    const { data, error } = await this.supabase.client
      .from('messages')
      .select(`*, profile:profiles(id, username, avatar_url, created_at)`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    // Reverse so oldest is first in the array
    return (data as unknown as Message[]).reverse();
  }

  async insertMessage(payload: {
    user_id: string;
    content: string | null;
    image_url: string | null;
  }): Promise<void> {
    const { error } = await this.supabase.client
      .from('messages')
      .insert(payload);

    if (error) throw new Error(error.message);
  }

  // ─── Realtime messages ─────────────────────────────────────

  /* subscribeToMessages(onInsert: (msg: Message) => void): void {

    if (!this.channel) {
      this.channel = this.supabase.client.channel('chat-global');
    }

    this.channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
      async (payload) => {
        // Fetch the full message with profile join
        const { data } = await this.supabase.client
          .from('messages')
          .select(`*, profile:profiles(id, username, avatar_url, created_at)`)
          .eq('id', (payload.new as { id: string }).id)
          .single();

        if (data) onInsert(data as unknown as Message);
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[ChatService] Realtime channel error — reconnecting');
        setTimeout(() => this.channel?.subscribe(), 3000);
      }
    });
  } */

  // ─── Presence (online users) ──────────────────────────────

 /*  subscribeToPresence(userId: string, username: string, onChange: (users: OnlineUser[]) => void ): void {

    if (!this.channel) {
      this.channel = this.supabase.client.channel('chat-global');
    }

    const userPayload: OnlineUser = {
      user_id: userId,
      username,
      online_at: new Date().toISOString(),
    };

    this.channel.on('presence', { event: 'sync' }, () => {

        const state: RealtimePresenceState = this.channel!.presenceState();
        const users = Object.values(state)
          .flat()
          .map((p) => p as unknown as OnlineUser)
          .filter(
            (u, i, arr) => arr.findIndex((x) => x.user_id === u.user_id) === i
          );
        onChange(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.channel!.track(userPayload);
        }
      });
  } */

   // ─── Realtime messages y presencia (UNIFICADO) ────────────

  /**
   * Inicializa el canal con todos los callbacks ANTES de suscribirse
   */
  initializeChannel(
    onMessageInsert: (msg: Message) => void,
    onPresenceSync: (users: OnlineUser[]) => void
  ): void {
    // Si ya existe un canal, lo limpiamos primero
    if (this.channel) {
      this.unsubscribeAll();
    }

    // Creamos el canal
    this.channel = this.supabase.client.channel('chat-global');

    // Registramos callback para mensajes (ANTES del subscribe)
    this.channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      async (payload) => {
        const { data } = await this.supabase.client
          .from('messages')
          .select(`*, profile:profiles(id, username, avatar_url, created_at)`)
          .eq('id', (payload.new as { id: string }).id)
          .single();

        if (data) onMessageInsert(data as unknown as Message);
      }
    );

    // Registramos callback para presencia (ANTES del subscribe)
    this.channel.on('presence', { event: 'sync' }, () => {
      const state: RealtimePresenceState = this.channel!.presenceState();
      const users = Object.values(state)
        .flat()
        .map((p) => p as unknown as OnlineUser)
        .filter(
          (u, i, arr) => arr.findIndex((x) => x.user_id === u.user_id) === i
        );
      onPresenceSync(users);
    });

    // Nos suscribimos (esto activa el canal)
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[ChatService] Channel subscribed successfully');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[ChatService] Realtime channel error — reconnecting');
        setTimeout(() => this.channel?.subscribe(), 3000);
      }
    });
  }

  /**
   * Actualiza la presencia del usuario en el canal ya suscrito
   */
  async updatePresence(userId: string, username: string): Promise<void> {
    if (!this.channel) {
      console.warn('[ChatService] Cannot update presence: channel not initialized');
      return;
    }

    const userPayload: OnlineUser = {
      user_id: userId,
      username,
      online_at: new Date().toISOString(),
    };

    await this.channel.track(userPayload);
  }

  unsubscribeAll(): void {
    if (this.channel) {
      void this.supabase.client.removeChannel(this.channel);
      this.channel = null;
    }
  }

  // ─── Storage ──────────────────────────────────────────────
  validateImage(file: File): void {
    if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
      throw new Error('Solo se permiten imágenes PNG, JPEG o WebP.');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('La imagen no puede superar 2 MB.');
    }
  }

  async uploadImage(file: File, userId: string): Promise<string> {
    this.validateImage(file);

    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error } = await this.supabase.client.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });

    if (error) throw new Error(error.message);

    const { data } = this.supabase.client.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return data.publicUrl;
  }
}
