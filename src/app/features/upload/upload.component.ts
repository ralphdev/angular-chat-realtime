import {
  Component,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../chat/chat.service';

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './upload.html',
})
export class UploadComponent {

  // ─── Outputs ──────────────────────────────────────────────
  readonly fileSelected = output<File | null>();

  // ─── State ────────────────────────────────────────────────
  readonly preview = signal<string | null>(null);
  readonly fileName = signal<string>('');
  readonly error = signal<string | null>(null);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.error.set(null);

    if (!ALLOWED.includes(file.type)) {
      this.error.set('Tipo no permitido. Usa PNG, JPEG o WebP.');
      input.value = '';
      return;
    }

    if (file.size > MAX_SIZE) {
      this.error.set('Tamaño máximo: 2 MB.');
      input.value = '';
      return;
    }

    this.fileName.set(file.name);

    const reader = new FileReader();
    reader.onload = (e) => this.preview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    this.fileSelected.emit(file);
    input.value = '';
  }

  clearFile(): void {
    this.preview.set(null);
    this.fileName.set('');
    this.fileSelected.emit(null);
  }

}
