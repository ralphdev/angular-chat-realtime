import {
  Injectable,
  signal,
  computed,
  effect,
  inject,
  OnDestroy,
} from '@angular/core';
import { AuthService } from '@core/auth.service';
import { ChatService } from './chat.service';
import { Message, OnlineUser } from '@shared/models/database';

interface ChatState {
  messages: Message[];
  onlineUsers: OnlineUser[];
  loading: boolean;
  sending: boolean;
  error: string | null;
}

@Injectable()
export class ChatStore implements OnDestroy {

  private readonly auth = inject(AuthService);
  private readonly chatService = inject(ChatService);

  // ─── Private raw state ────────────────────────────────────
  private readonly _state = signal<ChatState>({
    messages: [],
    onlineUsers: [],
    loading: true,
    sending: false,
    error: null,
  });

  // ─── Public read-only signals ─────────────────────────────
  readonly loading = computed(() => this._state().loading);
  readonly sending = computed(() => this._state().sending);
  readonly error = computed(() => this._state().error);
  readonly onlineUsers = computed(() => this._state().onlineUsers);

  readonly messages = computed(() =>
    [...this._state().messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  );

  /** ID of the authenticated user for bubble differentiation */
  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  /** Total online count */
  readonly onlineCount = computed(() => this._state().onlineUsers.length);

  constructor() {
    // Start realtime subscription when store is created
    effect(() => {

      const userId = this.auth.currentUser()?.id;
      const username = this.auth.profile()?.username ?? 'anonymous';

      if (userId) {
        void this.initialize(userId, username);
      }
    }, { allowSignalWrites: true });
  }

  // ─── Init ─────────────────────────────────────────────────
  // 1. Cargar mensajes existentes
  private async initialize(userId: string, username: string): Promise<void> {

    const messages = await this.chatService.fetchRecentMessages(50);

    this.patch({ loading: true, error: null });

    this.patch({ messages, loading: false });

    // 2. Inicializar canal con TODOS los callbacks antes de suscribirse
    this.chatService.initializeChannel(
      (msg) => {
        this._state.update((s) => ({
          ...s,
          messages: [...s.messages, msg],
        }));
      },
      (users) => {
        this.patch({ onlineUsers: users });
      }
    );

    /* this.chatService.subscribeToPresence(
      userId,
      this.auth.profile()?.username ?? 'anonymous',
      (users) => this.patch({ onlineUsers: users })
    ); */

    // 3. Después de la suscripción, actualizar presencia
    // Pequeño delay para asegurar que el canal está suscrito
    setTimeout(() => {
      void this.chatService.updatePresence(userId, username);
    }, 100);
  }

  // ─── Actions ──────────────────────────────────────────────

  async sendMessage(content: string, imageFile?: File): Promise<void> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    this.patch({ sending: true, error: null });

    try {
      let image_url: string | null = null;

      if (imageFile) {
        image_url = await this.chatService.uploadImage(imageFile, userId);
      }

      await this.chatService.insertMessage({
        user_id: userId,
        content: content.trim() || null,
        image_url,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar mensaje';
      this.patch({ error: message });
    } finally {
      this.patch({ sending: false });
    }
  }

  clearError(): void {
    this.patch({ error: null });
  }


  // ─── Helpers ──────────────────────────────────────────────

  private patch(partial: Partial<ChatState>): void {
    this._state.update((s) => ({ ...s, ...partial }));
  }

  ngOnDestroy(): void {
    this.chatService.unsubscribeAll();
  }
}
