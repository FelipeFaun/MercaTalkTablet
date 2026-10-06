import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';

import { AVAILABLE_BRANDS, BrandService } from './brand.service';

const rootVar = (name: string) => document.documentElement.style.getPropertyValue(name);

/** Fuerza "movimiento reducido" para que setBrand aplique el tema de forma síncrona */
function mockReducedMotion(reduce: boolean): void {
  spyOn(window, 'matchMedia').and.returnValue({ matches: reduce } as MediaQueryList);
}

describe('BrandService', () => {
  let service: BrandService;

  beforeEach(async () => {
    await Preferences.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(BrandService);
  });

  it('cada supermercado tiene logo propio y tinte de fondo', () => {
    for (const brand of AVAILABLE_BRANDS) {
      expect(brand.storeLogo).toMatch(/^assets\/brand\/logos\/.+\.(svg|png)$/);
      expect(brand.surfaceBg).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('Santa Isabel y Unimarc tienen tintes distintos', () => {
    const santa = AVAILABLE_BRANDS.find(b => b.id === 'santaisabel');
    const unimarc = AVAILABLE_BRANDS.find(b => b.id === 'unimarc');
    expect(santa?.surfaceBg).not.toBe(unimarc?.surfaceBg);
  });

  it('setBrand aplica el tinte y la marca de agua del supermercado', () => {
    mockReducedMotion(true);
    service.setBrand('mayorista10');

    expect(service.currentBrand().id).toBe('mayorista10');
    expect(rootVar('--brand-surface')).toBe('#FFF0E3');
    expect(rootVar('--brand-surface-rgb')).toBe('255, 240, 227');
    expect(rootVar('--brand-watermark')).toContain('assets/brand/logos/mayorista10.png');
  });

  it('usa la View Transitions API cuando no hay movimiento reducido', () => {
    if (!('startViewTransition' in document)) {
      pending('El navegador de pruebas no soporta View Transitions');
      return;
    }
    mockReducedMotion(false);
    const spy = spyOn(document, 'startViewTransition').and.callFake(((update: () => void) => {
      update();
      return {} as ViewTransition;
    }) as typeof document.startViewTransition);

    service.setBrand('jumbo');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(service.currentBrand().id).toBe('jumbo');
    expect(rootVar('--brand-surface')).toBe('#E6F5EC');
  });

  it('ignora un supermercado desconocido', () => {
    mockReducedMotion(true);
    service.setBrand('lider');
    service.setBrand('no-existe');
    expect(service.currentBrand().id).toBe('lider');
  });
});
