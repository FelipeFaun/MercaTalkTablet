import { 
  Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild, inject 
} from '@angular/core';
import { 
  IonContent, IonIcon, IonSpinner, IonBadge 
} from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { ProductsService, Product } from '../services/products.service';
import { BrandService } from '../core/brand.service';
import { ClpPipe } from '../shared/pipes/clp.pipe';
import { TranslatePipe } from '../shared/pipes/translate.pipe';
import { LanguageService } from '../core/language.service';

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
    color: '#0f172a',
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
    color: '#0f172a',
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
    color: '#0f172a',
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
    color: '#0f172a',
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
    color: '#0f172a',
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
    color: '#0f172a',
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
    color: '#0f172a',
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
    color: '#0f172a',
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
    color: '#0f172a',
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

  private productsService = inject(ProductsService);
  private ngZone = inject(NgZone);
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

  private aisleMeshes = new Map<number, {
    group: THREE.Group;
    hitMesh: THREE.Mesh;
    baseMeshes: THREE.Mesh[];
    lineMeshes: THREE.LineSegments[];
    labelSprite?: THREE.Sprite;
  }>();

  // Smooth Camera Animation Targets
  private targetCamPos: THREE.Vector3 | null = null;
  private targetLookAt: THREE.Vector3 | null = null;

  ngOnInit(): void {
    this.resetToInitialState();
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.init3DScene();
    });
  }

  ionViewWillEnter(): void {
    this.resetToInitialState();
    if (this.renderer && this.canvasContainerRef) {
      this.handleResize();
      this.update3DHoverVisuals();
    }
  }

  ngOnDestroy(): void {
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

    this.aisles.forEach(aisle => {
      const aisleData = this.createAisle3DObject(aisle);
      this.aisleMeshes.set(aisle.id, aisleData);
      this.scene.add(aisleData.group);
    });
  }

  private createAisle3DObject(aisle: AisleDefinition): {
    group: THREE.Group;
    hitMesh: THREE.Mesh;
    baseMeshes: THREE.Mesh[];
    lineMeshes: THREE.LineSegments[];
    labelSprite?: THREE.Sprite;
  } {
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
    const labelSprite = this.createTextSprite(`P-0${aisle.id} ${aisle.category}`);
    labelSprite.position.set(0, aisle.height + 3.2, 0);
    labelSprite.scale.set(13, 3.2, 1);
    group.add(labelSprite);

    return {
      group,
      hitMesh,
      baseMeshes,
      lineMeshes,
      labelSprite
    };
  }

  private createTextSprite(text: string): THREE.Sprite {
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
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

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
      const newSprite = this.createTextSprite(`P-0${aisle.id} ${aisle.category}`);
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

    if (this.selectedAisleId && this.isRouteActive) {
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

    this.aisleMeshes.forEach((data, id) => {
      const isSelected = this.selectedAisleId === id;
      const isHovered = this.hoveredAisleId === id;

      data.baseMeshes.forEach(mesh => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (isSelected) {
          // Seleccionado:
          // Modo claro: 0x0f172a
          // Modo oscuro: 0xf8fafc (blanco platino intenso de máxima visibilidad)
          mat.color.setHex(isLight ? 0x0f172a : 0xf8fafc);
          mat.emissive.setHex(isLight ? 0x1e293b : 0x334155);
          mat.roughness = 0.2;
        } else if (isHovered) {
          mat.color.setHex(isLight ? 0x1e293b : 0x94a3b8);
          mat.emissive.setHex(isLight ? 0x0f172a : 0x1e293b);
          mat.roughness = 0.3;
        } else {
          // En reposo:
          // Modo claro: 0x334155 (grafito oscuro contra suelo blanco)
          // Modo oscuro: 0x475569 (pizarra claro contra suelo 0x080d1a, ¡GRAN CONTRASTE!)
          mat.color.setHex(isLight ? 0x334155 : 0x475569);
          mat.emissive.setHex(0x000000);
          mat.roughness = 0.45;
        }
      });

      data.lineMeshes.forEach(line => {
        const mat = line.material as THREE.LineBasicMaterial;
        if (isSelected) {
          mat.color.setHex(isLight ? 0xffffff : 0x38bdf8);
        } else if (isHovered) {
          mat.color.setHex(isLight ? 0xffffff : 0xffffff);
        } else {
          // Aristas:
          // Modo claro: 0x1e293b
          // Modo oscuro: 0xcbd5e1 (platino nítido, delineando perfectamente la silueta de cada góndola)
          mat.color.setHex(isLight ? 0x1e293b : 0xcbd5e1);
        }
      });
    });
  }

  private clear3DRoute(): void {
    while (this.routeGroup.children.length > 0) {
      this.routeGroup.remove(this.routeGroup.children[0]);
    }
    while (this.beaconGroup.children.length > 0) {
      this.beaconGroup.remove(this.beaconGroup.children[0]);
    }
  }

  private update3DRoute(autoFrameCamera: boolean = true): void {
    this.clear3DRoute();

    if (!this.selectedAisleId || !this.isRouteActive) return;

    const aisle = this.aisles.find(a => a.id === this.selectedAisleId);
    if (!aisle) return;

    const isLight = this.currentTheme === 'light';
    const startX = -32;
    const startZ = 36;
    const destX = aisle.mapX;
    const destZ = aisle.mapZ;

    const waypoints: THREE.Vector3[] = [];
    waypoints.push(new THREE.Vector3(startX, 0.2, startZ));
    waypoints.push(new THREE.Vector3(startX, 0.2, 24));

    if (destX > 25) {
      waypoints.push(new THREE.Vector3(26, 0.2, 24));
      waypoints.push(new THREE.Vector3(26, 0.2, destZ));
      waypoints.push(new THREE.Vector3(destX - 2, 0.2, destZ));
    } else if (destZ < -30) {
      waypoints.push(new THREE.Vector3(destX > 0 ? 26 : -26, 0.2, 24));
      waypoints.push(new THREE.Vector3(destX > 0 ? 26 : -26, 0.2, -26));
      waypoints.push(new THREE.Vector3(destX, 0.2, -26));
      waypoints.push(new THREE.Vector3(destX, 0.2, destZ + 4));
    } else if (destX < -25) {
      waypoints.push(new THREE.Vector3(-32, 0.2, destZ));
      waypoints.push(new THREE.Vector3(destX + 3, 0.2, destZ));
    } else {
      waypoints.push(new THREE.Vector3(destX, 0.2, 24));
      waypoints.push(new THREE.Vector3(destX, 0.2, destZ));
    }

    // Ruta en 3D: en modo oscuro brilla en 0x38bdf8 (cyan neón luminoso); en claro en 0x0f172a
    const curve = new THREE.CatmullRomCurve3(waypoints, false, 'centripetal', 0.15);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.38, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({ color: isLight ? 0x0f172a : 0x38bdf8 });
    const routeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    this.routeGroup.add(routeMesh);

    // Baliza de Destino 3D (Pin)
    const pinGeo = new THREE.ConeGeometry(1.6, 3.2, 16);
    pinGeo.rotateX(Math.PI);
    const pinMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0x0f172a : 0x38bdf8,
      roughness: 0.2
    });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(destX, aisle.height + 4.5, destZ);
    this.beaconGroup.add(pin);

    // Anillo en el suelo
    const destRingGeo = new THREE.RingGeometry(1.8, 2.6, 32);
    destRingGeo.rotateX(-Math.PI / 2);
    const destRingMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x0f172a : 0x38bdf8,
      side: THREE.DoubleSide
    });
    const destRing = new THREE.Mesh(destRingGeo, destRingMat);
    destRing.position.set(destX, 0.1, destZ);
    this.beaconGroup.add(destRing);

    // Encuadre inicial panorámico que muestra TANTO la entrada como el pasillo
    if (autoFrameCamera) {
      const midX = (-32 + destX) / 2;
      const midZ = (36 + destZ) / 2;
      this.targetLookAt = new THREE.Vector3(midX, 2, midZ);
      this.targetCamPos = new THREE.Vector3(midX + 26, 54, midZ + 48);
    }
  }

  // =========================================================================
  // BUCLE DE ANIMACIÓN 60 FPS
  // =========================================================================

  private animate(): void {
    this.animFrameId = requestAnimationFrame(() => this.animate());

    const time = performance.now() * 0.002;

    if (this.kioskPulseMesh) {
      const scale = 1 + (Math.sin(time * 3) + 1) * 0.15;
      this.kioskPulseMesh.scale.set(scale, scale, 1);
    }

    if (this.beaconGroup.children.length > 0) {
      const pin = this.beaconGroup.children[0];
      if (pin) {
        pin.position.y += Math.sin(time * 4) * 0.03;
        pin.rotation.y += 0.03;
      }
    }

    if (this.targetCamPos && this.targetLookAt) {
      this.camera.position.lerp(this.targetCamPos, 0.07);
      this.controls.target.lerp(this.targetLookAt, 0.07);

      if (this.camera.position.distanceTo(this.targetCamPos) < 0.25) {
        this.cancelCameraAnimation();
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
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
}