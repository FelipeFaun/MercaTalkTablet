import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { IonContent, IonIcon, PopoverController } from '@ionic/angular/standalone';
import { BrandService } from '../core/brand.service';
import { LanguageService } from '../core/language.service';
import { LanguageCode, LanguageOption } from '../core/i18n/translations';
import { BrandSelectorPopoverComponent } from '../shared/components/brand-selector-popover/brand-selector-popover.component';
import { TranslatePipe } from '../shared/pipes/translate.pipe';

/**
 * Pantalla de reposo / bienvenida estilo Kiosko Tablet.
 * Muestra los 3 idiomas centrados en el medio de la pantalla y cicla periódicamente
 * entre los 3 idiomas (Español, Inglés, Portugués) para llamar la atención del cliente.
 * Al tocar un idioma, la app se configura y entra al flujo principal.
 * Tras 30s de inactividad en cualquier lugar de la app, regresa a esta pantalla.
 */
/** Intervalo de rotación automática entre idiomas en pantalla de bienvenida (18 segundos) */
export const WELCOME_ROTATION_INTERVAL_MS = 18000;

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  standalone: true,
  imports: [IonContent, IonIcon, TranslatePipe],
})
export class WelcomePage implements OnInit, OnDestroy {
  readonly brandService = inject(BrandService);
  readonly languageService = inject(LanguageService);
  private readonly popoverCtrl = inject(PopoverController);

  private readonly languagesList: readonly LanguageCode[] = ['es', 'en', 'pt'];
  private currentIdx = 0;
  private rotateInterval: ReturnType<typeof setInterval> | null = null;
  private fadeTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Estado de transición suave para animación de cambio de idioma */
  readonly isFading = signal<boolean>(false);

  ngOnInit(): void {
    this.startRotation();
  }

  ionViewWillEnter(): void {
    this.startRotation();
  }

  ionViewWillLeave(): void {
    this.stopRotation();
  }

  ngOnDestroy(): void {
    this.stopRotation();
  }

  /**
   * Inicia la rotación automática de los 3 idiomas cada 18 segundos.
   */
  startRotation(): void {
    if (this.rotateInterval) {
      return;
    }

    // Sincroniza el índice con el idioma actualmente activo
    const current = this.languageService.currentLang();
    const foundIdx = this.languagesList.indexOf(current);
    this.currentIdx = foundIdx >= 0 ? foundIdx : 0;

    this.rotateInterval = setInterval(() => {
      this.cycleNextLanguage();
    }, WELCOME_ROTATION_INTERVAL_MS);
  }

  /**
   * Detiene la rotación automática de idiomas.
   */
  stopRotation(): void {
    if (this.rotateInterval) {
      clearInterval(this.rotateInterval);
      this.rotateInterval = null;
    }
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
    this.isFading.set(false);
  }

  /**
   * Realiza la transición suave hacia el siguiente idioma en la lista.
   */
  private cycleNextLanguage(): void {
    this.isFading.set(true);
    this.fadeTimeout = setTimeout(() => {
      this.currentIdx = (this.currentIdx + 1) % this.languagesList.length;
      const nextLang = this.languagesList[this.currentIdx];
      this.languageService.setLanguage(nextLang);
      this.isFading.set(false);
    }, 220);
  }

  /**
   * Al seleccionar un idioma manualmente, se detiene la rotación y se ingresa a la app.
   */
  onSelectLanguage(lang: LanguageOption): void {
    this.stopRotation();
    this.languageService.selectLanguageAndEnter(lang.code as LanguageCode);
  }

  /**
   * Obtiene el slogan oficial del supermercado en el idioma que esté ciclando la pantalla.
   */
  getStoreTagline(): string {
    const brand = this.brandService.currentBrand();
    const key = `brand.tagline.${brand.id}`;
    const translated = this.languageService.t(key);
    return translated !== key ? translated : brand.tagline;
  }

  async openBrandMenu(event: MouseEvent): Promise<void> {
    this.stopRotation();
    const popover = await this.popoverCtrl.create({
      component: BrandSelectorPopoverComponent,
      event,
      alignment: 'end',
      side: 'bottom',
      arrow: false,
      cssClass: 'brand-popover-overlay',
      dismissOnSelect: true,
    });
    await popover.present();
    await popover.onDidDismiss();
    this.startRotation();
  }
}

