import { Component } from '@angular/core';
import { IonRouterOutlet } from '@ionic/angular/standalone';

/**
 * Contenedor principal de la app (pantalla completa sin barra inferior de pestañas).
 */
@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [IonRouterOutlet],
})
export class TabsPage {}
