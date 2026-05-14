import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/auth.service';

type Tab = 'login' | 'register';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthComponent {
  readonly auth = inject(AuthService);

  readonly tab = signal<Tab>('login');
  email = '';
  password = '';
  username = '';

  isFormValid() {
    if (this.tab() === 'register') {
      return !!this.email && !!this.password && !!this.username && this.password.length >= 6;
    }
    return !!this.email && !!this.password;
  }

  async submit(): Promise<void> {
    if (!this.isFormValid()) return;
    this.auth.clearError();

    try {
      if (this.tab() === 'login') {
        await this.auth.signIn(this.email, this.password);
      } else {
        await this.auth.signUp(this.email, this.password, this.username);
      }
    } catch {
      // Error is handled in AuthService state, no need to do anything here
    }
  }
}
