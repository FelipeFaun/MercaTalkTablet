import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { CartService } from '../../../core/cart.service';
import { ClpPipe } from '../../pipes/clp.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';

export type EventType = 'asado' | 'cumple' | 'fiesta';
export type GuestRange = '1-5' | '6-10' | '10+';
export type EventCategory = 'protein' | 'sides' | 'drinks' | 'supplies';

export interface EventCatalogItem {
  id: number;
  name: string;
  category: EventCategory;
  categoryLabelKey: string;
  aisle: string;
  aisleNum: number;
  unitPrice: number;
  isAlcohol: boolean;
  icon: string;
  defaultEvents: EventType[];
  getQuantityText: (mult: number, isCompensated: boolean) => string;
  getTotalPrice: (mult: number, isCompensated: boolean) => number;
}

export interface CalculatedItem {
  id: number;
  name: string;
  category: EventCategory;
  quantityText: string;
  aisle: string;
  aisleNum: number;
  unitPrice: number;
  totalPrice: number;
  isAlcohol: boolean;
  isCompensated: boolean;
}

const EVENT_MASTER_CATALOG: EventCatalogItem[] = [
  // ==================== ASADO ====================
  {
    id: 101,
    name: 'Lomo Vetado Premium',
    category: 'protein',
    categoryLabelKey: 'calculator.categoryProteins',
    aisle: 'Pasillo 6 · Carnicería',
    aisleNum: 6,
    unitPrice: 10990,
    isAlcohol: false,
    icon: 'flame-outline',
    defaultEvents: ['asado'],
    getQuantityText: (mult) => `${1.5 * mult} kg`,
    getTotalPrice: (mult) => 10990 * 1.5 * mult
  },
  {
    id: 102,
    name: 'Chorizos Parrilleros',
    category: 'sides',
    categoryLabelKey: 'calculator.categorySides',
    aisle: 'Pasillo 6 · Carnicería',
    aisleNum: 6,
    unitPrice: 3990,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: ['asado'],
    getQuantityText: (mult) => `${mult} pack (${5 * mult} un)`,
    getTotalPrice: (mult) => 3990 * mult
  },
  {
    id: 103,
    name: 'Carbón Vegetal 2.5kg',
    category: 'supplies',
    categoryLabelKey: 'calculator.categorySupplies',
    aisle: 'Pasillo 4 · Patio & Hogar',
    aisleNum: 4,
    unitPrice: 2990,
    isAlcohol: false,
    icon: 'flame-outline',
    defaultEvents: ['asado'],
    getQuantityText: (mult) => `${mult} bolsa(s)`,
    getTotalPrice: (mult) => 2990 * mult
  },
  {
    id: 104,
    name: 'Marraquetas Frescas',
    category: 'sides',
    categoryLabelKey: 'calculator.categorySides',
    aisle: 'Pasillo 1 · Panadería',
    aisleNum: 1,
    unitPrice: 1890,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: ['asado'],
    getQuantityText: (mult) => `${mult} kg`,
    getTotalPrice: (mult) => 1890 * mult
  },
  {
    id: 105,
    name: 'Bebida Coca-Cola 2.5L',
    category: 'drinks',
    categoryLabelKey: 'calculator.categoryDrinks',
    aisle: 'Pasillo 3 · Bebidas',
    aisleNum: 3,
    unitPrice: 2490,
    isAlcohol: false,
    icon: 'water-outline',
    defaultEvents: ['asado'],
    getQuantityText: (mult, isCompensated) => isCompensated ? `${mult + 2} botellas (compensado)` : `${mult} botella(s)`,
    getTotalPrice: (mult, isCompensated) => 2490 * (isCompensated ? mult + 2 : mult)
  },
  {
    id: 106,
    name: 'Cerveza Lata Pack 6',
    category: 'drinks',
    categoryLabelKey: 'calculator.categoryDrinks',
    aisle: 'Pasillo 3 · Bebidas & Licores',
    aisleNum: 3,
    unitPrice: 4990,
    isAlcohol: true,
    icon: 'beer-outline',
    defaultEvents: ['asado', 'fiesta'],
    getQuantityText: (mult) => `${mult} pack (${6 * mult} un)`,
    getTotalPrice: (mult) => 4990 * mult
  },
  {
    id: 107,
    name: 'Trutro Entero de Pollo',
    category: 'protein',
    categoryLabelKey: 'calculator.categoryProteins',
    aisle: 'Pasillo 6 · Aves & Pollo',
    aisleNum: 6,
    unitPrice: 4990,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${1.5 * mult} kg`,
    getTotalPrice: (mult) => 4990 * 1.5 * mult
  },
  {
    id: 108,
    name: 'Costillar de Cerdo',
    category: 'protein',
    categoryLabelKey: 'calculator.categoryProteins',
    aisle: 'Pasillo 6 · Carnicería Cerdo',
    aisleNum: 6,
    unitPrice: 8990,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult * 1.2} kg`,
    getTotalPrice: (mult) => 8990 * mult * 1.2
  },
  {
    id: 109,
    name: 'Hamburguesas Veganas NotBurger',
    category: 'protein',
    categoryLabelKey: 'calculator.categoryProteins',
    aisle: 'Pasillo 4 · Congelados Veggie',
    aisleNum: 4,
    unitPrice: 4490,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} pack (${4 * mult} un)`,
    getTotalPrice: (mult) => 4490 * mult
  },
  {
    id: 110,
    name: 'Longanizas Chillán Artesanales',
    category: 'sides',
    categoryLabelKey: 'calculator.categorySides',
    aisle: 'Pasillo 6 · Embutidos',
    aisleNum: 6,
    unitPrice: 4290,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} pack (${4 * mult} un)`,
    getTotalPrice: (mult) => 4290 * mult
  },
  {
    id: 111,
    name: 'Papas Granel para Asar',
    category: 'sides',
    categoryLabelKey: 'calculator.categorySides',
    aisle: 'Pasillo 5 · Verdulería',
    aisleNum: 5,
    unitPrice: 1490,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult * 1.5} kg`,
    getTotalPrice: (mult) => 1490 * mult * 1.5
  },
  {
    id: 112,
    name: 'Jugos Néctar Watts 1.5L',
    category: 'drinks',
    categoryLabelKey: 'calculator.categoryDrinks',
    aisle: 'Pasillo 3 · Jugos & Bebidas',
    aisleNum: 3,
    unitPrice: 1390,
    isAlcohol: false,
    icon: 'water-outline',
    defaultEvents: [],
    getQuantityText: (mult, isCompensated) => isCompensated ? `${mult + 2} botellas (compensado)` : `${mult} botella(s)`,
    getTotalPrice: (mult, isCompensated) => 1390 * (isCompensated ? mult + 2 : mult)
  },
  {
    id: 113,
    name: 'Vino Tinto Reserva Carmenere',
    category: 'drinks',
    categoryLabelKey: 'calculator.categoryDrinks',
    aisle: 'Pasillo 3 · Vinos & Licores',
    aisleNum: 3,
    unitPrice: 4990,
    isAlcohol: true,
    icon: 'wine-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} botella(s)`,
    getTotalPrice: (mult) => 4990 * mult
  },
  {
    id: 114,
    name: 'Agua Mineral Cachantun 1.6L',
    category: 'drinks',
    categoryLabelKey: 'calculator.categoryDrinks',
    aisle: 'Pasillo 3 · Aguas',
    aisleNum: 3,
    unitPrice: 1090,
    isAlcohol: false,
    icon: 'water-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} botella(s)`,
    getTotalPrice: (mult) => 1090 * mult
  },

  // ==================== CUMPLEAÑOS INFANTIL ====================
  {
    id: 201,
    name: 'Torta de Cumpleaños Artesanal',
    category: 'protein',
    categoryLabelKey: 'calculator.categoryProteins',
    aisle: 'Pasillo 1 · Pastelería',
    aisleNum: 1,
    unitPrice: 9990,
    isAlcohol: false,
    icon: 'gift-outline',
    defaultEvents: ['cumple'],
    getQuantityText: (mult) => mult === 1 ? '1 un (10 porc.)' : mult === 2 ? '1 un (15 porc.)' : '1 un (25 porc.)',
    getTotalPrice: (mult) => 9990 + (mult - 1) * 5000
  },
  {
    id: 202,
    name: 'Papas Fritas Lays Corte Americano',
    category: 'sides',
    categoryLabelKey: 'calculator.categorySides',
    aisle: 'Pasillo 2 · Snacks & Despensa',
    aisleNum: 2,
    unitPrice: 2190,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: ['cumple'],
    getQuantityText: (mult) => `${mult} bolsa(s) 250g`,
    getTotalPrice: (mult) => 2190 * mult
  },
  {
    id: 203,
    name: 'Jugos Néctar Watts 1.5L',
    category: 'drinks',
    categoryLabelKey: 'calculator.categoryDrinks',
    aisle: 'Pasillo 3 · Jugos & Bebidas',
    aisleNum: 3,
    unitPrice: 1390,
    isAlcohol: false,
    icon: 'water-outline',
    defaultEvents: ['cumple'],
    getQuantityText: (mult, isCompensated) => `${2 * mult + (isCompensated ? 1 : 0)} botellas`,
    getTotalPrice: (mult, isCompensated) => 1390 * (2 * mult + (isCompensated ? 1 : 0))
  },
  {
    id: 204,
    name: 'Vasos y Platos Festivos',
    category: 'supplies',
    categoryLabelKey: 'calculator.categorySupplies',
    aisle: 'Pasillo 4 · Cotillón & Hogar',
    aisleNum: 4,
    unitPrice: 1990,
    isAlcohol: false,
    icon: 'gift-outline',
    defaultEvents: ['cumple'],
    getQuantityText: (mult) => `${mult} set (${10 * mult} un)`,
    getTotalPrice: (mult) => 1990 * mult
  },
  {
    id: 205,
    name: 'Pack Dulces & Caramelos',
    category: 'supplies',
    categoryLabelKey: 'calculator.categorySupplies',
    aisle: 'Pasillo 2 · Confitería',
    aisleNum: 2,
    unitPrice: 3490,
    isAlcohol: false,
    icon: 'gift-outline',
    defaultEvents: ['cumple'],
    getQuantityText: (mult) => `${mult} bolsa(s) 500g`,
    getTotalPrice: (mult) => 3490 * mult
  },
  {
    id: 206,
    name: 'Mini Pizzas Cóctel',
    category: 'sides',
    categoryLabelKey: 'calculator.categorySides',
    aisle: 'Pasillo 4 · Congelados',
    aisleNum: 4,
    unitPrice: 3290,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} pack (${12 * mult} un)`,
    getTotalPrice: (mult) => 3290 * mult
  },
  {
    id: 207,
    name: 'Ramitas Queso Evercrisp 250g',
    category: 'sides',
    categoryLabelKey: 'calculator.categorySides',
    aisle: 'Pasillo 2 · Snacks',
    aisleNum: 2,
    unitPrice: 1690,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} bolsa(s)`,
    getTotalPrice: (mult) => 1690 * mult
  },
  {
    id: 208,
    name: 'Bebida Mini Lata Pack 6',
    category: 'drinks',
    categoryLabelKey: 'calculator.categoryDrinks',
    aisle: 'Pasillo 3 · Bebidas',
    aisleNum: 3,
    unitPrice: 2990,
    isAlcohol: false,
    icon: 'water-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} pack(s)`,
    getTotalPrice: (mult) => 2990 * mult
  },

  // ==================== JUNTADA / FIESTA ====================
  {
    id: 301,
    name: 'Pizza Familiar Congelada',
    category: 'protein',
    categoryLabelKey: 'calculator.categoryProteins',
    aisle: 'Pasillo 4 · Congelados',
    aisleNum: 4,
    unitPrice: 3490,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: ['fiesta'],
    getQuantityText: (mult) => `${mult + 1} unidades`,
    getTotalPrice: (mult) => 3490 * (mult + 1)
  },
  {
    id: 302,
    name: 'Nachos & Tortillas Doritos',
    category: 'sides',
    categoryLabelKey: 'calculator.categorySides',
    aisle: 'Pasillo 2 · Snacks',
    aisleNum: 2,
    unitPrice: 2490,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: ['fiesta'],
    getQuantityText: (mult) => `${mult} pack grande`,
    getTotalPrice: (mult) => 2490 * mult
  },
  {
    id: 304,
    name: 'Bebida Gaseosa 2.5L',
    category: 'drinks',
    categoryLabelKey: 'calculator.categoryDrinks',
    aisle: 'Pasillo 3 · Bebidas',
    aisleNum: 3,
    unitPrice: 1990,
    isAlcohol: false,
    icon: 'water-outline',
    defaultEvents: ['fiesta'],
    getQuantityText: (mult, isCompensated) => isCompensated ? `${mult + 2} botellas (compensado)` : `${mult + 1} botellas`,
    getTotalPrice: (mult, isCompensated) => 1990 * (isCompensated ? mult + 2 : mult + 1)
  },
  {
    id: 305,
    name: 'Hielo en Cubos 2kg',
    category: 'supplies',
    categoryLabelKey: 'calculator.categorySupplies',
    aisle: 'Pasillo 4 · Congelados',
    aisleNum: 4,
    unitPrice: 1690,
    isAlcohol: false,
    icon: 'water-outline',
    defaultEvents: ['fiesta'],
    getQuantityText: (mult) => `${mult} bolsa(s)`,
    getTotalPrice: (mult) => 1690 * mult
  },
  {
    id: 306,
    name: 'Empanaditas Cóctel Horno',
    category: 'protein',
    categoryLabelKey: 'calculator.categoryProteins',
    aisle: 'Pasillo 4 · Congelados Cóctel',
    aisleNum: 4,
    unitPrice: 3990,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} bandeja(s) (12 un)`,
    getTotalPrice: (mult) => 3990 * mult
  },
  {
    id: 307,
    name: 'Maní Salado Tostado 400g',
    category: 'sides',
    categoryLabelKey: 'calculator.categorySides',
    aisle: 'Pasillo 2 · Frutos Secos',
    aisleNum: 2,
    unitPrice: 1290,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} bolsa(s)`,
    getTotalPrice: (mult) => 1290 * mult
  },
  {
    id: 308,
    name: 'Pisco Especial 35° 1L',
    category: 'drinks',
    categoryLabelKey: 'calculator.categoryDrinks',
    aisle: 'Pasillo 3 · Destilados',
    aisleNum: 3,
    unitPrice: 5990,
    isAlcohol: true,
    icon: 'wine-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} botella(s)`,
    getTotalPrice: (mult) => 5990 * mult
  },
  {
    id: 115,
    name: 'Prietas Artesanales al Vacío',
    category: 'sides',
    categoryLabelKey: 'calculator.categorySides',
    aisle: 'Pasillo 6 · Embutidos',
    aisleNum: 6,
    unitPrice: 3890,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} pack (4 un)`,
    getTotalPrice: (mult) => 3890 * mult
  },
  {
    id: 116,
    name: 'Ensalada Chilena Pack Fresco',
    category: 'sides',
    categoryLabelKey: 'calculator.categorySides',
    aisle: 'Pasillo 5 · Verdulería',
    aisleNum: 5,
    unitPrice: 1990,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} bandeja(s) 500g`,
    getTotalPrice: (mult) => 1990 * mult
  },
  {
    id: 117,
    name: 'Pebre Criollo Fresco 250g',
    category: 'sides',
    categoryLabelKey: 'calculator.categorySides',
    aisle: 'Pasillo 1 · Platos Preparados',
    aisleNum: 1,
    unitPrice: 1490,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} pote(s)`,
    getTotalPrice: (mult) => 1490 * mult
  },
  {
    id: 118,
    name: 'Sobrecostilla Vacuno Parrillera',
    category: 'protein',
    categoryLabelKey: 'calculator.categoryProteins',
    aisle: 'Pasillo 6 · Carnicería',
    aisleNum: 6,
    unitPrice: 8490,
    isAlcohol: false,
    icon: 'flame-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${1.2 * mult} kg`,
    getTotalPrice: (mult) => 8490 * 1.2 * mult
  },
  {
    id: 209,
    name: 'Galletones Cóctel Rellenos',
    category: 'sides',
    categoryLabelKey: 'calculator.categorySides',
    aisle: 'Pasillo 2 · Galletas',
    aisleNum: 2,
    unitPrice: 1890,
    isAlcohol: false,
    icon: 'gift-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} pack(s)`,
    getTotalPrice: (mult) => 1890 * mult
  },
  {
    id: 309,
    name: 'Papas Pringles Original 124g',
    category: 'sides',
    categoryLabelKey: 'calculator.categorySides',
    aisle: 'Pasillo 2 · Snacks',
    aisleNum: 2,
    unitPrice: 2290,
    isAlcohol: false,
    icon: 'restaurant-outline',
    defaultEvents: [],
    getQuantityText: (mult) => `${mult} tubo(s)`,
    getTotalPrice: (mult) => 2290 * mult
  }
];

