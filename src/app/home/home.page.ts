import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton, IonContent, IonFooter, IonIcon, IonItem, IonLabel, IonList, IonSpinner, IonTextarea
} from '@ionic/angular/standalone';

import { BrandService } from '../core/brand.service';
import { VoiceService } from '../core/voice.service';
import { ChatService } from '../services/chat.service';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';

/**
 * Inicio: el avatar con sus opciones y, al conversar, el historial del chat
 * con el input fijo abajo. La lógica de intención, prompt y voz vive en
 * IntentService, PromptBuilderService, ChatService y VoiceService (M3).
 */
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    AppHeaderComponent,
    IonContent, IonFooter, IonList, IonItem, IonLabel, IonIcon,
    IonButton, IonTextarea, IonSpinner,
    FormsModule,
  ]
})
export class HomePage {
  private router = inject(Router);
  private brandService = inject(BrandService);

  readonly chat = inject(ChatService);
  readonly voice = inject(VoiceService);
  readonly brand = this.brandService.brand;

  private content = viewChild(IonContent);

  readonly currentAvatar = signal(this.brand.avatars[0]);
  readonly isInConversation = signal(false);
  userMessage = '';

  constructor() {
    // Al llegar un mensaje nuevo, bajar al final del historial
    effect(() => {
      this.chat.messages();
      this.chat.isLoading();
      if (this.isInConversation()) {
        void this.content()?.scrollToBottom(300);
      }
    });
  }

  ionViewWillLeave() {
    this.voice.stopSpeaking();
    this.voice.stopListening();
  }

  // ---------- conversación ----------

  startConversation() {
    this.isInConversation.set(true);
    this.userMessage = '';
    void this.voice.speak(this.chat.lastReply());
  }

  endConversation() {
    this.isInConversation.set(false);
    this.userMessage = '';
    this.voice.stopSpeaking();
    this.voice.stopListening();
    this.chat.reset();
  }

  async sendMessage() {
    const text = this.userMessage.trim();
    if (!text || this.chat.isLoading()) return;
    this.userMessage = '';
    const reply = await this.chat.send(text);
    void this.voice.speak(reply.text);
  }

  // Enter envía; Shift+Enter inserta salto de línea (B6)
  onEnter(event: Event) {
    const keyboard = event as KeyboardEvent;
    if (keyboard.shiftKey) return;
    event.preventDefault();
    void this.sendMessage();
  }

  // ---------- voz ----------

  async toggleListening() {
    if (this.voice.isListening()) {
      this.voice.stopListening();
      return;
    }
    const transcript = await this.voice.listen();
    if (transcript) {
      this.userMessage = transcript;
      await this.sendMessage();
    }
  }

  toggleMute() {
    void this.voice.toggleMute();
  }

  repeatVoice() {
    void this.voice.speak(this.chat.lastReply());
  }

  // ---------- navegación y avatar ----------

  changeAvatar(avatarPath: string) {
    this.currentAvatar.set(avatarPath);
  }

  navigateToPriceCheck() { void this.router.navigate(['/price-check']); }
  navigateToStoreLocator() { void this.router.navigate(['/store-locator']); }
  navigateToOffers() { void this.router.navigate(['/offers']); }
  navigateToRecipes() { void this.router.navigate(['/recipes']); }
  navigateToAppDownload() { void this.router.navigate(['/app-download']); }
}
