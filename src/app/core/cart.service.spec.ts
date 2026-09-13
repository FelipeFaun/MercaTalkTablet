import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';

import { CartService } from './cart.service';
import { Product } from '../models/catalog.model';

const leche: Product = {
  id: 1, name: 'Leche Entera', brand: 'Soprole', price: 1250, image: '', barcode: '1', category: 'Lácteos',
  inOffer: true, offerPrice: 999,
};
const arroz: Product = {
  id: 5, name: 'Arroz Grado 1', brand: 'Tucapel', price: 1850, image: '', barcode: '5', category: 'Abarrotes',
  inOffer: false,
};

describe('CartService', () => {
  let service: CartService;

  beforeEach(async () => {
    await Preferences.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartService);
    await flush();
  });

  it('parte vacío', () => {
    expect(service.isEmpty()).toBeTrue();
    expect(service.count()).toBe(0);
    expect(service.total()).toBe(0);
  });

  it('agrega productos y suma cantidades si se repiten', () => {
    service.add(leche);
    service.add(leche, 2);
    service.add(arroz);
    expect(service.items().length).toBe(2);
    expect(service.find(1)?.qty).toBe(3);
    expect(service.count()).toBe(4);
  });

  it('calcula el total con precio de oferta y el ahorro', () => {
    service.add(leche, 2);   // 2 × 999 (normal 1250)
    service.add(arroz);      // 1 × 1850
    expect(service.total()).toBe(2 * 999 + 1850);
    expect(service.savings()).toBe(2 * (1250 - 999));
  });

  it('setQty en 0 elimina el ítem; +/- ajustan la cantidad', () => {
    service.add(leche);
    service.increment(1);
    expect(service.find(1)?.qty).toBe(2);
    service.decrement(1);
    service.decrement(1);
    expect(service.find(1)).toBeUndefined();
    expect(service.isEmpty()).toBeTrue();
  });

  it('clear vacía el carrito', () => {
    service.add(leche);
    service.clear();
    expect(service.isEmpty()).toBeTrue();
  });

  it('persiste en Preferences y se restaura en una instancia nueva', async () => {
    service.add(leche, 2);
    TestBed.tick(); // corre el effect() que guarda
    await flush();

    const { value } = await Preferences.get({ key: 'mercatalk.cart' });
    expect(value).toContain('"productId":1');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(CartService);
    await flush();
    expect(restored.find(1)?.qty).toBe(2);
    expect(restored.total()).toBe(2 * 999);
  });

  it('ignora datos corruptos guardados', async () => {
    await Preferences.set({ key: 'mercatalk.cart', value: '{no es json' });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(CartService);
    await flush();
    expect(restored.isEmpty()).toBeTrue();
  });

  describe('presupuesto (Fase 3)', () => {
    it('sin presupuesto, budgetStatus y budgetRemaining son null', () => {
      expect(service.budget()).toBeNull();
      expect(service.budgetStatus()).toBeNull();
      expect(service.budgetRemaining()).toBeNull();
    });

    it('setBudget(null) o un monto <= 0 quitan el presupuesto', () => {
      service.setBudget(30000);
      expect(service.budget()).toBe(30000);
      service.setBudget(0);
      expect(service.budget()).toBeNull();
      service.setBudget(30000);
      service.setBudget(null);
      expect(service.budget()).toBeNull();
    });

    it('estado ok por debajo del 80%, warning desde el 80% y over al pasarse', () => {
      service.setBudget(10000);
      service.add(arroz, 4); // 7.400 -> 74%
      expect(service.budgetStatus()).toBe('ok');

      service.add(leche); // + 999 -> 8.399 (84%)
      expect(service.budgetStatus()).toBe('warning');

      service.add(leche, 2); // + 1.998 -> 10.397 (>100%)
      expect(service.budgetStatus()).toBe('over');
      expect(service.budgetRemaining()).toBe(10000 - service.total());
      expect(service.budgetRemaining()!).toBeLessThan(0);
    });

    it('persiste el presupuesto y se restaura en una instancia nueva, independiente del carrito', async () => {
      service.setBudget(25000);
      service.add(leche);
      TestBed.tick();
      await flush();

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const restored = TestBed.inject(CartService);
      await flush();
      expect(restored.budget()).toBe(25000);

      restored.clear();
      TestBed.tick();
      await flush();
      expect(restored.budget()).toBe(25000); // clear() no toca el presupuesto
    });

    it('quitar el presupuesto también se persiste (no queda un valor viejo)', async () => {
      service.setBudget(15000);
      TestBed.tick();
      await flush();
      service.setBudget(null);
      TestBed.tick();
      await flush();

      const { value } = await Preferences.get({ key: 'mercatalk.budget' });
      expect(value).toBeNull();

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const restored = TestBed.inject(CartService);
      await flush();
      expect(restored.budget()).toBeNull();
    });
  });
});

/** Deja correr las promesas pendientes (restore y el effect de guardado). */
function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
