import { ApplicationRef, Injectable, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'mercatalk.selected_brand';

/**
 * Representa una cadena de supermercados integrada en MercaTalk.
 * Cada supermercado cuenta con su identidad de marca, colores y un avatar único e inmutable.
 */
export interface Brand {
  /** Identificador único para persistencia y ruteo */
  id: string;
  /** Nombre del supermercado mostrado al usuario */
  storeName: string;
  /** Nombre del avatar/asistente virtual exclusivo */
  assistantName: string;
  /** Ruta local del logo */
  logo: string;
  /** Logo oficial del supermercado (marca de agua del fondo) */
  storeLogo: string;
  /** Avatar exclusivo del asistente del supermercado */
  avatar: string;
  /** Lista con el avatar (mantenida por compatibilidad) */
  avatars: string[];
  /** Color principal corporativo */
  primaryColor: string;
  /** Color secundario corporativo */
  secondaryColor: string;
  /** Valores RGB para variables de Ionic */
  primaryRgb: string;
  /** Fondo del encabezado (color sólido o gradiente) */
  headerBackground: string;
  /** Gradiente principal para botones destacados y tarjetas */
  gradient: string;
  /** Tono suave para fondos y hover */
  lightBg: string;
  /** Tinte de fondo de las páginas (~10 % del color principal) */
  surfaceBg: string;
  /** Color de contraste para textos sobre el color principal */
  contrastColor: string;
  /** Eslogan del supermercado */
  tagline: string;
}

export const AVAILABLE_BRANDS: Brand[] = [
  {
    id: 'lider',
    storeName: 'Lider',
    assistantName: 'Liderín',
    logo: 'assets/brand/logo.svg',
    storeLogo: 'assets/brand/logos/lider.svg',
    avatar: 'assets/images/avatar-lider.jpg',
    avatars: ['assets/images/avatar-lider.jpg'],
    primaryColor: '#0071CE',
    secondaryColor: '#005A9E',
    primaryRgb: '0, 113, 206',
    headerBackground: '#0071CE',
    gradient: 'linear-gradient(135deg, #0071CE 0%, #005A9E 100%)',
    lightBg: '#EBF4FC',
    surfaceBg: '#E6F1FA',
    contrastColor: '#FFFFFF',
    tagline: 'Precios Bajos Todos los Días',
  },
  {
    id: 'jumbo',
    storeName: 'Jumbo',
    assistantName: 'Jumbito',
    logo: 'assets/brand/logo.svg',
    storeLogo: 'assets/brand/logos/jumbo.png',
    avatar: 'assets/images/avatar-jumbo.jpg',
    avatars: ['assets/images/avatar-jumbo.jpg'],
    primaryColor: '#009A44',
    secondaryColor: '#007A36',
    primaryRgb: '0, 154, 68',
    headerBackground: '#009A44',
    gradient: 'linear-gradient(135deg, #009A44 0%, #007A36 100%)',
    lightBg: '#EAF8EE',
    surfaceBg: '#E6F5EC',
    contrastColor: '#FFFFFF',
    tagline: 'Te da más',
  },
  {
    id: 'santaisabel',
    storeName: 'Santa Isabel',
    assistantName: 'Santisa',
    logo: 'assets/brand/logo.svg',
    storeLogo: 'assets/brand/logos/santaisabel.svg',
    avatar: 'assets/images/avatar-santaisabel.jpg',
    avatars: ['assets/images/avatar-santaisabel.jpg'],
    primaryColor: '#E30613',
    secondaryColor: '#B80510',
    primaryRgb: '227, 6, 19',
    headerBackground: '#E30613',
    gradient: 'linear-gradient(135deg, #E30613 0%, #B80510 100%)',
    lightBg: '#FDEBED',
    surfaceBg: '#FCE4EA',
    contrastColor: '#FFFFFF',
    tagline: 'Te conoce',
  },
  {
    id: 'unimarc',
    storeName: 'Unimarc',
    assistantName: 'Don U',
    logo: 'assets/brand/logo.svg',
    storeLogo: 'assets/brand/logos/unimarc.svg',
    avatar: 'assets/images/avatar-unimarc.jpg',
    avatars: ['assets/images/avatar-unimarc.jpg'],
    primaryColor: '#DB291D',
    secondaryColor: '#AC1C12',
    primaryRgb: '219, 41, 29',
    headerBackground: '#DB291D',
    gradient: 'linear-gradient(135deg, #DB291D 0%, #AC1C12 100%)',
    lightBg: '#FDEEEE',
    surfaceBg: '#FBEAE5',
    contrastColor: '#FFFFFF',
    tagline: 'Lo mejor de Chile, más cerca de ti',
  },
  {
    id: 'mayorista10',
    storeName: 'Mayorista 10',
    assistantName: 'Chanchito 10',
    logo: 'assets/brand/logo.svg',
    storeLogo: 'assets/brand/logos/mayorista10.png',
    avatar: 'assets/images/avatar-mayorista10.jpg',
    avatars: ['assets/images/avatar-mayorista10.jpg'],
    primaryColor: '#FF6600',
    secondaryColor: '#E65C00',
    primaryRgb: '255, 102, 0',
    headerBackground: '#FF6600',
    gradient: 'linear-gradient(135deg, #FF6600 0%, #E65C00 100%)',
    lightBg: '#FFF3E6',
    surfaceBg: '#FFF0E3',
    contrastColor: '#FFFFFF',
    tagline: 'Desde 1 unidad para todos',
  },
];

export const DEFAULT_BRAND: Brand = AVAILABLE_BRANDS[0];

@Injectable({
  providedIn: 'root'
})
export class BrandService {
  private readonly appRef = inject(ApplicationRef);
  readonly brands: readonly Brand[] = AVAILABLE_BRANDS;
  private readonly _currentBrand = signal<Brand>(DEFAULT_BRAND);
  readonly currentBrand = this._currentBrand.asReadonly();

  /** Getter de compatibilidad hacia atrás */
  get brand(): Brand {
    return this._currentBrand();
  }

  constructor() {
    this.applyTheme(this._currentBrand());
    this.initBrand();
  }

  private async initBrand(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      const found = AVAILABLE_BRANDS.find(b => b.id === value);
      if (found) {
        this._currentBrand.set(found);
      }
    } catch {
      // Usar valor por defecto si falla el almacenamiento
    }
    this.applyTheme(this._currentBrand());
  }

  setBrand(brandId: string): void {
    const found = AVAILABLE_BRANDS.find(b => b.id === brandId);
    if (!found) return;

    // Fundido de toda la pantalla al cambiar de supermercado (View Transitions API).
    // tick() deja el DOM actualizado antes de que el navegador tome la captura nueva.
    if (supportsViewTransition() && !prefersReducedMotion()) {
      document.startViewTransition(() => {
        this._currentBrand.set(found);
        this.applyTheme(found);
        this.appRef.tick();
      });
    } else {
      this._currentBrand.set(found);
      this.applyTheme(found);
    }
    void Preferences.set({ key: STORAGE_KEY, value: found.id });
  }

  private applyTheme(brand: Brand): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', brand.primaryColor);
    root.style.setProperty('--brand-secondary', brand.secondaryColor);
    root.style.setProperty('--brand-primary-rgb', brand.primaryRgb);
    root.style.setProperty('--brand-header-bg', brand.headerBackground);
    root.style.setProperty('--brand-gradient', brand.gradient);
    root.style.setProperty('--brand-light', brand.lightBg);
    root.style.setProperty('--brand-contrast', brand.contrastColor);
    root.style.setProperty('--brand-surface', brand.surfaceBg);
    root.style.setProperty('--brand-surface-rgb', hexToRgb(brand.surfaceBg));
    // URL absoluta: un url() relativo dentro de una variable se resolvería según la hoja que la use
    root.style.setProperty('--brand-watermark', `url("${new URL(brand.storeLogo, document.baseURI).href}")`);
    root.style.setProperty('--ion-color-primary', brand.primaryColor);
    root.style.setProperty('--ion-color-primary-rgb', brand.primaryRgb);
    root.style.setProperty('--ion-color-primary-contrast', brand.contrastColor);
    root.style.setProperty('--ion-color-primary-shade', brand.secondaryColor);
    root.style.setProperty('--ion-color-primary-tint', brand.primaryColor);
  }
}

/** '#E6F1FA' → '230, 241, 250' (para usar dentro de rgba()) */
function hexToRgb(hex: string): string {
  const value = parseInt(hex.replace('#', ''), 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

function supportsViewTransition(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
