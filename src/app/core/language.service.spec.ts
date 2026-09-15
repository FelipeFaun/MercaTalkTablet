import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LanguageService, INACTIVITY_TIMEOUT_SECONDS } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LanguageService,
        provideRouter([]),
      ],
    });
    service = TestBed.inject(LanguageService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('inicia con Español como idioma por defecto', () => {
    expect(service.currentLang()).toBe('es');
    expect(service.remainingSeconds()).toBeNull();
  });

  it('traduce una clave simple al idioma activo', () => {
    expect(service.t('tabs.scan')).toBe('Escanear');

    service.setLanguage('en');
    expect(service.t('tabs.scan')).toBe('Scan');

    service.setLanguage('pt');
    expect(service.t('tabs.scan')).toBe('Escanear');
  });

  it('reemplaza parámetros en las traducciones', () => {
    service.setLanguage('es');
    expect(service.t('priceCheck.resultsCount', { count: 5 })).toBe('5 producto(s) encontrado(s)');

    service.setLanguage('en');
    expect(service.t('priceCheck.resultsCount', { count: 5 })).toBe('5 product(s) found');
  });

  it('inicia temporizador de inactividad al seleccionar idioma y entrar', () => {
    service.selectLanguageAndEnter('en');
    expect(service.currentLang()).toBe('en');
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
    expect(service.remainingSeconds()).toBe(INACTIVITY_TIMEOUT_SECONDS);
  });

  it('vuelve a la pantalla de reposo en Español tras el tiempo de inactividad', fakeAsync(() => {
    service.startInactivityTimer();
    expect(service.remainingSeconds()).toBe(INACTIVITY_TIMEOUT_SECONDS);

    // Avanza 10 segundos
    tick(10000);
    expect(service.remainingSeconds()).toBe(INACTIVITY_TIMEOUT_SECONDS - 10);

    // Avanza el resto del tiempo
    tick((INACTIVITY_TIMEOUT_SECONDS - 10) * 1000);
    expect(service.currentLang()).toBe('es');
    expect(router.navigate).toHaveBeenCalledWith(['/welcome']);
    expect(service.remainingSeconds()).toBeNull();
  }));

  it('permite volver manualmente a la pantalla de reposo', () => {
    service.returnToWelcome();
    expect(service.currentLang()).toBe('es');
    expect(router.navigate).toHaveBeenCalledWith(['/welcome']);
    expect(service.remainingSeconds()).toBeNull();
  });
});
