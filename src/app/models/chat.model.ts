import { OfferView, Product, Recipe } from './catalog.model';
import { CheaperAlternativeItem } from '../core/product-helper';

export interface ChatActionWidget {
  type: 
    | 'product_location'        // Para "¿Dónde está el arroz?" (mapa 3D, precio, carrito)
    | 'product_price'           // Para "¿Cuánto cuesta...?"
    | 'offers_list'             // Para "¿Qué detergentes están en oferta?"
    | 'cheaper_alternatives'    // Para "¿Hay una más barata?"
    | 'compare_ready';          // Para comparar productos
  
  title?: string;
  product?: Product;
  products?: Product[];
  offers?: OfferView[];
  referenceProduct?: Product;
  cheaperAlternatives?: CheaperAlternativeItem[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  /** Marca de tiempo (Date.now()). */
  at: number;
  /** Widget interactivo de control de tablet opcional */
  widget?: ChatActionWidget;
}

export type IntentType =
  | 'precio'
  | 'ubicacion'
  | 'ofertas'
  | 'receta'
  | 'categoria'
  | 'carrito'
  | 'mas_barato'
  | 'comparar'
  | 'general';

export type CartCommand = 'add' | 'remove' | 'total' | 'clear' | 'setBudget' | 'clearBudget';

export interface CartIntent {
  command: CartCommand;
  /** Producto identificado en la frase (para add/remove). */
  product?: Product;
  /** Candidatos cuando la frase es ambigua ("agrega leche" con varias leches). */
  candidates: Product[];
  qty: number;
  /** Monto en pesos para setBudget ("mi presupuesto es 30000"); sin número si no se entendió. */
  amount?: number;
}

/** Lo que el asistente entendió de una frase, con los datos del catálogo que aplican. */
export interface Intent {
  type: IntentType;
  /** Texto normalizado (minúsculas, sin tildes). */
  normalized: string;
  products: Product[];
  offers: OfferView[];
  recipes: Recipe[];
  cart?: CartIntent;
}
