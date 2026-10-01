import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton, IonContent, IonFooter, IonIcon, IonSpinner, IonTextarea
} from '@ionic/angular/standalone';

import { BrandService } from '../core/brand.service';
import { VoiceService } from '../core/voice.service';
import { ChatService } from '../services/chat.service';
import { CartFeedbackService } from '../core/cart-feedback.service';
import { CompareService } from '../services/compare.service';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';
import { TranslatePipe } from '../shared/pipes/translate.pipe';
import { ClpPipe } from '../shared/pipes/clp.pipe';

import { Product, OfferView } from '../models/catalog.model';
import { CheaperAlternativeItem } from '../core/product-helper';
import { ProductCompareModalComponent } from '../shared/components/product-compare-modal/product-compare-modal.component';
import { EventCalculatorModalComponent } from '../shared/components/event-calculator-modal/event-calculator-modal.component';
import { StockAlertModalComponent } from '../shared/components/stock-alert-modal/stock-alert-modal.component';
import { IncidentReportModalComponent } from '../shared/components/incident-report-modal/incident-report-modal.component';
import { ExpressListQrModalComponent, QrModalPayload } from '../shared/components/express-qr-modal/express-qr-modal.component';

export type HomeActiveModal = 'eventCalculator' | 'stockAlert' | 'incidentReport' | 'expressQr' | null;

/**
 * Inicio Kiosk-First:
 * 1. Botón Principal Gigante: 🔍 Consultar Precio
 * 2. Trío de Acciones de 1er Nivel: 📍 Mapa 3D | 🏷️ Ofertas | 🤖 Preguntar a Liderín
 * 3. Más Herramientas: Catálogo, Mi cálculo, Recetas, Calculadora, Stock, Avisos
 * 4. Conversación con Liderín: Ejecución de acciones de tablet (mapa, precio, ofertas, ahorro, comparar).
 */
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AppHeaderComponent,
    IonContent, IonFooter, IonIcon,
    IonButton, IonTextarea, IonSpinner,
    FormsModule,
    TranslatePipe,
    ClpPipe,
    ProductCompareModalComponent,
    EventCalculatorModalComponent,
    StockAlertModalComponent,
    IncidentReportModalComponent,
    ExpressListQrModalComponent
  ]
})
export class HomePage {
  private router = inject(Router);
  private brandService = inject(BrandService);
  private cartFeedback = inject(CartFeedbackService);
  readonly compareService = inject(CompareService);

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

  // ---------- Conversación y Control de Tablet ----------

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

  async sendMessage(customText?: string) {
    const text = (customText ?? this.userMessage).trim();
    if (!text || this.chat.isLoading()) return;
    this.userMessage = '';
    const reply = await this.chat.send(text);
    void this.voice.speak(reply.text);
  }

  onEnter(event: Event) {
    const keyboard = event as KeyboardEvent;
    if (keyboard.shiftKey) return;
    event.preventDefault();
    void this.sendMessage();
  }

  // Acciones que Liderín ejecuta en la tablet desde los widgets
  navigateToMapForProduct(product: Product) {
    void this.router.navigate(['/store-locator'], {
      queryParams: { productId: product.id }
    });
  }

  navigateToPriceForProduct(product: Product) {
    void this.router.navigate(['/price-check'], {
      queryParams: { barcode: product.barcode, productId: product.id }
    });
  }

  addToCartFromChat(product: Product) {
    void this.cartFeedback.addWithToast(product);
  }

  compareFromChat(productA: Product, productB?: Product) {
    this.compareService.clear();
    this.compareService.addProduct(productA);
    if (productB) {
      this.compareService.addProduct(productB);
    }
    this.compareService.openModal();
  }

  askCheaperForProduct(product: Product) {
    void this.sendMessage(`¿Hay una opción más barata que ${product.name}?`);
  }

  handleImageError(event: any) {
    event.target.src = 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=300&fit=crop';
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
