// src/app/price-check/price-check.page.ts

import { Component, OnInit, ViewChild, ElementRef, OnDestroy, NgZone } from '@angular/core';
import { Product, ProductsService } from '../services/products';
import { 
  IonHeader, 
  IonToolbar, 
  IonContent, 
  IonButton, 
  IonIcon, 
  IonInput, 
  IonItem, 
  IonCard, 
  IonCardTitle, 
  IonCardSubtitle, 
  IonCardContent, 
  IonSpinner 
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// ZXing
import { BrowserMultiFormatReader } from '@zxing/library';

@Component({
  selector: 'app-price-checker',
  templateUrl: './price-check.page.html',
  styleUrls: ['./price-check.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink,
    IonHeader, 
    IonToolbar, 
    IonContent, 
    IonButton, 
    IonIcon, 
    IonInput, 
    IonItem, 
    IonCard, 
    IonCardTitle, 
    IonCardSubtitle, 
    IonCardContent,
    IonSpinner
  ],
})
export class PriceCheckerPage implements OnInit, OnDestroy {
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

  // ZXing
  private codeReader: BrowserMultiFormatReader | null = null;
  private mediaStream: MediaStream | null = null;
  private scanTimeout: any = null;

  constructor(private productsService: ProductsService, private ngZone: NgZone) {}

  ngOnInit() {}

  ngOnDestroy() {
    this.stopScanner(false);
  }

  // ------------------------------------------------------------------
  // 🖼️ Manejo de Imágenes
  // ------------------------------------------------------------------
  handleImageError(event: any) {
    const fallbackImage = 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=300&fit=crop';
    event.target.src = fallbackImage;
  }

  // ------------------------------------------------------------------
  // 🔍 Lógica de Búsqueda por Nombre
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
      } else {
        this.scanError = null;
      }
    }, 600);
  }

  searchProducts() {
    this.searchProduct();
  }

  // ------------------------------------------------------------------
  // 📸 Escaneo real con ZXing
  // ------------------------------------------------------------------

  /**
   * Inicia el escaneo usando ZXing (cámara real).
   * Selecciona preferentemente la cámara trasera y establece timeout de seguridad.
   */
  async startBarcodeScan() {
    this.clearState();
    this.isScanning = true;
    this.scanError = null;
    this.scannedBarcode = null;

    // crear lector
    this.codeReader = new BrowserMultiFormatReader();

    try {
      // listar dispositivos y elegir trasera si existe
      const devices = await this.codeReader.listVideoInputDevices();
      let deviceId: string | null = null;

      if (devices && devices.length > 0) {
        const rear = devices.find(d => /back|rear|environment/gi.test(d.label));
        deviceId = (rear && rear.deviceId) || devices[0].deviceId;
      }

      const video = this.videoElement.nativeElement;

      // Intentar usar decodeFromVideoDevice (stream + callback)
      // decodeFromVideoDevice libera la cámara cuando codeReader.reset() es llamado.
      this.codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
        // Callback ocurre fuera de zone; pasar a NgZone para updates Angular
        this.ngZone.run(() => {
          if (result) {
            const code = result.getText();
            // detener e iniciar búsqueda
            this.scannedBarcode = code;
            this.stopScanner(true);
          } else if (err && (err.name && err.name !== 'NotFoundException')) {
            // Otros errores de ZXing se loguean (NotFoundException es normal mientras no detecta)
            console.warn('ZXing error:', err);
          }
        });
      });

      // Guardar mediaStream si está disponible (para asegurarnos poder detenerlo)
      // decodeFromVideoDevice internamente asigna el stream al video; lo extraemos
      // después de un tick
      setTimeout(() => {
        try {
          const stream = video.srcObject as MediaStream;
          if (stream) this.mediaStream = stream;
        } catch (e) {
          // ignore
        }
      }, 300);

      // Timeout de seguridad: si no detecta en X ms, detiene y muestra opciones
      const TIMEOUT_MS = 15000; // 15s
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
      // Aseguramos limpieza
      try { this.codeReader?.reset(); } catch {}
    }
  }

  /**
   * Detiene el escáner y libera recursos.
   * Si proceedToSearch === true y hay scannedBarcode, ejecuta búsqueda por código.
   */
  stopScanner(proceedToSearch: boolean = false) {
    // marcar como no escaneando
    this.isScanning = false;

    // limpiar timeout
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }

    // reset ZXing
    try {
      if (this.codeReader) {
        this.codeReader.reset(); // detiene decodeFromVideoDevice y libera cámara
        this.codeReader = null;
      }
    } catch (err) {
      console.warn('Error reseteando ZXing:', err);
    }

    // detener mediaStream si existe
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

    // si se detectó código y se pide proceder, buscar
    if (proceedToSearch && this.scannedBarcode) {
      // Ejecutar búsqueda por código
      this.searchProductByBarcode(this.scannedBarcode);
    }
  }

  // ------------------------------------------------------------------
  // 🔎 Búsqueda por código
  // ------------------------------------------------------------------
  searchProductByBarcode(barcode: string) {
    this.isLoading = true;
    this.showResults = true;
    this.hasSearched = true;
    this.scanError = null;

    // Query simulada / pequeña latencia para UX
    setTimeout(() => {
      const product = this.productsService.findProductByBarcode(barcode);

      if (product) {
        this.searchResults = [product];
        this.productName = product.name;
        this.scanError = null;
      } else {
        this.searchResults = [];
        this.scanError = `El código "${barcode}" no se encontró en la base de datos de precios.`;
        this.productName = '';
      }

      this.isLoading = false;
    }, 600);
  }

  // ------------------------------------------------------------------
  // 🧹 Utilidades
  // ------------------------------------------------------------------
  clearState() {
    this.isLoading = false;
    this.showResults = false;
    this.hasSearched = false;
    this.scanError = null;
    this.scannedBarcode = null;
    this.searchResults = [];
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

  // método auxiliar para debug
  testService() {
    console.log('Productos:', this.productsService.getAllProducts());
  }
}
