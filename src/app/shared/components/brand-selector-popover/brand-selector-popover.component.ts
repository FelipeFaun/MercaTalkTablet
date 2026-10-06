import { Component, ElementRef, inject } from '@angular/core';
import { IonIcon, PopoverController } from '@ionic/angular/standalone';
import { BrandService } from '../../../core/brand.service';
import { ChatService } from '../../../services/chat.service';

/** Espera máxima al cierre del menú antes de aplicar la marca */
const CLOSE_TIMEOUT_MS = 600;

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
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  async selectBrand(brandId: string): Promise<void> {
    // Se espera a que el menú termine de cerrarse para que no quede congelado
    // dentro del fundido de cambio de marca. El tope evita que una animación
    // de cierre trabada deje la marca sin cambiar.
    const closed = this.host.nativeElement.closest('ion-popover')?.onDidDismiss();
    this.popoverCtrl.dismiss(brandId).catch(() => undefined);
    await Promise.race([closed, new Promise(resolve => setTimeout(resolve, CLOSE_TIMEOUT_MS))]);
    this.brandService.setBrand(brandId);
    if (this.chatService.messages().length <= 1) {
      this.chatService.reset();
    }
  }
}
