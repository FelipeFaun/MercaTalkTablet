import { Injectable, inject } from '@angular/core';
import { OfferView, Product, Recipe } from '../models/catalog.model';
import { CATALOG_TRANSLATIONS, CatalogTranslation } from './i18n/catalog-translations';
import { LanguageService } from './language.service';

const AISLE_OR_SHELF = /^(Pasillo|Estante)\s+(.+)$/;

/**
 * Muestra los datos del catálogo (que viven en español) en el idioma activo.
 * Lee el idioma en cada llamada: usado desde plantillas o computed(), el texto
 * cambia al instante cuando el cliente cambia de idioma.
 */
@Injectable({
  providedIn: 'root'
})
export class CatalogI18nService {
  private readonly language = inject(LanguageService);

  /** Nombre del producto en el idioma activo (o el original si no hay traducción) */
  productName(id: number | null | undefined, fallback: string): string {
    if (id == null) return fallback;
    return this.dictionary()?.products[id] ?? fallback;
  }

  /**
   * Categorías, secciones, pasillos ("Pasillo 3"), estantes ("Estante 2") y
   * combinaciones como "Pasillo 6 · Carnicería".
   */
  term(text: string | null | undefined): string {
    if (!text) return text ?? '';
    const dictionary = this.dictionary();
    if (!dictionary) return text;
    if (text.includes(' · ')) {
      return text.split(' · ').map(part => this.term(part)).join(' · ');
    }
    const exact = dictionary.terms[text];
    if (exact) return exact;
    const match = AISLE_OR_SHELF.exec(text);
    if (match) {
      return `${this.language.t(match[1] === 'Pasillo' ? 'catalog.aisle' : 'catalog.shelf')} ${match[2]}`;
    }
    return text;
  }

  /** Cantidades armadas en el código, como "2 bolsa(s)" o "1 un (10 porc.)" */
  quantity(text: string | null | undefined): string {
    if (!text) return text ?? '';
    const dictionary = this.dictionary();
    if (!dictionary) return text;
    return dictionary.units.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text);
  }

  /** Copia del producto con nombre, categoría y ubicación traducidos */
  product<T extends Product>(product: T): T {
    if (!this.dictionary()) return product;
    const location = product.supermarketLocation;
    return {
      ...product,
      name: this.productName(product.id, product.name),
      category: this.term(product.category),
      supermarketLocation: location && {
        aisle: this.term(location.aisle),
        section: this.term(location.section),
        shelf: this.term(location.shelf),
      },
    };
  }

  offer(offer: OfferView): OfferView {
    if (!this.dictionary()) return offer;
    return {
      ...offer,
      product: this.productName(offer.productId, offer.product),
      category: this.term(offer.category),
    };
  }

  recipe(recipe: Recipe): Recipe {
    const translation = this.dictionary()?.recipes[recipe.id];
    if (!translation) return recipe;
    return {
      ...recipe,
      ...translation,
      category: this.term(recipe.category),
      difficulty: this.term(recipe.difficulty),
    };
  }

  private dictionary(): CatalogTranslation | undefined {
    return CATALOG_TRANSLATIONS[this.language.currentLang()];
  }
}
