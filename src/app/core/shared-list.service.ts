import { Injectable, inject } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { CartItem } from '../models/catalog.model';
import { BrandService } from './brand.service';
import { LanguageService } from './language.service';

/** Debe coincidir con el default de expires_at en supabase/migrations/*_shared_lists.sql */
export const SHARED_LIST_TTL_MINUTES = 30;

/**
 * Producto de una lista compartida. Es el contrato con la app de celular:
 * va tal cual en la columna jsonb `items` (docs/QR-TABLET-CELULAR.md).
 */
export interface SharedListItem {
  name: string;
  /** Unidades; 1 cuando la cantidad viene como texto (ej. "2 kg") */
  qty: number;
  /** Cantidad tal como se mostró en la tablet, si no son unidades simples */
  qtyLabel?: string;
  aisle?: string;
  /** Id en el catálogo compartido (products.id) */
  productId?: number;
  /** Precio normal por unidad, en CLP */
  unitPrice?: number;
  /** Precio de oferta por unidad, en CLP */
  offerPrice?: number;
}

export interface SharedListDraft {
  title: string;
  items: SharedListItem[];
  total: number;
}

/** Lista ya guardada: lo que la tablet necesita para mostrar el QR */
export interface SharedListTicket {
  id: string;
  /** Contenido del QR */
  url: string;
}

/**
 * Envía la lista de la tablet al celular a través del Supabase compartido.
 * La tablet no inicia sesión: usa la clave pública y la base solo le deja
 * crear listas y preguntar si ya fueron recibidas.
 */
@Injectable({
  providedIn: 'root'
})
export class SharedListService {
  private readonly brandService = inject(BrandService);
  private readonly languageService = inject(LanguageService);
  private clientPromise: Promise<SupabaseClient> | null = null;

  /** false sin Supabase configurado: la tablet muestra el QR fijo de respaldo */
  readonly enabled = Boolean(environment.supabaseUrl && environment.supabaseAnonKey);

  async share(draft: SharedListDraft): Promise<SharedListTicket> {
    const client = await this.client();
    const id = newUuid();
    // expires_at lo pone la base: así no depende del reloj de la tablet
    const { error } = await client.from('shared_lists').insert({
      id,
      brand_id: this.brandService.currentBrand().id,
      title: draft.title,
      items: draft.items,
      total: Math.max(0, Math.round(draft.total)),
      language: this.languageService.currentLang(),
    });
    if (error) {
      throw new Error(`No se pudo guardar la lista compartida: ${error.message}`);
    }
    return { id, url: sharedListUrl(id) };
  }

  /** true cuando el celular ya tomó la lista (claim_shared_list) */
  async isClaimed(id: string): Promise<boolean> {
    const client = await this.client();
    const { data, error } = await client.rpc('shared_list_claimed', { list_id: id });
    if (error) {
      throw new Error(`No se pudo consultar la lista compartida: ${error.message}`);
    }
    return data === true;
  }

  // El cliente se carga recién al primer uso: la app no paga su peso al arrancar
  private client(): Promise<SupabaseClient> {
    if (!this.enabled) {
      return Promise.reject(new Error('Supabase no está configurado (environment.supabaseUrl / supabaseAnonKey)'));
    }
    this.clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    );
    return this.clientPromise;
  }
}

/** Contenido del QR para una lista: `${sharedListBaseUrl}/${id}` */
export function sharedListUrl(id: string): string {
  return `${environment.sharedListBaseUrl.replace(/\/+$/, '')}/${id}`;
}

export function sharedItemsFromCart(
  items: readonly CartItem[],
  aisleOf: (productId: number) => string | undefined,
): SharedListItem[] {
  return items.map(item => withoutUndefined({
    name: item.name,
    qty: item.qty,
    aisle: aisleOf(item.productId),
    productId: item.productId,
    unitPrice: item.unitPrice,
    offerPrice: item.offerPrice,
  }));
}

/** Listas que no salen del carrito (ej. calculadora de eventos): la cantidad viene como texto */
export function sharedItemsFromLabels(
  items: readonly { name: string; aisle: string; qty?: string }[],
): SharedListItem[] {
  return items.map(item => withoutUndefined({
    name: item.name,
    qty: 1,
    qtyLabel: item.qty,
    aisle: item.aisle,
  }));
}

type RandomSource = Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>>;

/** UUID v4. randomUUID solo existe en contextos seguros (https / localhost) */
export function newUuid(source: RandomSource = crypto): string {
  if (typeof source.randomUUID === 'function') {
    return source.randomUUID();
  }
  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// El JSON que recibe el celular no lleva claves vacías
function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}