@Component({
  selector: 'app-event-calculator-modal',
  standalone: true,
  imports: [CommonModule, IonIcon, ClpPipe, TranslatePipe],
  templateUrl: './event-calculator-modal.component.html',
  styleUrls: ['./event-calculator-modal.component.scss']
})
export class EventCalculatorModalComponent implements OnInit {
  private cart = inject(CartService);

  @Output() dismissModal = new EventEmitter<void>();
  @Output() openExpressQr = new EventEmitter<{ title: string; items: { name: string; aisle: string; qty?: string }[]; total: number }>();

  readonly selectedEvent = signal<EventType>('asado');
  readonly selectedRange = signal<GuestRange>('6-10');
  readonly addedToCartSuccess = signal<boolean>(false);

  // Lista de IDs de productos activos en el cálculo
  readonly selectedItemIds = signal<number[]>([]);

  // Producto recientemente quitado para sugerir compensación / adición
  readonly lastRemovedItem = signal<EventCatalogItem | null>(null);
  // Productos añadidos específicamente para compensar ítems eliminados
  readonly compensatedItemIds = signal<number[]>([]);

  // Modo sin alcohol activado
  readonly isAlcoholExcluded = signal<boolean>(false);

  // Estado del modal secundario de sugerencias / sustitución
  readonly showSuggestedModal = signal<boolean>(false);
  readonly selectedCategoryFilter = signal<string>('all');
  readonly replaceTargetId = signal<number | null>(null);

