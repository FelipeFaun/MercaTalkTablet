import { Component } from '@angular/core';
import { IonContent, IonIcon, IonItem, IonLabel, IonList } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';

/** Accesos que no caben en la barra inferior. */
@Component({
  selector: 'app-more',
  templateUrl: './more.page.html',
  styleUrls: ['./more.page.scss'],
  standalone: true,
  imports: [RouterLink, IonContent, IonList, IonItem, IonIcon, IonLabel, AppHeaderComponent],
})
export class MorePage {
  readonly options = [
    { label: 'Recetas', detail: 'Ideas para cocinar con productos en oferta', icon: 'restaurant-outline', link: '/recipes' },
    { label: 'Ubicación en tienda', detail: 'En qué pasillo y estante está cada producto', icon: 'map-outline', link: '/store-locator' },
    { label: 'Descargar la app', detail: 'Código QR y enlace a la tienda', icon: 'phone-portrait-outline', link: '/app-download' },
  ];
}
