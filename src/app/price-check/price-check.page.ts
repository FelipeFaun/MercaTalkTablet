// src/app/price-check/price-check.page.ts

import { Component, ViewChild, ElementRef, OnDestroy, OnInit, NgZone, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonIcon, 
  IonSpinner 
} from '@ionic/angular/standalone';

import { Product, ProductsService } from '../services/products.service';
import { CartFeedbackService } from '../core/cart-feedback.service';
import { NutritionService } from '../core/nutrition.service';
import { NutritionResult } from '../models/nutrition.model';
import { NutritionCardComponent } from '../shared/components/nutrition-card/nutrition-card.component';
import { ClpPipe } from '../shared/pipes/clp.pipe';
import { TranslatePipe } from '../shared/pipes/translate.pipe';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';
import { BrandService } from '../core/brand.service';
import { ProductHelper, ProductMetrics, CheaperAlternativeItem } from '../core/product-helper';
import { CompareService } from '../services/compare.service';
import { ProductCompareModalComponent } from '../shared/components/product-compare-modal/product-compare-modal.component';

// ZXing
import { BrowserMultiFormatReader } from '@zxing/library';

@Component({
  selector: 'app-price-checker',
  templateUrl: './price-check.page.html',
  styleUrls: ['./price-check.page.scss'],
  standalone: true,
  imports: [
    AppHeaderComponent,
    CommonModule, 
    FormsModule,
    IonContent, 
    IonIcon, 
    IonSpinner,
    ClpPipe,
    NutritionCardComponent,
    TranslatePipe,
    ProductCompareModalComponent
  ],
})
export class PriceCheckerPage implements OnInit, OnDestroy {
  private productsService = inject(ProductsService);
  private cartFeedback = inject(CartFeedbackService);
  private nutritionService = inject(NutritionService);
  private ngZone = inject(NgZone);
  private brandService = inject(BrandService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly compareService = inject(CompareService);

  readonly currentBrand = this.brandService.currentBrand;

  // --- ViewChilds para cámara ---
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  // Variables de control de estado de la UI
  isScanning: boolean = false; 
  isLoading: boolean = false; 
  showResults: boolean = false; 
  hasSearched: boolean = false;
  
  // Variables de datos y errores
  productName: string = ''; 
  scanError: string | null = null; 
  scannedBarcode: string | null = null; 
  searchResults: Product[] = []; 

  // Estado del Consultor Hero (Función #1 Kiosk)
  selectedHeroProduct: Product | null = null;
  heroMetrics: ProductMetrics | null = null;

  // Drawer de Alternativas Generales
  showAlternativesDrawer: boolean = false;
  alternativesList: Product[] = [];

  // Drawer de Alternativas MÁS ECONÓMICAS (Mejora 3)
  showCheaperDrawer: boolean = false;
  cheaperAlternatives: CheaperAlternativeItem[] = [];

  // Toast Feedback para Kiosko
  kioskToastMessage: string | null = null;
  private toastTimer: any = null;

  // ZXing
  private codeReader: BrowserMultiFormatReader | null = null;
  private mediaStream: MediaStream | null = null;
  private scanTimeout: any = null;

  ngOnInit() {
    this.checkQueryParams();
  }

  ionViewWillEnter() {
    this.checkQueryParams();
  }

  private checkQueryParams() {
    const barcode = this.route.snapshot.queryParams['barcode'];
    const pid = this.route.snapshot.queryParams['productId'];
    if (barcode) {
      setTimeout(() => this.searchProductByBarcode(barcode), 150);
    } else if (pid) {
      const num = parseInt(pid, 10);
      const prod = this.productsService.getAllProducts().find(p => p.id === num);
      if (prod) {
        setTimeout(() => this.selectHeroProduct(prod), 150);
      }
    }
  }

  ngOnDestroy() {
    this.stopScanner(false);
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  showToast(message: string, durationMs: number = 3500) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.kioskToastMessage = message;
    this.toastTimer = setTimeout(() => {
      this.kioskToastMessage = null;
    }, durationMs);
  }

  // ------------------------------------------------------------------
  // Selección y Despliegue de Producto Kiosk Hero
  // ------------------------------------------------------------------
  selectHeroProduct(product: Product) {
    this.selectedHeroProduct = product;
    this.heroMetrics = ProductHelper.getMetrics(product);
    this.cheaperAlternatives = this.productsService.getCheaperAlternatives(product.id);
    this.showResults = true;
    this.hasSearched = true;
    this.productName = product.name;
    this.scanError = null;
  }

  // ------------------------------------------------------------------
  // Opciones Más Económicas (Mejora 3)
  // ------------------------------------------------------------------
  openCheaperAlternatives(product: Product) {
    this.cheaperAlternatives = this.productsService.getCheaperAlternatives(product.id);
    this.showCheaperDrawer = true;
  }

  closeCheaperAlternatives() {
    this.showCheaperDrawer = false;
  }

  compareWithCheaper(target: Product, cheaper: CheaperAlternativeItem) {
    this.compareService.clear();
    this.compareService.addProduct(target);
    this.compareService.addProduct(cheaper.product);
    this.showCheaperDrawer = false;
  }

  // ------------------------------------------------------------------
  // 4 Acciones Principales del Consultor Evolucionado
  // ------------------------------------------------------------------

  // 1. 📍 Ver Ubicación en Sala (Mapa 3D)
  viewLocation(product: Product) {
    void this.router.navigate(['/store-locator'], {
      queryParams: { productId: product.id }
    });
  }

  // 2. ⚖️ Comparar Producto
  compareProduct(product: Product) {
    const res = this.compareService.addProduct(product);
    this.showToast(res.message);

    if (this.compareService.isAwaitingSecondProduct()) {
      this.showToast(`"${product.name}" listo para comparar. Escanea o busca el segundo producto.`);
    }
  }

  // 3. 💰 Ver Alternativas
  openAlternatives(product: Product) {
    this.alternativesList = this.productsService.getSimilarProducts(product.id);
    this.showAlternativesDrawer = true;
  }

  closeAlternatives() {
    this.showAlternativesDrawer = false;
  }

  compareWithAlternative(current: Product, alt: Product) {
    this.compareService.clear();
    this.compareService.addProduct(current);
    this.compareService.addProduct(alt);
    this.showAlternativesDrawer = false;
  }

  // 4. ➕ Agregar a mi cálculo (Mi Compra)
  addToCart(product: Product) {
    void this.cartFeedback.addWithToast(product);
    this.showToast(`✓ "${product.name}" agregado a tu lista de compra.`);
  }

  // Acción rápida: Escanear otro producto
  scanAnother() {
    this.clearSearch();
    void this.startBarcodeScan();
  }

  // ------------------------------------------------------------------
  // Aporte nutricional (Open Food Facts)
  // ------------------------------------------------------------------
  expandedNutritionBarcode: string | null = null;
  nutritionLoading = false;
  private nutritionCache = new Map<string, NutritionResult>();

  async toggleNutrition(product: Product) {
    if (this.expandedNutritionBarcode === product.barcode) {
      this.expandedNutritionBarcode = null;
      return;
    }
    this.expandedNutritionBarcode = product.barcode;
    if (!this.nutritionCache.has(product.barcode)) {
      this.nutritionLoading = true;
      const result = await this.nutritionService.getByBarcode(product.barcode);
      this.nutritionCache.set(product.barcode, result);
      this.nutritionLoading = false;
    }
  }

  nutritionResult(barcode: string): NutritionResult | undefined {
    return this.nutritionCache.get(barcode);
  }

  // ------------------------------------------------------------------
  // Manejo de Imágenes
  // ------------------------------------------------------------------
  handleImageError(event: any) {
    const fallbackImage = 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=300&fit=crop';
    event.target.src = fallbackImage;
  }

  // ------------------------------------------------------------------
  // Lógica de Búsqueda por Nombre
  // ------------------------------------------------------------------
  searchProduct() {
    this.clearState();
    const query = this.productName.trim();

    if (!query) {
      this.scanError = 'Por favor, ingresa un nombre o marca para buscar.';
      return;
    }

    this.isLoading = true;
    this.hasSearched = true;

    setTimeout(() => {
      this.searchResults = this.productsService.searchProducts(query);
      this.isLoading = false;
      this.showResults = true;
      this.scannedBarcode = null;

      if (this.searchResults.length === 0) {
        this.scanError = `No se encontraron resultados para "${query}".`;
      } else if (this.searchResults.length === 1) {
        // Si hay solo 1 coincidencia exacta, abrir vista Hero directamente
        this.selectHeroProduct(this.searchResults[0]);
      } else {
        this.scanError = null;
      }
    }, 500);
  }

  searchProducts() {
    this.searchProduct();
  }

  quickSearch(term: string) {
    this.productName = term;
    this.searchProduct();
  }

  // ------------------------------------------------------------------
  // Escaneo real con ZXing
  // ------------------------------------------------------------------
  async startBarcodeScan() {
    this.clearState();
    this.isScanning = true;
    this.scanError = null;
    this.scannedBarcode = null;

    this.codeReader = new BrowserMultiFormatReader();

    try {
      const devices = await this.codeReader.listVideoInputDevices();
      let deviceId: string | null = null;

      if (devices && devices.length > 0) {
        const rear = devices.find(d => /back|rear|environment/gi.test(d.label));
        deviceId = (rear && rear.deviceId) || devices[0].deviceId;
      }

      const video = this.videoElement.nativeElement;

      this.codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
        this.ngZone.run(() => {
          if (result) {
            const code = result.getText();
            this.scannedBarcode = code;
            this.stopScanner(true);
          } else if (err && (err.name && err.name !== 'NotFoundException')) {
            console.warn('ZXing error:', err);
          }
        });
      });

      setTimeout(() => {
        try {
          const stream = video.srcObject as MediaStream;
          if (stream) this.mediaStream = stream;
        } catch (e) {}
      }, 300);

      const TIMEOUT_MS = 15000;
      this.scanTimeout = setTimeout(() => {
        this.ngZone.run(() => {
          if (this.isScanning) {
            this.scanError = 'No se detectó ningún código. Intenta mejorar la iluminación o ajusta la distancia.';
            this.stopScanner(false);
          }
        });
      }, TIMEOUT_MS);

    } catch (error: any) {
      console.error('Error iniciando cámara / ZXing:', error);
      this.scanError = 'No se pudo iniciar la cámara. Revisa permisos o el hardware.';
      this.isScanning = false;
      try { this.codeReader?.reset(); } catch {}
    }
  }

  stopScanner(proceedToSearch: boolean = false) {
    this.isScanning = false;

    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }

    try {
      if (this.codeReader) {
        this.codeReader.reset();
        this.codeReader = null;
      }
    } catch (err) {
      console.warn('Error reseteando ZXing:', err);
    }

    try {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(t => t.stop());
        this.mediaStream = null;
      }

      if (this.videoElement && this.videoElement.nativeElement) {
        this.videoElement.nativeElement.srcObject = null;
      }
    } catch (err) {
      console.warn('Error deteniendo mediaStream:', err);
    }

    if (proceedToSearch && this.scannedBarcode) {
      this.searchProductByBarcode(this.scannedBarcode);
    }
  }

  cancelScan() {
    this.stopScanner(false);
  }

  simulateDemoScan(barcode: string = '7801234567890') {
    this.stopScanner(false);
    this.searchProductByBarcode(barcode);
  }

  // ------------------------------------------------------------------
  // Búsqueda por código de barras
  // ------------------------------------------------------------------
  searchProductByBarcode(barcode: string) {
    this.isLoading = true;
    this.showResults = true;
    this.hasSearched = true;
    this.scanError = null;

    setTimeout(() => {
      const product = this.productsService.findProductByBarcode(barcode);

      if (product) {
        this.searchResults = [product];
        this.productName = product.name;
        this.scanError = null;

        // Si el usuario estaba esperando el segundo producto para comparar, integrarlo de inmediato
        if (this.compareService.isAwaitingSecondProduct()) {
          const res = this.compareService.addProduct(product);
          this.showToast(res.message);
        }

        // Desplegar ficha Kiosk Hero
        this.selectHeroProduct(product);
      } else {
        this.searchResults = [];
        this.selectedHeroProduct = null;
        this.heroMetrics = null;
        this.scanError = `El código "${barcode}" no se encontró en la base de datos de precios.`;
        this.productName = '';
      }

      this.isLoading = false;
    }, 400);
  }

  // ------------------------------------------------------------------
  // Utilidades y Limpieza
  // ------------------------------------------------------------------
  clearState() {
    this.isLoading = false;
    this.showResults = false;
    this.hasSearched = false;
    this.scanError = null;
    this.scannedBarcode = null;
    this.searchResults = [];
    this.selectedHeroProduct = null;
    this.heroMetrics = null;
    this.showAlternativesDrawer = false;
  }

  clearSearch() {
    this.productName = '';
    this.clearState();
    this.stopScanner(false);
  }

  get searchQuery(): string {
    return this.productName;
  }

  set searchQuery(value: string) {
    this.productName = value;
  }
}
