import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton, IonContent, IonFooter, IonIcon, IonSpinner, IonTextarea
} from '@ionic/angular/standalone';

import { BrandService } from '../core/brand.service';
import { VoiceService } from '../core/voice.service';
import { ChatService } from '../services/chat.service';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';
import { TranslatePipe } from '../shared/pipes/translate.pipe';

import { EventCalculatorModalComponent } from '../shared/components/event-calculator-modal/event-calculator-modal.component';
import { StockAlertModalComponent } from '../shared/components/stock-alert-modal/stock-alert-modal.component';
import { IncidentReportModalComponent } from '../shared/components/incident-report-modal/incident-report-modal.component';
import { ExpressListQrModalComponent, QrModalPayload } from '../shared/components/express-qr-modal/express-qr-modal.component';

export type HomeActiveModal = 'eventCalculator' | 'stockAlert' | 'incidentReport' | 'expressQr' | null;

/**
 * Inicio: Jerarquía UX/UI con el Protagonista al centro-superior,
 * Cuadrícula 2x2 de Atajos Rápidos y Módulos de Valor Añadido (Herramientas Especiales).
 * Al conversar, despliega el historial interactivo y controles de voz/texto.
 */
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    AppHeaderComponent,
    IonContent, IonFooter, IonIcon,
    IonButton, IonTextarea, IonSpinner,
    FormsModule,
    TranslatePipe,
    EventCalculatorModalComponent,
    StockAlertModalComponent,
    IncidentReportModalComponent,
    ExpressListQrModalComponent
  ]
})
export class HomePage {
  private router = inject(Router);
  private brandService = inject(BrandService);

  readonly chat = inject(ChatService);
  readonly voice = inject(VoiceService);
  readonly currentBrand = this.brandService.currentBrand;
  readonly currentAvatar = computed(() => this.currentBrand().avatar);
  private content = viewChild(IonContent);
  readonly isInConversation = signal(false);
  userMessage = '';

  /** Estado del modal activo en pantalla */
  readonly activeModal = signal<HomeActiveModal>(null);
  readonly qrPayload = signal<QrModalPayload | null>(null);

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

  // ---------- Modales de Valor Añadido ----------

  openEventCalculator() {
    this.activeModal.set('eventCalculator');
  }

  openStockAlert() {
    this.activeModal.set('stockAlert');
  }

  openIncidentReport() {
    this.activeModal.set('incidentReport');
  }

  openExpressQr(payload?: QrModalPayload) {
    this.qrPayload.set(payload ?? null);
    this.activeModal.set('expressQr');
  }

  closeModal() {
    this.activeModal.set(null);
  }

  // ---------- Conversación ----------

  startConversation() {
    this.isInConversation.set(true);
    this.userMessage = '';
    if (this.chat.messages().length <= 1) {
      this.chat.reset();
    }
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

  // ---------- Voz ----------

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

  // ---------- Navegación ----------

  navigateToPriceCheck() { void this.router.navigate(['/price-check']); }
  navigateToProducts() { void this.router.navigate(['/products']); }
  navigateToCart() { void this.router.navigate(['/cart']); }
  navigateToStoreLocator() { void this.router.navigate(['/store-locator']); }
  navigateToOffers() { void this.router.navigate(['/offers']); }
  navigateToRecipes() { void this.router.navigate(['/recipes']); }
  navigateToAppDownload() { void this.router.navigate(['/app-download']); }
}
