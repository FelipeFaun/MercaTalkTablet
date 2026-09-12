// services/recipes.service.ts
import { Injectable } from '@angular/core';
import { WALMART_RECIPES } from '../data/recipes.data';

export interface Recipe {
  id: number;
  name: string;
  description: string;
  mainIngredient: string;
  category: string;
  difficulty: string;
  time: string;
  ingredients: string[];
  steps: string[];
  image: string;
  relatedProductId: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecipesService {
  private recipes: Recipe[] = WALMART_RECIPES;

  constructor() {}

  // BUSCAR RECETAS POR TÉRMINO
  searchRecipes(query: string): Recipe[] {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return this.recipes.filter(recipe => 
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
    return this.recipes.filter(recipe => 
      recipe.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  // OBTENER RECETA POR ID
  getRecipeById(id: number): Recipe | undefined {
    return this.recipes.find(recipe => recipe.id === id);
  }

  // OBTENER TODAS LAS CATEGORÍAS
  getAllCategories(): string[] {
    return [...new Set(this.recipes.map(recipe => recipe.category))];
  }

  // OBTENER RECETAS FÁCILES
  getEasyRecipes(): Recipe[] {
    return this.recipes.filter(recipe => 
      recipe.difficulty.toLowerCase().includes('fácil') || 
      recipe.difficulty.toLowerCase().includes('muy fácil')
    );
  }

  // OBTENER RECETAS RÁPIDAS (menos de 20 min)
  getQuickRecipes(): Recipe[] {
    return this.recipes.filter(recipe => {
      const time = parseInt(recipe.time);
      return !isNaN(time) && time <= 20;
    });
  }
}