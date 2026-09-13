import { Injectable } from '@angular/core';

/**
 * "Skin" de la app: nombre del supermercado, logo y asistente.
 * MercaTalk es el producto; cada supermercado cliente configura aquí su marca
 * (el logo va en assets/brand/, nunca hotlinkeado).
 */
export interface Brand {
  /** Nombre del supermercado que se muestra al usuario. */
  storeName: string;
  /** Nombre del avatar/asistente. */
  assistantName: string;
  /** Ruta local del logo para la barra superior (fondo azul). */
  logo: string;
  /** Avatares disponibles del asistente. */
  avatars: string[];
}

export const DEFAULT_BRAND: Brand = {
  storeName: 'MercaTalk',
  assistantName: 'Liderín',
  logo: 'assets/brand/logo.svg',
  avatars: ['assets/images/liderin.png', 'assets/images/liderin2.png'],
};

@Injectable({
  providedIn: 'root'
})
export class BrandService {
  readonly brand: Brand = DEFAULT_BRAND;
}