  ngOnInit(): void {
    this.resetToEventDefaults(this.selectedEvent());
  }

  private resetToEventDefaults(event: EventType) {
    const defaultItems = EVENT_MASTER_CATALOG.filter(item => item.defaultEvents.includes(event));
    let ids = defaultItems.map(i => i.id);

    if (this.isAlcoholExcluded()) {
      ids = ids.filter(id => {
        const item = EVENT_MASTER_CATALOG.find(i => i.id === id);
        return !item?.isAlcohol;
      });
    }

    this.selectedItemIds.set(ids);
  }

  // Detecta si actualmente hay compensación activa (porque se retiró alcohol o se activó la opción)
  readonly hasAlcoholCompensated = computed(() => {
    const ids = this.selectedItemIds();
    const hasAnyAlcohol = ids.some(id => {
      const item = EVENT_MASTER_CATALOG.find(i => i.id === id);
      return item?.isAlcohol === true;
    });
    // Se compensa si el usuario explícitamente excluyó alcohol o si no tiene ningún alcohol en lista
    return this.isAlcoholExcluded() || !hasAnyAlcohol;
  });

  // Genera automáticamente la lista de compras según evento, personas y personalizaciones
  calculateItems(): CalculatedItem[] {
    const range = this.selectedRange();
    const mult = range === '1-5' ? 1 : range === '6-10' ? 2 : 3;
    const isCompensated = this.hasAlcoholCompensated();
    const currentIds = this.selectedItemIds();

    const items: CalculatedItem[] = [];

    for (const id of currentIds) {
      const master = EVENT_MASTER_CATALOG.find(i => i.id === id);
      if (!master) continue;

      const isAlcoholComp = isCompensated && master.category === 'drinks' && !master.isAlcohol;
      const isItemCompensated = isAlcoholComp || this.compensatedItemIds().includes(master.id);

      items.push({
        id: master.id,
        name: master.name,
        category: master.category,
        quantityText: master.getQuantityText(mult, isAlcoholComp),
        aisle: master.aisle,
        aisleNum: master.aisleNum,
        unitPrice: master.unitPrice,
        totalPrice: master.getTotalPrice(mult, isAlcoholComp),
        isAlcohol: master.isAlcohol,
        isCompensated: isItemCompensated
      });
    }

    return items;
  }

