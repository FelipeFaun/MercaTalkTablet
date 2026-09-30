import { Injectable, inject } from '@angular/core';
import { CatalogService } from '../core/catalog.service';
import { Product } from '../models/catalog.model';

export type { Product } from '../models/catalog.model';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private catalog = inject(CatalogService);

  // Métodos existentes
  searchProducts(query: string): Product[] {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return this.getAllProducts().filter(product =>
      product.name.toLowerCase().includes(lowerQuery) ||
      product.brand.toLowerCase().includes(lowerQuery) ||
      product.category.toLowerCase().includes(lowerQuery)
    );
  }

  findProductByBarcode(barcode: string): Product | undefined {
    return this.getAllProducts().find(product => product.barcode === barcode);
  }

  getAllProducts(): Product[] {
    return this.catalog.getProducts();
  }

  getProductsOnOffer(): Product[] {
    return this.getAllProducts().filter(product => product.inOffer);
  }

  getProductsByCategory(category: string): Product[] {
    return this.getAllProducts().filter(product =>
      product.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  getProductLocation(productName: string): Product['supermarketLocation'] | null {
    const product = this.getAllProducts().find(p =>
      p.name.toLowerCase().includes(productName.toLowerCase())
    );
    return product?.supermarketLocation || null;
  }

  // NUEVO MÉTODO: Obtener productos por categorías
  getCategories(): string[] {
    const categories = this.getAllProducts().map(product => product.category);
    return [...new Set(categories)]; // Elimina duplicados
  }

  // NUEVO MÉTODO: Buscar productos similares
  getSimilarProducts(productId: number): Product[] {
    const products = this.getAllProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return [];

    return products.filter(p =>
      p.category === product.category &&
      p.id !== productId
    ).slice(0, 4); // Máximo 4 productos similares
  }

  // RECOMENDACIONES DE INTERÉS GENERAL (Para estado inicial y destacados)
  getFeaturedInterestProducts(limit: number = 6): Product[] {
    const products = this.getAllProducts();
    // Prioriza productos con oferta vigente y representatividad de distintos pasillos
    const offers = products.filter(p => p.inOffer);
    const seenAisles = new Set<string>();
    const featured: Product[] = [];

    // 1. Uno de cada pasillo en oferta
    for (const p of offers) {
      const aisle = p.supermarketLocation?.aisle || '';
      if (!seenAisles.has(aisle)) {
        seenAisles.add(aisle);
        featured.push(p);
      }
      if (featured.length >= limit) break;
    }

    // 2. Si faltan para el límite, agregar otros productos en oferta o populares
    if (featured.length < limit) {
      for (const p of products) {
        if (!featured.some(f => f.id === p.id)) {
          featured.push(p);
          if (featured.length >= limit) break;
        }
      }
    }

    return featured.slice(0, limit);
  }

  // RECOMENDACIONES INTELIGENTES CRUZADAS (Cross-selling para un producto seleccionado)
  getRecommendedForProduct(product: Product, limit: number = 4): Product[] {
    const all = this.getAllProducts();
    const currentAisle = product.supermarketLocation?.aisle || '';
    const nameLower = product.name.toLowerCase();
    const catLower = product.category.toLowerCase();

    // Mapeo inteligente de categorías complementarias
    const complementaryAisles: string[] = [];
    const targetKeywords: string[] = [];

    if (catLower.includes('lácteo') || nameLower.includes('leche') || nameLower.includes('yogur')) {
      complementaryAisles.push('Pasillo 7', 'Pasillo 3'); // Panadería, Café/Té
      targetKeywords.push('café', 'pan', 'queque', 'galletas', 'cereal');
    } else if (catLower.includes('abarrote') || catLower.includes('pasta') || nameLower.includes('fideo') || nameLower.includes('arroz')) {
      complementaryAisles.push('Pasillo 1', 'Pasillo 6'); // Queso, Salsas, Carnes
      targetKeywords.push('pomarola', 'salsa', 'queso', 'atún', 'carne');
    } else if (catLower.includes('bebida') || catLower.includes('jugo')) {
      complementaryAisles.push('Pasillo 7', 'Pasillo 9'); // Galletas, Snacks
      targetKeywords.push('galleta', 'queque', 'pan', 'pisco');
    } else if (catLower.includes('limpieza')) {
      complementaryAisles.push('Pasillo 4', 'Pasillo 8');
      targetKeywords.push('lavaloza', 'quix', 'cloro', 'papel', 'jabón');
    } else if (catLower.includes('carne') || catLower.includes('pesca') || catLower.includes('fiambr')) {
      complementaryAisles.push('Pasillo 9', 'Pasillo 5', 'Pasillo 2'); // Vinos, Ensaladas, Arroz
      targetKeywords.push('vino', 'arroz', 'tomate', 'limón', 'aceite');
    } else if (catLower.includes('panad') || catLower.includes('pastel')) {
      complementaryAisles.push('Pasillo 1', 'Pasillo 3', 'Pasillo 6'); // Mantequilla, Café, Jamón
      targetKeywords.push('mantequilla', 'manjar', 'café', 'té', 'jamón');
    } else if (catLower.includes('cuidado') || catLower.includes('bucal')) {
      complementaryAisles.push('Pasillo 8', 'Pasillo 4');
      targetKeywords.push('jabón', 'pasta', 'cepillo', 'desodorante');
    } else if (catLower.includes('vino') || catLower.includes('licor') || catLower.includes('cerveza')) {
      complementaryAisles.push('Pasillo 1', 'Pasillo 6', 'Pasillo 5'); // Quesos, Carnes, Frutos secos
      targetKeywords.push('queso', 'carne', 'jamón', 'salame', 'nueces');
    }

    const recommendations: Product[] = [];

    // 1. Buscar coincidencias por palabras clave objetivo
    if (targetKeywords.length > 0) {
      for (const p of all) {
        if (p.id === product.id) continue;
        const pName = p.name.toLowerCase();
        if (targetKeywords.some(kw => pName.includes(kw))) {
          if (!recommendations.some(r => r.id === p.id)) {
            recommendations.push(p);
            if (recommendations.length >= limit) return recommendations;
          }
        }
      }
    }

    // 2. Buscar en pasillos complementarios (priorizando los que están en oferta)
    for (const aisle of complementaryAisles) {
      const aisleItems = all.filter(p => p.supermarketLocation?.aisle === aisle && p.id !== product.id);
      for (const p of aisleItems) {
        if (!recommendations.some(r => r.id === p.id)) {
          recommendations.push(p);
          if (recommendations.length >= limit) return recommendations;
        }
      }
    }

    // 3. Fallback: productos de la misma categoría o con mejores ofertas
    const sameCat = all.filter(p => p.category === product.category && p.id !== product.id);
    for (const p of sameCat) {
      if (!recommendations.some(r => r.id === p.id)) {
        recommendations.push(p);
        if (recommendations.length >= limit) return recommendations;
      }
    }

    return recommendations.slice(0, limit);
  }

  // RECOMENDACIONES POR PASILLO (Ofertas y destacados del pasillo)
  getAisleRecommendations(aisleId: number, excludeProductId?: number, limit: number = 4): Product[] {
    const aisleTag = `Pasillo ${aisleId}`;
    const all = this.getAllProducts();
    const inAisle = all.filter(p => p.supermarketLocation?.aisle === aisleTag && p.id !== excludeProductId);
    
    // Ofertas del pasillo primero
    const sorted = [...inAisle].sort((a, b) => {
      if (a.inOffer && !b.inOffer) return -1;
      if (!a.inOffer && b.inOffer) return 1;
      return 0;
    });

    return sorted.slice(0, limit);
  }
}

