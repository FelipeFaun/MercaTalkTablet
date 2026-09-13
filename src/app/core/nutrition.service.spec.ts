import { TestBed } from '@angular/core/testing';

import { NutritionService } from './nutrition.service';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('NutritionService', () => {
  let service: NutritionService;
  let fetchSpy: jasmine.Spy<typeof fetch>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NutritionService);
    fetchSpy = spyOn(window, 'fetch');
  });

  it('convierte una respuesta encontrada a NutritionFacts', async () => {
    fetchSpy.and.resolveTo(jsonResponse({
      status: 1,
      product: {
        product_name_es: 'Nutella',
        brands: 'Ferrero',
        image_url: 'https://images.openfoodfacts.org/nutella.jpg',
        nutriscore_grade: 'e',
        nova_group: 4,
        serving_size: '100g',
        nutriments: {
          'energy-kcal_100g': 539,
          fat_100g: 30.9,
          'saturated-fat_100g': 10.6,
          carbohydrates_100g: 57.5,
          sugars_100g: 56.3,
          fiber_100g: 0,
          proteins_100g: 6.3,
          salt_100g: 0.107,
        },
      },
    }));

    const result = await service.getByBarcode('3017620422003');
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.facts.productName).toBe('Nutella');
      expect(result.facts.nutriscoreGrade).toBe('e');
      expect(result.facts.novaGroup).toBe(4);
      expect(result.facts.energyKcal100g).toBe(539);
      expect(result.facts.sugars100g).toBe(56.3);
    }
  });

  it('devuelve not-found cuando Open Food Facts no tiene el código (status 0 / 404)', async () => {
    fetchSpy.and.resolveTo(jsonResponse({ status: 0, status_verbose: 'product not found' }, 404));

    const result = await service.getByBarcode('7801234567890');
    expect(result).toEqual({ status: 'not-found', barcode: '7801234567890' });
  });

  it('devuelve error cuando la red falla', async () => {
    fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));

    const result = await service.getByBarcode('123');
    expect(result).toEqual({ status: 'error', barcode: '123' });
  });

  it('devuelve error para un código vacío sin llamar a la red', async () => {
    const result = await service.getByBarcode('   ');
    expect(result.status).toBe('error');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('cachea por código de barras: la segunda consulta no vuelve a llamar a fetch', async () => {
    fetchSpy.and.resolveTo(jsonResponse({ status: 0 }, 404));

    await service.getByBarcode('111');
    await service.getByBarcode('111');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('ignora nutrientes faltantes sin inventar valores', async () => {
    fetchSpy.and.resolveTo(jsonResponse({
      status: 1,
      product: { product_name: 'Producto simple', nutriments: { 'energy-kcal_100g': 100 } },
    }));

    const result = await service.getByBarcode('222');
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.facts.energyKcal100g).toBe(100);
      expect(result.facts.sugars100g).toBeUndefined();
      expect(result.facts.nutriscoreGrade).toBeUndefined();
    }
  });
});
