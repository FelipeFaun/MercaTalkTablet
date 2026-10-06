import { 
  Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild, inject 
} from '@angular/core';
import { 
  IonContent, IonIcon, IonSpinner, IonBadge 
} from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { ProductsService, Product } from '../services/products.service';
import { BrandService } from '../core/brand.service';
import { ClpPipe } from '../shared/pipes/clp.pipe';
import { TranslatePipe } from '../shared/pipes/translate.pipe';
import { LanguageService } from '../core/language.service';
import { CartService } from '../core/cart.service';
import { VoiceService } from '../core/voice.service';
import { OffersService } from '../services/offers.service';
import { CartItem } from '../models/catalog.model';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Preferences } from '@capacitor/preferences';
import {
  AISLE_ACCESS, CHECKOUT_POINT, KIOSK_POINT, NavLeg, NavPoint, NavStep,
  buildSteps, estimateTrip, orderStops, pathLength, shortestPath
} from './store-navigation';

export interface AisleDefinition {
  id: number;
  label: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  badge: string;
  description: string;
  mapX: number;
  mapZ: number;
  width: number;
  depth: number;
  height: number;
}

interface AisleMeshData {
  group: THREE.Group;
  hitMesh: THREE.Mesh;
  baseMeshes: THREE.Mesh[];
  lineMeshes: THREE.LineSegments[];
  labelSprite?: THREE.Sprite;
  floorPad: THREE.Mesh;
  color: THREE.Color;
  lift: number;
  introDelay: number;
}

const ROUTE_DOT_COUNT = 5;
const INTRO_STAGGER_MS = 90;
const INTRO_DURATION_MS = 700;

