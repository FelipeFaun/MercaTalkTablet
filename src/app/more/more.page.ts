import { Component } from '@angular/core';
import { IonContent, IonIcon, IonItem, IonLabel, IonList } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';
import { TranslatePipe } from '../shared/pipes/translate.pipe';

/** Accesos que no caben en la barra inferior. */
@Component({
  selector: 'app-more',
  templateUrl: './more.page.html',
  styleUrls: ['./more.page.scss'],
  standalone: true,
  imports: [RouterLink, IonContent, IonList, IonItem, IonIcon, IonLabel, AppHeaderComponent, TranslatePipe],
})
export class MorePage {
  readonly options = [
    { labelKey: 'more.recipes', detailKey: 'more.recipesDesc', icon: 'restaurant-outline', link: '/recipes' },
    { labelKey: 'more.locator', detailKey: 'more.locatorDesc', icon: 'map-outline', link: '/store-locator' },
    { labelKey: 'more.download', detailKey: 'more.downloadDesc', icon: 'phone-portrait-outline', link: '/app-download' },
  ];
}
