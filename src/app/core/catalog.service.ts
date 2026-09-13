import { Injectable } from '@angular/core';
import catalogJson from '../data/catalog.json';
import { Catalog, Offer, OfferView, Product, Recipe } from '../models/catalog.model';

/**
 * Única fuente de datos de productos, ofertas y recetas.
 * Hoy lee data/catalog.json; cuando exista la API del supermercado solo
 * cambia este servicio.
 */
@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private readonly catalog: Catalog = catalogJson as Catalog;

  // OFERTAS VIGENTES (validUntil >= hoy) UNIDAS A SU PRODUCTO
  getActiveOffers(today: Date = new Date()): OfferView[] {
    const todayIso = toIsoDate(today);
    return this.catalog.offers
      .filter(offer => offer.validUntil >= todayIso)
      .map(offer => this.toOfferView(offer))
      .filter((view): view is OfferView => view !== null);
  }

  // PRODUCTOS CON inOffer / offerPrice CALCULADOS DESDE LAS OFERTAS VIGENTES
  getProducts(): Product[] {
    const offerByProduct = new Map<number, OfferView>();
    for (const offer of this.getActiveOffers()) {
      offerByProduct.set(offer.productId, offer);
    }
    return this.catalog.products.map(product => {
      const offer = offerByProduct.get(product.id);
      return offer
        ? { ...product, inOffer: true, offerPrice: offer.price }
        : { ...product, inOffer: false };
    });
  }

  getProductById(id: number): Product | undefined {
    return this.getProducts().find(product => product.id === id);
  }

  getRecipes(): Recipe[] {
    return this.catalog.recipes;
  }

  // PRODUCTOS QUE USA UNA RECETA
  getRecipeProducts(recipe: Recipe): Product[] {
    const products = this.getProducts();
    return recipe.productIds
      .map(id => products.find(product => product.id === id))
      .filter((product): product is Product => product !== undefined);
  }

  private toOfferView(offer: Offer): OfferView | null {
    const product = this.catalog.products.find(p => p.id === offer.productId);
    if (!product) return null;
    return {
      id: offer.id,
      productId: product.id,
      product: product.name,
      brand: product.brand,
      price: offer.offerPrice,
      originalPrice: product.price,
      discount: Math.round(((product.price - offer.offerPrice) / product.price) * 100),
      category: product.category,
      validUntil: offer.validUntil,
      image: product.image,
    };
  }
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
