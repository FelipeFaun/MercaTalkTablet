import { Injectable, inject } from '@angular/core';
import { CatalogService } from './catalog.service';
import { OfferView, Product, Recipe } from '../models/catalog.model';
import { CartCommand, CartIntent, Intent, IntentType } from '../models/chat.model';

/**
 * Entiende lo que pide la persona y busca en el catálogo.
 * Sale de HomePage (M3). Búsqueda por tokens: cada palabra de la frase que
 * coincide con algún producto debe estar en el resultado, así "leche soprole"
 * o "arroz tucapel grado 1" encuentran el producto exacto (C3).
 */
@Injectable({
  providedIn: 'root'
})
export class IntentService {
  private catalog = inject(CatalogService);

  analyze(message: string): Intent {
    const normalized = normalize(message);
    const cart = this.detectCart(normalized, message);
    if (cart) {
      return { type: 'carrito', normalized, products: [], offers: [], recipes: [], cart };
    }

    const type = this.detectType(normalized);
    const products = this.searchProducts(normalized);

    const intent: Intent = { type, normalized, products: [], offers: [], recipes: [] };

    switch (type) {
      case 'mas_barato':
        intent.products = products.slice(0, 4);
        break;
      case 'comparar':
        intent.products = products.slice(0, 3);
        break;
      case 'precio':
      case 'ubicacion':
        intent.products = products.slice(0, 5);
        break;
      case 'categoria':
        intent.products = products.slice(0, 3);
        break;
      case 'ofertas':
        intent.offers = this.searchOffers(normalized);
        break;
      case 'receta':
        intent.recipes = this.searchRecipes(normalized);
        break;
      default:
        // Aunque no pregunte el precio, si nombra un producto conviene dar el dato
        intent.products = products.slice(0, 3);
    }
    return intent;
  }

  // BÚSQUEDA POR TOKENS SOBRE NOMBRE + MARCA + CATEGORÍA
  searchProducts(message: string): Product[] {
    const products = this.catalog.getProducts();
    const tokens = tokenize(message).filter(token => !STOPWORDS.has(token));
    if (tokens.length === 0) return [];

    const indexed = products.map(product => ({
      product,
      words: tokenize(`${product.name} ${product.brand} ${product.category}`),
    }));

    // Solo cuentan los tokens que existen en algún producto ("la", "hola" se descartan solos)
    const relevant = tokens.filter(token => indexed.some(entry => matchesWord(entry.words, token)));
    if (relevant.length === 0) return [];

    return indexed
      .filter(entry => relevant.every(token => matchesWord(entry.words, token)))
      // Menos palabras "extra" = coincidencia más exacta primero
      .sort((a, b) => a.words.length - b.words.length)
      .map(entry => entry.product);
  }

  private searchOffers(message: string): OfferView[] {
    const products = this.searchProducts(message);
    const all = this.catalog.getActiveOffers();
    if (products.length > 0) {
      const ids = new Set(products.map(product => product.id));
      const matching = all.filter(offer => ids.has(offer.productId));
      if (matching.length > 0) return matching.slice(0, 5);
    }
    return [...all].sort((a, b) => b.discount - a.discount).slice(0, 5);
  }

  private searchRecipes(message: string): Recipe[] {
    const all = this.catalog.getRecipes();
    const tokens = tokenize(message).filter(token => !STOPWORDS.has(token) && !RECIPE_WORDS.has(token));
    const matching = all.filter(recipe => {
      const words = tokenize(`${recipe.name} ${recipe.mainIngredient} ${recipe.category} ${recipe.ingredients.join(' ')}`);
      return tokens.some(token => matchesWord(words, token));
    });
    return (matching.length > 0 ? matching : all).slice(0, 2);
  }

  private detectType(normalized: string): IntentType {
    if (hasAny(normalized, CHEAPER_WORDS)) return 'mas_barato';
    if (hasAny(normalized, COMPARE_WORDS)) return 'comparar';
    if (hasAny(normalized, OFFER_WORDS)) return 'ofertas';
    if (hasAny(normalized, RECIPE_WORDS)) return 'receta';
    if (hasAny(normalized, PRICE_WORDS)) return 'precio';
    if (hasAny(normalized, LOCATION_WORDS)) return 'ubicacion';
    if (hasAny(normalized, CATEGORY_WORDS)) return 'categoria';
    return 'general';
  }

