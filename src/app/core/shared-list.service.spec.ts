import { TestBed } from '@angular/core/testing';

import { CartItem } from '../models/catalog.model';
import {
  SharedListService,
  newUuid,
  sharedItemsFromCart,
  sharedItemsFromLabels,
  sharedListUrl,
} from './shared-list.service';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const leche: CartItem = {
  productId: 1, name: 'Leche Entera 1L', brand: 'Soprole', image: '', unitPrice: 1250, offerPrice: 999, qty: 2,
};
const arroz: CartItem = {
  productId: 5, name: 'Arroz Grado 1', brand: 'Tucapel', image: '', unitPrice: 1850, qty: 1,
};

describe('SharedListService', () => {
  it('sin Supabase configurado queda desactivado y no intenta guardar', async () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(SharedListService);

    expect(service.enabled).toBeFalse();
    await expectAsync(service.share({ title: 'Mi compra', items: [], total: 0 }))
      .toBeRejectedWithError(/no está configurado/);
  });

  it('arma la lista desde el carrito con precios, pasillo y sin claves vacías', () => {
    const items = sharedItemsFromCart([leche, arroz], id => (id === 1 ? 'Pasillo 1' : undefined));

    expect(items).toEqual([
      { name: 'Leche Entera 1L', qty: 2, aisle: 'Pasillo 1', productId: 1, unitPrice: 1250, offerPrice: 999 },
      { name: 'Arroz Grado 1', qty: 1, productId: 5, unitPrice: 1850 },
    ]);
    expect('offerPrice' in items[1]).toBeFalse();
  });

  it('arma la lista de la calculadora guardando la cantidad como texto', () => {
    const items = sharedItemsFromLabels([
      { name: 'Carne para asado', aisle: 'Carnicería', qty: '2 kg' },
      { name: 'Carbón', aisle: 'Pasillo 8' },
    ]);

    expect(items).toEqual([
      { name: 'Carne para asado', qty: 1, qtyLabel: '2 kg', aisle: 'Carnicería' },
      { name: 'Carbón', qty: 1, aisle: 'Pasillo 8' },
    ]);
  });

  it('el QR lleva el enlace con el id de la lista', () => {
    const id = newUuid();
    expect(id).toMatch(UUID_V4);
    expect(sharedListUrl(id)).toMatch(new RegExp(`/${id}$`));
  });

  it('genera uuid v4 también sin crypto.randomUUID (contexto no seguro)', () => {
    const withoutRandomUuid = { getRandomValues: crypto.getRandomValues.bind(crypto) };
    expect(newUuid(withoutRandomUuid)).toMatch(UUID_V4);
  });
});
