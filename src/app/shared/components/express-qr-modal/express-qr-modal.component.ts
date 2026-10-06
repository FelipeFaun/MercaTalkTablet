import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { CartService } from '../../../core/cart.service';
import { CatalogService } from '../../../core/catalog.service';
import {
  SHARED_LIST_TTL_MINUTES,
  SharedListItem,
  SharedListService,
  sharedItemsFromCart,
  sharedItemsFromLabels,
} from '../../../core/shared-list.service';
import { ClpPipe } from '../../pipes/clp.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface QrItemPayload {
  name: string;
  aisle: string;
  qty?: string;
}

export interface QrModalPayload {
  title?: string;
  items?: QrItemPayload[];
  total?: number;
}

/**
 * Estado del QR:
 * - static: sin Supabase configurado, QR fijo de respaldo (comportamiento original)
 * - empty: no hay productos que enviar
 * - sharing → ready: guardando la lista y generando el QR propio
 * - received: el celular ya tomó la lista
 * - error: no se pudo guardar (sin conexión, por ejemplo)
 */
export type QrShareState = 'static' | 'empty' | 'sharing' | 'ready' | 'received' | 'error';

/** Cada cuánto se pregunta si el celular ya recibió la lista */
const CLAIM_POLL_MS = 3000;

@Component({
  selector: 'app-express-qr-modal',
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner, ClpPipe, TranslatePipe],
  templateUrl: './express-qr-modal.component.html',
  styleUrls: ['./express-qr-modal.component.scss']
})
export class ExpressListQrModalComponent implements OnInit {
  private cart = inject(CartService);
  private catalog = inject(CatalogService);
  private sharedList = inject(SharedListService);

  @Input() payload: QrModalPayload | null = null;
  @Output() dismissModal = new EventEmitter<void>();

  readonly modalTitle = signal<string>('Lista Express');
  readonly displayItems = signal<QrItemPayload[]>([]);
  readonly estimatedTotal = signal<number>(0);
  readonly qrImageSrc = 'assets/qr/QR.png';

  readonly shareState = signal<QrShareState>('static');
  /** QR generado con el enlace de la lista (data URL PNG) */
  readonly qrDataUrl = signal<string | null>(null);
  readonly ttlMinutes = SHARED_LIST_TTL_MINUTES;

  /** Lo que viaja al celular (más completo que lo que se muestra) */
  private sharedItems: SharedListItem[] = [];
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  /** Cerrado o destruido: no se guarda ni se consulta nada más */
  private closed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.close());

    // Cualquier navegación lo cierra (también la vuelta a la bienvenida por
    // inactividad). Ionic deja la página en caché sin redibujarla, así que además
    // de pedir el cierre se dejan de consultar listas en ese mismo momento.
    inject(Router).events
      .pipe(filter(event => event instanceof NavigationStart), takeUntilDestroyed())
      .subscribe(() => {
        this.close();
        this.onDismiss();
      });
  }

  ngOnInit(): void {
    if (this.payload && this.payload.items && this.payload.items.length > 0) {
      this.modalTitle.set(this.payload.title ?? 'Lista Express');
      this.displayItems.set(this.payload.items);
      this.estimatedTotal.set(this.payload.total ?? 0);
      this.sharedItems = sharedItemsFromLabels(this.payload.items);
    } else {
      // Tomar los datos actuales del carrito
      const cartItems = this.cart.items();
      if (cartItems.length > 0) {
        const aisleOf = (productId: number) => this.catalog.getProductById(productId)?.supermarketLocation?.aisle;
        this.modalTitle.set('Mi Compra Actual');
        this.displayItems.set(cartItems.map(item => ({
          name: item.name,
          aisle: aisleOf(item.productId) ?? 'Pasillo General',
          qty: `${item.qty} un`
        })));
        this.estimatedTotal.set(this.cart.total());
        this.sharedItems = sharedItemsFromCart(cartItems, aisleOf);
      } else {
        // Canasta vacía: no inventar productos falsos
        this.modalTitle.set('Tu canasta está vacía');
        this.displayItems.set([]);
        this.estimatedTotal.set(0);
      }
    }

    void this.shareList();
  }

  /** Guarda la lista en Supabase y muestra su QR. También sirve para reintentar. */
  async shareList(): Promise<void> {
    if (this.closed) return;
    if (!this.sharedList.enabled) {
      this.shareState.set('static');
      return;
    }
    if (this.sharedItems.length === 0) {
      this.shareState.set('empty');
      return;
    }

    this.stopPolling();
    this.shareState.set('sharing');
    try {
      const ticket = await this.sharedList.share({
        title: this.modalTitle(),
        items: this.sharedItems,
        total: this.estimatedTotal(),
      });
      // qrcode es CommonJS: según el empaquetador llega como default o como módulo
      const qrcode = await import('qrcode');
      const dataUrl = await (qrcode.default ?? qrcode).toDataURL(ticket.url, {
        width: 380,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      if (this.closed) return;
      this.qrDataUrl.set(dataUrl);
      this.shareState.set('ready');
      this.watchClaim(ticket.id, Date.now() + SHARED_LIST_TTL_MINUTES * 60_000);
    } catch (error) {
      console.error(error);
      if (!this.closed) {
        this.shareState.set('error');
      }
    }
  }

  onDismiss() {
    this.dismissModal.emit();
  }

  // Pregunta cada pocos segundos (sin solaparse) hasta que el celular la tome o venza
  private watchClaim(id: string, expiresAt: number): void {
    const check = async () => {
      if (this.closed || Date.now() > expiresAt) return;
      try {
        if (await this.sharedList.isClaimed(id)) {
          this.shareState.set('received');
          return;
        }
      } catch {
        // Fallo de red puntual: se vuelve a intentar en el siguiente ciclo
      }
      if (!this.closed) {
        this.pollTimer = setTimeout(check, CLAIM_POLL_MS);
      }
    };
    this.pollTimer = setTimeout(check, CLAIM_POLL_MS);
  }

  private close(): void {
    this.closed = true;
    this.stopPolling();
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
