import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // ← Añade esto
import { 
  IonHeader, IonToolbar, IonContent,
  IonButton
} from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';
import { WALMART_RECIPES } from '../data/recipes.data';

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
  recipes = WALMART_RECIPES;
  
  constructor() {}

  viewRecipe(recipe: any) {
    console.log('Viendo receta:', recipe.name);
  }
}