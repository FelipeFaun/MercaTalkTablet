import { Component, inject } from '@angular/core';
import { IonIcon, PopoverController } from '@ionic/angular/standalone';
import { BrandService } from '../../../core/brand.service';
import { ChatService } from '../../../services/chat.service';

/**
 * Menú emergente de selección de Supermercados.
 * Se presenta mediante PopoverController en la capa superior (ion-app overlay)
 * para evitar cualquier recorte o problemas de apilamiento con toolbars y contenidos.
 */
@Component({
  selector: 'app-brand-selector-popover',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './brand-selector-popover.component.html',
  styleUrls: ['./brand-selector-popover.component.scss'],
})
export class BrandSelectorPopoverComponent {
  readonly brandService = inject(BrandService);
  private chatService = inject(ChatService);
  private popoverCtrl = inject(PopoverController);

  selectBrand(brandId: string): void {
    this.brandService.setBrand(brandId);
    if (this.chatService.messages().length <= 1) {
      this.chatService.reset();
    }
    void this.popoverCtrl.dismiss(brandId);
  }
}