  totalEstimated(): number {
    return this.calculateItems().reduce((sum, item) => sum + item.totalPrice, 0);
  }

  setEvent(type: EventType) {
    this.selectedEvent.set(type);
    this.addedToCartSuccess.set(false);
    this.lastRemovedItem.set(null);
    this.compensatedItemIds.set([]);
    this.resetToEventDefaults(type);
  }

  setRange(range: GuestRange) {
    this.selectedRange.set(range);
    this.addedToCartSuccess.set(false);
  }

  // Alternar modo "Sin Alcohol" con compensación automática
  toggleAlcoholExclusion() {
    const newState = !this.isAlcoholExcluded();
    this.isAlcoholExcluded.set(newState);

    if (newState) {
      // Quitar productos con alcohol
      const filtered = this.selectedItemIds().filter(id => {
        const item = EVENT_MASTER_CATALOG.find(i => i.id === id);
        return !item?.isAlcohol;
      });
      this.selectedItemIds.set(filtered);
    } else {
      // Restaurar alcohol por defecto si no está
      const defaultAlcohol = EVENT_MASTER_CATALOG.filter(
        i => i.defaultEvents.includes(this.selectedEvent()) && i.isAlcohol
      );
      const current = [...this.selectedItemIds()];
      for (const al of defaultAlcohol) {
        if (!current.includes(al.id)) {
          current.push(al.id);
        }
      }
      this.selectedItemIds.set(current);
    }
  }

