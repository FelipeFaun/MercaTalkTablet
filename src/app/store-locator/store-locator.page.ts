import { Component, inject, OnInit } from '@angular/core';
import { 
  IonContent, IonIcon, IonSpinner, IonBadge
} from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ProductsService, Product } from '../services/products.service';
import { BrandService } from '../core/brand.service';
import { ClpPipe } from '../shared/pipes/clp.pipe';
import { TranslatePipe } from '../shared/pipes/translate.pipe';

import { LanguageService } from '../core/language.service';

export interface AisleDefinition {
  id: number;
  label: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  badge: string;
  description: string;
  mapX: number;
  mapY: number;
}

export interface ShelfGroup {
  shelfName: string;
  shelfNumber: number;
  products: Product[];
}

export const SUPERMARKET_AISLES: AisleDefinition[] = [
  {
    id: 1,
    label: 'Pasillo 1',
    name: 'Lácteos & Refrigerados',
    category: 'Lácteos',
    icon: '🥛',
    color: '#eab308',
    badge: 'Fresco',
    description: 'Leches, yogures, mantequillas, quesos y refrigerados',
    mapX: 560,
    mapY: 100
  },
  {
    id: 2,
    label: 'Pasillo 2',
    name: 'Abarrotes & Despensa',
    category: 'Abarrotes',
    icon: '🍚',
    color: '#64748b',
    badge: 'Despensa',
    description: 'Arroz, fideos, harinas, azúcar, sopas y conservas',
    mapX: 300,
    mapY: 380
  },
  {
    id: 3,
    label: 'Pasillo 3',
    name: 'Bebidas, Aguas & Café',
    category: 'Bebidas',
    icon: '☕',
    color: '#475569',
    badge: 'Líquidos',
    description: 'Bebidas gaseosas, jugos naturales, aguas minerales y té',
    mapX: 390,
    mapY: 380
  },
  {
    id: 4,
    label: 'Pasillo 4',
    name: 'Limpieza, Hogar & Congelados',
    category: 'Limpieza',
    icon: '🧼',
    color: '#06b6d4',
    badge: 'Hogar',
    description: 'Detergentes, desinfectantes, lavalozas y productos congelados',
    mapX: 480,
    mapY: 380
  },
  {
    id: 5,
    label: 'Pasillo 5',
    name: 'Frutas, Verduras & Granel',
    category: 'Frutas y Verduras',
    icon: '🍎',
    color: '#84cc16',
    badge: 'Fresco',
    description: 'Manzanas, plátanos, tomates, paltas y frutos secos',
    mapX: 110,
    mapY: 380
  },
  {
    id: 6,
    label: 'Pasillo 6',
    name: 'Carnicería, Pollo & Pescadería',
    category: 'Carnicería',
    icon: '🥩',
    color: '#f87171',
    badge: 'Carnes',
    description: 'Pechuga de pollo fresca y cortes de vacuno seleccionados',
    mapX: 330,
    mapY: 100
  },
  {
    id: 7,
    label: 'Pasillo 7',
    name: 'Panadería & Pastelería',
    category: 'Panadería',
    icon: '🥖',
    color: '#fb923c',
    badge: 'Panadería',
    description: 'Pan de molde horneado y bollería seleccionada',
    mapX: 660,
    mapY: 360
  },
  {
    id: 8,
    label: 'Pasillo 8',
    name: 'Cuidado Personal & Farmacia',
    category: 'Cuidado Personal',
    icon: '🧴',
    color: '#f43f5e',
    badge: 'Higiene',
    description: 'Desodorantes, aseo corporal y cuidado diario',
    mapX: 660,
    mapY: 550
  },
  {
    id: 9,
    label: 'Pasillo 9',
    name: 'Vinos, Cervezas & Licores',
    category: 'Vinos',
    icon: '🍷',
    color: '#854d0e',
    badge: 'Vinos',
    description: 'Vinos tintos Carmenere y cepas seleccionadas',
    mapX: 660,
    mapY: 170
  },
];

@Component({
  selector: 'app-store-locator',
  templateUrl: './store-locator.page.html',
  styleUrls: ['./store-locator.page.scss'],
  standalone: true,
  imports: [
    AppHeaderComponent,
    RouterModule, IonContent,
    IonIcon, IonSpinner, IonBadge,
    ClpPipe,
    TranslatePipe,
    FormsModule,
    CommonModule
  ]
})
export class StoreLocatorPage implements OnInit {
  private productsService = inject(ProductsService);
  readonly brandService = inject(BrandService);
  readonly langService = inject(LanguageService);

