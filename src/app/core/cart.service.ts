import { Injectable, computed, effect, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { CartItem, Product } from '../models/catalog.model';

const STORAGE_KEY = 'mercatalk.cart';

/**
 * Carrito "Mi compra": lo que la persona lleva y cuánto le costará.
 * Estado con signals; se guarda en @capacitor/preferences (localStorage en
 * web, SharedPreferences en Android) cada vez que cambia.
 */
@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly _items = signal<CartItem[]>([]);
  /** true cuando ya se leyó el carrito guardado; antes no se persiste nada. */
  private readonly ready = signal(false);

  readonly items = this._items.asReadonly();

  // CANTIDAD TOTAL DE UNIDADES (para el badge de la pestaña)
  readonly count = computed(() => this._items().reduce((sum, item) => sum + item.qty, 0));

  // TOTAL A PAGAR EN PESOS
  readonly total = computed(() =>
    this._items().reduce((sum, item) => sum + unitPriceOf(item) * item.qty, 0)
  );

  // LO QUE SE AHORRA POR OFERTAS
  readonly savings = computed(() =>
    this._items().reduce((sum, item) =>
      item.offerPrice !== undefined ? sum + (item.unitPrice - item.offerPrice) * item.qty : sum, 0)
  );

  readonly isEmpty = computed(() => this._items().length === 0);

  constructor() {
    void this.restore();
    effect(() => {
      const items = this._items();
      if (this.ready()) {
        void Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(items) });
      }
    });
  }

  // AGREGAR UN PRODUCTO (suma cantidad si ya estaba)
  add(product: Product, qty = 1): void {
    if (qty <= 0) return;
    this._items.update(items => {
      const existing = items.find(item => item.productId === product.id);
      if (existing) {
        return items.map(item =>
          item.productId === product.id ? { ...item, qty: item.qty + qty } : item
        );
      }
      return [...items, toCartItem(product, qty)];
    });
  }

  setQty(productId: number, qty: number): void {
    if (qty <= 0) {
      this.remove(productId);
      return;
    }
    this._items.update(items =>
      items.map(item => (item.productId === productId ? { ...item, qty } : item))
    );
  }

  increment(productId: number): void {
    const item = this.find(productId);
    if (item) this.setQty(productId, item.qty + 1);
  }

  decrement(productId: number): void {
    const item = this.find(productId);
    if (item) this.setQty(productId, item.qty - 1);
  }

  remove(productId: number): void {
    this._items.update(items => items.filter(item => item.productId !== productId));
  }

  clear(): void {
    this._items.set([]);
  }

  find(productId: number): CartItem | undefined {
    return this._items().find(item => item.productId === productId);
  }

  // LEER EL CARRITO GUARDADO AL ARRANCAR
  private async restore(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      const parsed: unknown = value ? JSON.parse(value) : [];
      if (Array.isArray(parsed)) {
        this._items.set(parsed.filter(isCartItem));
      }
    } catch {
      // Un carrito corrupto no debe impedir usar la app: se parte vacío.
      this._items.set([]);
    } finally {
      this.ready.set(true);
    }
  }
}

export function unitPriceOf(item: CartItem): number {
  return item.offerPrice ?? item.unitPrice;
}

function toCartItem(product: Product, qty: number): CartItem {
  const item: CartItem = {
    productId: product.id,
    name: product.name,
    brand: product.brand,
    image: product.image,
    unitPrice: product.price,
    qty,
  };
  if (product.inOffer && product.offerPrice !== undefined) {
    item.offerPrice = product.offerPrice;
  }
  return item;
}

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item['productId'] === 'number'
    && typeof item['name'] === 'string'
    && typeof item['unitPrice'] === 'number'
    && typeof item['qty'] === 'number'
    && item['qty'] > 0;
}
