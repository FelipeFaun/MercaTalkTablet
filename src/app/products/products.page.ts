import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { ProductsService, Product } from '../services/products.service';
import { CartService } from '../core/cart.service';
import { CartFeedbackService } from '../core/cart-feedback.service';
import { BrandService } from '../core/brand.service';
import { ClpPipe } from '../shared/pipes/clp.pipe';
import { TranslatePipe } from '../shared/pipes/translate.pipe';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';

@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    ClpPipe,
    TranslatePipe,
    AppHeaderComponent
  ]
})
export class ProductsPage {
  private productsService = inject(ProductsService);
  private cartFeedback = inject(CartFeedbackService);
  readonly cart = inject(CartService);
  readonly brandService = inject(BrandService);

  readonly currentBrand = this.brandService.currentBrand;
  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('all');

  readonly categories = computed(() => {
    return ['all', ...this.productsService.getCategories()];
  });

  readonly filteredProducts = computed(() => {
    let list = this.productsService.getAllProducts();
    const cat = this.selectedCategory();
    if (cat !== 'all') {
      list = list.filter(p => p.category.toLowerCase() === cat.toLowerCase());
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.barcode.includes(q)
      );
    }
    return list;
  });

  getCartQty(productId: number): number {
    return this.cart.find(productId)?.qty ?? 0;
  }

  addToCart(product: Product): void {
    void this.cartFeedback.addWithToast(product);
  }

  incrementQty(productId: number): void {
    this.cart.increment(productId);
  }

  decrementQty(productId: number): void {
    this.cart.decrement(productId);
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  handleImageError(event: any): void {
    event.target.src = 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=300&fit=crop';
  }
}
