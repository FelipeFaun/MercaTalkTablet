import { TestBed } from '@angular/core/testing';

import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CatalogService);
  });

  it('toda oferta y toda receta apuntan a productos que existen', () => {
    const ids = new Set(service.getProducts().map(p => p.id));
    for (const offer of service.getActiveOffers(new Date('2000-01-01'))) {
      expect(ids.has(offer.productId)).withContext(`oferta ${offer.id}`).toBeTrue();
    }
    for (const recipe of service.getRecipes()) {
      expect(recipe.productIds.length).withContext(recipe.name).toBeGreaterThan(0);
      for (const pid of recipe.productIds) {
        expect(ids.has(pid)).withContext(`${recipe.name} -> producto ${pid}`).toBeTrue();
      }
    }
  });

  it('las ofertas vencidas no se muestran', () => {
    const all = service.getActiveOffers(new Date('2000-01-01'));
    const none = service.getActiveOffers(new Date('2099-12-31'));
    expect(all.length).toBeGreaterThan(0);
    expect(none.length).toBe(0);
  });

  it('una oferta siempre es más barata que el precio normal y calcula el descuento', () => {
    for (const offer of service.getActiveOffers(new Date('2000-01-01'))) {
      expect(offer.price).withContext(offer.product).toBeLessThan(offer.originalPrice);
      expect(offer.discount).withContext(offer.product).toBeGreaterThan(0);
      expect(offer.discount).toBe(Math.round(((offer.originalPrice - offer.price) / offer.originalPrice) * 100));
    }
  });

  it('inOffer y offerPrice del producto salen de las ofertas vigentes', () => {
    const offers = service.getActiveOffers();
    const products = service.getProducts();
    for (const product of products) {
      const offer = offers.find(o => o.productId === product.id);
      expect(product.inOffer).withContext(product.name).toBe(!!offer);
      expect(product.offerPrice).withContext(product.name).toBe(offer?.price);
    }
  });

  it('los códigos de barras son únicos', () => {
    const barcodes = service.getProducts().map(p => p.barcode);
    expect(new Set(barcodes).size).toBe(barcodes.length);
  });

  it('getRecipeProducts devuelve los productos de la receta', () => {
    const recipe = service.getRecipes()[0];
    const products = service.getRecipeProducts(recipe);
    expect(products.map(p => p.id)).toEqual(recipe.productIds);
  });
});