function easeOutBack(t: number): number {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function aisleIdOf(product?: Product | null): number | null {
  const match = product?.supermarketLocation?.aisle?.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Una parada de la ruta del carrito: un pasillo y lo que hay que tomar ahí. */
export interface CartStop {
  aisle: AisleDefinition;
  items: { item: CartItem; product: Product }[];
  done: boolean;
}

/** Resumen de ofertas vigentes de un pasillo, para el rótulo 3D y el panel. */
export interface AisleOfferInfo {
  count: number;
  /** Días hasta que vence la oferta más próxima. */
  soonestDays: number;
}

const PICKED_KEY = 'mercatalk.store.picked';
/** Una oferta "vence pronto" si le quedan estos días o menos. */
const OFFER_SOON_DAYS = 14;

export interface ShelfGroup {
  shelfName: string;
  shelfNumber: number;
  products: Product[];
}

export const SUPERMARKET_AISLES: AisleDefinition[] = [
  {
    id: 1,
    label: 'Pasillo 1',
    name: 'Lácteos & Refrigerados',
    category: 'Lácteos',
    icon: 'nutrition-outline',
    color: '#2f8fd8',
    badge: 'Fresco',
    description: 'Leches, yogures, mantequillas, quesos y refrigerados',
    mapX: 28,
    mapZ: -36,
    width: 26,
    depth: 6,
    height: 7
  },
  {
    id: 2,
    label: 'Pasillo 2',
    name: 'Abarrotes & Despensa',
    category: 'Abarrotes',
    icon: 'restaurant-outline',
    color: '#d99a1e',
    badge: 'Despensa',
    description: 'Arroz, fideos, harinas, azúcar, sopas y conservas',
    mapX: -16,
    mapZ: -2,
    width: 6,
    depth: 34,
    height: 6.5
  },
  {
    id: 3,
    label: 'Pasillo 3',
    name: 'Bebidas, Aguas & Café',
    category: 'Bebidas',
    icon: 'cafe-outline',
    color: '#14a39a',
    badge: 'Líquidos',
    description: 'Bebidas gaseosas, jugos naturales, aguas minerales y té',
    mapX: 0,
    mapZ: -2,
    width: 6,
    depth: 34,
    height: 6.5
  },
  {
    id: 4,
    label: 'Pasillo 4',
    name: 'Limpieza, Hogar & Congelados',
    category: 'Limpieza',
    icon: 'sparkles-outline',
    color: '#7c5cd6',
    badge: 'Hogar',
    description: 'Detergentes, desinfectantes, lavalozas y productos congelados',
    mapX: 16,
    mapZ: -2,
    width: 6,
    depth: 34,
    height: 6.5
  },
  {
    id: 5,
    label: 'Pasillo 5',
    name: 'Frutas, Verduras & Granel',
    category: 'Frutas y Verduras',
    icon: 'leaf-outline',
    color: '#3fa34d',
    badge: 'Fresco',
    description: 'Manzanas, plátanos, tomates, paltas y frutos secos',
    mapX: -36,
    mapZ: 2,
    width: 8,
    depth: 36,
    height: 3.5
  },
  {
    id: 6,
    label: 'Pasillo 6',
    name: 'Carnicería, Pollo & Pescadería',
    category: 'Carnicería',
    icon: 'fast-food-outline',
    color: '#d6453d',
    badge: 'Carnes',
    description: 'Pechuga de pollo fresca, pescados y cortes de vacuno seleccionados',
    mapX: -16,
    mapZ: -36,
    width: 28,
    depth: 6,
    height: 6
  },
  {
    id: 7,
    label: 'Pasillo 7',
    name: 'Panadería & Pastelería',
    category: 'Panadería',
    icon: 'pizza-outline',
    color: '#c9782b',
    badge: 'Panadería',
    description: 'Pan de molde horneado y bollería seleccionada',
    mapX: 36,
    mapZ: -3,
    width: 8,
    depth: 16,
    height: 5.5
  },
  {
    id: 8,
    label: 'Pasillo 8',
    name: 'Cuidado Personal & Farmacia',
    category: 'Cuidado Personal',
    icon: 'medkit-outline',
    color: '#d4559a',
    badge: 'Higiene',
    description: 'Desodorantes, aseo corporal y cuidado diario',
    mapX: 36,
    mapZ: 18,
    width: 8,
    depth: 16,
    height: 6
  },
  {
    id: 9,
    label: 'Pasillo 9',
    name: 'Vinos, Cervezas & Licores',
    category: 'Vinos',
    icon: 'wine-outline',
    color: '#8e2a4a',
    badge: 'Vinos',
    description: 'Vinos tintos Carmenere y cepas seleccionadas',
    mapX: 36,
    mapZ: -24,
    width: 8,
    depth: 14,
    height: 7
  },
];

@Component({
  selector: 'app-store-locator',
  templateUrl: './store-locator.page.html',
  styleUrls: ['./store-locator.page.scss'],
  standalone: true,
  imports: [
    AppHeaderComponent,
    RouterModule,
    IonContent,
    IonIcon,
    IonSpinner,
    IonBadge,
    ClpPipe,
    TranslatePipe,
    FormsModule,
    CommonModule
  ]
})
export class StoreLocatorPage implements OnInit, OnDestroy {
  @ViewChild('canvasContainer', { static: false }) canvasContainerRef!: ElementRef<HTMLDivElement>;

  @ViewChild('scanVideo', { static: false }) scanVideoRef?: ElementRef<HTMLVideoElement>;

  private productsService = inject(ProductsService);
  private offersService = inject(OffersService);
  readonly cartService = inject(CartService);
  readonly voice = inject(VoiceService);
  private ngZone = inject(NgZone);
  private route = inject(ActivatedRoute);
  readonly brandService = inject(BrandService);
  readonly langService = inject(LanguageService);

  readonly aisles: AisleDefinition[] = SUPERMARKET_AISLES;

  searchQuery: string = '';
  searchResults: Product[] = [];
  isLoading: boolean = false;

  selectedAisleId: number | null = null;
  selectedProduct: Product | null = null;
  highlightedShelf: string | null = null;
  previousAisleId: number | null = null;
  isRouteActive: boolean = false;

  // Ruta del carrito (lista de compras con avance)
  cartRouteActive = false;
  cartStops: CartStop[] = [];
  unlocatedItems: CartItem[] = [];
  private pickedIds = new Set<number>();

  // Indicaciones paso a paso
  navSteps: NavStep[] = [];
  trip: { meters: number; minutes: number } | null = null;
  activeStepIndex: number | null = null;
  stepsExpanded = true;

  // Ofertas en el mapa
  showOffers = true;
  aisleOffers = new Map<number, AisleOfferInfo>();

  // Búsqueda por voz
  voiceFeedback: string | null = null;

  // Escáner de código de barras
  isScannerOpen = false;
  isScanning = false;
  scanError: string | null = null;
  manualBarcode = '';
  private codeReader: BrowserMultiFormatReader | null = null;

  currentPerspective: 'isometric' | 'entrance' = 'isometric';
  currentTheme: 'light' | 'dark' = 'light';

  // Three.js Core
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Three.js Raycaster & Hover
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private hoveredAisleId: number | null = null;
  private isPointerDown = false;
  private pointerDownPos = { x: 0, y: 0 };

  // Three.js Objects & Meshes
  private floorMesh!: THREE.Mesh;
  private gridHelper!: THREE.GridHelper;
  private borderLines!: THREE.LineSegments;
  private kioskPulseMesh: THREE.Mesh | null = null;
  private routeGroup = new THREE.Group();
  private beaconGroup = new THREE.Group();

  private aisleMeshes = new Map<number, AisleMeshData>();

  // Smooth Camera Animation Targets
  private targetCamPos: THREE.Vector3 | null = null;
  private targetLookAt: THREE.Vector3 | null = null;

  // Animación: entrada escalonada, ruta que se dibuja y pulsos
  private readonly reduceMotion =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  private introStart = 0;
  private routeLegs: { meshes: THREE.Mesh[]; from: number; to: number }[] = [];
  private routeCurve: THREE.CurvePath<THREE.Vector3> | null = null;
  private routeLength = 0;
  private routeStart = 0;
  private offerSprites = new Map<number, THREE.Sprite>();
  private stepMarker: THREE.Mesh | null = null;
  private routeDots: THREE.Mesh[] = [];
  private destRipples: THREE.Mesh[] = [];
  private lastFrameTime = 0;

  ngOnInit(): void {
    this.resetToInitialState();
    this.computeAisleOffers();
    void this.restorePicked();
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.init3DScene();
    });
    this.checkInitialProductQuery();
  }

  ionViewWillEnter(): void {
    this.resetToInitialState();
    if (this.renderer && this.canvasContainerRef) {
      this.handleResize();
      this.update3DHoverVisuals();
    }
    this.checkInitialProductQuery();
  }

  private checkInitialProductQuery(): void {
    const pid = this.route.snapshot.queryParams['productId'];
    if (pid) {
      const numId = parseInt(pid, 10);
      const found = this.productsService.getAllProducts().find(p => p.id === numId);
      if (found) {
        setTimeout(() => {
          this.selectProduct(found);
        }, 500);
      }
    }
  }

  ionViewWillLeave(): void {
    this.closeScanner();
    this.voice.stopListening();
    this.voice.stopSpeaking();
  }

  ngOnDestroy(): void {
    this.closeScanner();
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  resetToInitialState(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedProduct = null;
    this.highlightedShelf = null;
    this.selectedAisleId = null;
    this.previousAisleId = null;
    this.isRouteActive = false;
    this.isLoading = false;
    this.cartRouteActive = false;
    this.voiceFeedback = null;
    this.cancelCameraAnimation();
    this.update3DHoverVisuals();
    this.clear3DRoute();
  }

  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyThemeColors();
  }

  private cancelCameraAnimation(): void {
    this.targetCamPos = null;
    this.targetLookAt = null;
  }

  // =========================================================================
  // MOTOR 3D THREE.JS
  // =========================================================================

  private init3DScene(): void {
    if (!this.canvasContainerRef) return;
    const container = this.canvasContainerRef.nativeElement;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Escena
    this.scene = new THREE.Scene();

    // Cámara Perspectiva
    this.camera = new THREE.PerspectiveCamera(40, width / height, 1, 1000);
    this.camera.position.set(38, 62, 58);

    // Renderizador WebGL
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Controles Orbitales
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minDistance = 18;
    this.controls.maxDistance = 180;
    this.controls.target.set(0, 0, 0);

    // Cancelar animación de cámara automática cuando el usuario toque/arrastre/zoom
    this.controls.addEventListener('start', () => {
      this.cancelCameraAnimation();
    });

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.9);
    dirLight.position.set(40, 85, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.9);
    fillLight.position.set(-45, 45, -35);
    this.scene.add(fillLight);

    // Construcción del Supermercado 3D
    this.buildArchitecturalFloor();
    this.buildPerimeterBoundaries();
    this.buildCheckoutLanes();
    this.buildKioskStation();
    this.buildEntrancePortal();
    this.buildAllAisles();
    this.buildOfferBadges();
    this.buildStepMarker();

    this.scene.add(this.routeGroup);
    this.scene.add(this.beaconGroup);

    // Aplicar Colores Iniciales del Tema Claro
    this.applyThemeColors();

    // Eventos de Puntero
    const dom = this.renderer.domElement;
    dom.addEventListener('pointermove', this.onPointerMove.bind(this));
    dom.addEventListener('pointerdown', this.onPointerDown.bind(this));
    dom.addEventListener('pointerup', this.onPointerUp.bind(this));

    // Observer para Resize
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(container);

    // Iniciar Animación
    this.animate();
  }

  private handleResize(): void {
    if (!this.canvasContainerRef || !this.renderer || !this.camera) return;
    const container = this.canvasContainerRef.nativeElement;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // =========================================================================
  // MODELADO ARQUITECTÓNICO PROCEDURAL
  // =========================================================================

  private buildArchitecturalFloor(): void {
    const floorGeo = new THREE.BoxGeometry(98, 1.2, 88);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.05
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.set(0, -0.6, 0);
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    this.gridHelper = new THREE.GridHelper(96, 24, 0x94a3b8, 0xe2e8f0);
    this.gridHelper.position.set(0, 0.02, 0);
    this.scene.add(this.gridHelper);

    const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(96.2, 0.2, 86.2));
    const borderMat = new THREE.LineBasicMaterial({ color: 0x64748b, linewidth: 2 });
    this.borderLines = new THREE.LineSegments(borderGeo, borderMat);
    this.borderLines.position.set(0, 0.05, 0);
    this.scene.add(this.borderLines);
  }

  private buildPerimeterBoundaries(): void {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.6,
      metalness: 0.1
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.22,
      roughness: 0.1,
      metalness: 0.6
    });

    // Muro Trasero
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(96, 4, 1.5), wallMat);
    backWall.position.set(0, 2, -43);
    backWall.castShadow = true;
    this.scene.add(backWall);

    // Muro Lateral Izquierdo
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4, 86), wallMat);
    leftWall.position.set(-48, 2, 0);
    leftWall.castShadow = true;
    this.scene.add(leftWall);

    // Muro Lateral Derecho
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4, 86), wallMat);
    rightWall.position.set(48, 2, 0);
    rightWall.castShadow = true;
    this.scene.add(rightWall);

    // Muro Frontal de Cristal
    const frontWallA = new THREE.Mesh(new THREE.BoxGeometry(10, 2.5, 1.2), glassMat);
    frontWallA.position.set(-43, 1.25, 43);
    this.scene.add(frontWallA);

    const frontWallB = new THREE.Mesh(new THREE.BoxGeometry(40, 2.5, 1.2), glassMat);
    frontWallB.position.set(28, 1.25, 43);
    this.scene.add(frontWallB);
  }

  private buildCheckoutLanes(): void {
    const checkoutGroup = new THREE.Group();
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.4 });
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.2 });

    const lanePositions = [-10, -2, 6, 14, 22, 30];

    lanePositions.forEach(x => {
      const desk = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.8, 10), counterMat);
      desk.position.set(x, 0.9, 32);
      desk.castShadow = true;
      desk.receiveShadow = true;
      checkoutGroup.add(desk);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.5), poleMat);
      pole.position.set(x + 1.2, 2.3, 31);
      checkoutGroup.add(pole);

      const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.15), screenMat);
      monitor.position.set(x + 1.2, 3.2, 31);
      checkoutGroup.add(monitor);
    });

    const signSprite = this.createTextSprite('LÍNEA DE CAJAS');
    signSprite.position.set(10, 5.5, 32);
    signSprite.scale.set(14, 3.5, 1);
    checkoutGroup.add(signSprite);

    this.scene.add(checkoutGroup);
  }

  private buildEntrancePortal(): void {
    const entranceGroup = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });

    const postLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 5), metalMat);
    postLeft.position.set(-36, 2.5, 41);
    entranceGroup.add(postLeft);

    const postRight = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 5), metalMat);
    postRight.position.set(-24, 2.5, 41);
    entranceGroup.add(postRight);

    const beam = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.6, 0.6), metalMat);
    beam.position.set(-30, 5, 41);
    entranceGroup.add(beam);

    const entranceSign = this.createTextSprite('ENTRADA PRINCIPAL');
    entranceSign.position.set(-30, 6.2, 41);
    entranceSign.scale.set(14, 3.2, 1);
    entranceGroup.add(entranceSign);

    this.scene.add(entranceGroup);
  }

  private buildKioskStation(): void {
    const kioskGroup = new THREE.Group();
    kioskGroup.position.set(-32, 0, 36);

    const totemMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.7 });
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, emissive: 0x0369a1 });

    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.2, 1.2), totemMat);
    pedestal.position.set(0, 2.1, 0);
    pedestal.castShadow = true;
    kioskGroup.add(pedestal);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.4, 0.15), screenMat);
    screen.position.set(0, 2.7, 0.6);
    kioskGroup.add(screen);

    const ringGeo = new THREE.RingGeometry(2.2, 3.4, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });
    this.kioskPulseMesh = new THREE.Mesh(ringGeo, ringMat);
    this.kioskPulseMesh.position.set(0, 0.06, 0);
    kioskGroup.add(this.kioskPulseMesh);

    const labelSprite = this.createTextSprite('TÚ ESTÁS AQUÍ');
    labelSprite.position.set(0, 7.8, 0);
    labelSprite.scale.set(12, 3, 1);
    kioskGroup.add(labelSprite);

    this.scene.add(kioskGroup);
  }

  private buildAllAisles(): void {
    this.aisleMeshes.clear();
    this.introStart = performance.now();

    // Las góndolas emergen del suelo desde la entrada hacia el fondo
    const order = [...this.aisles].sort((a, b) => (b.mapZ - a.mapZ) || (a.mapX - b.mapX));

    this.aisles.forEach(aisle => {
      const aisleData = this.createAisle3DObject(aisle);
      aisleData.introDelay = this.reduceMotion ? 0 : order.indexOf(aisle) * INTRO_STAGGER_MS;
      if (!this.reduceMotion) {
        aisleData.group.scale.set(1, 0.001, 1);
        aisleData.floorPad.scale.set(0.001, 1, 0.001);
      }
      this.aisleMeshes.set(aisle.id, aisleData);
      this.scene.add(aisleData.group);
      this.scene.add(aisleData.floorPad);
    });
  }

  private createAisle3DObject(aisle: AisleDefinition): AisleMeshData {
    const group = new THREE.Group();
    group.position.set(aisle.mapX, 0, aisle.mapZ);
    group.userData = { aisleId: aisle.id };

    const baseMeshes: THREE.Mesh[] = [];
    const lineMeshes: THREE.LineSegments[] = [];

    const shelfMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.45,
      metalness: 0.25
    });

    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x1e293b,
      linewidth: 1.5
    });

    // Hitbox táctil
    const hitGeo = new THREE.BoxGeometry(aisle.width + 2, aisle.height + 2, aisle.depth + 2);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.set(0, (aisle.height + 2) / 2, 0);
    hitMesh.userData = { aisleId: aisle.id };
    group.add(hitMesh);

    if (aisle.id === 5) {
      // Frutas y Verduras: Islas escalonadas
      const tableCount = 4;
      const step = aisle.depth / tableCount;
      const startZ = -aisle.depth / 2 + step / 2;

      for (let i = 0; i < tableCount; i++) {
        const tableZ = startZ + i * step;
        const baseBox = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.2, step * 0.72), shelfMat.clone());
        baseBox.position.set(0, 1.1, tableZ);
        baseBox.castShadow = true;
        baseBox.receiveShadow = true;
        group.add(baseBox);
        baseMeshes.push(baseBox);

        const edgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(baseBox.geometry), edgeMat.clone());
        edgeLines.position.copy(baseBox.position);
        group.add(edgeLines);
        lineMeshes.push(edgeLines);
      }
    } else if (aisle.id === 1 || aisle.id === 6) {
      // Lácteos o Carnes: Murales refrigerados
      const moduleCount = 3;
      const moduleWidth = aisle.width / moduleCount;
      const startX = -aisle.width / 2 + moduleWidth / 2;

      for (let i = 0; i < moduleCount; i++) {
        const modX = startX + i * moduleWidth;
        const cabinet = new THREE.Mesh(new THREE.BoxGeometry(moduleWidth * 0.9, aisle.height, aisle.depth), shelfMat.clone());
        cabinet.position.set(modX, aisle.height / 2, 0);
        cabinet.castShadow = true;
        cabinet.receiveShadow = true;
        group.add(cabinet);
        baseMeshes.push(cabinet);

        const edgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(cabinet.geometry), edgeMat.clone());
        edgeLines.position.copy(cabinet.position);
        group.add(edgeLines);
        lineMeshes.push(edgeLines);
      }
    } else {
      // Góndolas Centrales
      const mainGondola = new THREE.Mesh(new THREE.BoxGeometry(aisle.width, aisle.height, aisle.depth), shelfMat.clone());
      mainGondola.position.set(0, aisle.height / 2, 0);
      mainGondola.castShadow = true;
      mainGondola.receiveShadow = true;
      group.add(mainGondola);
      baseMeshes.push(mainGondola);

      const edgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(mainGondola.geometry), edgeMat.clone());
      edgeLines.position.copy(mainGondola.position);
      group.add(edgeLines);
      lineMeshes.push(edgeLines);

      // Cabeceras de Góndola (Endcaps)
      if (aisle.depth > 20) {
        const capGeo = new THREE.BoxGeometry(aisle.width * 1.15, aisle.height * 0.85, 2.2);
        const northCap = new THREE.Mesh(capGeo, shelfMat.clone());
        northCap.position.set(0, (aisle.height * 0.85) / 2, aisle.depth / 2 + 1.1);
        group.add(northCap);
        baseMeshes.push(northCap);

        const southCap = new THREE.Mesh(capGeo, shelfMat.clone());
        southCap.position.set(0, (aisle.height * 0.85) / 2, -aisle.depth / 2 - 1.1);
        group.add(southCap);
        baseMeshes.push(southCap);
      }
    }

    // Rótulo Flotante 3D
    const labelSprite = this.createTextSprite(`P-0${aisle.id} ${aisle.category}`, aisle.color);
    labelSprite.position.set(0, aisle.height + 3.2, 0);
    labelSprite.scale.set(13, 3.2, 1);
    group.add(labelSprite);

    // Zona de color en el piso: identifica la sección aun vista desde arriba
    const padGeo = new THREE.PlaneGeometry(aisle.width + 5, aisle.depth + 5);
    padGeo.rotateX(-Math.PI / 2);
    const padMat = new THREE.MeshBasicMaterial({
      color: aisle.color,
      transparent: true,
      opacity: 0.16,
      depthWrite: false
    });
    const floorPad = new THREE.Mesh(padGeo, padMat);
    floorPad.position.set(aisle.mapX, 0.04, aisle.mapZ);
    floorPad.renderOrder = 1;

    return {
      group,
      hitMesh,
      baseMeshes,
      lineMeshes,
      labelSprite,
      floorPad,
      color: new THREE.Color(aisle.color),
      lift: 0,
      introDelay: 0
    };
  }

  private createTextSprite(text: string, accent?: string): THREE.Sprite {
    const isLight = this.currentTheme === 'light';
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Fondo pastilla monocromática nítida
    ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)';
    this.roundRect(ctx, 16, 16, 480, 96, 24);
    ctx.fill();

    ctx.strokeStyle = isLight ? '#0f172a' : '#cbd5e1';
    ctx.lineWidth = 4;
    this.roundRect(ctx, 16, 16, 480, 96, 24);
    ctx.stroke();

    ctx.font = 'bold 36px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
    ctx.textBaseline = 'middle';

    if (accent) {
      // Punto de color de la sección a la izquierda del texto
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(64, 64, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(text, 96, 64, 380);
    } else {
      ctx.textAlign = 'center';
      ctx.fillText(text, 256, 64);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(mat);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private updateAllSpritesTheme(): void {
    this.aisleMeshes.forEach((data, id) => {
      const aisle = this.aisles.find(a => a.id === id);
      if (!aisle || !data.labelSprite) return;
      const newSprite = this.createTextSprite(`P-0${aisle.id} ${aisle.category}`, aisle.color);
      data.labelSprite.material.map?.dispose();
      data.labelSprite.material.map = newSprite.material.map;
      data.labelSprite.material.needsUpdate = true;
    });
  }

  private applyThemeColors(): void {
    const isLight = this.currentTheme === 'light';

    if (this.scene) {
      // En modo oscuro: fondo obsidiana profundo
      this.scene.background = new THREE.Color(isLight ? 0xf1f5f9 : 0x050811);
      this.scene.fog = new THREE.FogExp2(isLight ? 0xf1f5f9 : 0x050811, isLight ? 0.0035 : 0.0055);
    }

    if (this.floorMesh) {
      const mat = this.floorMesh.material as THREE.MeshStandardMaterial;
      // En modo oscuro: losa en 0x080d1a
      mat.color.setHex(isLight ? 0xffffff : 0x080d1a);
      mat.roughness = isLight ? 0.9 : 0.8;
      mat.metalness = isLight ? 0.05 : 0.2;
    }

    // Recrear cuadrícula según tema
    if (this.gridHelper && this.scene) {
      this.scene.remove(this.gridHelper);
      this.gridHelper = new THREE.GridHelper(
        96, 
        24, 
        isLight ? 0x94a3b8 : 0x334155, 
        isLight ? 0xe2e8f0 : 0x1e293b
      );
      this.gridHelper.position.set(0, 0.02, 0);
      this.scene.add(this.gridHelper);
    }

    if (this.kioskPulseMesh) {
      const mat = this.kioskPulseMesh.material as THREE.MeshBasicMaterial;
      mat.color.setHex(isLight ? 0x0f172a : 0x38bdf8);
    }

    this.updateAllSpritesTheme();
    this.update3DHoverVisuals();

    if ((this.selectedAisleId && this.isRouteActive) || this.cartRouteActive) {
      this.update3DRoute(false);
    }
  }

  // =========================================================================
  // INTERACCIÓN DE PUNTERO
  // =========================================================================

  private onPointerMove(event: PointerEvent): void {
    if (!this.canvasContainerRef || !this.renderer) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hitMeshes = Array.from(this.aisleMeshes.values()).map(a => a.hitMesh);
    const intersects = this.raycaster.intersectObjects(hitMeshes, false);

    if (intersects.length > 0) {
      const aisleId = intersects[0].object.userData['aisleId'] as number;
      if (this.hoveredAisleId !== aisleId) {
        this.hoveredAisleId = aisleId;
        this.renderer.domElement.style.cursor = 'pointer';
        this.update3DHoverVisuals();
      }
    } else {
      if (this.hoveredAisleId !== null) {
        this.hoveredAisleId = null;
        this.renderer.domElement.style.cursor = 'default';
        this.update3DHoverVisuals();
      }
    }
  }

  private onPointerDown(event: PointerEvent): void {
    this.isPointerDown = true;
    this.pointerDownPos = { x: event.clientX, y: event.clientY };
    this.cancelCameraAnimation();
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;

    const dist = Math.hypot(event.clientX - this.pointerDownPos.x, event.clientY - this.pointerDownPos.y);
    if (dist < 6 && this.hoveredAisleId !== null) {
      const selectedId = this.hoveredAisleId;
      this.ngZone.run(() => {
        this.selectAisle(selectedId);
      });
    }
  }

  // =========================================================================
  // ACTUALIZACIÓN DE RESALTADO Y RUTA EN 3D
  // =========================================================================

  private update3DHoverVisuals(): void {
    const isLight = this.currentTheme === 'light';
    const neutral = new THREE.Color(isLight ? 0xe2e8f0 : 0x1e293b);
    const hasSelection = this.selectedAisleId !== null || this.cartRouteActive;
    const pendingIds = new Set(this.cartRouteActive ? this.cartStops.filter(s => !s.done).map(s => s.aisle.id) : []);
    const doneIds = new Set(this.cartRouteActive ? this.cartStops.filter(s => s.done).map(s => s.aisle.id) : []);

    // Solo se fijan colores objetivo; animate() los interpola cada cuadro
    this.aisleMeshes.forEach((data, id) => {
      const isSelected = this.selectedAisleId === id;
      const isHovered = this.hoveredAisleId === id;

      let body: THREE.Color;
      let glow: THREE.Color;
      if (isSelected) {
        body = data.color.clone();
        glow = data.color.clone().multiplyScalar(0.35);
      } else if (isHovered) {
        body = data.color.clone().lerp(new THREE.Color(0xffffff), 0.12);
        glow = data.color.clone().multiplyScalar(0.18);
      } else if (pendingIds.has(id)) {
        // Parada de la compra que aún falta: color pleno
        body = data.color.clone();
        glow = data.color.clone().multiplyScalar(0.15);
      } else if (doneIds.has(id)) {
        // Parada completada: casi gris, para que se note que ya pasaste
        body = neutral.clone().lerp(data.color, 0.12);
        glow = new THREE.Color(0x000000);
      } else {
        // En reposo el color de la sección se mezcla con el neutro del tema;
        // si hay otra sección elegida, esta se apaga para que destaque aquella
        body = neutral.clone().lerp(data.color, hasSelection ? 0.28 : (isLight ? 0.62 : 0.7));
        glow = new THREE.Color(0x000000);
      }

      data.baseMeshes.forEach(mesh => {
        mesh.userData['targetColor'] = body;
        mesh.userData['targetEmissive'] = glow;
        (mesh.material as THREE.MeshStandardMaterial).roughness = isSelected ? 0.25 : 0.45;
      });

      const edge = isSelected || isHovered
        ? new THREE.Color(0xffffff)
        : data.color.clone().multiplyScalar(isLight ? 0.55 : 1.1);
      data.lineMeshes.forEach(line => {
        line.userData['targetColor'] = edge;
      });

      const padMat = data.floorPad.material as THREE.MeshBasicMaterial;
      padMat.userData['targetOpacity'] = isSelected ? 0.42
        : isHovered ? 0.3
        : pendingIds.has(id) ? 0.34
        : hasSelection ? 0.07
        : 0.16;
    });
  }

  private tweenAisleVisuals(now: number, dt: number): void {
    // Interpolación exponencial independiente de la tasa de cuadros (~150 ms)
    const k = this.reduceMotion ? 1 : 1 - Math.exp(-dt / 70);
    const pulse = this.reduceMotion ? 1 : 0.75 + 0.25 * Math.sin(now * 0.005);

    this.aisleMeshes.forEach((data, id) => {
      const isSelected = this.selectedAisleId === id;
      const isHovered = this.hoveredAisleId === id;

      // Entrada escalonada: la góndola crece desde el suelo con rebote suave
      if (data.group.scale.y < 1) {
        const t = Math.min(1, Math.max(0, (now - this.introStart - data.introDelay) / INTRO_DURATION_MS));
        const grow = Math.max(0.001, easeOutBack(t));
        data.group.scale.y = t >= 1 ? 1 : grow;
        const spread = Math.max(0.001, easeOutCubic(t));
        data.floorPad.scale.set(spread, 1, spread);
      }

      // Elevación al pasar el cursor o al seleccionar
      const targetLift = isSelected ? 1.2 : isHovered ? 0.7 : 0;
      data.lift += (targetLift - data.lift) * k;
      data.group.position.y = data.lift;

      data.baseMeshes.forEach(mesh => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const tc = mesh.userData['targetColor'] as THREE.Color | undefined;
        const te = mesh.userData['targetEmissive'] as THREE.Color | undefined;
        if (tc) mat.color.lerp(tc, k);
        if (te) {
          const e = isSelected ? te.clone().multiplyScalar(pulse) : te;
          mat.emissive.lerp(e, k);
        }
      });

      data.lineMeshes.forEach(line => {
        const tc = line.userData['targetColor'] as THREE.Color | undefined;
        if (tc) (line.material as THREE.LineBasicMaterial).color.lerp(tc, k);
      });

      const padMat = data.floorPad.material as THREE.MeshBasicMaterial;
      const to = padMat.userData['targetOpacity'] as number | undefined;
      if (to !== undefined) {
        const target = isSelected ? to * (0.8 + 0.2 * pulse) : to;
        padMat.opacity += (target - padMat.opacity) * k;
      }
    });
  }

  private clear3DRoute(): void {
    const disposeAll = (group: THREE.Group) => {
      while (group.children.length > 0) {
        const child = group.children[0] as THREE.Mesh | THREE.Sprite;
        group.remove(child);
        child.geometry?.dispose();
        const mat = child.material as THREE.Material & { map?: THREE.Texture | null };
        mat?.map?.dispose();
        mat?.dispose();
      }
    };
    disposeAll(this.routeGroup);
    disposeAll(this.beaconGroup);
    this.routeLegs = [];
    this.routeCurve = null;
    this.routeLength = 0;
    this.routeDots = [];
    this.destRipples = [];
    this.navSteps = [];
    this.trip = null;
    this.activeStepIndex = null;
    if (this.stepMarker) this.stepMarker.visible = false;
  }

  /** Vuelve a trazar la ruta activa: la del carrito o la de un pasillo. */
  private update3DRoute(autoFrameCamera: boolean = true): void {
    this.clear3DRoute();

    if (this.cartRouteActive) {
      this.renderCartRoute(autoFrameCamera);
      return;
    }

    if (!this.selectedAisleId || !this.isRouteActive) return;
    const aisle = this.aisles.find(a => a.id === this.selectedAisleId);
    if (!aisle) return;

    const legs: NavLeg[] = [{ aisleId: aisle.id, path: shortestPath(KIOSK_POINT, AISLE_ACCESS[aisle.id]) }];
    this.renderLegs(legs, autoFrameCamera);
    this.addDestinationBeacon(aisle, true);

    this.navSteps = this.buildNavSteps(legs);
    this.trip = estimateTrip(pathLength(legs[0].path), 0);
  }

  private renderCartRoute(autoFrameCamera: boolean): void {
    const pending = this.cartStops.filter(stop => !stop.done);
    const legs: NavLeg[] = [];
    let from: NavPoint = KIOSK_POINT;
    // Solo se camina hacia lo que falta; lo ya tomado queda marcado con ✓
    for (const stop of pending) {
      const to = AISLE_ACCESS[stop.aisle.id];
      legs.push({ aisleId: stop.aisle.id, path: shortestPath(from, to) });
      from = to;
    }
    legs.push({ aisleId: null, path: shortestPath(from, CHECKOUT_POINT) });

    this.renderLegs(legs, autoFrameCamera);

    this.cartStops.forEach((stop, i) => {
      this.addStopMarker(stop.aisle, i + 1, stop.done);
    });
    const next = pending[0];
    if (next) {
      this.addDestinationBeacon(next.aisle, false);
    }

    this.navSteps = this.buildNavSteps(legs);
    const total = legs.reduce((sum, leg) => sum + pathLength(leg.path), 0);
    this.trip = estimateTrip(total, pending.length);
  }

  private buildNavSteps(legs: NavLeg[]): NavStep[] {
    return buildSteps(
      legs,
      id => {
        const a = this.aisles.find(x => x.id === id)!;
        return { x: a.mapX, z: a.mapZ };
      },
      id => {
        const a = this.aisles.find(x => x.id === id)!;
        return `${this.getAisleLabel(a)} (${this.getAisleName(a)})`;
      }
    );
  }

  /**
   * Dibuja cada tramo con el color de su pasillo de destino (el tramo final a
   * cajas va en gris) y prepara la animación de trazado y los puntos viajeros.
   */
  private renderLegs(legs: NavLeg[], autoFrameCamera: boolean): void {
    const isLight = this.currentTheme === 'light';
    const toVec = (p: NavPoint) => new THREE.Vector3(p.x, 0.2, p.z);
    const fullPath = new THREE.CurvePath<THREE.Vector3>();

    const lengths = legs.map(leg => pathLength(leg.path));
    const total = lengths.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;

    legs.forEach((leg, i) => {
      if (leg.path.length < 2) return;
      const curve = new THREE.CurvePath<THREE.Vector3>();
      for (let k = 1; k < leg.path.length; k++) {
        const segment = new THREE.LineCurve3(toVec(leg.path[k - 1]), toVec(leg.path[k]));
        curve.add(segment);
        fullPath.add(segment);
      }

      const aisle = leg.aisleId !== null ? this.aisles.find(a => a.id === leg.aisleId) : undefined;
      const color = new THREE.Color(aisle ? aisle.color : (isLight ? 0x64748b : 0x94a3b8));
      const segments = Math.max(24, Math.round(lengths[i] * 3));

      const tubeGeo = new THREE.TubeGeometry(curve, segments, 0.38, 8, false);
      const tube = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({ color }));

      const haloGeo = new THREE.TubeGeometry(curve, segments, 0.9, 8, false);
      const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: isLight ? 0.18 : 0.28,
        depthWrite: false
      }));

      if (!this.reduceMotion) {
        tubeGeo.setDrawRange(0, 0);
        haloGeo.setDrawRange(0, 0);
      }
      this.routeGroup.add(halo, tube);
      this.routeLegs.push({ meshes: [tube, halo], from: acc / total, to: (acc + lengths[i]) / total });
      acc += lengths[i];
    });

    this.routeCurve = fullPath;
    this.routeLength = total;
    this.routeStart = performance.now();

    // Puntos que recorren la ruta indicando el sentido de la marcha
    if (!this.reduceMotion) {
      const dotCount = Math.min(14, Math.max(ROUTE_DOT_COUNT, Math.round(total / 24)));
      for (let i = 0; i < dotCount; i++) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.6, 16, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        dot.visible = false;
        this.routeGroup.add(dot);
        this.routeDots.push(dot);
      }
    }

    if (autoFrameCamera) {
      this.frameCameraOn(legs.flatMap(leg => leg.path));
    }
  }

  /** Encuadra la cámara para que se vea toda la ruta. */
  private frameCameraOn(points: NavPoint[]): void {
    if (points.length === 0) return;
    const xs = points.map(p => p.x);
    const zs = points.map(p => p.z);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const span = Math.max(maxX - minX, maxZ - minZ, 30);
    const d = span * 1.3;
    this.targetLookAt = new THREE.Vector3(cx, 2, cz);
    this.targetCamPos = new THREE.Vector3(cx + d * 0.42, d * 0.95, cz + d * 0.8);
  }

  /** Pin giratorio sobre el pasillo de destino y ondas en el punto de llegada. */
  private addDestinationBeacon(aisle: AisleDefinition, withPin: boolean): void {
    const color = new THREE.Color(aisle.color);
    const access = AISLE_ACCESS[aisle.id];

    if (withPin) {
      const pinGeo = new THREE.ConeGeometry(1.6, 3.2, 16);
      pinGeo.rotateX(Math.PI);
      const pin = new THREE.Mesh(pinGeo, new THREE.MeshStandardMaterial({
        color,
        emissive: color.clone().multiplyScalar(0.35),
        roughness: 0.2
      }));
      pin.position.set(aisle.mapX, aisle.height + 4.5, aisle.mapZ);
      pin.userData['baseY'] = aisle.height + 4.5;
      pin.userData['isPin'] = true;
      this.beaconGroup.add(pin);
    }

    const ringGeo = new THREE.RingGeometry(1.8, 2.6, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    ring.position.set(access.x, 0.1, access.z);
    this.beaconGroup.add(ring);

    if (!this.reduceMotion) {
      for (let i = 0; i < 2; i++) {
        const rippleGeo = new THREE.RingGeometry(2.4, 2.8, 48);
        rippleGeo.rotateX(-Math.PI / 2);
        const ripple = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false
        }));
        ripple.position.set(access.x, 0.12, access.z);
        ripple.userData['phase'] = i * 0.5;
        this.beaconGroup.add(ripple);
        this.destRipples.push(ripple);
      }
    }
  }

  /** Número de parada (o ✓ si ya se tomó todo) flotando sobre el pasillo. */
  private addStopMarker(aisle: AisleDefinition, order: number, done: boolean): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = done ? '#94a3b8' : aisle.color;
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(done ? '✓' : String(order), 64, 68);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    const baseY = aisle.height + 9.5;
    sprite.position.set(aisle.mapX, baseY, aisle.mapZ);
    sprite.scale.set(4.2, 4.2, 1);
    sprite.renderOrder = 10;
    sprite.userData['baseY'] = baseY;
    sprite.userData['marker'] = true;
    this.beaconGroup.add(sprite);
  }

  // =========================================================================
  // OFERTAS EN EL MAPA
  // =========================================================================

  private computeAisleOffers(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offers = this.offersService.getAllOffers();
    const products = this.productsService.getAllProducts();
    const info = new Map<number, AisleOfferInfo>();

    for (const offer of offers) {
      const product = products.find(p => p.id === offer.productId);
      const aisleId = aisleIdOf(product);
      if (aisleId === null) continue;
      const until = new Date(`${offer.validUntil}T00:00:00`);
      const days = Math.max(0, Math.round((until.getTime() - today.getTime()) / 86_400_000));
      const current = info.get(aisleId);
      info.set(aisleId, {
        count: (current?.count ?? 0) + 1,
        soonestDays: Math.min(current?.soonestDays ?? Infinity, days),
      });
    }
    this.aisleOffers = info;
  }

  isOfferSoon(info?: AisleOfferInfo): boolean {
    return !!info && info.soonestDays <= OFFER_SOON_DAYS;
  }

  /** Rótulo "% N ofertas" sobre cada pasillo; rojo si alguna vence pronto. */
  private buildOfferBadges(): void {
    this.aisleOffers.forEach((info, aisleId) => {
      const data = this.aisleMeshes.get(aisleId);
      const aisle = this.aisles.find(a => a.id === aisleId);
      if (!data || !aisle) return;

      const soon = this.isOfferSoon(info);
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = soon ? '#dc2626' : '#ea580c';
      this.roundRect(ctx, 16, 16, 480, 96, 48);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = `% ${info.count} ${info.count === 1 ? 'oferta' : 'ofertas'}`;
      ctx.fillText(soon ? `${label} · ${info.soonestDays} d` : label, 256, 66, 440);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
      const baseY = aisle.height + 6.4;
      sprite.position.set(0, baseY, 0);
      sprite.scale.set(9, 2.25, 1);
      sprite.userData['baseY'] = baseY;
      sprite.visible = this.showOffers;
      data.group.add(sprite);
      this.offerSprites.set(aisleId, sprite);
    });
  }

  toggleOffers(): void {
    this.showOffers = !this.showOffers;
    this.offerSprites.forEach(sprite => (sprite.visible = this.showOffers));
  }

  // =========================================================================
  // BUCLE DE ANIMACIÓN 60 FPS
  // =========================================================================

  private animate(): void {
    this.animFrameId = requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const dt = this.lastFrameTime ? Math.min(now - this.lastFrameTime, 100) : 16;
    this.lastFrameTime = now;
    const time = now * 0.002;

    this.tweenAisleVisuals(now, dt);

    if (!this.reduceMotion) {
      if (this.kioskPulseMesh) {
        const scale = 1 + (Math.sin(time * 3) + 1) * 0.15;
        this.kioskPulseMesh.scale.set(scale, 1, scale);
      }

      // Pin giratorio y números de parada flotando
      this.beaconGroup.children.forEach((child, i) => {
        const baseY = child.userData['baseY'] as number | undefined;
        if (baseY === undefined) return;
        if (child.userData['isPin']) {
          child.position.y = baseY + Math.sin(time * 2.5) * 0.6;
          child.rotation.y += 0.03;
        } else if (child.userData['marker']) {
          child.position.y = baseY + Math.sin(time * 2 + i) * 0.35;
        }
      });

      // Rótulos de oferta: vaivén suave, desfasado por pasillo
      if (this.showOffers) {
        this.offerSprites.forEach((sprite, aisleId) => {
          sprite.position.y = (sprite.userData['baseY'] as number) + Math.sin(time * 1.6 + aisleId) * 0.3;
        });
      }

      if (this.stepMarker?.visible) {
        const s = 1 + 0.25 * Math.sin(time * 4);
        this.stepMarker.scale.set(s, 1, s);
      }
    }

    this.animateRoute(now);

    if (this.targetCamPos && this.targetLookAt) {
      const k = 1 - Math.exp(-dt / 220);
      this.camera.position.lerp(this.targetCamPos, k);
      this.controls.target.lerp(this.targetLookAt, k);

      if (this.camera.position.distanceTo(this.targetCamPos) < 0.25) {
        this.cancelCameraAnimation();
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private animateRoute(now: number): void {
    if (!this.routeCurve || this.reduceMotion) return;

    // Trazado progresivo, tramo por tramo; más largo cuanto más larga la ruta
    const elapsed = now - this.routeStart;
    const drawDuration = Math.min(2400, 700 + this.routeLength * 6);
    const drawT = easeOutCubic(Math.min(1, elapsed / drawDuration));
    this.routeLegs.forEach(leg => {
      const local = Math.min(1, Math.max(0, (drawT - leg.from) / Math.max(1e-6, leg.to - leg.from)));
      leg.meshes.forEach(mesh => {
        const index = mesh.geometry.index;
        if (index) {
          // Redondeado a múltiplos de 6 para no cortar un triángulo a la mitad
          mesh.geometry.setDrawRange(0, Math.floor((index.count * local) / 6) * 6);
        }
      });
    });

    // Puntos viajeros a velocidad constante, cuando la ruta ya está dibujada
    const travelling = drawT >= 1;
    const period = Math.max(2000, (this.routeLength / 14) * 1000);
    this.routeDots.forEach((dot, i) => {
      dot.visible = travelling;
      if (!travelling) return;
      const u = ((elapsed - drawDuration) / period + i / this.routeDots.length) % 1;
      const p = this.routeCurve!.getPoint(Math.max(0, u));
      dot.position.set(p.x, p.y + 0.5, p.z);
      dot.scale.setScalar(0.6 + 0.4 * Math.sin(u * Math.PI));
    });

    // Ondas en el punto de llegada
    this.destRipples.forEach(ripple => {
      const t = (elapsed / 1800 + (ripple.userData['phase'] as number)) % 1;
      const scale = 1 + t * 2.2;
      ripple.scale.set(scale, 1, scale);
      (ripple.material as THREE.MeshBasicMaterial).opacity = travelling ? 0.55 * (1 - t) : 0;
    });
  }

  // =========================================================================
  // PRESETS DE CÁMARA
  // =========================================================================

  setPerspective(type: 'isometric' | 'entrance'): void {
    this.currentPerspective = type;

    if (type === 'isometric') {
      this.targetCamPos = new THREE.Vector3(38, 62, 58);
      this.targetLookAt = new THREE.Vector3(0, 0, 0);
    } else if (type === 'entrance') {
      this.targetCamPos = new THREE.Vector3(-36, 28, 64);
      this.targetLookAt = new THREE.Vector3(-22, 4, 18);
    }
  }

  zoomIn(): void {
    this.cancelCameraAnimation();
    const dir = new THREE.Vector3().subVectors(this.controls.target, this.camera.position).normalize();
    this.camera.position.addScaledVector(dir, 14);
    this.controls.update();
  }

  zoomOut(): void {
    this.cancelCameraAnimation();
    const dir = new THREE.Vector3().subVectors(this.controls.target, this.camera.position).normalize();
    this.camera.position.addScaledVector(dir, -14);
    this.controls.update();
  }

  resetView(): void {
    this.cancelCameraAnimation();
    this.setPerspective('isometric');
  }

  // =========================================================================
  // GESTIÓN DE PRODUCTOS, BÚSQUEDA Y SELECCIÓN
  // =========================================================================

  get allProducts(): Product[] {
    return this.productsService.getAllProducts();
  }

  get currentAisle(): AisleDefinition | undefined {
    if (!this.selectedAisleId) return undefined;
    return this.aisles.find(a => a.id === this.selectedAisleId);
  }

  getProductsInAisle(aisleId: number): Product[] {
    return this.allProducts.filter(p => p.supermarketLocation?.aisle === `Pasillo ${aisleId}`);
  }

  getShelfGroupsForAisle(aisleId: number): ShelfGroup[] {
    const products = this.getProductsInAisle(aisleId);
    const map = new Map<string, Product[]>();

    for (const p of products) {
      const shelfKey = p.supermarketLocation?.shelf || 'Estante 1';
      if (!map.has(shelfKey)) {
        map.set(shelfKey, []);
      }
      map.get(shelfKey)!.push(p);
    }

    return Array.from(map.entries())
      .map(([shelfName, prods]) => {
        const numMatch = shelfName.match(/\d+/);
        const shelfNumber = numMatch ? parseInt(numMatch[0], 10) : 1;
        return { shelfName, shelfNumber, products: prods };
      })
      .sort((a, b) => a.shelfNumber - b.shelfNumber);
  }

  selectAisle(aisleId: number): void {
    this.cartRouteActive = false;
    this.selectedAisleId = aisleId;
    this.previousAisleId = aisleId;
    this.selectedProduct = null;
    this.highlightedShelf = null;
    this.isRouteActive = true;
    this.searchQuery = '';
    this.searchResults = [];

    this.update3DHoverVisuals();
    this.update3DRoute(true);
  }

  onSearchFocus(): void {
    if (this.selectedProduct) {
      this.closeProduct();
    }
  }

  onSearchInput(): void {
    this.selectedProduct = null;
    this.highlightedShelf = null;
    this.isRouteActive = false;

    const q = this.searchQuery.trim();
    if (!q) {
      this.searchResults = [];
      this.isLoading = false;
      this.update3DHoverVisuals();
      this.clear3DRoute();
      return;
    }

    this.isLoading = true;
    setTimeout(() => {
      this.searchResults = this.productsService.searchProducts(q);
      this.isLoading = false;

      if (this.searchResults.length === 1) {
        this.selectProduct(this.searchResults[0]);
      }
    }, 200);
  }

  selectProduct(product: Product): void {
    if (!this.selectedProduct) {
      this.previousAisleId = this.selectedAisleId;
    }

    this.cartRouteActive = false;
    this.selectedProduct = product;
    this.isRouteActive = true;

    if (product.supermarketLocation?.aisle) {
      const match = product.supermarketLocation.aisle.match(/\d+/);
      if (match) {
        this.selectedAisleId = parseInt(match[0], 10);
      }
    }

    this.highlightedShelf = product.supermarketLocation?.shelf || null;
    this.update3DHoverVisuals();
    this.update3DRoute(true);
  }

  closeProduct(): void {
    this.selectedProduct = null;
    this.highlightedShelf = null;
    this.isRouteActive = false;
    this.selectedAisleId = this.previousAisleId;
    this.previousAisleId = null;
    this.update3DHoverVisuals();
    if (this.selectedAisleId) {
      this.update3DRoute(false);
    } else {
      this.clear3DRoute();
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedProduct = null;
    this.highlightedShelf = null;
    this.isRouteActive = false;
    this.selectedAisleId = null;
    this.previousAisleId = null;
    this.isLoading = false;
    this.cartRouteActive = false;
    this.voiceFeedback = null;
    this.update3DHoverVisuals();
    this.clear3DRoute();
  }

  // =========================================================================
  // PRODUCTOS QUE PUEDEN INTERESARLE AL CLIENTE (Recomendaciones dinámicas)
  // =========================================================================

  get featuredProducts(): Product[] {
    return this.productsService.getFeaturedInterestProducts(6);
  }

  get complementaryProducts(): Product[] {
    if (!this.selectedProduct) return [];
    return this.productsService.getRecommendedForProduct(this.selectedProduct, 4);
  }

  getAisleOffers(aisleId: number): Product[] {
    return this.productsService.getAisleRecommendations(aisleId, this.selectedProduct?.id, 4);
  }

  getAisleLabel(aisle?: AisleDefinition): string {
    if (!aisle) return '';
    const key = `storeLocator.aisle.${aisle.id}.label`;
    const translated = this.langService.t(key);
    return translated !== key ? translated : aisle.label;
  }

  getAisleName(aisle?: AisleDefinition): string {
    if (!aisle) return '';
    const key = `storeLocator.aisle.${aisle.id}.name`;
    const translated = this.langService.t(key);
    return translated !== key ? translated : aisle.name;
  }

  getAisleDesc(aisle?: AisleDefinition): string {
    if (!aisle) return '';
    const key = `storeLocator.aisle.${aisle.id}.desc`;
    const translated = this.langService.t(key);
    return translated !== key ? translated : aisle.description;
  }

  getShelfDisplay(shelfName?: string): string {
    if (!shelfName) return '';
    const match = shelfName.match(/\d+/);
    const num = match ? match[0] : '1';
    const shelfWord = this.langService.t('storeLocator.shelfLabel');
    return `${shelfWord} ${num}`;
  }

  getAisleDisplay(aisleName?: string): string {
    if (!aisleName) return '';
    const match = aisleName.match(/\d+/);
    if (!match) return aisleName;
    const num = parseInt(match[0], 10);
    const key = `storeLocator.aisle.${num}.label`;
    const translated = this.langService.t(key);
    return translated !== key ? translated : aisleName;
  }

  // =========================================================================
  // RUTA DEL CARRITO Y LISTA DE COMPRAS CON AVANCE
  // =========================================================================

  /** Resumen para la invitación del panel: cuántos productos y pasillos. */
  get cartSummary(): { items: number; aisles: number } {
    const items = this.cartService.items();
    const aisles = new Set<number>();
    for (const item of items) {
      const id = aisleIdOf(this.productsService.getAllProducts().find(p => p.id === item.productId));
      if (id !== null) aisles.add(id);
    }
    return { items: items.length, aisles: aisles.size };
  }

  get pickedCount(): number {
    return this.cartStops.reduce((sum, stop) => sum + stop.items.filter(x => this.isPicked(x.item.productId)).length, 0);
  }

  get totalStopItems(): number {
    return this.cartStops.reduce((sum, stop) => sum + stop.items.length, 0);
  }

  get allPicked(): boolean {
    return this.cartStops.length > 0 && this.cartStops.every(stop => stop.done);
  }

  startCartRoute(): void {
    const products = this.productsService.getAllProducts();
    const byAisle = new Map<number, { item: CartItem; product: Product }[]>();
    const unlocated: CartItem[] = [];

    for (const item of this.cartService.items()) {
      const product = products.find(p => p.id === item.productId);
      const aisleId = aisleIdOf(product);
      if (!product || aisleId === null || !AISLE_ACCESS[aisleId]) {
        unlocated.push(item);
        continue;
      }
      if (!byAisle.has(aisleId)) byAisle.set(aisleId, []);
      byAisle.get(aisleId)!.push({ item, product });
    }

    // Lo que ya no está en el carrito deja de contar como tomado
    const inCart = new Set(this.cartService.items().map(i => i.productId));
    this.pickedIds.forEach(id => { if (!inCart.has(id)) this.pickedIds.delete(id); });
    void this.persistPicked();

    const order = orderStops([...byAisle.keys()]);
    this.cartStops = order.map(aisleId => {
      const items = byAisle.get(aisleId)!.sort((a, b) =>
        (a.product.supermarketLocation?.shelf ?? '').localeCompare(b.product.supermarketLocation?.shelf ?? ''));
      return {
        aisle: this.aisles.find(a => a.id === aisleId)!,
        items,
        done: items.every(x => this.pickedIds.has(x.item.productId)),
      };
    });
    this.unlocatedItems = unlocated;

    this.searchQuery = '';
    this.searchResults = [];
    this.selectedProduct = null;
    this.highlightedShelf = null;
    this.selectedAisleId = null;
    this.previousAisleId = null;
    this.isRouteActive = false;
    this.voiceFeedback = null;
    this.cartRouteActive = true;
    this.stepsExpanded = false;

    this.update3DHoverVisuals();
    this.update3DRoute(true);
  }

  exitCartRoute(): void {
    this.cartRouteActive = false;
    this.cartStops = [];
    this.unlocatedItems = [];
    this.update3DHoverVisuals();
    this.clear3DRoute();
    this.setPerspective('isometric');
  }

  isPicked(productId: number): boolean {
    return this.pickedIds.has(productId);
  }

  togglePicked(stop: CartStop, productId: number): void {
    if (this.pickedIds.has(productId)) {
      this.pickedIds.delete(productId);
    } else {
      this.pickedIds.add(productId);
    }
    void this.persistPicked();

    const wasDone = stop.done;
    stop.done = stop.items.every(x => this.pickedIds.has(x.item.productId));
    if (stop.done !== wasDone) {
      // Cambió el recorrido pendiente: se vuelve a trazar sin mover la cámara
      this.update3DHoverVisuals();
      this.update3DRoute(false);
      if (this.allPicked) {
        void this.voice.speak('Tienes todo. Dirígete a la línea de cajas.');
      }
    }
  }

  stopIndexOf(aisleId: number | null): number {
    return this.cartStops.findIndex(stop => stop.aisle.id === aisleId);
  }

  private async restorePicked(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: PICKED_KEY });
      const ids = value ? (JSON.parse(value) as number[]) : [];
      this.pickedIds = new Set(ids.filter(n => typeof n === 'number'));
    } catch {
      this.pickedIds = new Set();
    }
  }

  private async persistPicked(): Promise<void> {
    try {
      await Preferences.set({ key: PICKED_KEY, value: JSON.stringify([...this.pickedIds]) });
    } catch {
      // Sin almacenamiento la lista sigue funcionando en esta sesión
    }
  }

  // =========================================================================
  // INDICACIONES PASO A PASO
  // =========================================================================

  private buildStepMarker(): void {
    const geo = new THREE.RingGeometry(1.2, 2, 32);
    geo.rotateX(-Math.PI / 2);
    this.stepMarker = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthTest: false
    }));
    this.stepMarker.renderOrder = 11;
    this.stepMarker.visible = false;
    this.scene.add(this.stepMarker);
  }

  /** Enfoca la cámara en el punto donde ocurre la indicación. */
  focusStep(index: number): void {
    const step = this.navSteps[index];
    if (!step) return;
    this.activeStepIndex = index;
    this.targetLookAt = new THREE.Vector3(step.point.x, 1, step.point.z);
    this.targetCamPos = new THREE.Vector3(step.point.x + 16, 42, step.point.z + 34);
    if (this.stepMarker) {
      this.stepMarker.position.set(step.point.x, 0.3, step.point.z);
      this.stepMarker.visible = true;
    }
  }

  stepIcon(step: NavStep): string {
    switch (step.kind) {
      case 'left': return 'arrow-back';
      case 'right': return 'arrow-forward';
      case 'arrive': return 'location';
      case 'checkout': return 'cart-outline';
      default: return 'arrow-up';
    }
  }

  stepColor(step: NavStep): string {
    const aisle = step.aisleId !== null ? this.aisles.find(a => a.id === step.aisleId) : undefined;
    return aisle?.color ?? '#64748b';
  }

  speakDirections(): void {
    if (this.voice.isSpeaking()) {
      this.voice.stopSpeaking();
      return;
    }
    const intro = this.trip ? `Unos ${this.trip.minutes} minutos a pie. ` : '';
    void this.voice.speak(intro + this.navSteps.map(step => spokenMeters(step.text)).join('. '));
  }

  // =========================================================================
  // BÚSQUEDA POR VOZ
  // =========================================================================

  async startVoiceSearch(): Promise<void> {
    if (this.voice.isListening()) {
      this.voice.stopListening();
      return;
    }
    if (!this.voice.recognitionSupported()) {
      this.voiceFeedback = 'Este navegador no permite dictar. Usa Chrome o Edge, o escribe el producto.';
      return;
    }
    this.voiceFeedback = 'Te escucho… di por ejemplo "¿dónde está el arroz?"';
    const heard = await this.voice.listen();
    if (!heard) {
      this.voiceFeedback = 'No te escuché. Toca el micrófono e inténtalo de nuevo.';
      return;
    }
    this.handleVoiceQuery(heard);
  }

  /** Interpreta la frase dictada: producto primero, si no, una sección. */
  private handleVoiceQuery(heard: string): void {
    const term = extractSearchTerm(heard);
    this.cartRouteActive = false;
    this.searchQuery = term || heard;

    const results = this.findProductsByVoice(term);
    if (results.length > 0) {
      this.searchResults = results;
      const product = results[0];
      this.selectProduct(product);
      const loc = product.supermarketLocation;
      const where = loc ? `${this.getAisleDisplay(loc.aisle)}, ${this.getShelfDisplay(loc.shelf)}` : 'un pasillo sin ubicación registrada';
      const minutes = this.trip ? ` Llegas en unos ${this.trip.minutes} minutos.` : '';
      this.voiceFeedback = `"${heard}" → ${product.name}: ${where}`;
      void this.voice.speak(`${product.name} está en ${where}.${minutes}`);
      return;
    }

    const aisle = this.findAisleByVoice(term);
    if (aisle) {
      this.searchQuery = '';
      this.selectAisle(aisle.id);
      const title = `${this.getAisleLabel(aisle)}: ${this.getAisleName(aisle)}`;
      this.voiceFeedback = `"${heard}" → ${title}`;
      void this.voice.speak(`La sección ${this.getAisleName(aisle)} está en el ${this.getAisleLabel(aisle)}.`);
      return;
    }

    this.searchResults = [];
    this.voiceFeedback = `No encontré "${term || heard}". Prueba con otro nombre o escríbelo.`;
    void this.voice.speak(`No encontré ${term || heard} en el plano.`);
  }

  private findProductsByVoice(term: string): Product[] {
    if (!term) return [];
    const direct = this.productsService.searchProducts(term);
    if (direct.length > 0) return direct;
    // Palabra por palabra, también en singular ("tomates" → "tomate")
    for (const word of term.split(/\s+/).filter(w => w.length >= 3)) {
      for (const variant of [word, word.replace(/es$/, ''), word.replace(/s$/, '')]) {
        const found = this.productsService.searchProducts(variant);
        if (found.length > 0) return found;
      }
    }
    return [];
  }

  private findAisleByVoice(term: string): AisleDefinition | undefined {
    const words = normalize(term).split(/\s+/).filter(w => w.length >= 4);
    return this.aisles.find(aisle => {
      const haystack = normalize(`${aisle.name} ${aisle.category} ${aisle.description} ${this.getAisleName(aisle)}`);
      return words.some(w => haystack.includes(w) || haystack.includes(w.replace(/s$/, '')));
    });
  }

  dismissVoiceFeedback(): void {
    this.voiceFeedback = null;
  }

  // =========================================================================
  // ESCANEAR Y UBICAR
  // =========================================================================

  openScanner(): void {
    this.isScannerOpen = true;
    this.scanError = null;
    this.manualBarcode = '';
    this.voiceFeedback = null;
    // Esperar a que Angular pinte el <video> antes de pedir la cámara
    setTimeout(() => void this.startCamera(), 0);
  }

  private async startCamera(): Promise<void> {
    const video = this.scanVideoRef?.nativeElement;
    if (!video || !this.isScannerOpen) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      this.scanError = 'Este navegador no da acceso a la cámara. Escribe el código abajo.';
      return;
    }

    this.isScanning = true;
    this.codeReader = new BrowserMultiFormatReader();
    try {
      const devices = await this.codeReader.listVideoInputDevices();
      if (devices.length === 0) {
        throw new Error('no-camera');
      }
      const rear = devices.find(d => /back|rear|environment|trasera/i.test(d.label));
      const deviceId = (rear ?? devices[0]).deviceId;

      await this.codeReader.decodeFromVideoDevice(deviceId, video, result => {
        if (result) {
          this.ngZone.run(() => this.locateBarcode(result.getText()));
        }
      });
    } catch (error) {
      this.ngZone.run(() => {
        this.isScanning = false;
        this.scanError = (error as Error)?.message === 'no-camera'
          ? 'No se encontró una cámara. Escribe el código de barras abajo.'
          : 'No se pudo abrir la cámara. Revisa el permiso o escribe el código abajo.';
      });
      this.stopCamera();
    }
  }

  private stopCamera(): void {
    try {
      this.codeReader?.reset();
    } catch {
      // La cámara ya estaba cerrada
    }
    this.codeReader = null;
    this.isScanning = false;
  }

  closeScanner(): void {
    this.stopCamera();
    this.isScannerOpen = false;
  }

  submitManualBarcode(): void {
    const code = this.manualBarcode.replace(/\D/g, '');
    if (!code) {
      this.scanError = 'Escribe los números que aparecen bajo el código de barras.';
      return;
    }
    this.locateBarcode(code);
  }

  /** Busca el código en el catálogo y traza la ruta a su pasillo. */
  private locateBarcode(code: string): void {
    const product = this.productsService.findProductByBarcode(code);
    if (!product) {
      this.scanError = `El código ${code} no está en el catálogo de esta tienda.`;
      return;
    }
    this.closeScanner();
    this.searchQuery = '';
    this.searchResults = [];
    this.selectProduct(product);
    const loc = product.supermarketLocation;
    this.voiceFeedback = loc
      ? `Escaneado: ${product.name} se repone en ${this.getAisleDisplay(loc.aisle)}, ${this.getShelfDisplay(loc.shelf)}.`
      : `Escaneado: ${product.name}. No tiene ubicación registrada.`;
  }
}

