import { Injectable } from '@angular/core';
import { NutritionFacts, NutritionResult } from '../models/nutrition.model';

const API_URL = 'https://world.openfoodfacts.org/api/v2/product/';
const FIELDS = 'status,code,product_name,product_name_es,brands,image_url,nutriscore_grade,nova_group,serving_size,nutriments';
const TIMEOUT_MS = 10000;

/**
 * Aporte nutricional por código de barras, con datos reales y gratis de
 * Open Food Facts (world.openfoodfacts.org), sin necesidad de API key.
 * Cubre lo que pidió el profesor sin inventar datos: si el código no está
 * en su base (frecuente con códigos de catálogo de prueba), se informa
 * "sin datos" en vez de mostrar algo inventado.
 */
@Injectable({
  providedIn: 'root'
})
export class NutritionService {
  private readonly cache = new Map<string, NutritionResult>();

  async getByBarcode(barcode: string): Promise<NutritionResult> {
    const code = barcode.trim();
    if (!code) return { status: 'error', barcode: code };

    const cached = this.cache.get(code);
    if (cached) return cached;

    const result = await this.fetchByBarcode(code);
    this.cache.set(code, result);
    return result;
  }

  private async fetchByBarcode(code: string): Promise<NutritionResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${API_URL}${encodeURIComponent(code)}.json?fields=${FIELDS}`, {
        signal: controller.signal,
      });

      // Open Food Facts responde 404 (con status:0 en el cuerpo) cuando el
      // código no existe en su base; no es un error de red.
      if (!response.ok && response.status !== 404) {
        return { status: 'error', barcode: code };
      }

      const data = await response.json();
      if (data?.status !== 1 || !data.product) {
        return { status: 'not-found', barcode: code };
      }

      return { status: 'found', facts: toFacts(code, data.product) };
    } catch {
      return { status: 'error', barcode: code };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function toFacts(barcode: string, product: Record<string, unknown>): NutritionFacts {
  const nutriments = (product['nutriments'] as Record<string, unknown>) ?? {};
  const grade = String(product['nutriscore_grade'] ?? '').toLowerCase();
  const nova = Number(product['nova_group']);

  return {
    barcode,
    productName: firstNonEmpty(product['product_name_es'], product['product_name']),
    brands: asString(product['brands']),
    imageUrl: asString(product['image_url']),
    nutriscoreGrade: (['a', 'b', 'c', 'd', 'e'] as const).includes(grade as 'a') ? (grade as NutritionFacts['nutriscoreGrade']) : undefined,
    novaGroup: nova >= 1 && nova <= 4 ? (nova as NutritionFacts['novaGroup']) : undefined,
    servingSize: asString(product['serving_size']),
    energyKcal100g: asNumber(nutriments['energy-kcal_100g']),
    fat100g: asNumber(nutriments['fat_100g']),
    saturatedFat100g: asNumber(nutriments['saturated-fat_100g']),
    carbohydrates100g: asNumber(nutriments['carbohydrates_100g']),
    sugars100g: asNumber(nutriments['sugars_100g']),
    fiber100g: asNumber(nutriments['fiber_100g']),
    proteins100g: asNumber(nutriments['proteins_100g']),
    salt100g: asNumber(nutriments['salt_100g']),
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
}

function firstNonEmpty(...values: unknown[]): string | undefined {
  for (const value of values) {
    const str = asString(value);
    if (str) return str;
  }
  return undefined;
}
