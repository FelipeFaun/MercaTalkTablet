import { OfferView, Product, Recipe } from './catalog.model';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  /** Marca de tiempo (Date.now()). */
  at: number;
}

export type IntentType =
  | 'precio'
  | 'ubicacion'
  | 'ofertas'
  | 'receta'
  | 'categoria'
  | 'carrito'
  | 'general';

export type CartCommand = 'add' | 'remove' | 'total' | 'clear';

export interface CartIntent {
  command: CartCommand;
  /** Producto identificado en la frase (para add/remove). */
  product?: Product;
  /** Candidatos cuando la frase es ambigua ("agrega leche" con varias leches). */
  candidates: Product[];
  qty: number;
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
