/** Aporte nutricional de un producto, tal como lo entrega Open Food Facts. */
export interface NutritionFacts {
  barcode: string;
  /** Nombre real del producto en Open Food Facts (puede diferir del nombre local). */
  productName?: string;
  brands?: string;
  imageUrl?: string;
  /** A (mejor) a E (peor). Escala oficial Nutri-Score. */
  nutriscoreGrade?: 'a' | 'b' | 'c' | 'd' | 'e';
  /** 1 (poco procesado) a 4 (ultraprocesado). Clasificación NOVA. */
  novaGroup?: 1 | 2 | 3 | 4;
  /** Base de los valores nutricionales, normalmente "100g". */
  servingSize?: string;
  energyKcal100g?: number;
  fat100g?: number;
  saturatedFat100g?: number;
  carbohydrates100g?: number;
  sugars100g?: number;
  fiber100g?: number;
  proteins100g?: number;
  salt100g?: number;
}

export type NutritionResult =
  | { status: 'found'; facts: NutritionFacts }
  | { status: 'not-found'; barcode: string }
  | { status: 'error'; barcode: string };
