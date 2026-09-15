import { Injectable, NgZone, OnDestroy, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import {
  LanguageCode,
  LanguageOption,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
} from './i18n/translations';
import { VoiceService } from './voice.service';

export const INACTIVITY_TIMEOUT_SECONDS = 3000;
const ACTIVITY_EVENTS: readonly (keyof WindowEventMap)[] = [
  'pointerdown',
  'touchstart',
  'click',
  'keydown',
  'wheel',
];

@Injectable({
  providedIn: 'root',
})
export class LanguageService implements OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly voiceService = inject(VoiceService);

  readonly languages: readonly LanguageOption[] = SUPPORTED_LANGUAGES;
  private readonly _currentLang = signal<LanguageCode>('es');
  readonly currentLang = this._currentLang.asReadonly();

  /** Segundos restantes de inactividad antes de volver a la pantalla de reposo (null si está en reposo) */
  private readonly _remainingSeconds = signal<number | null>(null);
  readonly remainingSeconds = this._remainingSeconds.asReadonly();

  private inactivityIntervalId: ReturnType<typeof setInterval> | null = null;
  private secondsLeft = INACTIVITY_TIMEOUT_SECONDS;
  private listenersAttached = false;
  private isWelcomeScreen = false;
  private readonly routerSub: Subscription;
  private readonly boundActivityHandler = () => this.handleUserActivity();

  constructor() {
    // Escucha cambios de ruta para pausar el temporizador en la pantalla de reposo
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects || event.url;
        this.isWelcomeScreen = url.includes('/welcome');
        if (this.isWelcomeScreen) {
          this.stopInactivityTimer();
        } else {
          this.startInactivityTimer();
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSub.unsubscribe();
    this.stopInactivityTimer();
  }

  /**
   * Obtiene la opción de idioma actual con metadata (bandera, tier, nombres)
   */
  currentLanguageOption(): LanguageOption {
    const code = this._currentLang();
    return this.languages.find((l) => l.code === code) ?? this.languages[0];
  }

  /**
   * Cambia el idioma de la aplicación.
   */
  setLanguage(lang: LanguageCode): void {
    this._currentLang.set(lang);
    this.voiceService.setLocale(lang);
    if (!this.isWelcomeScreen) {
      this.handleUserActivity();
    }
  }

  /**
   * Selecciona el idioma y entra a la aplicación principal (/home).
   */
  selectLanguageAndEnter(lang: LanguageCode): void {
    this.setLanguage(lang);
    void this.router.navigate(['/home']);
  }

  /**
   * Vuelve manualmente a la pantalla de reposo.
   */
  returnToWelcome(): void {
    this.voiceService.stopSpeaking();
    this.voiceService.stopListening();
    this.setLanguage('es');
    void this.router.navigate(['/welcome']);
    this.stopInactivityTimer();
  }

  /**
   * Traduce una clave con soporte para parámetros tipo `{{param}}`.
   * Si la clave no se encuentra en el idioma activo, intenta en Español y finalmente devuelve la clave.
   */
  t(key: string, params?: Record<string, string | number | null | undefined>): string {
    const lang = this._currentLang();
    const dictionary = TRANSLATIONS[lang] || TRANSLATIONS['es'];
    let text = dictionary[key] || TRANSLATIONS['es'][key] || key;

    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        text = text.replace(new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g'), paramValue != null ? String(paramValue) : '');
      }
    }

    return text;
  }

  /**
   * Inicia el temporizador de inactividad de 30s y asocia los listeners de interacción global
   * fuera de la zona de Angular para evitar sobrecarga de change detection.
   */
  startInactivityTimer(): void {
    this.stopInactivityTimer();

    this.secondsLeft = INACTIVITY_TIMEOUT_SECONDS;
    this._remainingSeconds.set(this.secondsLeft);

    this.ngZone.runOutsideAngular(() => {
      // Inicia intervalo de decremento de 1 segundo
      this.inactivityIntervalId = setInterval(() => {
        this.secondsLeft--;
        if (this.secondsLeft <= 0) {
          // 30 segundos cumplidos sin interacción: volver a la pantalla de reposo en Español
          this.ngZone.run(() => {
            this.returnToWelcome();
          });
        } else {
          this._remainingSeconds.set(this.secondsLeft);
        }
      }, 1000);

      // Asocia escuchadores de actividad en window
      if (!this.listenersAttached && typeof window !== 'undefined') {
        for (const eventName of ACTIVITY_EVENTS) {
          window.addEventListener(eventName, this.boundActivityHandler, { passive: true });
        }
        this.listenersAttached = true;
      }
    });
  }

  /**
   * Reinicia la cuenta regresiva a 30 segundos cada vez que el usuario interactúa.
   */
  private handleUserActivity(): void {
    if (this.isWelcomeScreen) return;
    this.secondsLeft = INACTIVITY_TIMEOUT_SECONDS;
    this._remainingSeconds.set(this.secondsLeft);
  }

  /**
   * Detiene el temporizador y limpia los listeners globales.
   */
  stopInactivityTimer(): void {
    if (this.inactivityIntervalId) {
      clearInterval(this.inactivityIntervalId);
      this.inactivityIntervalId = null;
    }

    if (this.listenersAttached && typeof window !== 'undefined') {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, this.boundActivityHandler);
      }
      this.listenersAttached = false;
    }

    this._remainingSeconds.set(null);
  }
}
