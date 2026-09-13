// services/recipes.service.ts
import { Injectable, inject } from '@angular/core';
import { CatalogService } from '../core/catalog.service';
import { Product, Recipe } from '../models/catalog.model';

export type { Recipe } from '../models/catalog.model';

@Injectable({
  providedIn: 'root'
})
export class RecipesService {
  private catalog = inject(CatalogService);

  // OBTENER TODAS LAS RECETAS
  getAllRecipes(): Recipe[] {
    return this.catalog.getRecipes();
  }

  // BUSCAR RECETAS POR TÉRMINO
  searchRecipes(query: string): Recipe[] {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return this.getAllRecipes().filter(recipe =>
      recipe.name.toLowerCase().includes(lowerQuery) ||
      recipe.description.toLowerCase().includes(lowerQuery) ||
      recipe.mainIngredient.toLowerCase().includes(lowerQuery) ||
      recipe.category.toLowerCase().includes(lowerQuery) ||
      recipe.ingredients.some(ingredient =>
        ingredient.toLowerCase().includes(lowerQuery)
      )
    );
  }

  // BUSCAR RECETAS POR CATEGORÍA
  getRecipesByCategory(category: string): Recipe[] {
    return this.getAllRecipes().filter(recipe =>
      recipe.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  // OBTENER RECETA POR ID
  getRecipeById(id: number): Recipe | undefined {
    return this.getAllRecipes().find(recipe => recipe.id === id);
  }

  // PRODUCTOS DEL CATÁLOGO QUE USA LA RECETA (con precio y oferta)
  getRecipeProducts(recipe: Recipe): Product[] {
    return this.catalog.getRecipeProducts(recipe);
  }

  // OBTENER TODAS LAS CATEGORÍAS
  getAllCategories(): string[] {
    return [...new Set(this.getAllRecipes().map(recipe => recipe.category))];
  }

  // OBTENER RECETAS FÁCILES
  getEasyRecipes(): Recipe[] {
    return this.getAllRecipes().filter(recipe =>
      recipe.difficulty.toLowerCase().includes('fácil')
    );
  }

  // OBTENER RECETAS RÁPIDAS (menos de 20 min)
  getQuickRecipes(): Recipe[] {
    return this.getAllRecipes().filter(recipe => {
      const time = parseInt(recipe.time);
      return !isNaN(time) && time <= 20;
    });
  }
}
