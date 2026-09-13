import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertController, IonButton, IonContent, IonFooter, IonIcon } from '@ionic/angular/standalone';
import { CartService, unitPriceOf } from '../core/cart.service';
import { CartItem } from '../models/catalog.model';
import { ClpPipe } from '../shared/pipes/clp.pipe';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';

/** "Mi compra": lo que la persona lleva y cuánto le costará en caja. */
@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: true,
  imports: [RouterLink, IonContent, IonFooter, IonButton, IonIcon, ClpPipe, AppHeaderComponent],
})
export class CartPage {
  private alertController = inject(AlertController);

  readonly cart = inject(CartService);

  unitPrice(item: CartItem): number {
    return unitPriceOf(item);
  }

  lineTotal(item: CartItem): number {
    return unitPriceOf(item) * item.qty;
  }

  // % del presupuesto ya gastado, tope 100 para que la barra no se desborde (Fase 3)
  budgetPercent(): number {
    const budget = this.cart.budget();
    if (!budget) return 0;
    return Math.min(100, Math.round((this.cart.total() / budget) * 100));
  }

  // FIJAR O CAMBIAR EL PRESUPUESTO
  async editBudget(): Promise<void> {
    const current = this.cart.budget();
    const alert = await this.alertController.create({
      header: current !== null ? 'Cambiar presupuesto' : 'Fijar un presupuesto',
      message: 'Te aviso cuando te acerques o te pases.',
      inputs: [
        {
          name: 'amount',
          type: 'number',
          min: 0,
          placeholder: 'Ej: 30000',
          value: current ?? undefined,
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        ...(current !== null ? [{ text: 'Quitar', role: 'destructive', handler: () => this.cart.setBudget(null) }] : []),
        {
          text: 'Guardar',
          handler: (data: { amount?: string }) => {
            const amount = Number(data.amount);
            if (Number.isFinite(amount) && amount > 0) {
              this.cart.setBudget(amount);
            }
          },
        },
      ],
    });
    await alert.present();
  }

  // VACIAR CON CONFIRMACIÓN (es irreversible)
  async confirmClear(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Vaciar mi compra',
      message: `Se quitarán ${this.cart.count()} productos de la lista.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Vaciar', role: 'destructive', handler: () => this.cart.clear() },
      ],
    });
    await alert.present();
  }

  // IMAGEN DE RESPALDO SI LA URL FALLA
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/icon/favicon.png';
  }
}
