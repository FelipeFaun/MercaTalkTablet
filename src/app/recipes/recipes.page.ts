import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // ← Añade esto
import { 
  IonContent, IonIcon
} from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';
import { RouterModule } from '@angular/router';
import { RecipesService, Recipe } from '../services/recipes.service';
import { TranslatePipe } from '../shared/pipes/translate.pipe';

@Component({
  selector: 'app-recipes',
  templateUrl: './recipes.page.html',
  styleUrls: ['./recipes.page.scss'],
  standalone: true,
  imports: [
    AppHeaderComponent,
    CommonModule, // ← Esto incluye UpperCasePipe
    RouterModule,
    IonContent,
    IonIcon,
    TranslatePipe
  ]
})
export class RecipesPage {
  private recipesService = inject(RecipesService);

  recipes: Recipe[] = this.recipesService.getAllRecipes();

  viewRecipe(recipe: Recipe) {
    console.log('Viendo receta:', recipe.name);
  }
}