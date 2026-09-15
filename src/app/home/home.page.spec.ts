import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([]), provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe iniciar sin modales activos', () => {
    expect(component.activeModal()).toBeNull();
  });

  it('debe abrir y cerrar la calculadora de eventos', () => {
    component.openEventCalculator();
    expect(component.activeModal()).toBe('eventCalculator');
    component.closeModal();
    expect(component.activeModal()).toBeNull();
  });

  it('debe abrir y cerrar el reporte de stock cruzado', () => {
    component.openStockAlert();
    expect(component.activeModal()).toBe('stockAlert');
    component.closeModal();
    expect(component.activeModal()).toBeNull();
  });

  it('debe abrir y cerrar los avisos e incidentes operativos', () => {
    component.openIncidentReport();
    expect(component.activeModal()).toBe('incidentReport');
    component.closeModal();
    expect(component.activeModal()).toBeNull();
  });

  it('debe abrir y cerrar la lista express con QR', () => {
    component.openExpressQr({ title: 'Mi Asado', items: [{ name: 'Carne', aisle: 'Pasillo 6' }] });
    expect(component.activeModal()).toBe('expressQr');
    expect(component.qrPayload()?.title).toBe('Mi Asado');
    component.closeModal();
    expect(component.activeModal()).toBeNull();
  });
});