  readonly aisles: AisleDefinition[] = SUPERMARKET_AISLES;

  searchQuery: string = '';
  searchResults: Product[] = [];
  isLoading: boolean = false;

  /** Nivel de zoom del plano arquitectónico */
  zoomLevel: number = 1.0;

  /** Pasillo seleccionado actualmente (null por defecto para iniciar completamente limpio) */
  selectedAisleId: number | null = null;

  /** Producto seleccionado */
  selectedProduct: Product | null = null;

  /** Pasillo resaltado */
  highlightedAisleId: number | null = null;

  /** Estante resaltado */
  highlightedShelf: string | null = null;

  /** Pasillo previo antes de abrir el detalle de un producto (para regresar a él al cerrar) */
  previousAisleId: number | null = null;

  /** Controla si el trazo de ruta y la chincheta están activos en el plano */
  isRouteActive: boolean = false;

  ngOnInit(): void {
    this.resetToInitialState();
  }

  /** Se invoca automáticamente cada vez que el usuario ingresa a esta página en Ionic */
  ionViewWillEnter(): void {
    this.resetToInitialState();
  }

  /** Reinicia el estado inicial sin productos, pasillos ni rutas trazadas */
  resetToInitialState(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedProduct = null;
    this.highlightedShelf = null;
    this.selectedAisleId = null;
    this.highlightedAisleId = null;
    this.previousAisleId = null;
    this.isRouteActive = false;
    this.isLoading = false;
    this.zoomLevel = 1.0;
  }

  /** Retorna la etiqueta traducida del pasillo (ej: 'Pasillo 1', 'Aisle 1', 'Corredor 1') */
  getAisleLabel(aisle?: AisleDefinition): string {
    if (!aisle) return '';
    const key = `storeLocator.aisle.${aisle.id}.label`;
    const translated = this.langService.t(key);
    return translated !== key ? translated : aisle.label;
  }

  /** Retorna el nombre traducido del pasillo */
  getAisleName(aisle?: AisleDefinition): string {
    if (!aisle) return '';
    const key = `storeLocator.aisle.${aisle.id}.name`;
    const translated = this.langService.t(key);
    return translated !== key ? translated : aisle.name;
  }

  /** Retorna la descripción traducida del pasillo */
  getAisleDesc(aisle?: AisleDefinition): string {
    if (!aisle) return '';
    const key = `storeLocator.aisle.${aisle.id}.desc`;
    const translated = this.langService.t(key);
    return translated !== key ? translated : aisle.description;
  }

  /** Formatea la visualización del estante en el idioma activo (ej: 'Estante 2', 'Shelf 2', 'Prateleira 2') */
  getShelfDisplay(shelfName?: string): string {
    if (!shelfName) return '';
    const match = shelfName.match(/\d+/);
    const num = match ? match[0] : '1';
    const shelfWord = this.langService.t('storeLocator.shelfLabel');
    return `${shelfWord} ${num}`;
  }

  /** Traduce la cadena de pasillo de un producto (ej: 'Pasillo 2' -> 'Aisle 2') */
  getAisleDisplay(aisleName?: string): string {
    if (!aisleName) return '';
    const match = aisleName.match(/\d+/);
    if (!match) return aisleName;
    const num = parseInt(match[0], 10);
    const key = `storeLocator.aisle.${num}.label`;
    const translated = this.langService.t(key);
    return translated !== key ? translated : aisleName;
  }

  get allProducts(): Product[] {
    return this.productsService.getAllProducts();
  }

  get currentAisle(): AisleDefinition | undefined {
    if (!this.selectedAisleId) return undefined;
    return this.aisles.find(a => a.id === this.selectedAisleId);
  }

  getProductsInAisle(aisleId: number): Product[] {
    return this.allProducts.filter(p => p.supermarketLocation?.aisle === `Pasillo ${aisleId}`);
  }

  getShelfGroupsForAisle(aisleId: number): ShelfGroup[] {
    const products = this.getProductsInAisle(aisleId);
    const map = new Map<string, Product[]>();

    for (const p of products) {
      const shelfKey = p.supermarketLocation?.shelf || 'Estante 1';
      if (!map.has(shelfKey)) {
        map.set(shelfKey, []);
      }
      map.get(shelfKey)!.push(p);
    }

    return Array.from(map.entries())
      .map(([shelfName, prods]) => {
        const numMatch = shelfName.match(/\d+/);
        const shelfNumber = numMatch ? parseInt(numMatch[0], 10) : 1;
        return {
          shelfName,
          shelfNumber,
          products: prods
        };
      })
      .sort((a, b) => a.shelfNumber - b.shelfNumber);
  }

