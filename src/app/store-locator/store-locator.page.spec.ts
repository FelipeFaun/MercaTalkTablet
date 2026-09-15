import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { StoreLocatorPage } from './store-locator.page';

describe('StoreLocatorPage', () => {
  let component: StoreLocatorPage;
  let fixture: ComponentFixture<StoreLocatorPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoreLocatorPage],
      providers: [provideRouter([]), provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(StoreLocatorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with 9 supermarket aisles and default zoom of 1.0 with clean state', () => {
    expect(component.aisles.length).toBe(9);
    expect(component.selectedAisleId).toBeNull();
    expect(component.zoomLevel).toBe(1.0);
    expect(component.currentAisle).toBeUndefined();
    expect(component.getActiveRoutePath()).toBe('');
  });

  it('should zoom in, zoom out, and reset zoom properly', () => {
    component.zoomIn();
    expect(component.zoomLevel).toBe(1.15);

    component.zoomOut();
    expect(component.zoomLevel).toBe(1.0);

    component.zoomIn();
    component.zoomIn();
    expect(component.zoomLevel).toBe(1.3);

    component.resetZoom();
    expect(component.zoomLevel).toBe(1.0);
  });

  it('should select an aisle and group products by shelf', () => {
    component.selectAisle(2);
    expect(component.selectedAisleId).toBe(2);
    expect(component.currentAisle?.name).toBe('Abarrotes & Despensa');

    const shelfGroups = component.getShelfGroupsForAisle(2);
    expect(shelfGroups.length).toBeGreaterThan(0);
  });

  it('should generate an SVG route path toward the selected aisle', () => {
    component.selectAisle(6); // Carnicería (superior)
    const route = component.getActiveRoutePath();
    expect(route).toContain('M 160 670');
    expect(route).toContain('115');
  });

  it('should search for a product and highlight aisle and shelf', (done) => {
    component.searchQuery = 'Leche';
    component.searchProductLocation();

    setTimeout(() => {
      expect(component.searchResults.length).toBeGreaterThan(0);
      const product = component.searchResults[0];
      component.selectProduct(product);

      expect(component.selectedProduct).toEqual(product);
      expect(component.highlightedAisleId).toBe(1);
      expect(component.highlightedShelf).toBeTruthy();
      done();
    }, 400);
  });

  it('should clear search and reset product selection', () => {
    component.searchQuery = 'Arroz';
    component.clearSearch();

    expect(component.searchQuery).toBe('');
    expect(component.searchResults.length).toBe(0);
    expect(component.selectedProduct).toBeNull();
  });

  it('should reset search and product each time ionViewWillEnter is triggered', () => {
    // Simular un producto previamente buscado por un usuario anterior
    component.searchQuery = 'Leche';
    component.searchResults = [component.allProducts[0]];
    component.selectedProduct = component.allProducts[0];
    component.highlightedShelf = 'Estante 2';
    component.zoomLevel = 1.45;

    // Al reingresar a la página (ionViewWillEnter)
    component.ionViewWillEnter();

    expect(component.searchQuery).toBe('');
    expect(component.searchResults.length).toBe(0);
    expect(component.selectedProduct).toBeNull();
    expect(component.highlightedShelf).toBeNull();
    expect(component.zoomLevel).toBe(1.0);
    expect(component.selectedAisleId).toBeNull();
    expect(component.getActiveRoutePath()).toBe('');
  });

  it('should reset selectedProduct whenever a new search is typed or focused', () => {
    component.selectedProduct = component.allProducts[0];
    expect(component.selectedProduct).not.toBeNull();

    component.onSearchFocus();
    expect(component.selectedProduct).toBeNull();

    component.selectedProduct = component.allProducts[0];
    component.searchQuery = 'Pan';
    component.onSearchInput();
    expect(component.selectedProduct).toBeNull();
  });

  it('should translate aisle labels, names, and shelves according to active language', () => {
    const aisle1 = component.aisles[0];

    // Default Spanish
    component.langService.setLanguage('es');
    expect(component.getAisleLabel(aisle1)).toBe('Pasillo 1');
    expect(component.getAisleName(aisle1)).toBe('Lácteos & Refrigerados');
    expect(component.getShelfDisplay('Estante 3')).toBe('Estante 3');

    // Switch to English
    component.langService.setLanguage('en');
    expect(component.getAisleLabel(aisle1)).toBe('Aisle 1');
    expect(component.getAisleName(aisle1)).toBe('Dairy & Refrigerated');
    expect(component.getShelfDisplay('Estante 3')).toBe('Shelf 3');

    // Switch to Portuguese
    component.langService.setLanguage('pt');
    expect(component.getAisleLabel(aisle1)).toBe('Corredor 1');
    expect(component.getAisleName(aisle1)).toBe('Laticínios & Refrigerados');
    expect(component.getShelfDisplay('Estante 3')).toBe('Prateleira 3');

    // Reset back to Spanish
    component.langService.setLanguage('es');
  });

  it('should close product, remove route line, and return to clean search state when closeProduct is called', () => {
    // Escenario 1: El usuario busca un producto desde el estado inicial limpio
    component.resetToInitialState();
    expect(component.selectedAisleId).toBeNull();
    expect(component.getActiveRoutePath()).toBe('');

    const testProd = component.allProducts[0]; // Pasillo 1
    component.selectProduct(testProd);

    expect(component.selectedProduct).toEqual(testProd);
    expect(component.selectedAisleId).toBe(1);
    expect(component.isRouteActive).toBeTrue();
    expect(component.getActiveRoutePath()).not.toBe('');

    // Al cerrar el producto
    component.closeProduct();

    expect(component.selectedProduct).toBeNull();
    expect(component.selectedAisleId).toBeNull();
    expect(component.isRouteActive).toBeFalse();
    expect(component.getActiveRoutePath()).toBe('');
  });

  it('should return to previous aisle and remove route line when closing a product from an aisle', () => {
    // Escenario 2: El usuario estaba explorando el pasillo 3 y abrió un producto
    component.selectAisle(3);
    expect(component.selectedAisleId).toBe(3);

    const testProd = component.getProductsInAisle(3)[0];
    component.selectProduct(testProd);

    expect(component.selectedProduct).toEqual(testProd);
    expect(component.isRouteActive).toBeTrue();

    // Al cerrar el producto, vuelve al pasillo 3 donde estaba pero retira la línea del producto
    component.closeProduct();

    expect(component.selectedProduct).toBeNull();
    expect(component.selectedAisleId).toBe(3);
    expect(component.isRouteActive).toBeFalse();
    expect(component.getActiveRoutePath()).toBe('');
  });
});

