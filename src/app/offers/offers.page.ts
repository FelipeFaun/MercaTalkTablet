import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';
import { RouterModule } from '@angular/router'; // ← Importar RouterModule
import { OffersService, Offer } from '../services/offers.service';
import { CatalogService } from '../core/catalog.service';
import { CartFeedbackService } from '../core/cart-feedback.service';
import { ClpPipe } from '../shared/pipes/clp.pipe';

@Component({
  selector: 'app-offers',
  templateUrl: './offers.page.html',
  styleUrls: ['./offers.page.scss'],
  standalone: true,
  imports: [
    AppHeaderComponent,
    RouterModule, // ← Añadir esto para routerLink
    IonContent, IonIcon,
    ClpPipe, DatePipe
  ]
})
export class OffersPage {
  private offersService = inject(OffersService);
  private catalog = inject(CatalogService);
  private cartFeedback = inject(CartFeedbackService);

  offers: Offer[] = this.offersService.getAllOffers();

  // AGREGAR EL PRODUCTO DE LA OFERTA A MI COMPRA
  addToCart(offer: Offer) {
    const product = this.catalog.getProductById(offer.productId);
    if (product) {
      void this.cartFeedback.addWithToast(product);
    }
  }
}