  // ÓRDENES SOBRE EL CARRITO: "agrega dos leches", "cuánto llevo", "saca el arroz",
  // "tengo 30 mil de presupuesto" (Fase 3: presupuesto)
  private detectCart(normalized: string, raw: string): CartIntent | null {
    const command = this.detectCartCommand(normalized);
    if (!command) return null;

    if (command === 'total' || command === 'clear' || command === 'clearBudget') {
      return { command, candidates: [], qty: 0 };
    }
    if (command === 'setBudget') {
      // El texto sin normalizar conserva "30.000"; normalize() convierte el punto en espacio.
      return { command, candidates: [], qty: 0, amount: parseAmount(raw) ?? undefined };
    }

    const qty = parseQty(normalized);
    const candidates = this.searchProducts(singularize(normalized));
    const product = candidates.length === 1 ? candidates[0] : undefined;
    return { command, product, candidates, qty };
  }

  private detectCartCommand(normalized: string): CartCommand | null {
    // El presupuesto se revisa antes que quitar/agregar: "quita mi presupuesto"
    // no debe leerse como "quita [producto]".
    if (hasAny(normalized, CART_BUDGET_CLEAR_WORDS)) return 'clearBudget';
    if (hasAny(normalized, CART_BUDGET_SET_WORDS)) return 'setBudget';
    if (hasAny(normalized, CART_CLEAR_WORDS)) return 'clear';
    // Los verbos explícitos mandan: "agrega leche a mi compra" es agregar, no "ver mi compra"
    if (hasAny(normalized, CART_REMOVE_WORDS)) return 'remove';
    if (hasAny(normalized, CART_ADD_WORDS)) return 'add';
    if (hasAny(normalized, CART_TOTAL_WORDS)) return 'total';
    return null;
  }
}

// ---------- utilidades de texto (exportadas para tests y otros servicios) ----------

/** Minúsculas, sin tildes ni signos, espacios simples. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita las tildes separadas por NFD
    .replace(/[¿?¡!.,;:()"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  return normalize(text).split(' ').filter(token => token.length > 0);
}

function matchesWord(words: string[], token: string): boolean {
  return words.some(word => {
    if (word === token) return true;
    // prefijos para plurales y variantes: "leches" ~ "leche", "yogur" ~ "yogurt"
    const shorter = word.length < token.length ? word : token;
    const longer = word.length < token.length ? token : word;
    return shorter.length >= 4 && longer.startsWith(shorter);
  });
}

function hasAny(text: string, words: Set<string>): boolean {
  const padded = ` ${text} `;
  const tokens = new Set(tokenize(text));
  for (const word of words) {
    // las frases se comparan por palabras completas: "cuanto va" no debe coincidir con "cuanto vale"
    if (word.includes(' ') ? padded.includes(` ${word} `) : tokens.has(word)) return true;
  }
  return false;
}

/** "dos leches" -> 2; "3 yogures" -> 3; sin número -> 1 */
export function parseQty(normalized: string): number {
  const digits = normalized.match(/\b(\d{1,2})\b/);
  if (digits) return Math.max(1, parseInt(digits[1], 10));
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(normalized)) return value;
  }
  return 1;
}

/**
 * Monto en pesos de una frase de presupuesto: "30.000" / "30000" / "$30000" -> 30000;
 * "30 mil" o "treinta mil" -> 30000. Recibe el texto SIN pasar por normalize()
 * (que convertiría el punto de "30.000" en un espacio); esta función hace su
 * propio lowercase para las palabras. null si no se encontró ningún número.
 */
export function parseAmount(text: string): number | null {
  const digits = text.match(/\$?\s?(\d{1,3}(?:[.,]\d{3})+|\d{4,7})/);
  if (digits) {
    const value = parseInt(digits[1].replace(/[.,]/g, ''), 10);
    if (value > 0) return value;
  }

  const lower = text.toLowerCase();
  const numericThousands = lower.match(/\b(\d{1,3})\s*mil\b/);
  if (numericThousands) return parseInt(numericThousands[1], 10) * 1000;

  for (const [word, value] of Object.entries(TEN_WORDS)) {
    if (new RegExp(`\\b${word}\\s*mil\\b`).test(lower)) return value * 1000;
  }
  return null;
}

/** Quita plurales simples para que "leches" encuentre "leche". */
function singularize(normalized: string): string {
  return tokenize(normalized)
    .map(token => (token.length > 4 && token.endsWith('es') ? token.slice(0, -2) : token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token))
    .join(' ');
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, media: 1, medio: 1, docena: 12,
};

/** Decenas habladas para montos redondos: "treinta mil" -> 30 * 1000. */
const TEN_WORDS: Record<string, number> = {
  diez: 10, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50,
  sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100,
};

const STOPWORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'a', 'al', 'en',
  'con', 'sin', 'por', 'para', 'que', 'es', 'son', 'hay', 'esta', 'estan', 'tiene', 'tienen',
  'me', 'mi', 'tu', 'te', 'lo', 'se', 'su', 'sus', 'ya', 'si', 'no', 'muy', 'mas', 'menos',
  'cuanto', 'cuanta', 'cuantos', 'cuantas', 'cuesta', 'cuestan', 'vale', 'valen', 'valor', 'precio', 'precios',
  'donde', 'esta', 'encuentro', 'queda', 'ubicacion', 'pasillo', 'estante', 'seccion',
  'quiero', 'dame', 'muestrame', 'busca', 'buscar', 'ver', 'saber', 'necesito', 'tengo',
  'hola', 'liderin', 'por', 'favor', 'gracias', 'oye', 'dime', 'cual', 'cuales', 'como',
  'agrega', 'agregar', 'agregame', 'anade', 'anadir', 'pon', 'ponme', 'suma', 'sumame', 'echa', 'echame', 'mete', 'meteme',
  'quita', 'quitame', 'saca', 'sacame', 'elimina', 'borra', 'carrito', 'compra', 'lista', 'llevo',
  'oferta', 'ofertas', 'descuento', 'descuentos', 'promocion', 'promociones', 'rebaja', 'barato', 'barata',
  'receta', 'recetas', 'cocinar', 'preparar', 'hacer', 'cocina', 'plato', 'comida',
  ...Object.keys(NUMBER_WORDS),
]);

const CHEAPER_WORDS = new Set(['mas barata', 'mas barato', 'mas baratas', 'mas baratos', 'mas economica', 'mas economico', 'mas economicas', 'mas economicos', 'hay una mas barata', 'hay uno mas barato', 'algo mas barato', 'algo mas barata', 'opcion mas barata', 'opciones mas baratas', 'alternativa mas barata', 'ahorro', 'ahorrar', 'menos cara', 'menos caro']);
const COMPARE_WORDS = new Set(['compara', 'comparar', 'comparame', 'comparativa', 'vs', 'versus', 'diferencia entre']);

const PRICE_WORDS = new Set(['precio', 'precios', 'cuanto', 'cuanta', 'cuantos', 'cuesta', 'cuestan', 'vale', 'valen', 'valor', 'caro', 'cara']);
const LOCATION_WORDS = new Set(['donde', 'ubicacion', 'ubicado', 'ubicada', 'pasillo', 'estante', 'seccion', 'encuentro', 'queda', 'quedan']);
const OFFER_WORDS = new Set(['oferta', 'ofertas', 'descuento', 'descuentos', 'promocion', 'promociones', 'rebaja', 'rebajas', 'barato', 'barata', 'economico', 'economica']);
const CATEGORY_WORDS = new Set(['tipos', 'clases', 'variedades', 'categorias', 'todas las', 'todos los', 'que hay']);
const RECIPE_WORDS = new Set(['receta', 'recetas', 'cocinar', 'preparar', 'cocina', 'plato', 'como hacer', 'preparacion', 'almuerzo', 'cena', 'once']);

const CART_ADD_WORDS = new Set(['agrega', 'agregar', 'agregame', 'anade', 'anadir', 'anademe', 'pon', 'ponme', 'suma', 'sumame', 'echa', 'echame', 'mete', 'meteme', 'me llevo', 'llevar', 'llevare', 'al carrito', 'a mi compra', 'a la compra']);
const CART_REMOVE_WORDS = new Set(['quita', 'quitame', 'saca', 'sacame', 'elimina', 'eliminame', 'borra', 'borrame', 'ya no quiero', 'sin el', 'sin la']);
const CART_TOTAL_WORDS = new Set(['cuanto llevo', 'cuanto voy', 'cuanto va', 'cuanto suma', 'total', 'que llevo', 'que tengo', 'ver mi compra', 'ver el carrito', 'muestrame mi compra', 'muestrame el carrito', 'cuanto gastare', 'cuanto gasto', 'cuanto pagare', 'cuanto pago']);
const CART_CLEAR_WORDS = new Set(['vacia el carrito', 'vaciar el carrito', 'vacia mi compra', 'vaciar mi compra', 'borra todo', 'quita todo', 'saca todo', 'empezar de nuevo', 'limpia el carrito']);

const CART_BUDGET_SET_WORDS = new Set(['presupuesto', 'quiero gastar', 'no quiero gastar mas de', 'no gastar mas de', 'gastar maximo', 'gastar como maximo', 'tengo para gastar']);
const CART_BUDGET_CLEAR_WORDS = new Set(['quita mi presupuesto', 'sin presupuesto', 'borra mi presupuesto', 'elimina mi presupuesto', 'saca mi presupuesto', 'olvida mi presupuesto', 'quitar presupuesto']);
