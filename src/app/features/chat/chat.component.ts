import {
  Component,
  signal,
  inject,
  viewChild,
  ElementRef,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/auth.service';
import { ChatStore } from './chat.store';
import { ChatService } from './chat.service';
import { UploadComponent } from '../upload/upload.component';
import { Message } from '@shared/models/database';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.html',
  imports: [CommonModule, FormsModule, DatePipe, UploadComponent],
  providers: [ChatStore, ChatService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {

  readonly auth = inject(AuthService);
  readonly store = inject(ChatStore);
  readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  messageText = '';
  readonly selectedFile = signal<File | null>(null);
  readonly lightboxUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      const msgs = this.store.messages();
      if (msgs.length > 0) {
        Promise.resolve().then(() => this.scrollToBottom());
      }
    });
  }

  canSend(): boolean {
    return !this.store.sending() && (!!this.messageText.trim() || !!this.selectedFile());
  }

  isOwnMessage(msg: Message): boolean {
    return msg.user_id === this.store.currentUserId();
  }

  senderInitial(msg: Message): string {
    return (msg.profile?.username ?? 'U')[0].toUpperCase();
  }

  async sendMessage(): Promise<void> {
    const text = this.messageText.trim();
    const file = this.selectedFile();
    if (!text && !file) return;
    await this.store.sendMessage(text, file ?? undefined);
    this.messageText = '';
    this.selectedFile.set(null);
  }

  onEnterKey(event: Event): void {

    const keyboardEvent = event as KeyboardEvent;

    if (!keyboardEvent.shiftKey) {
      event.preventDefault();
      void this.sendMessage();
    }
  }

  signOut(): void {
    void this.auth.signOut();
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
