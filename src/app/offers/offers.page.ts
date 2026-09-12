import { Component } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon
} from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router'; // ← Importar RouterModule
import { WALMART_OFFERS } from '../data/offers.data';

@Component({
  selector: 'app-offers',
  templateUrl: './offers.page.html',
  styleUrls: ['./offers.page.scss'],
  standalone: true,
  imports: [
    RouterModule, // ← Añadir esto para routerLink
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon
  ]
})
export class OffersPage {
  offers = WALMART_OFFERS;
  
  constructor() {}

  addToCart(product: any) {
    console.log('Producto agregado al carrito:', product.product);
  }
}