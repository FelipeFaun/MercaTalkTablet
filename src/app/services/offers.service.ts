// services/offers.service.ts
import { Injectable, inject } from '@angular/core';
import { CatalogService } from '../core/catalog.service';
import { OfferView } from '../models/catalog.model';

/** Lo que consumen las páginas y el chat: la oferta ya unida a su producto. */
export type Offer = OfferView;

@Injectable({
  providedIn: 'root'
})
export class OffersService {
  private catalog = inject(CatalogService);

  // OBTENER TODAS LAS OFERTAS VIGENTES
  getAllOffers(): Offer[] {
    return this.catalog.getActiveOffers();
  }

  // BUSCAR OFERTAS POR TÉRMINO
  searchOffers(query: string): Offer[] {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return this.getAllOffers().filter(offer =>
      offer.product.toLowerCase().includes(lowerQuery) ||
      offer.brand.toLowerCase().includes(lowerQuery) ||
      offer.category.toLowerCase().includes(lowerQuery)
    );
  }

  // OBTENER OFERTAS POR CATEGORÍA
  getOffersByCategory(category: string): Offer[] {
    return this.getAllOffers().filter(offer =>
      offer.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  // OBTENER OFERTAS CON MÁS DESCUENTO
  getBestOffers(): Offer[] {
    return this.getAllOffers()
      .filter(offer => offer.discount > 0)
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 5); // Top 5 ofertas
  }

  // OBTENER OFERTAS PRÓXIMAS A VENCER (7 días o menos)
  getExpiringOffers(): Offer[] {
    const today = new Date();
    return this.getAllOffers()
      .filter(offer => {
        const validUntil = new Date(offer.validUntil);
        const diffDays = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      })
      .sort((a, b) => new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime());
  }

  // OBTENER OFERTA POR ID
  getOfferById(id: number): Offer | undefined {
    return this.getAllOffers().find(offer => offer.id === id);
  }

  // OBTENER OFERTA DE UN PRODUCTO
  getOfferForProduct(productId: number): Offer | undefined {
    return this.getAllOffers().find(offer => offer.productId === productId);
  }

  // OBTENER TODAS LAS CATEGORÍAS DE OFERTAS
  getAllCategories(): string[] {
    return [...new Set(this.getAllOffers().map(offer => offer.category))];
  }
}
