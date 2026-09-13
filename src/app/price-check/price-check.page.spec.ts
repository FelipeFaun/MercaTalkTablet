import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { PriceCheckerPage } from './price-check.page';
import { NutritionService } from '../core/nutrition.service';
import { NutritionResult } from '../models/nutrition.model';

describe('PriceCheckerPage', () => {
  let component: PriceCheckerPage;
  let fixture: ComponentFixture<PriceCheckerPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriceCheckerPage],
      providers: [provideRouter([]), provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(PriceCheckerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('toggleNutrition (Fase 3)', () => {
    const barcode = '7801234567890';
    let getByBarcode: jasmine.Spy<NutritionService['getByBarcode']>;
    let found: NutritionResult;

    beforeEach(() => {
      found = { status: 'found', facts: { barcode, energyKcal100g: 100 } };
      getByBarcode = spyOn(TestBed.inject(NutritionService), 'getByBarcode').and.resolveTo(found);
    });

    it('abre la tarjeta y consulta el servicio la primera vez', async () => {
      await component.toggleNutrition({ barcode } as any);
      expect(component.expandedNutritionBarcode).toBe(barcode);
      expect(getByBarcode).toHaveBeenCalledOnceWith(barcode);
      expect(component.nutritionResult(barcode)).toEqual(found);
    });

    it('vuelve a tocar el mismo producto la cierra sin volver a consultar', async () => {
      await component.toggleNutrition({ barcode } as any);
      await component.toggleNutrition({ barcode } as any);
      expect(component.expandedNutritionBarcode).toBeNull();
      expect(getByBarcode).toHaveBeenCalledTimes(1);
    });

    it('reabrir el mismo producto usa el resultado en caché, sin volver a llamar al servicio', async () => {
      await component.toggleNutrition({ barcode } as any);
      await component.toggleNutrition({ barcode } as any); // cierra
      await component.toggleNutrition({ barcode } as any); // reabre
      expect(component.expandedNutritionBarcode).toBe(barcode);
      expect(getByBarcode).toHaveBeenCalledTimes(1);
    });
  });
});
