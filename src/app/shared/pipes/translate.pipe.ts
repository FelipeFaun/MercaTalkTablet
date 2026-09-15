import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/language.service';

/**
 * Pipe de traducción reactivo para plantillas HTML.
 * Uso: {{ 'tabs.scan' | translate }} o {{ 'home.officialAssistant' | translate:{ store: 'Lider' } }}
 */
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly langService = inject(LanguageService);

  transform(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.langService.t(key, params);
  }
}
