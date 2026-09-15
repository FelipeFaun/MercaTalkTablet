import { Component, inject, input } from '@angular/core';
import { IonHeader, IonIcon, IonToolbar, PopoverController } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { BrandService } from '../../../core/brand.service';
import { LanguageService } from '../../../core/language.service';
import { BrandSelectorPopoverComponent } from '../brand-selector-popover/brand-selector-popover.component';
import { LanguageSelectorPopoverComponent } from '../language-selector-popover/language-selector-popover.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * Barra superior de la aplicación con soporte para temas corporativos dinámicos,
 * selector de supermercados y selector de idiomas con retorno automático por inactividad.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IonHeader, IonToolbar, RouterLink, IonIcon, TranslatePipe],
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
})
export class AppHeaderComponent {
  readonly brandService = inject(BrandService);
  readonly languageService = inject(LanguageService);
  private readonly popoverCtrl = inject(PopoverController);

  /** Título centrado; vacío = solo logo. */
  title = input('');

  async openBrandMenu(event: MouseEvent): Promise<void> {
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
  }

  async openLanguageMenu(event: MouseEvent): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: LanguageSelectorPopoverComponent,
      event,
      alignment: 'end',
      side: 'bottom',
      arrow: false,
      cssClass: 'brand-popover-overlay',
      dismissOnSelect: true,
    });
    await popover.present();
  }
}
