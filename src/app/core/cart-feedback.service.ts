import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { CartService } from './cart.service';
import { Product } from '../models/catalog.model';

/**
 * Agrega al carrito y confirma con un toast ("Agregado · Ver mi compra").
 * Lo usan búsqueda, escáner, ofertas y (Fase 2) el chat.
 */
@Injectable({
  providedIn: 'root'
})
export class CartFeedbackService {
  private cart = inject(CartService);
  private toastController = inject(ToastController);
  private router = inject(Router);

  async addWithToast(product: Product, qty = 1): Promise<void> {
    this.cart.add(product, qty);

    if (Capacitor.isNativePlatform()) {
      void Haptics.impact({ style: ImpactStyle.Light });
    }

    const toast = await this.toastController.create({
      message: `${product.name} agregado a Mi compra`,
      duration: 2500,
      position: 'bottom',
      color: 'success',
      icon: 'cart',
      buttons: [
        {
          text: 'Ver',
          handler: () => { void this.router.navigate(['/cart']); },
        },
      ],
    });
    await toast.present();
  }
}