  // Sugerencias inteligentes para compensar el producto eliminado
  readonly removalCompensationSuggestions = computed<EventCatalogItem[]>(() => {
    const removed = this.lastRemovedItem();
    if (!removed) return [];

    const currentIds = this.selectedItemIds();
    const event = this.selectedEvent();
    const isAlcoholOff = this.isAlcoholExcluded();

    // 1. Buscar candidatos de la misma categoría no incluidos
    let candidates = EVENT_MASTER_CATALOG.filter(item => {
      if (item.id === removed.id) return false;
      if (currentIds.includes(item.id)) return false;
      if (isAlcoholOff && item.isAlcohol) return false;
      return item.category === removed.category;
    });

    // Si son 'sides' o 'protein' y faltan candidatos, incluir de la otra categoría alimenticia
    if (candidates.length < 3 && (removed.category === 'sides' || removed.category === 'protein')) {
      const altCategory: EventCategory = removed.category === 'sides' ? 'protein' : 'sides';
      const complementary = EVENT_MASTER_CATALOG.filter(item => {
        if (item.id === removed.id) return false;
        if (currentIds.includes(item.id)) return false;
        if (isAlcoholOff && item.isAlcohol) return false;
        return item.category === altCategory;
      });
      candidates = [...candidates, ...complementary];
    }

    // Priorizar productos del evento actual o generales
    candidates.sort((a, b) => {
      const aMatches = a.defaultEvents.includes(event) ? 1 : 0;
      const bMatches = b.defaultEvents.includes(event) ? 1 : 0;
      return bMatches - aMatches;
    });

    return candidates.slice(0, 3);
  });

