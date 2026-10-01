import { Injectable, signal, computed, effect } from '@angular/core';
import { Product } from '../models/catalog.model';
import { ProductHelper, ProductMetrics } from '../core/product-helper';

export interface ComparedProductItem {
  product: Product;
  metrics: ProductMetrics;
  isBestPrice: boolean;
  isBestPum: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CompareService {
  readonly MAX_PRODUCTS = 3;
  private readonly INACTIVITY_TIMEOUT_MS = 75000; // 75s para reseteo automático en tablet pública

  // Estado con Signals
  readonly products = signal<Product[]>([]);
  readonly isModalOpen = signal<boolean>(false);
  readonly isAwaitingSecondProduct = signal<boolean>(false);

  private timerId: any = null;

  // Items calculados con métricas y detección de ganadores
  readonly comparedItems = computed<ComparedProductItem[]>(() => {
    const list = this.products();
    if (list.length === 0) return [];

    const items = list.map(p => ({
      product: p,
      metrics: ProductHelper.getMetrics(p)
    }));

    // Determinar mejor precio absoluto
    let minPrice = Infinity;
    let minPum = Infinity;

    for (const it of items) {
      if (it.metrics.effectivePrice < minPrice) {
        minPrice = it.metrics.effectivePrice;
      }
      if (it.metrics.rawUnitPrice < minPum) {
        minPum = it.metrics.rawUnitPrice;
      }
    }

    return items.map(it => ({
      product: it.product,
      metrics: it.metrics,
      isBestPrice: items.length > 1 && it.metrics.effectivePrice === minPrice,
      isBestPum: items.length > 1 && it.metrics.rawUnitPrice === minPum
    }));
  });

  readonly count = computed(() => this.products().length);
  readonly canAddMore = computed(() => this.products().length < this.MAX_PRODUCTS);

  constructor() {
    // Si cambia la lista de productos, refrescar temporizador de inactividad
    effect(() => {
      const prods = this.products();
      if (prods.length > 0) {
        this.resetInactivityTimer();
      } else {
        this.cancelInactivityTimer();
      }
    });
  }

  /**
   * Agrega un producto a la comparación (máximo 3).
   */
  addProduct(product: Product): { success: boolean; message: string; full: boolean } {
    this.resetInactivityTimer();
    const current = this.products();

    // Validar si ya existe
    if (current.some(p => p.id === product.id)) {
      return {
        success: false,
        message: `"${product.name}" ya está en la comparación.`,
        full: current.length >= this.MAX_PRODUCTS
      };
    }

    // Validar límite
    if (current.length >= this.MAX_PRODUCTS) {
      return {
        success: false,
        message: `Límite alcanzado (máximo ${this.MAX_PRODUCTS} productos). Quita uno para agregar este.`,
        full: true
      };
    }

    const updated = [...current, product];
    this.products.set(updated);

    if (updated.length >= 2) {
      this.isAwaitingSecondProduct.set(false);
      this.isModalOpen.set(true); // Abrir comparador automáticamente con 2 o más
    } else {
      this.isAwaitingSecondProduct.set(true);
    }

    return {
      success: true,
      message: `"${product.name}" agregado a la comparación.`,
      full: updated.length >= this.MAX_PRODUCTS
    };
  }

  removeProduct(productId: number): void {
    this.resetInactivityTimer();
    const updated = this.products().filter(p => p.id !== productId);
    this.products.set(updated);
    if (updated.length < 2) {
      this.isAwaitingSecondProduct.set(updated.length === 1);
    }
    if (updated.length === 0) {
      this.isModalOpen.set(false);
    }
  }

  hasProduct(productId: number): boolean {
    return this.products().some(p => p.id === productId);
  }

  openModal(): void {
    this.resetInactivityTimer();
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  clear(): void {
    this.cancelInactivityTimer();
    this.products.set([]);
    this.isModalOpen.set(false);
    this.isAwaitingSecondProduct.set(false);
  }

  // --- Manejo del Temporizador de Inactividad de Quiosco ---
  resetInactivityTimer(): void {
    this.cancelInactivityTimer();
    this.timerId = setTimeout(() => {
      this.clear();
    }, this.INACTIVITY_TIMEOUT_MS);
  }

  private cancelInactivityTimer(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}