  /** Controles de zoom interactivo */
  zoomIn(): void {
    this.zoomLevel = Math.min(1.8, +(this.zoomLevel + 0.15).toFixed(2));
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(0.7, +(this.zoomLevel - 0.15).toFixed(2));
  }

  resetZoom(): void {
    this.zoomLevel = 1.0;
  }

  /** Selecciona un pasillo en el mapa y descarta búsquedas o productos previos */
  /** Selecciona un pasillo en el mapa y descarta búsquedas o productos previos */
  selectAisle(aisleId: number): void {
    this.selectedAisleId = aisleId;
    this.highlightedAisleId = aisleId;
    this.previousAisleId = aisleId;
    this.selectedProduct = null;
    this.highlightedShelf = null;
    this.isRouteActive = true;
    this.searchQuery = '';
    this.searchResults = [];
  }

  /** Al enfocar el buscador, descarta cualquier producto seleccionado para buscar desde cero */
  onSearchFocus(): void {
    if (this.selectedProduct) {
      this.closeProduct();
    }
  }

  /** Búsqueda en vivo por teclado de tablet: reinicia el producto previo cada vez que se busca */
  onSearchInput(): void {
    this.selectedProduct = null;
    this.highlightedShelf = null;
    this.isRouteActive = false;

    const q = this.searchQuery.trim();
    if (!q) {
      this.searchResults = [];
      this.isLoading = false;
      this.highlightedAisleId = this.selectedAisleId;
      return;
    }

    this.isLoading = true;
    setTimeout(() => {
      this.searchResults = this.productsService.searchProducts(q);
      this.isLoading = false;

      // Si hay un solo resultado, seleccionarlo y enfocarlo
      if (this.searchResults.length === 1) {
        this.selectProduct(this.searchResults[0]);
      }
    }, 200);
  }

  /** Alias compatible para búsqueda */
  searchProductLocation(): void {
    this.onSearchInput();
  }

  /** Selecciona un producto para enfocarlo en el mapa */
  selectProduct(product: Product): void {
    // Si no había un producto ya abierto, guardar el pasillo previo para poder retornar a él
    if (!this.selectedProduct) {
      this.previousAisleId = this.selectedAisleId;
    }

    this.selectedProduct = product;
    this.isRouteActive = true;

    if (product.supermarketLocation?.aisle) {
      const match = product.supermarketLocation.aisle.match(/\d+/);
      if (match) {
        const aisleNum = parseInt(match[0], 10);
        this.selectedAisleId = aisleNum;
        this.highlightedAisleId = aisleNum;
      }
    }

    this.highlightedShelf = product.supermarketLocation?.shelf || null;
  }

  /** Cierra el producto seleccionado, elimina la línea de ruta y regresa al estado donde estaba */
  closeProduct(): void {
    this.selectedProduct = null;
    this.highlightedShelf = null;
    this.isRouteActive = false;
    this.selectedAisleId = this.previousAisleId;
    this.highlightedAisleId = this.previousAisleId;
    this.previousAisleId = null;
  }

  /** Limpia la búsqueda activa */
  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedProduct = null;
    this.highlightedShelf = null;
    this.isRouteActive = false;
    this.selectedAisleId = null;
    this.highlightedAisleId = null;
    this.previousAisleId = null;
    this.isLoading = false;
  }

  /** Extrae el número del pasillo */
  getAisleNumber(aisleName?: string): number {
    if (!aisleName) return 1;
    const match = aisleName.match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
  }

  /** Genera las coordenadas dinámicas del SVG para la ruta activa (vacío si no hay pasillo seleccionado o ruta activa) */
  getActiveRoutePath(): string {
    if (!this.currentAisle || !this.isRouteActive) {
      return '';
    }

    // Ruta directa desde la entrada hasta el pasillo o sección seleccionada
    const destX = this.currentAisle.mapX;
    const destY = this.currentAisle.mapY;

    if (destX > 600) {
      // Pasillos derecha (Vinos, Panadería, Cuidado Personal)
      return `M 160 670 L 160 115 L 630 115 L 630 ${destY}`;
    } else if (destY < 200) {
      // Secciones superiores (Carnes, Lácteos)
      return `M 160 670 L 160 115 L ${destX} 115`;
    } else if (destX < 200) {
      // Frutas / Verduras
      return `M 160 670 L 160 ${destY}`;
    } else {
      // Pasillos verticales centrales (Abarrotes, Bebidas, Limpieza)
      return `M 160 670 L 160 600 L ${destX} 600 L ${destX} ${destY}`;
    }
  }
}