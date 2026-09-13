import { Component, computed, input } from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { NutritionFacts, NutritionResult } from '../../../models/nutrition.model';

interface NutrientRow {
  label: string;
  value: number | undefined;
  unit: string;
}

/**
 * Aporte nutricional de un producto (Open Food Facts): Nutri-Score, grupo
 * NOVA y los nutrientes principales por 100 g. Estados de carga, sin datos
 * y error se resuelven aquí para no repetirlos donde se use.
 */
@Component({
  selector: 'app-nutrition-card',
  standalone: true,
  imports: [IonIcon, IonSpinner],
  templateUrl: './nutrition-card.component.html',
  styleUrls: ['./nutrition-card.component.scss'],
})
export class NutritionCardComponent {
  loading = input(false);
  result = input<NutritionResult | undefined>(undefined);

  readonly facts = computed<NutritionFacts | null>(() => {
    const result = this.result();
    return result?.status === 'found' ? result.facts : null;
  });

  readonly rows = computed<NutrientRow[]>(() => {
    const facts = this.facts();
    if (!facts) return [];
    return [
      { label: 'Energía', value: facts.energyKcal100g, unit: 'kcal' },
      { label: 'Grasas', value: facts.fat100g, unit: 'g' },
      { label: 'Grasas saturadas', value: facts.saturatedFat100g, unit: 'g' },
      { label: 'Hidratos de carbono', value: facts.carbohydrates100g, unit: 'g' },
      { label: 'Azúcares', value: facts.sugars100g, unit: 'g' },
      { label: 'Fibra', value: facts.fiber100g, unit: 'g' },
      { label: 'Proteínas', value: facts.proteins100g, unit: 'g' },
      { label: 'Sal', value: facts.salt100g, unit: 'g' },
    ].filter(row => row.value !== undefined);
  });

  readonly novaLabel = computed(() => {
    switch (this.facts()?.novaGroup) {
      case 1: return 'Sin procesar o mínimamente procesado';
      case 2: return 'Ingrediente culinario procesado';
      case 3: return 'Procesado';
      case 4: return 'Ultraprocesado';
      default: return '';
    }
  });
}
