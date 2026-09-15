import { Component, computed, inject } from '@angular/core';
import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { CartService } from '../core/cart.service';
import { BrandService } from '../core/brand.service';
import { TranslatePipe } from '../shared/pipes/translate.pipe';

/**
 * Navegación principal de la app móvil (barra inferior).
 * Las URLs de las páginas no cambian: /home, /price-check, /cart, /offers, /more.
 */
@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge, TranslatePipe],
})
export class TabsPage {
  private cartService = inject(CartService);
  private brandService = inject(BrandService);

  readonly cartCount = this.cartService.count;
  readonly assistantName = computed(() => this.brandService.currentBrand().assistantName);
}
