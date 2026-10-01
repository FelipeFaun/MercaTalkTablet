import { Product, StockStatus } from '../models/catalog.model';

export interface ProductMetrics {
  effectivePrice: number;
  originalPrice: number;
  hasDiscount: boolean;
  discountPercentage: number;
  savingsAmount: number;
  netContent: string;
  pumText: string;
  rawUnitPrice: number;
  stockStatus: StockStatus;
  stockLabel: string;
  stockCount: number;
  locationText: string;
}

export interface CheaperAlternativeItem {
  product: Product;
  targetPrice: number;
  alternativePrice: number;
  savings: number;
  savingsPercent: number;
  pumText: string;
}

export class ProductHelper {
  /**
   * Obtiene el precio efectivo (oferta si aplica, o normal).
   */
  static getEffectivePrice(product: Product): number {
    return product.inOffer && product.offerPrice !== undefined && product.offerPrice > 0
      ? product.offerPrice
      : product.price;
  }

  /**
   * Extrae o normaliza el contenido neto de un producto.
   */
  static getNetContent(product: Product): string {
    if (product.netContent && product.netContent.trim()) {
      return product.netContent;
    }

    const name = product.name;
    const match = name.match(/(\d+(?:[.,]\d+)?)\s*(l|lt|litro|litros|ml|cc|kg|kilo|kilos|g|gr|gramos|un|unidades)\b/i);
    if (match) {
      const val = match[1];
      const unit = match[2].toUpperCase();
      if (unit.startsWith('L') || unit === 'LT' || unit.startsWith('LITRO')) return `${val} L`;
      if (unit === 'ML' || unit === 'CC') return `${val} ml`;
      if (unit.startsWith('K') || unit.startsWith('KILO')) return `${val} kg`;
      if (unit.startsWith('G') || unit.startsWith('GR') || unit.startsWith('GRAMO')) return `${val} g`;
      return `${val} un`;
    }

    const cat = product.category.toLowerCase();
    if (cat.includes('lácteo') || cat.includes('bebida') || cat.includes('jugo') || cat.includes('agua')) {
      return '1 L';
    }
    if (cat.includes('abarrote') || cat.includes('arroz') || cat.includes('harina') || cat.includes('azúcar') || cat.includes('carne')) {
      return '1 kg';
    }
    if (cat.includes('limpieza') || cat.includes('detergente')) {
      return '1 L';
    }
    return '1 un';
  }

  /**
   * Calcula el Precio por Unidad de Medida (PUM) estándar ($/L o $/kg).
   */
  static calculatePUM(product: Product): { text: string; rawValue: number; unit: string } {
    const price = this.getEffectivePrice(product);
    const content = this.getNetContent(product);

    const match = content.match(/(\d+(?:[.,]\d+)?)\s*(l|ml|kg|g|un)/i);
    if (!match) {
      return { text: `$${price.toLocaleString('es-CL')} / un`, rawValue: price, unit: 'un' };
    }

    const value = parseFloat(match[1].replace(',', '.'));
    const unit = match[2].toLowerCase();

    let standardUnit = 'un';
    let standardFactor = 1;

    if (unit === 'l') {
      standardUnit = 'L';
      standardFactor = value;
    } else if (unit === 'ml') {
      standardUnit = 'L';
      standardFactor = value / 1000;
    } else if (unit === 'kg') {
      standardUnit = 'kg';
      standardFactor = value;
    } else if (unit === 'g') {
      standardUnit = 'kg';
      standardFactor = value / 1000;
    } else {
      standardUnit = 'un';
      standardFactor = value || 1;
    }

    const rawUnitPrice = Math.round(price / (standardFactor || 1));
    const formattedPrice = `$${rawUnitPrice.toLocaleString('es-CL')}`;

    return {
      text: `${formattedPrice}/${standardUnit}`,
      rawValue: rawUnitPrice,
      unit: standardUnit
    };
  }

  /**
   * Genera el desglose de métricas completo para la vista Kiosk y Comparador.
   */
  static getMetrics(product: Product): ProductMetrics {
    const effectivePrice = this.getEffectivePrice(product);
    const originalPrice = product.price;
    const hasDiscount = Boolean(product.inOffer && product.offerPrice && product.offerPrice < product.price);
    const discountPercentage = hasDiscount
      ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100)
      : 0;
    const savingsAmount = hasDiscount ? originalPrice - effectivePrice : 0;
    const netContent = this.getNetContent(product);
    const pum = this.calculatePUM(product);

    const stockStatus = product.stockStatus || 'available';
    const stockCount = product.stockCount ?? (stockStatus === 'out_of_stock' ? 0 : (stockStatus === 'low' ? 3 : 18));
    
    let stockLabel = 'Disponible';
    if (stockStatus === 'out_of_stock' || stockCount === 0) {
      stockLabel = 'Agotado';
    } else if (stockStatus === 'low' || stockCount <= 5) {
      stockLabel = `Últimas ${stockCount} unidades`;
    } else {
      stockLabel = `Disponible (${stockCount} un.)`;
    }

    const loc = product.supermarketLocation;
    const locationText = loc
      ? `${loc.aisle} · ${loc.section} · ${loc.shelf}`
      : 'Ubicación central en sala';

    return {
      effectivePrice,
      originalPrice,
      hasDiscount,
      discountPercentage,
      savingsAmount,
      netContent,
      pumText: pum.text,
      rawUnitPrice: pum.rawValue,
      stockStatus,
      stockLabel,
      stockCount,
      locationText
    };
  }

  /**
   * Encuentra alternativas estrictamente más baratas en la misma categoría o tipo de producto.
   * Calcula el ahorro nominal ($) y el porcentaje de ahorro (%).
   */
  static findCheaperAlternatives(targetProduct: Product, allProducts: Product[], limit: number = 4): CheaperAlternativeItem[] {
    const targetPrice = this.getEffectivePrice(targetProduct);
    const targetCat = targetProduct.category.toLowerCase();

    // Palabras relevantes del producto para afinar búsqueda si es específico (ej: "sin lactosa", "arroz")
    const isSinLactosa = /sin lactosa/i.test(targetProduct.name);

    const candidates = allProducts.filter(p => {
      if (p.id === targetProduct.id) return false;
      const pPrice = this.getEffectivePrice(p);
      if (pPrice >= targetPrice) return false; // Solo más baratas

      if (isSinLactosa) {
        return /sin lactosa/i.test(p.name);
      }

      return p.category.toLowerCase() === targetCat;
    });

    // Ordenar de mayor ahorro a menor (el más barato primero)
    candidates.sort((a, b) => this.getEffectivePrice(a) - this.getEffectivePrice(b));

    return candidates.slice(0, limit).map(alt => {
      const altPrice = this.getEffectivePrice(alt);
      const savings = targetPrice - altPrice;
      const savingsPercent = Math.round((savings / targetPrice) * 100);
      const pum = this.calculatePUM(alt);

      return {
        product: alt,
        targetPrice,
        alternativePrice: altPrice,
        savings,
        savingsPercent,
        pumText: pum.text
      };
    });
  }
}
