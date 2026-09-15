import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Preferences } from '@capacitor/preferences';
import { EventCalculatorModalComponent } from './event-calculator-modal.component';

describe('EventCalculatorModalComponent', () => {
  let component: EventCalculatorModalComponent;
  let fixture: ComponentFixture<EventCalculatorModalComponent>;

  beforeEach(async () => {
    await Preferences.clear();
    await TestBed.configureTestingModule({
      imports: [EventCalculatorModalComponent],
      providers: [provideIonicAngular()]
    }).compileComponents();

    fixture = TestBed.createComponent(EventCalculatorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe calcular productos y pasillos automáticamente para asado', () => {
    component.setEvent('asado');
    component.setRange('6-10');
    const items = component.calculateItems();
    expect(items.length).toBeGreaterThan(0);
    const carne = items.find(i => i.name.includes('Lomo'));
    expect(carne).toBeDefined();
    expect(carne?.aisle).toContain('Pasillo 6');
  });

  it('debe calcular productos para cumpleaños infantil con pasillos', () => {
    component.setEvent('cumple');
    component.setRange('1-5');
    const items = component.calculateItems();
    const torta = items.find(i => i.name.includes('Torta'));
    expect(torta).toBeDefined();
    expect(torta?.aisle).toContain('Pasillo 1');
  });

  it('debe permitir excluir alcohol y compensar automáticamente con bebidas sin alcohol', () => {
    component.setEvent('asado');
    expect(component.isAlcoholExcluded()).toBeFalse();

    // Activar modo sin alcohol
    component.toggleAlcoholExclusion();
    expect(component.isAlcoholExcluded()).toBeTrue();
    expect(component.hasAlcoholCompensated()).toBeTrue();

    const items = component.calculateItems();
    // No debe haber cerveza ni licores
    const alcoholItems = items.filter(i => i.isAlcohol);
    expect(alcoholItems.length).toBe(0);

    // Bebidas sin alcohol deben tener bandera de compensado
    const cocaCola = items.find(i => i.name.includes('Coca-Cola'));
    expect(cocaCola).toBeDefined();
    expect(cocaCola?.isCompensated).toBeTrue();
    expect(cocaCola?.quantityText).toContain('compensado');
  });

  it('debe permitir quitar un producto específico de la lista', () => {
    component.setEvent('asado');
    const initialCount = component.calculateItems().length;

    // Quitar carbón (id 103)
    component.removeItem(103);
    const newItems = component.calculateItems();
    expect(newItems.length).toBe(initialCount - 1);
    expect(newItems.some(i => i.id === 103)).toBeFalse();
  });

  it('debe permitir agregar un producto sugerido del catálogo temático', () => {
    component.setEvent('asado');
    const catalog = component.getSuggestedCatalog();
    const pollo = catalog.find(i => i.id === 107); // Trutro Entero de Pollo
    expect(pollo).toBeDefined();

    component.selectSuggestedProduct(pollo!);
    const items = component.calculateItems();
    expect(items.some(i => i.id === 107)).toBeTrue();
  });

  it('debe permitir reemplazar un producto existente por otro', () => {
    component.setEvent('asado');
    // Abrir reemplazo para Lomo Vetado (id 101)
    component.openReplaceModal(101);
    expect(component.replaceTargetId()).toBe(101);

    const catalog = component.getSuggestedCatalog();
    const costillar = catalog.find(i => i.id === 108); // Costillar de Cerdo
    expect(costillar).toBeDefined();

    component.selectSuggestedProduct(costillar!);
    const items = component.calculateItems();
    expect(items.some(i => i.id === 101)).toBeFalse();
    expect(items.some(i => i.id === 108)).toBeTrue();
  });

  it('debe emitir openExpressQr con los productos y pasillos calculados', () => {
    spyOn(component.openExpressQr, 'emit');
    component.triggerExpressQr();
    expect(component.openExpressQr.emit).toHaveBeenCalled();
  });

  it('debe agregar productos a mi compra', () => {
    component.addAllToCart();
    expect(component.addedToCartSuccess()).toBeTrue();
  });

  it('debe sugerir opciones de compensación al eliminar chorizos u otro alimento y permitir compensar con 1 toque', () => {
    component.setEvent('asado');
    component.setRange('6-10');

    // Quitar Chorizos Parrilleros (id 102)
    component.removeItem(102);

    expect(component.lastRemovedItem()?.id).toBe(102);
    expect(component.lastRemovedItem()?.name).toContain('Chorizos');

    const suggestions = component.removalCompensationSuggestions();
    expect(suggestions.length).toBeGreaterThan(0);
    // Debe sugerir productos relevantes no incluidos como Longanizas Chillán o Prietas
    expect(suggestions.some(s => s.id === 110 || s.id === 115 || s.id === 111)).toBeTrue();

    const topSug = component.topCompensationSuggestion();
    expect(topSug).toBeTruthy();

    // Compensar con 1 toque
    component.applyRemovalCompensation(topSug!);

    // Debe haberse añadido a los ítems calculados y marcado como compensado
    const items = component.calculateItems();
    const compensatedItem = items.find(i => i.id === topSug!.id);
    expect(compensatedItem).toBeDefined();
    expect(compensatedItem?.isCompensated).toBeTrue();
    expect(component.lastRemovedItem()).toBeNull();
  });

  it('debe permitir deshacer la eliminación de un producto', () => {
    component.setEvent('asado');
    component.removeItem(102); // Quitar chorizos
    expect(component.calculateItems().some(i => i.id === 102)).toBeFalse();

    // Deshacer eliminación
    component.undoLastRemoval();
    expect(component.calculateItems().some(i => i.id === 102)).toBeTrue();
    expect(component.lastRemovedItem()).toBeNull();
  });

  it('debe permitir descartar las sugerencias de compensación', () => {
    component.setEvent('asado');
    component.removeItem(102);
    expect(component.lastRemovedItem()).not.toBeNull();

    component.dismissRemovalPrompt();
    expect(component.lastRemovedItem()).toBeNull();
  });

  it('debe emitir dismissModal al cerrar', () => {
    spyOn(component.dismissModal, 'emit');
    component.onDismiss();
    expect(component.dismissModal.emit).toHaveBeenCalled();
  });
});
