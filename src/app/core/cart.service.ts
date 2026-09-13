import { Injectable, computed, effect, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { CartItem, Product } from '../models/catalog.model';

const ITEMS_KEY = 'mercatalk.cart';
const BUDGET_KEY = 'mercatalk.budget';

/** Qué tan cerca está el total del presupuesto fijado. */
export type BudgetStatus = 'ok' | 'warning' | 'over';

/** A partir de qué fracción del presupuesto se avisa (M3 del plan: al acercarse). */
const BUDGET_WARNING_RATIO = 0.8;

/**
 * Carrito "Mi compra": lo que la persona lleva, cuánto le costará y, si fijó
 * un presupuesto, cuánto le queda. Estado con signals; se guarda en
 * @capacitor/preferences (localStorage en web, SharedPreferences en Android)
 * cada vez que cambia.
 */
@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly _items = signal<CartItem[]>([]);
  private readonly _budget = signal<number | null>(null);
  /** true cuando ya se leyó lo guardado; antes no se persiste nada. */
  private readonly ready = signal(false);

  readonly items = this._items.asReadonly();
  readonly budget = this._budget.asReadonly();

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

  // LO QUE QUEDA DEL PRESUPUESTO (puede ser negativo si ya se pasó)
  readonly budgetRemaining = computed(() => {
    const budget = this._budget();
    return budget === null ? null : budget - this.total();
  });

  // 'ok' hasta el 80 %, 'warning' desde ahí, 'over' al pasarse (Fase 3: presupuesto)
  readonly budgetStatus = computed<BudgetStatus | null>(() => {
    const budget = this._budget();
    if (budget === null || budget <= 0) return null;
    const ratio = this.total() / budget;
    if (ratio >= 1) return 'over';
    if (ratio >= BUDGET_WARNING_RATIO) return 'warning';
    return 'ok';
  });

  constructor() {
    void this.restore();
    effect(() => {
      const items = this._items();
      if (this.ready()) {
        void Preferences.set({ key: ITEMS_KEY, value: JSON.stringify(items) });
      }
    });
    effect(() => {
      const budget = this._budget();
      if (this.ready()) {
        void (budget === null
          ? Preferences.remove({ key: BUDGET_KEY })
          : Preferences.set({ key: BUDGET_KEY, value: String(budget) }));
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

  // FIJAR (o quitar, con null) el presupuesto de la compra. "tengo $30.000".
  setBudget(amount: number | null): void {
    this._budget.set(amount !== null && amount > 0 ? Math.round(amount) : null);
  }

  // LEER LO GUARDADO AL ARRANCAR
  private async restore(): Promise<void> {
    try {
      const [itemsResult, budgetResult] = await Promise.all([
        Preferences.get({ key: ITEMS_KEY }),
        Preferences.get({ key: BUDGET_KEY }),
      ]);

      const parsedItems: unknown = itemsResult.value ? JSON.parse(itemsResult.value) : [];
      if (Array.isArray(parsedItems)) {
        this._items.set(parsedItems.filter(isCartItem));
      }

      const budget = budgetResult.value !== null ? Number(budgetResult.value) : NaN;
      if (Number.isFinite(budget) && budget > 0) {
        this._budget.set(budget);
      }
    } catch {
      // Un carrito corrupto no debe impedir usar la app: se parte vacío/sin presupuesto.
      this._items.set([]);
      this._budget.set(null);
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