/** Quita tildes y pasa a minúsculas para comparar texto dictado. */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * De una frase dictada ("¿dónde está el arroz?") deja solo lo que se busca
 * ("arroz"). Cubre las formas más comunes en español, inglés y portugués.
 */
function extractSearchTerm(phrase: string): string {
  let t = phrase.toLowerCase().replace(/[¿?¡!.,;:"]/g, ' ').replace(/\s+/g, ' ').trim();
  const leads = [
    /^(en )?(d[oó]nde|donde) (est[aá]n?|encuentro|hay|queda[n]?|puedo encontrar|se encuentra[n]?)\s+/,
    /^(busco|buscar|necesito|quiero|ll[eé]vame a|mu[eé]strame)\s+/,
    /^(where is|where are|where can i find|find)\s+/,
    /^(onde (est[aá]|fica|encontro))\s+/,
  ];
  for (const re of leads) t = t.replace(re, '');
  t = t.replace(/^(el|la|los|las|un|una|unos|unas|the|o|a|os|as)\s+/, '');
  return t.replace(/\s+(por favor|please)$/, '').trim();
}

/** "avanza 12 m" → "avanza 12 metros" para la voz. */
function spokenMeters(text: string): string {
  return text.replace(/(\d+) m\b/g, (_, n: string) => `${n} ${n === '1' ? 'metro' : 'metros'}`);
}
