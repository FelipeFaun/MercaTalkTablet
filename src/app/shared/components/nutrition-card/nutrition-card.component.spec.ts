import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { NutritionCardComponent } from './nutrition-card.component';
import { NutritionResult } from '../../../models/nutrition.model';

describe('NutritionCardComponent', () => {
  let fixture: ComponentFixture<NutritionCardComponent>;
  let component: NutritionCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutritionCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NutritionCardComponent);
    component = fixture.componentInstance;
  });

  function text(): string {
    return fixture.nativeElement.textContent as string;
  }

  it('muestra el estado de carga', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(text()).toContain('Consultando Open Food Facts');
  });

  it('muestra el mensaje de "sin datos" sin inventar información', () => {
    const result: NutritionResult = { status: 'not-found', barcode: '7801234567890' };
    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();
    expect(text()).toContain('no tiene aporte nutricional registrado');
  });

  it('muestra el mensaje de error', () => {
    const result: NutritionResult = { status: 'error', barcode: '123' };
    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();
    expect(text()).toContain('No se pudo consultar');
  });

  it('muestra el Nutri-Score, NOVA y los nutrientes disponibles', () => {
    const result: NutritionResult = {
      status: 'found',
      facts: {
        barcode: '3017620422003',
        productName: 'Nutella',
        brands: 'Ferrero',
        nutriscoreGrade: 'e',
        novaGroup: 4,
        servingSize: '100g',
        energyKcal100g: 539,
        sugars100g: 56.3,
      },
    };
    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();

    expect(text()).toContain('Nutella');
    expect(text()).toContain('Ferrero');
    expect(text()).toContain('Grupo NOVA 4');
    expect(text()).toContain('539');
    expect(text()).toContain('56.3');

    const badge = fixture.debugElement.query(By.css('.nutriscore'));
    expect(badge.nativeElement.textContent.trim()).toBe('E');
    expect(badge.nativeElement.classList).toContain('grade-e');
  });

  it('no muestra filas de nutrientes que no vinieron en la respuesta', () => {
    const result: NutritionResult = {
      status: 'found',
      facts: { barcode: '1', energyKcal100g: 100 },
    };
    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();

    expect(component.rows().length).toBe(1);
    expect(text()).not.toContain('Proteínas');
  });
});
