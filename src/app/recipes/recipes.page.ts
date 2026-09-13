import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // ← Añade esto
import { 
  IonHeader, IonToolbar, IonContent,
  IonButton
} from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';
import { RecipesService, Recipe } from '../services/recipes.service';

@Component({
  selector: 'app-recipes',
  templateUrl: './recipes.page.html',
  styleUrls: ['./recipes.page.scss'],
  standalone: true,
  imports: [
    CommonModule, // ← Esto incluye UpperCasePipe
    RouterModule,
    IonHeader, IonToolbar, IonContent,
    IonButton
  ]
})
export class RecipesPage {
  private recipesService = inject(RecipesService);

  recipes: Recipe[] = this.recipesService.getAllRecipes();

  viewRecipe(recipe: Recipe) {
    console.log('Viendo receta:', recipe.name);
  }
}