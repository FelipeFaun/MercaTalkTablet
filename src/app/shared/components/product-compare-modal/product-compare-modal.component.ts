import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { CompareService, ComparedProductItem } from '../../../services/compare.service';
import { CartFeedbackService } from '../../../core/cart-feedback.service';
import { ProductsService, Product } from '../../../services/products.service';
import { ClpPipe } from '../../pipes/clp.pipe';

@Component({
  selector: 'app-product-compare-modal',
  standalone: true,
  imports: [CommonModule, IonIcon, ClpPipe],
  templateUrl: './product-compare-modal.component.html',
  styleUrls: ['./product-compare-modal.component.scss']
})
export class ProductCompareModalComponent {
  readonly compareService = inject(CompareService);
  private cartFeedback = inject(CartFeedbackService);
  private productsService = inject(ProductsService);
  private router = inject(Router);

  @Output() requestScan = new EventEmitter<void>();

  readonly comparedItems = this.compareService.comparedItems;
  readonly maxProducts = this.compareService.MAX_PRODUCTS;

  get emptySlotsCount(): number {
    return Math.max(0, this.maxProducts - this.comparedItems().length);
  }

  getEmptySlots(): number[] {
    return Array.from({ length: this.emptySlotsCount }, (_, i) => i);
  }

  // Sugerencias rápidas para el slot vacío basadas en la categoría del primer producto
  getQuickSuggestions(): Product[] {
    const items = this.comparedItems();
    if (items.length === 0) return [];
    const firstCat = items[0].product.category;
    const currentIds = new Set(items.map(it => it.product.id));

    return this.productsService
      .getProductsByCategory(firstCat)
      .filter(p => !currentIds.has(p.id))
      .slice(0, 3);
  }

  addProduct(product: Product): void {
    this.compareService.addProduct(product);
  }

  removeProduct(productId: number): void {
    this.compareService.removeProduct(productId);
  }

  clearAll(): void {
    this.compareService.clear();
  }

  close(): void {
    this.compareService.closeModal();
  }

  addToCart(product: Product): void {
    void this.cartFeedback.addWithToast(product);
  }

  viewLocation(product: Product): void {
    this.compareService.closeModal();
    void this.router.navigate(['/store-locator'], {
      queryParams: { productId: product.id }
    });
  }

  startScanning(): void {
    this.compareService.closeModal();
    this.requestScan.emit();
  }

  handleImageError(event: any): void {
    event.target.src = 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=300&fit=crop';
  }
}
