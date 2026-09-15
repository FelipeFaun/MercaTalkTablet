import { Component, inject } from '@angular/core';
import { IonIcon, PopoverController } from '@ionic/angular/standalone';
import { LanguageService } from '../../../core/language.service';
import { LanguageCode, LanguageOption } from '../../../core/i18n/translations';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * Menú desplegable para cambiar el idioma de la aplicación.
 * Muestra las opciones de Español, Inglés y Portugués, y un aviso del
 * retorno automático a Español tras 30s de inactividad.
 */
@Component({
  selector: 'app-language-selector-popover',
  standalone: true,
  imports: [IonIcon, TranslatePipe],
  templateUrl: './language-selector-popover.component.html',
  styleUrls: ['./language-selector-popover.component.scss'],
})
export class LanguageSelectorPopoverComponent {
  readonly languageService = inject(LanguageService);
  private readonly popoverCtrl = inject(PopoverController);

  selectLanguage(lang: LanguageOption): void {
    this.languageService.setLanguage(lang.code as LanguageCode);
    void this.popoverCtrl.dismiss(lang.code);
  }
}
