import { Component } from '@angular/core';
import { IonApp, IonIcon, IonRouterOutlet } from '@ionic/angular/standalone';
import { TranslatePipe } from './shared/pipes/translate.pipe';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, IonIcon, TranslatePipe],
})
export class AppComponent {}