  // Opción principal sugerida de 1 toque
  readonly topCompensationSuggestion = computed<EventCatalogItem | null>(() => {
    const suggestions = this.removalCompensationSuggestions();
    return suggestions.length > 0 ? suggestions[0] : null;
  });

  // Quitar un producto de la lista y activar sugerencias de compensación
  removeItem(id: number) {
    const item = EVENT_MASTER_CATALOG.find(i => i.id === id);
    const updated = this.selectedItemIds().filter(itemId => itemId !== id);
    this.selectedItemIds.set(updated);

    if (item) {
      this.lastRemovedItem.set(item);
    }

    // Si el usuario quitó el último producto con alcohol, activar bandera
    if (item?.isAlcohol) {
      const remainingAlcohol = updated.some(itemId => {
        const found = EVENT_MASTER_CATALOG.find(i => i.id === itemId);
        return found?.isAlcohol;
      });
      if (!remainingAlcohol) {
        this.isAlcoholExcluded.set(true);
      }
    }
  }

  // Aplicar compensación agregando un ítem sugerido
  applyRemovalCompensation(suggestedItem: EventCatalogItem) {
    const current = [...this.selectedItemIds()];
    if (!current.includes(suggestedItem.id)) {
      current.push(suggestedItem.id);
      this.selectedItemIds.set(current);
    }
    const compensated = [...this.compensatedItemIds()];
    if (!compensated.includes(suggestedItem.id)) {
      compensated.push(suggestedItem.id);
      this.compensatedItemIds.set(compensated);
    }
    this.lastRemovedItem.set(null);
  }

