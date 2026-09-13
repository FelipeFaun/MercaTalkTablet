import { Injectable, inject } from '@angular/core';
import { CatalogService } from '../core/catalog.service';
import { Product } from '../models/catalog.model';

export type { Product } from '../models/catalog.model';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private catalog = inject(CatalogService);

  // Métodos existentes
  searchProducts(query: string): Product[] {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return this.getAllProducts().filter(product =>
      product.name.toLowerCase().includes(lowerQuery) ||
      product.brand.toLowerCase().includes(lowerQuery) ||
      product.category.toLowerCase().includes(lowerQuery)
    );
  }

  findProductByBarcode(barcode: string): Product | undefined {
    return this.getAllProducts().find(product => product.barcode === barcode);
  }

  getAllProducts(): Product[] {
    return this.catalog.getProducts();
  }

  getProductsOnOffer(): Product[] {
    return this.getAllProducts().filter(product => product.inOffer);
  }

  getProductsByCategory(category: string): Product[] {
    return this.getAllProducts().filter(product =>
      product.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  getProductLocation(productName: string): Product['supermarketLocation'] | null {
    const product = this.getAllProducts().find(p =>
      p.name.toLowerCase().includes(productName.toLowerCase())
    );
    return product?.supermarketLocation || null;
  }

  // NUEVO MÉTODO: Obtener productos por categorías
  getCategories(): string[] {
    const categories = this.getAllProducts().map(product => product.category);
    return [...new Set(categories)]; // Elimina duplicados
  }

  // NUEVO MÉTODO: Buscar productos similares
  getSimilarProducts(productId: number): Product[] {
    const products = this.getAllProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return [];

    return products.filter(p =>
      p.category === product.category &&
      p.id !== productId
    ).slice(0, 4); // Máximo 4 productos similares
  }
}
