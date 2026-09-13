import { TestBed } from '@angular/core/testing';

import { IntentService, normalize, parseQty } from './intent.service';

describe('IntentService', () => {
  let service: IntentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IntentService);
  });

  describe('normalize', () => {
    it('quita tildes, signos y mayúsculas', () => {
      expect(normalize('¿Cuánto vale la Leche?')).toBe('cuanto vale la leche');
      expect(normalize('  Té   Supremo ')).toBe('te supremo');
    });
  });

  describe('searchProducts (C3: búsqueda por tokens)', () => {
    it('"leche" devuelve todas las leches', () => {
      const names = service.searchProducts('precio de la leche').map(p => p.name);
      expect(names).toContain('Leche Entera');
      expect(names).toContain('Leche sin lactosa');
    });

    it('"leche soprole" devuelve solo la de Soprole (antes: 0 resultados)', () => {
      const results = service.searchProducts('cuánto vale la leche soprole');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Leche Entera');
      expect(results[0].brand).toBe('Soprole');
    });

    it('"arroz tucapel grado 1" encuentra el producto exacto', () => {
      const results = service.searchProducts('arroz tucapel grado 1');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Arroz Grado 1');
    });

    it('funciona sin tildes y con plurales', () => {
      expect(service.searchProducts('te supremo')[0]?.name).toBe('Té Supremo');
      expect(service.searchProducts('platanos')[0]?.name).toBe('Plátanos');
      expect(service.searchProducts('yogur')[0]?.name).toBe('Yogurt Natural');
    });

    it('las palabras que no son productos no rompen la búsqueda', () => {
      expect(service.searchProducts('hola, tienes manzanas?')[0]?.name).toBe('Manzanas');
      expect(service.searchProducts('hola qué tal')).toEqual([]);
    });
  });

  describe('analyze', () => {
    it('detecta precio, ubicación, ofertas y receta', () => {
      expect(service.analyze('¿cuánto cuesta el pan?').type).toBe('precio');
      expect(service.analyze('dónde está el detergente').type).toBe('ubicacion');
      expect(service.analyze('qué ofertas hay').type).toBe('ofertas');
      expect(service.analyze('una receta con atún').type).toBe('receta');
    });

    it('adjunta los productos encontrados al intent de precio', () => {
      const intent = service.analyze('cuánto vale la leche soprole');
      expect(intent.products.map(p => p.name)).toEqual(['Leche Entera']);
    });

    it('las ofertas de un producto tienen prioridad sobre las generales', () => {
      const intent = service.analyze('hay oferta de leche?');
      expect(intent.offers.length).toBeGreaterThan(0);
      expect(intent.offers.every(o => o.product.toLowerCase().includes('leche'))).toBeTrue();
    });

    it('receta por ingrediente', () => {
      const intent = service.analyze('quiero cocinar algo con atún');
      expect(intent.recipes[0].name).toContain('Atún');
    });
  });

  describe('carrito por voz/texto (2.8)', () => {
    it('"agrega dos leches soprole" -> add x2 del producto exacto', () => {
      const intent = service.analyze('agrega dos leches soprole');
      expect(intent.type).toBe('carrito');
      expect(intent.cart?.command).toBe('add');
      expect(intent.cart?.qty).toBe(2);
      expect(intent.cart?.product?.name).toBe('Leche Entera');
    });

    it('"agrega leche a mi compra" es agregar (no ver mi compra) y queda ambiguo', () => {
      const intent = service.analyze('agrega leche a mi compra');
      expect(intent.cart?.command).toBe('add');
      expect(intent.cart?.product).toBeUndefined();
      expect(intent.cart?.candidates.length).toBeGreaterThan(1);
    });

    it('"cuánto llevo" -> total', () => {
      expect(service.analyze('¿cuánto llevo?').cart?.command).toBe('total');
      expect(service.analyze('cuál es el total de mi compra').cart?.command).toBe('total');
    });

    it('"saca el arroz tucapel" -> remove', () => {
      const intent = service.analyze('saca el arroz tucapel');
      expect(intent.cart?.command).toBe('remove');
      expect(intent.cart?.product?.name).toBe('Arroz Grado 1');
    });

    it('"vacía el carrito" -> clear', () => {
      expect(service.analyze('vacía el carrito').cart?.command).toBe('clear');
    });

    it('parseQty entiende números y palabras', () => {
      expect(parseQty('agrega 3 yogures')).toBe(3);
      expect(parseQty('pon cuatro panes')).toBe(4);
      expect(parseQty('agrega azucar')).toBe(1);
    });
  });
});
