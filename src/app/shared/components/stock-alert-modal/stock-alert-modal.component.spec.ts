import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { StockAlertModalComponent } from './stock-alert-modal.component';

describe('StockAlertModalComponent', () => {
  let component: StockAlertModalComponent;
  let fixture: ComponentFixture<StockAlertModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockAlertModalComponent],
      providers: [provideIonicAngular()]
    }).compileComponents();

    fixture = TestBed.createComponent(StockAlertModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe inicializar con un producto con stock en bodega y 0 en góndola', () => {
    const info = component.selectedStockInfo();
    expect(info).not.toBeNull();
    expect(info?.shelfStock).toBe(0);
    expect(info?.warehouseStock).toBeGreaterThan(0);
  });

  it('debe avisar a reponedor y cambiar el estado a staffNotified', () => {
    expect(component.staffNotified()).toBeFalse();
    component.notifyStaff();
    expect(component.staffNotified()).toBeTrue();
  });

  it('debe buscar productos al escribir en la barra', () => {
    component.searchQuery = 'leche';
    component.onSearchChange();
    expect(component.searchResults().length).toBeGreaterThan(0);
  });

  it('debe emitir dismissModal al cerrar', () => {
    spyOn(component.dismissModal, 'emit');
    component.onDismiss();
    expect(component.dismissModal.emit).toHaveBeenCalled();
  });
});
