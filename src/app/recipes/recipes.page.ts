import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';
import { RecipesService, Recipe } from '../services/recipes.service';
import { CartService } from '../core/cart.service';
import { CartFeedbackService } from '../core/cart-feedback.service';
import { Product } from '../models/catalog.model';
import { ClpPipe } from '../shared/pipes/clp.pipe';
import { TranslatePipe } from '../shared/pipes/translate.pipe';

@Component({
  selector: 'app-recipes',
  templateUrl: './recipes.page.html',
  styleUrls: ['./recipes.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonContent,
    IonIcon,
    AppHeaderComponent,
    ClpPipe,
    TranslatePipe
  ]
})
export class RecipesPage {
  private recipesService = inject(RecipesService);
  private cartService = inject(CartService);
  private cartFeedback = inject(CartFeedbackService);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);

  recipes: Recipe[] = this.recipesService.getAllRecipes();

  // RECETA SELECCIONADA PARA VER EL DETALLE Y LO QUE HAY QUE COMPRAR
  selectedRecipe = signal<Recipe | null>(null);

  // PRODUCTOS DEL SUPERMERCADO ASOCIADOS A LA RECETA
  selectedRecipeProducts = computed<Product[]>(() => {
    const r = this.selectedRecipe();
    return r ? this.recipesService.getRecipeProducts(r) : [];
  });

  // TOTAL ESTIMADO DE LOS PRODUCTOS (con ofertas aplicadas)
  selectedRecipeTotal = computed<number>(() => {
    return this.selectedRecipeProducts().reduce((sum, p) => sum + (p.offerPrice ?? p.price), 0);
  });

  // AHORRO TOTAL EN OFERTAS DE ESTA RECETA
  selectedRecipeSavings = computed<number>(() => {
    return this.selectedRecipeProducts().reduce((sum, p) => {
      return p.offerPrice ? sum + (p.price - p.offerPrice) : sum;
    }, 0);
  });

  viewRecipe(recipe: Recipe): void {
    this.selectedRecipe.set(recipe);
  }

  closeRecipe(): void {
    this.selectedRecipe.set(null);
  }

  addProduct(product: Product): void {
    void this.cartFeedback.addWithToast(product, 1);
  }

  async addAllProducts(): Promise<void> {
    const recipe = this.selectedRecipe();
    const products = this.selectedRecipeProducts();
    if (!products.length) return;

    for (const p of products) {
      this.cartService.add(p, 1);
    }

    const toast = await this.toastCtrl.create({
      message: `¡Se agregaron ${products.length} productos a Mi compra!`,
      duration: 3000,
      position: 'bottom',
      color: 'success',
      icon: 'checkmark-circle',
      buttons: [
        {
          text: 'Ver compra',
          handler: () => {
            void this.router.navigate(['/cart']);
          }
        }
      ]
    });
    await toast.present();
  }

  getProductQty(productId: number): number {
    return this.cartService.find(productId)?.qty ?? 0;
  }
}