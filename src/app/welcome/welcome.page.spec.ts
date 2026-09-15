import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { WelcomePage } from './welcome.page';
import { LanguageService } from '../core/language.service';
import { BrandService } from '../core/brand.service';
import { SUPPORTED_LANGUAGES } from '../core/i18n/translations';

describe('WelcomePage', () => {
  let component: WelcomePage;
  let langService: LanguageService;
  let brandService: BrandService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomePage],
      providers: [
        LanguageService,
        BrandService,
        provideRouter([]),
        provideIonicAngular(),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(WelcomePage);
    component = fixture.componentInstance;
    langService = TestBed.inject(LanguageService);
    brandService = TestBed.inject(BrandService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('debe crearse correctamente e inicializar en Español', () => {
    expect(component).toBeTruthy();
    expect(langService.currentLang()).toBe('es');
  });

  it('debe rotar periódicamente entre los 3 idiomas cada 18 segundos', fakeAsync(() => {
    component.ngOnInit();
    expect(langService.currentLang()).toBe('es');

    // Avanza 18000ms + 220ms de transición suave hacia Inglés
    tick(18000);
    tick(220);
    expect(langService.currentLang()).toBe('en');

    // Avanza otros 18000ms + 220ms hacia Portugués
    tick(18000);
    tick(220);
    expect(langService.currentLang()).toBe('pt');

    // Avanza otros 18000ms + 220ms de vuelta a Español
    tick(18000);
    tick(220);
    expect(langService.currentLang()).toBe('es');

    component.stopRotation();
  }));

  it('debe detener la rotación al destruir el componente o salir de la vista', fakeAsync(() => {
    component.ngOnInit();
    tick(18000);
    tick(220);
    expect(langService.currentLang()).toBe('en');

    component.ionViewWillLeave();
    // Avanza el tiempo y comprueba que no cambia porque está pausado
    tick(36000);
    expect(langService.currentLang()).toBe('en');
  }));

  it('debe seleccionar el idioma manualmente, detener rotación y navegar a /home', () => {
    const enOption = SUPPORTED_LANGUAGES.find((l) => l.code === 'en')!;
    component.onSelectLanguage(enOption);

    expect(langService.currentLang()).toBe('en');
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('debe devolver el slogan oficial traducido según el idioma activo', () => {
    brandService.setBrand('lider');
    langService.setLanguage('es');
    expect(component.getStoreTagline()).toBe('Precios Bajos Todos los Días');

    langService.setLanguage('en');
    expect(component.getStoreTagline()).toBe('Low Prices Every Day');

    langService.setLanguage('pt');
    expect(component.getStoreTagline()).toBe('Preços Baixos Todos os Dias');
  });
});
