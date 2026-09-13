import { Component, inject } from '@angular/core';
import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { CartService } from '../core/cart.service';
import { BrandService } from '../core/brand.service';

/**
 * Navegación principal de la app móvil (barra inferior).
 * Las URLs de las páginas no cambian: /home, /price-check, /cart, /offers, /more.
 */
@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
})
export class TabsPage {
  private cartService = inject(CartService);
  private brandService = inject(BrandService);

  readonly cartCount = this.cartService.count;
  readonly assistantName = this.brandService.brand.assistantName;
}
