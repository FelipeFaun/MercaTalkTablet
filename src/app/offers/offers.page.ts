import { Component, inject } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonContent
} from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router'; // ← Importar RouterModule
import { OffersService, Offer } from '../services/offers.service';
import { ClpPipe } from '../shared/pipes/clp.pipe';

@Component({
  selector: 'app-offers',
  templateUrl: './offers.page.html',
  styleUrls: ['./offers.page.scss'],
  standalone: true,
  imports: [
    RouterModule, // ← Añadir esto para routerLink
    IonHeader, IonToolbar, IonContent,
    ClpPipe
  ]
})
export class OffersPage {
  private offersService = inject(OffersService);

  offers: Offer[] = this.offersService.getAllOffers();

  addToCart(offer: Offer) {
    console.log('Producto agregado al carrito:', offer.product);
  }
}