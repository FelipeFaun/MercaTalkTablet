import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { CatalogService } from '../../../core/catalog.service';
import { Product } from '../../../models/catalog.model';
import { ClpPipe } from '../../pipes/clp.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface StockInfo {
  product: Product;
  shelfStock: number;
  warehouseStock: number;
  aisle: string;
  section: string;
  shelf: string;
}

@Component({
  selector: 'app-stock-alert-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, ClpPipe, TranslatePipe],
  templateUrl: './stock-alert-modal.component.html',
  styleUrls: ['./stock-alert-modal.component.scss']
})
export class StockAlertModalComponent implements OnInit {
  private catalog = inject(CatalogService);

  @Output() dismissModal = new EventEmitter<void>();

  searchQuery = '';
  readonly allProducts = signal<Product[]>([]);
  readonly searchResults = signal<Product[]>([]);
  readonly selectedStockInfo = signal<StockInfo | null>(null);
  readonly staffNotified = signal<boolean>(false);

  // Muestra de productos sugeridos para acceso rápido táctil
  readonly sampleProducts = signal<Product[]>([]);

  ngOnInit(): void {
    const products = this.catalog.getProducts();
    this.allProducts.set(products);
    this.sampleProducts.set(products.slice(0, 4));

    // Seleccionar por defecto el primer producto con stock en bodega pero góndola vacía
    if (products.length > 0) {
      this.selectProduct(products[0]);
    }
  }

  onSearchChange() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.searchResults.set([]);
      return;
    }
    const results = this.allProducts().filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.barcode.includes(q)
    );
    this.searchResults.set(results.slice(0, 5));
  }

  selectProduct(product: Product) {
    this.staffNotified.set(false);
    this.searchQuery = '';
    this.searchResults.set([]);

    // Simulación realista: 0 en góndola (agotado físicamente) y existencias en bodega
    this.selectedStockInfo.set({
      product,
      shelfStock: 0,
      warehouseStock: 24,
      aisle: product.supermarketLocation?.aisle ?? 'Pasillo 1',
      section: product.supermarketLocation?.section ?? 'Góndola Central',
      shelf: product.supermarketLocation?.shelf ?? 'Nivel 2'
    });
  }

  notifyStaff() {
    this.staffNotified.set(true);
  }

  handleImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/icon/favicon.png';
  }

  onDismiss() {
    this.dismissModal.emit();
  }
}
