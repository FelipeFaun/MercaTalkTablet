import { Component } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButton, IonInput, IonItem, IonCard, 
  IonCardHeader, IonCardTitle, IonCardContent, IonIcon, 
  IonButtons, IonBackButton, IonSpinner, IonLabel,
  IonList, IonChip, IonText, IonCardSubtitle // ✅ AÑADIDO
} from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { search, location, navigate, storefront, arrowBack } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ProductsService, Product } from '../services/products';

@Component({
  selector: 'app-store-locator',
  templateUrl: './store-locator.page.html',
  styleUrls: ['./store-locator.page.scss'],
  standalone: true,
  imports: [
    RouterModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonInput, IonItem, IonCard, 
    IonCardHeader, IonCardTitle, IonCardContent, IonIcon, 
    IonButtons, IonBackButton, IonSpinner, IonLabel,
    IonList, IonChip, IonText, IonCardSubtitle, // ✅ AÑADIDO
    FormsModule,
    CommonModule
  ]
})
export class StoreLocatorPage {
  searchQuery: string = '';
  searchResults: Product[] = [];
  isLoading: boolean = false;
  showResults: boolean = false;
  selectedProduct: Product | null = null;

  constructor(private productsService: ProductsService) {
    addIcons({ search, location, navigate, storefront, arrowBack });
  }


  // 🔍 BUSCAR PRODUCTO PARA SABER SU UBICACIÓN
  searchProductLocation() {
    if (!this.searchQuery.trim()) return;
    
    this.isLoading = true;
    this.showResults = false;
    this.selectedProduct = null;
    
    setTimeout(() => {
      this.searchResults = this.productsService.searchProducts(this.searchQuery);
      this.isLoading = false;
      this.showResults = true;
      
      // Si hay un solo resultado, seleccionarlo automáticamente
      if (this.searchResults.length === 1) {
        this.selectProduct(this.searchResults[0]);
      }
    }, 800);
  }

  // 📍 SELECCIONAR PRODUCTO PARA VER SU UBICACIÓN
  selectProduct(product: Product) {
    this.selectedProduct = product;
  }

  // 🔙 VOLVER A LA LISTA DE RESULTADOS
  backToResults() {
    this.selectedProduct = null;
  }

  // 🗺️ OBTENER ICONO PARA EL PASILLO
  getAisleIcon(aisle: string): string {
    if (aisle.includes('1')) return '🥛'; // Lácteos
    if (aisle.includes('2')) return '🍚'; // Granos
    if (aisle.includes('3')) return '☕'; // Bebidas calientes
    if (aisle.includes('4')) return '🫒'; // Aceites
    return '📦';
  }

  // 🧹 LIMPIAR BÚSQUEDA
  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
    this.showResults = false;
    this.selectedProduct = null;
    this.isLoading = false;
  }
}