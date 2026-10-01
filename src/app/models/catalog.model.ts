// Modelo de datos del catálogo. Product es la entidad raíz; ofertas y recetas
// se relacionan por productId. Fuente actual: assets data/catalog.json
// (después se reemplaza por la API del supermercado sin tocar las páginas).

export interface ProductLocation {
  aisle: string;
  section: string;
  shelf: string;
}

export type StockStatus = 'available' | 'low' | 'out_of_stock';

export interface Product {
  id: number;
  name: string;
  brand: string;
  price: number;
  image: string;
  barcode: string;
  category: string;
  supermarketLocation?: ProductLocation;
  /** Derivados por CatalogService desde las ofertas vigentes; no vienen en el JSON. */
  inOffer?: boolean;
  offerPrice?: number;
  /** Campos para consultor de precio evolucionado y comparador */
  netContent?: string;
  unitType?: 'L' | 'kg' | 'un' | 'g' | 'ml';
  unitValue?: number;
  stockStatus?: StockStatus;
  stockCount?: number;
}

export interface Offer {
  id: number;
  productId: number;
  offerPrice: number;
  /** Fecha ISO (yyyy-mm-dd). La oferta se muestra solo si aún no vence. */
  validUntil: string;
}

export interface Recipe {
  id: number;
  name: string;
  description: string;
  mainIngredient: string;
  category: string;
  difficulty: string;
  time: string;
  ingredients: string[];
  steps: string[];
  image: string;
  /** Productos del catálogo que usa la receta. */
  productIds: number[];
}

/** Oferta lista para mostrar: la oferta unida a su producto. */
export interface OfferView {
  id: number;
  productId: number;
  product: string;
  brand: string;
  price: number;
  originalPrice: number;
  discount: number;
  category: string;
  validUntil: string;
  image: string;
}

/** Línea del carrito. Guarda una copia de los datos del producto para
 *  mostrarla sin consultar el catálogo y para que sobreviva a cambios de precio. */
export interface CartItem {
  productId: number;
  name: string;
  brand: string;
  image: string;
  /** Precio normal por unidad. */
  unitPrice: number;
  /** Precio de oferta por unidad, si estaba en oferta al agregarlo. */
  offerPrice?: number;
  qty: number;
}

export interface Catalog {
  products: Product[];
  offers: Offer[];
  recipes: Recipe[];
}
