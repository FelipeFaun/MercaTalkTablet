import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { CartService } from '../../../core/cart.service';
import { CatalogService } from '../../../core/catalog.service';
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

@Component({
  selector: 'app-express-qr-modal',
  standalone: true,
  imports: [CommonModule, IonIcon, ClpPipe, TranslatePipe],
  templateUrl: './express-qr-modal.component.html',
  styleUrls: ['./express-qr-modal.component.scss']
})
export class ExpressListQrModalComponent implements OnInit {
  private cart = inject(CartService);
  private catalog = inject(CatalogService);

  @Input() payload: QrModalPayload | null = null;
  @Output() dismissModal = new EventEmitter<void>();

  readonly modalTitle = signal<string>('Lista Express');
  readonly displayItems = signal<QrItemPayload[]>([]);
  readonly estimatedTotal = signal<number>(0);
  readonly qrImageSrc = 'assets/qr/QR.png';

  ngOnInit(): void {
    if (this.payload && this.payload.items && this.payload.items.length > 0) {
      this.modalTitle.set(this.payload.title ?? 'Lista Express');
      this.displayItems.set(this.payload.items);
      this.estimatedTotal.set(this.payload.total ?? 0);
    } else {
      // Tomar los datos actuales del carrito
      const cartItems = this.cart.items();
      if (cartItems.length > 0) {
        this.modalTitle.set('Mi Compra Actual');
        this.displayItems.set(cartItems.map(item => {
          const prod = this.catalog.getProductById(item.productId);
          return {
            name: item.name,
            aisle: prod?.supermarketLocation?.aisle ?? 'Pasillo General',
            qty: `${item.qty} un`
          };
        }));
        this.estimatedTotal.set(this.cart.total());
      } else {
        // Ejemplo por defecto de ruta y lista de tienda
        this.modalTitle.set('Ruta de Compras Express');
        this.displayItems.set([
          { name: 'Leche Entera Soprole', aisle: 'Pasillo 1 · Refrigerados', qty: '2 un' },
          { name: 'Arroz Grado 1 Miraflores', aisle: 'Pasillo 2 · Abarrotes', qty: '1 un' },
          { name: 'Aceite Vegetal 900ml', aisle: 'Pasillo 2 · Despensa', qty: '1 un' },
          { name: 'Detergente Líquido Omo', aisle: 'Pasillo 4 · Limpieza', qty: '1 un' }
        ]);
        this.estimatedTotal.set(11890);
      }
    }
  }

  onDismiss() {
    this.dismissModal.emit();
  }
}
