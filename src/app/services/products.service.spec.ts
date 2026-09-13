import { TestBed } from '@angular/core/testing';

import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('busca por nombre, marca o categoría sin distinguir mayúsculas', () => {
    expect(service.searchProducts('LECHE').length).toBeGreaterThan(0);
    expect(service.searchProducts('soprole').length).toBeGreaterThan(0);
    expect(service.searchProducts('lácteos').length).toBeGreaterThan(0);
  });

  it('devuelve vacío con una búsqueda en blanco', () => {
    expect(service.searchProducts('   ')).toEqual([]);
  });

  it('encuentra un producto por código de barras', () => {
    const first = service.getAllProducts()[0];
    expect(service.findProductByBarcode(first.barcode)).toEqual(first);
    expect(service.findProductByBarcode('0000000000000')).toBeUndefined();
  });

  it('solo lista productos en oferta en getProductsOnOffer', () => {
    expect(service.getProductsOnOffer().every(p => p.inOffer)).toBeTrue();
  });
});