  // Deshacer la eliminación del último producto
  undoLastRemoval() {
    const removed = this.lastRemovedItem();
    if (!removed) return;
    const current = [...this.selectedItemIds()];
    if (!current.includes(removed.id)) {
      current.push(removed.id);
      this.selectedItemIds.set(current);
    }
    this.lastRemovedItem.set(null);
  }

  // Descartar sugerencias de compensación
  dismissRemovalPrompt() {
    this.lastRemovedItem.set(null);
  }

  // Iniciar cambio/reemplazo de producto
  openReplaceModal(targetId: number) {
    this.replaceTargetId.set(targetId);
    const target = EVENT_MASTER_CATALOG.find(i => i.id === targetId);
    this.selectedCategoryFilter.set(target ? target.category : 'all');
    this.showSuggestedModal.set(true);
  }

  // Abrir catálogo sugerido para agregar productos adicionales
  openAddSuggestedModal(category?: string) {
    this.replaceTargetId.set(null);
    this.selectedCategoryFilter.set(category ?? 'all');
    this.showSuggestedModal.set(true);
  }

  closeSuggestedModal() {
    this.showSuggestedModal.set(false);
    this.replaceTargetId.set(null);
  }

  // Filtrado de productos disponibles para agregar/sustituir
  getSuggestedCatalog(): EventCatalogItem[] {
    const event = this.selectedEvent();
    const filter = this.selectedCategoryFilter();
    const isAlcoholOff = this.isAlcoholExcluded();

    return EVENT_MASTER_CATALOG.filter(item => {
      // Filtrar alcohol si está excluido
      if (isAlcoholOff && item.isAlcohol) return false;

      // Filtrar por categoría si no es 'all'
      if (filter !== 'all' && item.category !== filter) return false;

      // Mostrar productos relevantes al evento o genéricos
      const matchesEvent = item.defaultEvents.includes(event) || item.defaultEvents.length === 0;
      return matchesEvent;
    });
  }

  // Seleccionar producto del catálogo sugerido
  selectSuggestedProduct(item: EventCatalogItem) {
    const replaceId = this.replaceTargetId();
    const current = [...this.selectedItemIds()];

    if (replaceId !== null) {
      // Modo Reemplazo
      const index = current.indexOf(replaceId);
      if (index !== -1) {
        current[index] = item.id;
      } else {
        current.push(item.id);
      }
    } else {
      // Modo Adición
      if (!current.includes(item.id)) {
        current.push(item.id);
      }
    }

    this.selectedItemIds.set(current);
    this.closeSuggestedModal();
  }

  isItemInList(id: number): boolean {
    return this.selectedItemIds().includes(id);
  }

  triggerExpressQr() {
    const items = this.calculateItems().map(i => ({
      name: i.name,
      aisle: i.aisle,
      qty: i.quantityText
    }));
    const eventName = this.selectedEvent() === 'asado'
      ? 'Asado / 18 de Septiembre'
      : this.selectedEvent() === 'cumple'
      ? 'Cumpleaños Infantil'
      : 'Juntada / Fiesta';

    this.openExpressQr.emit({
      title: `Lista para ${eventName} (${this.selectedRange()} personas)`,
      items,
      total: this.totalEstimated()
    });
  }

  addAllToCart() {
    const items = this.calculateItems();
    for (const item of items) {
      this.cart.add({
        id: item.id,
        name: item.name,
        brand: 'Selección Evento',
        price: item.totalPrice,
        image: 'assets/icon/favicon.png',
        barcode: `EV-${item.id}`,
        category: 'Eventos'
      }, 1);
    }
    this.addedToCartSuccess.set(true);
    setTimeout(() => this.addedToCartSuccess.set(false), 4000);
  }

  onDismiss() {
    this.dismissModal.emit();
  }
}
