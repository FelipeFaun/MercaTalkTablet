// services/offers.service.ts
import { Injectable } from '@angular/core';
import { WALMART_OFFERS } from '../data/offers.data';

export interface Offer {
  id: number;
  product: string;           // Usar 'product' en lugar de 'productName'
  price: number;             // Usar 'price' en lugar de 'offerPrice'
  originalPrice: number;
  discount: number;
  category: string;
  validUntil: string;
  image: string;
  // Eliminar campos que no existen en tus datos:
  // name?: string;
  // description?: string;
  // inStock?: boolean;
  // limitPerCustomer?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OffersService {
  private offers: Offer[] = WALMART_OFFERS;

  constructor() {}

  // OBTENER TODAS LAS OFERTAS
  getAllOffers(): Offer[] {
    return this.offers;
  }

  // BUSCAR OFERTAS POR TÉRMINO
  searchOffers(query: string): Offer[] {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return this.offers.filter(offer => 
      offer.product.toLowerCase().includes(lowerQuery) ||
      offer.category.toLowerCase().includes(lowerQuery)
    );
  }

  // OBTENER OFERTAS POR CATEGORÍA
  getOffersByCategory(category: string): Offer[] {
    return this.offers.filter(offer => 
      offer.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  // OBTENER OFERTAS CON MÁS DESCUENTO
  getBestOffers(): Offer[] {
    return this.offers
      .filter(offer => offer.discount > 0) // Solo ofertas con descuento real
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 5); // Top 5 ofertas
  }

  // OBTENER OFERTAS PRÓXIMAS A VENCER
  getExpiringOffers(): Offer[] {
    const today = new Date();
    return this.offers
      .filter(offer => {
        const validUntil = new Date(offer.validUntil);
        const diffTime = validUntil.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7; // Ofertas que expiran en 7 días o menos
      })
      .sort((a, b) => new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime());
  }

  // OBTENER OFERTA POR ID
  getOfferById(id: number): Offer | undefined {
    return this.offers.find(offer => offer.id === id);
  }

  // OBTENER TODAS LAS CATEGORÍAS DE OFERTAS
  getAllCategories(): string[] {
    return [...new Set(this.offers.map(offer => offer.category))];
  }

  // OBTENER OFERTAS CON DESCUENTO (excluyendo las sin descuento)
  getDiscountedOffers(): Offer[] {
    return this.offers.filter(offer => offer.discount > 0);
  }
}