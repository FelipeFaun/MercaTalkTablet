# MercaTalk Mobile — Plan de trabajo post-auditoría

**Base:** `AUDITORIA-MerkaTalk.pdf` (10 sep 2026) · **Stack:** Ionic 8 · Angular 20 · Capacitor 7 · standalone components
**Objetivo:** convertir el prototipo de kiosko en una app móvil vendible, con el carrito como función central, sin romper el formato visual ni la estructura de código actual.

Estado verificado el 13 sep 2026 (después de la auditoría):

| Hallazgo | Estado real hoy |
|---|---|
| C1 Sin git | Parcial: ya hay repo (`FelipeFaun/MerkaTalkMobile`), pero `www/` sigue trackeado (46 archivos) y `src/app/home/liderin.png` (1,3 MB) sigue duplicado |
| C5 Carrito | `cart.service.ts` sigue en 0 bytes |
| C2 Permisos | `AndroidManifest.xml` solo declara `INTERNET` |
| M9 Identidad | `appId: io.ionic.starter`, `appName: proyecto_lider`, `<title>Ionic App</title>`, `lang="en"` |
| Resto (C3, C4, A1–A7, M1–M10, B1–B8) | Sin cambios |

---

## 1. Reglas del juego (para no romper "el formato de lo que está hecho")

Estas son las convenciones que ya usa el código y que **toda edición debe respetar**:

| Aspecto | Convención actual | Se mantiene |
|---|---|---|
| Arquitectura | Standalone components, `bootstrapApplication` en `main.ts`, sin `app.config.ts` ni NgModules | Sí — nuevos providers van en `main.ts` |
| Imports Ionic | Cada componente desde `@ionic/angular/standalone` listado en `imports: [...]` | Sí — importar solo lo que se usa (arregla NG8113) |
| Íconos | `addIcons({...})` en el constructor de cada página | Se centraliza en `main.ts` (1 sola vez) pero sigue siendo `addIcons` |
| Nombres de archivo | `x.page.ts / .html / .scss / .spec.ts`, servicios en `src/app/services/*.service.ts` | Sí. `products.ts` → renombrar a `products.service.ts` para ser coherente |
| Rutas | `loadComponent` lazy en `app.routes.ts` | Sí |
| Header | `<ion-toolbar class="blue-toolbar">` con `.header-content` / `.logo-section` / `.empty-space` en cada página | Se extrae a un componente compartido `app-header` con el **mismo markup y clases** |
| Paleta | `#0071ce` primario · `#2c3e50` texto · `#7f8c8d` secundario · `#e74c3c` peligro/oferta · `#f8f9fa` fondos · `#e0e0e0` bordes | Sí — pasan a variables Ionic en `theme/variables.scss`, mismos valores |
| Tarjetas | `.product-card` > `.product-image` + `.product-info` (`.product-title`, `.price-section`, `.current-price`, `.original-price`, `.discount-badge`) en offers | Sí — se convierte en `app-product-card` reutilizable con esas mismas clases |
| Templates | Mezcla de `*ngIf/*ngFor` (home, price-check) y `@if/@for` (offers) | Nuevo código usa `@if/@for`; lo existente se migra cuando se toca ese archivo |
| Estado | Propiedades planas en el componente | Nuevo código usa `signal()/computed()` (Angular 20, estable) |
| Inyección | `constructor(private x: X)` | Nuevo código usa `inject()` (resuelve los 9 errores de lint `prefer-inject`) |
| Idioma | Comentarios y UI en español, tono cercano ("Liderín") | Sí |
| Estilos por página | SCSS por página con `:host`, `ion-content { --background }`, secciones con `.container` | Sí, pero **sin `!important`** nuevos (hoy hay 93) |

Regla de oro: **una tarea = un hallazgo de la auditoría = un commit** con el ID en el mensaje (`fix(C3): búsqueda por tokens`).

---

## 2. Skills instaladas y cuándo usarlas

Están en `.claude/skills/` (16). Se invocan por nombre o se activan solas por contexto.

| Tarea | Skill | Qué aporta |
|---|---|---|
| Páginas, servicios, signals, `inject()`, control flow | `angular-developer` (oficial de Google) | Convenciones Angular 20, signals, HttpClient, testing |
| Tabs, lifecycle Ionic (`ionViewWillEnter`), forms Ionic, `NavController` | `ionic-angular` | Navegación con tabs, referencias `navigation.md` y `lifecycle.md` |
| VoiceService, ScannerService, permisos, `NgZone`, `Capacitor.isNativePlatform()` | `capacitor-angular` | Patrón "plugin envuelto en servicio" con fallback web |
| Layout móvil, tarjetas, estados vacíos/error, focus, WCAG | `frontend-ui-engineering` | Evita el "AI aesthetic", checklist de accesibilidad |
| Decisiones visuales nuevas (tab bar, página carrito, chat) | `frontend-design` | Que el rediseño sea intencional y coherente con la paleta |
| Revisar una página contra guías de UI | `web-design-guidelines` | Salida `archivo:línea` con hallazgos |
| Backend del chat, API key, prompt, LLM | `security-and-hardening` (sección *Securing AI/LLM*) + `security-threat-model` | OWASP LLM Top 10: el prompt no es frontera de seguridad |
| Antes de cada merge | `security-review`, `best-practices` | Checklist de revisión |
| aria-label, teclado, `user-scalable` | `accessibility` | WCAG 2.2 |
| Bundle, imágenes, presupuesto SCSS | `performance`, `core-web-vitals` | WebP, lazy, presupuestos |
| Auditoría final de la app web/PWA | `web-quality-audit` | Corre todo junto |

`seo` solo aplica si se publica una landing/PWA pública.

---

## 3. Arquitectura destino

```
src/app/
├── core/                       # servicios sin UI (providedIn: 'root')
│   ├── catalog.service.ts      # productos + ofertas + recetas desde assets/data/catalog.json
│   ├── cart.service.ts         # signal<CartItem[]>, total, ahorro, persistencia
│   ├── chat.service.ts         # historial, envía últimos 8 turnos, sin prompt en cliente
│   ├── intent.service.ts       # analyzeIntent / findSpecificProduct (sale de HomePage)
│   ├── voice.service.ts        # STT/TTS nativo (Capacitor) o Web Speech (fallback)
│   ├── scanner.service.ts      # @capacitor/barcode-scanner nativo o ZXing web
│   └── brand.service.ts        # skin: nombre, logo, colores (Liderín = un skin)
├── data/
│   └── catalog.json            # Product raíz; Offer{productId}; Recipe{productIds[]}
├── models/
│   └── catalog.model.ts        # Product, Offer, Recipe, CartItem, ChatMessage
├── shared/
│   ├── components/
│   │   ├── app-header/         # el blue-toolbar actual, una sola vez
│   │   ├── product-card/       # la .product-card de offers, reutilizable
│   │   └── price-tag/
│   └── pipes/
│       └── clp.pipe.ts         # $1.250 siempre igual
├── tabs/                       # ion-tabs: Liderín · Escanear · Mi compra · Ofertas · Más
├── home/  price-check/  offers/  recipes/  store-locator/  app-download/   # se mantienen
└── cart/                       # NUEVA página "Mi compra"
```

Las páginas existentes **no se mueven** (misma ruta, mismos archivos); solo se les quita lógica hacia `core/` y se envuelven en tabs.

---

## 4. Fases

### FASE 0 — Higiene (2–3 días) · cierra C1, A1, A3, A4, A5, M4, M7, M9, B4, B8

Orden de ejecución (cada punto es un commit):

| # | Tarea | Hallazgo | Archivos | Skill |
|---|---|---|---|---|
| 0.1 | `git rm -r --cached www` + `/www` en `.gitignore`; borrar `src/app/home/liderin.png` | C1 | `.gitignore` | — |
| 0.2 | `npm uninstall quagga jsqr html5-qrcode @zxing/browser cordova-plugin-speechrecognition` | M4 | `package.json` | `best-practices` |
| 0.3 | Identidad: `appId: cl.mercatalk.app`, `appName: MercaTalk`, `namespace` en `build.gradle`, `<title>MercaTalk</title>`, `lang="es"` | M9 | `capacitor.config.ts`, `android/app/build.gradle`, `src/index.html` | `capacitor-angular` |
| 0.4 | Permisos `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS` | C2 (parte) | `AndroidManifest.xml` | `capacitor-angular` |
| 0.5 | `LOCALE_ID = 'es-CL'` + `registerLocaleData(localeEsCl)` en `main.ts`; `ClpPipe` (`currency:'CLP':'symbol-narrow':'1.0-0'`); reemplazar los 3 formatos de precio | A3 | `main.ts`, `shared/pipes/clp.pipe.ts`, 3 templates | `angular-developer` |
| 0.6 | Registrar **todos** los íconos usados en `main.ts` con un solo `addIcons` (quitar los `addIcons` por página) | A1 | `main.ts`, `home.page.ts` | `ionic-angular` |
| 0.7 | `ng generate @angular/core:inject` (8 errores) + quitar `ngOnInit() {}` vacío; `ng lint` en 0 | M7 | varios | `angular-developer` |
| 0.8 | Quitar imports Ion* no usados (13 warnings NG8113) | M7 | todas las páginas | `angular-developer` |
| 0.9 | Arreglar specs: `PriceCheckPage`→`PriceCheckerPage`, `Products`→`ProductsService`, `recipes.page.spec.ts` vacío; `ng test` compila | A5 | 3 specs | `angular-developer` (testing-fundamentals) |
| 0.10 | `tsconfig.json`: `lib: ["es2022","dom"]`, quitar `types: ["node"]` | B8 | `tsconfig.json` | — |
| 0.11 | `README.md` con `npm install`, `ionic serve`, `npx cap sync android`, `npx cap run android`; borrar `Esquema_src_Markdown.md` | B4 | `README.md` | — |
| 0.12 | `catalog.json` unificado: `Product` raíz, `Offer { productId, offerPrice, validUntil }`, `Recipe { productIds[] }`; corregir Té Supremo, Sopa Maggi, oferta 4 (`originalPrice: 0`), fechas vencidas, comentarios pegados | A4 | `data/catalog.json`, `core/catalog.service.ts` | `angular-developer` |

**Definition of Done Fase 0:** `ng lint` → 0 errores · `ng build --configuration production` → 0 warnings · `ng test` compila · `npx cap sync android` sin errores · precios iguales en las 3 páginas.

---

### FASE 1 — El carrito (semana 1–2) · cierra C5, M8 (parte), C2 (escáner)

| # | Tarea | Detalle | Skill |
|---|---|---|---|
| 1.1 | `models/catalog.model.ts` | `CartItem { productId, qty, unitPrice, offerPrice? }` | `angular-developer` |
| 1.2 | `core/cart.service.ts` | `items = signal<CartItem[]>([])`, `total = computed()`, `savings = computed()`, `count = computed()`; `add/remove/setQty/clear`; persistencia con `@capacitor/preferences` (clave `mercatalk.cart`) con `effect()` que guarda al cambiar | `angular-developer` (signals-overview, effects) |
| 1.3 | Tab bar | `tabs/tabs.page.ts` con `<ion-tabs>`: **Liderín** (home) · **Escanear** (price-check) · **Mi compra** (cart, con badge `count()`) · **Ofertas** · **Más** (recetas, ubicación, descarga). Rutas hijas en `app.routes.ts`, mismas URLs de hoy | `ionic-angular` (navigation.md) |
| 1.4 | Página `cart/` "Mi compra" | Lista con `app-product-card` compacta, botones +/−, total grande en CLP, línea "Ahorraste $X en ofertas", estado vacío con CTA "Escanear un producto", botón "Vaciar" con `AlertController` | `frontend-ui-engineering`, `frontend-design` |
| 1.5 | `core/scanner.service.ts` | `Capacitor.isNativePlatform()` → `@capacitor/barcode-scanner`; web → ZXing (`BrowserMultiFormatReader` de `@zxing/library` se mantiene solo como fallback). Un método `scan(): Promise<string | null>` | `capacitor-angular` |
| 1.6 | price-check: botón "Agregar a mi compra" | En cada resultado y tras escanear; toast "Agregado · Ver mi compra" | `frontend-ui-engineering` |
| 1.7 | offers: `addToCart` real | Reemplaza el `console.log` | — |
| 1.8 | `shared/components/app-header` y `product-card` | Extraer el markup existente sin cambiar clases; `BrandService` entrega logo/nombre (logo local en `assets/brand/`, no Walmart) | `frontend-ui-engineering` |

**DoD Fase 1:** en un Android físico, escanear un producto del catálogo → aparece en Mi compra → cerrar y abrir la app → sigue ahí → total correcto en CLP.

---

### FASE 2 — Conversación real (semana 2–3) · cierra C2 (voz), C3, C4, A2, A7, M1, M2, M3, B2, B6

| # | Tarea | Detalle | Skill |
|---|---|---|---|
| 2.1 | `models`: `ChatMessage { role: 'user' \| 'assistant', text, at }` | `ChatService.messages = signal<ChatMessage[]>` | `angular-developer` |
| 2.2 | Historial en pantalla | home: lista de burbujas con scroll automático al último, mensaje del usuario visible; input fijo abajo (`ion-footer`), avatar pequeño en el header (A2). Layout mobile-first: `.avatar-section` deja de ser `flex: 0 0 400px` | `frontend-ui-engineering`, `frontend-design` |
| 2.3 | Memoria | Enviar los últimos 8 turnos en `history[]`; "¿y la sin lactosa?" funciona | `security-and-hardening` (LLM10: acotar tokens) |
| 2.4 | `core/intent.service.ts` | Sacar `analyzeIntent`, `findSpecificProduct`, `applyProductLimits`, `knownProducts` de HomePage. Búsqueda por **tokens** (cada palabra, intersección sobre nombre+marca+categoría), sin tildes (`normalize('NFD')`). "leche soprole" y "arroz tucapel grado 1" deben resolver | `angular-developer` |
| 2.5 | `core/voice.service.ts` | Nativo: `@capacitor-community/speech-recognition` + `text-to-speech`; web: Web Speech. `stopListening()` que realmente detiene; cola de TTS (no toggle) para que bienvenida y respuesta no se pisen (M1, M2) | `capacitor-angular` |
| 2.6 | Respuesta en texto plano | Pedir al modelo "sin formato Markdown" y además limpiar `**`/`#` residuales; renderizar con interpolación `{{ }}`, **nunca `[innerHTML]`** con salida del LLM | `security-and-hardening` (LLM05) |
| 2.7 | Backend seguro | URL en `environment.ts`; el **system prompt sale del cliente**: el backend lo resuelve por `character_name`. API key por app en header vía `HttpInterceptor`; quitar `credentials: 'include'`. Timeout 45 s + 1 reintento (B7). Ver §5 para el proxy | `security-and-hardening`, `security-threat-model` |
| 2.8 | El chat opera el carrito | Intents `add_to_cart`, `cart_total`, `remove_from_cart` → `CartService`. "agrega dos leches" / "¿cuánto llevo?" — **argumento de venta** | `angular-developer` |
| 2.9 | Prompt | Corregir "Nunda", quitar empleados inventados y `ASSISTANT_SEX` (B2) | — |
| 2.10 | Enter en móvil | `(keyup.enter)` → botón enviar; Enter inserta salto (B6) | `accessibility` |

**DoD Fase 2:** en APK, hablar "cuánto vale la leche soprole" → responde con precio del catálogo → "agrégala" → aparece en Mi compra. HomePage < 250 líneas.

---

### FASE 3 — Diferenciadores (semana 3–4) · elegir 2–3

| Idea | Servicio | Esfuerzo | Por qué vende |
|---|---|---|---|
| **Presupuesto** ("tengo $30.000") | Solo `CartService` + aviso del avatar al 80 % y 100 %, sugerir reemplazo en oferta | Bajo | Usa lo ya construido |
| **Aporte nutricional por código de barras** | Open Food Facts `GET world.openfoodfacts.org/api/v2/product/{barcode}.json` (gratis, sin key) | Bajo | Cubre lo que pidió el profesor con datos reales |
| **Llamar al personal** | Supabase Realtime (canal `store:{id}`) — el móvil publica `{aisle, productId}`, el tablet lo muestra | Medio | Demo entre equipo tablet y móvil |
| Lista compartida | Supabase (tabla `lists` + Realtime) | Medio | Requiere auth |
| Modo offline | `catalog.json` ya es local; chat degrada a respuestas de `IntentService` sin red | Bajo | — |
| Mapa de pasillos SVG | Un SVG en `assets/` con `id` por pasillo; resaltar con CSS | Medio | Visual |

---

### Transversal — Pulido y calidad · A6, M5, M6, M10, B1, B3, B5

- **A6 marca:** logo local en `assets/brand/logo.svg`, imágenes de productos en `assets/products/*.webp` (≤ 40 KB c/u) referenciadas desde `catalog.json`. Sin hotlinks a Walmart/Unsplash.
- **M10 assets:** avatares a WebP 560×560 (2× de 280 px), QR a 400×400. Meta: `src/assets` < 800 KB.
- **M6 dark mode:** decidir **quitar** `dark.system.css` (la app fuerza claro en todas partes). Cuando se toque un SCSS, reemplazar colores fijos por `var(--ion-color-*)` y eliminar `!important`.
- **M5:** `getAisleIcon` por `section`, no por substring del número.
- **B1:** reemplazar `console.log`/`alert()` por `ToastController` y un `LoggerService` que calla en producción.
- **B3/B5:** `aria-label` en botones de solo ícono (mic, enviar, +/−), quitar `user-scalable=no`, arreglar `<h1 class=>`.
- Correr `web-design-guidelines` sobre cada página tocada antes del PR.

---

## 5. Servicios recomendados

Todos tienen capa gratuita suficiente para el proyecto. Recomendación principal en negrita; alternativa cuando aplica.

### Backend + base de datos

| Necesidad | Recomendado | Alternativa | Notas |
|---|---|---|---|
| **BD + Auth + Realtime + Functions** | **Supabase** (Postgres) | Firebase (Firestore + RTDB) | Supabase: SQL real, tablas `products/offers/recipes/stores`, Row Level Security, Realtime para "llamar al personal", Edge Functions (Deno) para el proxy del LLM, Storage para imágenes. Free: 500 MB DB, 1 GB storage, 500K invocaciones edge/mes. Firebase es válido si el equipo tablet ya lo usa. |
| Self-hosted (sin nube) | PocketBase | — | Un binario, SQLite, auth y realtime incluidos. Útil para demo sin internet. |

Esquema mínimo en Supabase (mismo modelo que `catalog.json`, así la migración es cambiar `CatalogService` de leer el JSON a leer la API):

```sql
create table products (
  id bigint primary key, name text not null, brand text, price int not null,
  barcode text unique, category text, image_url text,
  aisle text, section text, shelf text
);
create table offers (
  id bigint primary key, product_id bigint references products(id),
  offer_price int not null, valid_until date not null
);
create table recipes (
  id bigint primary key, name text not null, steps text[], product_ids bigint[]
);
create table staff_calls (  -- "llamar al personal"
  id bigserial primary key, store_id text, aisle text, product_id bigint,
  created_at timestamptz default now(), attended boolean default false
);
```

### Chat / LLM

| Necesidad | Recomendado | Notas |
|---|---|---|
| **Proxy del LLM** (cierra A7) | **Supabase Edge Function `chat`** (o Cloudflare Worker) | El cliente envía `{ character: 'liderin', history: ChatMessage[8], cart_summary }`. La función guarda el system prompt, agrega la API key y llama al backend actual (`triskeledu.cl/litserver`) o a un modelo directo. Rate limit por `device_id`. |
| Modelo (si se cambia el backend) | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) | Latencia < 2 s vs 14–20 s actuales; costo bajo para respuestas de 100 palabras. Cualquier modelo sirve; lo importante es que la key esté en el proxy. |
| Streaming | SSE desde la Edge Function | Que el usuario vea la respuesta aparecer; mejora percepción de latencia. |

### Datos externos

| Necesidad | Servicio | Notas |
|---|---|---|
| **Nutrición por barcode** | Open Food Facts API v2 | Gratis, sin key, JSON con `nutriments`, `nutriscore_grade`. Cachear en Supabase para no depender de ellos en la demo. |
| Catálogo real | API del supermercado (cuando exista) | Hoy: `catalog.json`. Diseñar `CatalogService` con interfaz `getProducts(): Promise<Product[]>` para cambiar la fuente sin tocar páginas. |

### Dispositivo (ya instalados, solo faltan importarlos)

| Función | Plugin | Estado |
|---|---|---|
| Voz → texto | `@capacitor-community/speech-recognition` | instalado, sin usar |
| Texto → voz | `@capacitor-community/text-to-speech` | instalado, sin usar |
| Escáner | `@capacitor/barcode-scanner` | instalado, sin usar. Alternativa más precisa: `@capacitor-mlkit/barcode-scanning` |
| Persistencia carrito | `@capacitor/preferences` | **falta instalar** (`npm i @capacitor/preferences`) |
| Catálogo offline grande | `@capacitor-community/sqlite` | solo si el catálogo supera ~5.000 productos |
| Haptics al agregar | `@capacitor/haptics` | instalado |

### Operación

| Necesidad | Recomendado | Notas |
|---|---|---|
| CI | GitHub Actions: `npm ci && ng lint && ng build --configuration production && ng test --watch=false --browsers=ChromeHeadless` | Bloquea PRs que rompan lint/build |
| Errores en producción | Sentry (free 5K eventos/mes) con `@sentry/angular` + `@sentry/capacitor` | Ver crashes del APK |
| Analítica de uso | PostHog (free 1M eventos) | Qué intents se usan, tasa de escaneo exitoso |
| Distribución de APK al equipo/profesor | Firebase App Distribution o Google Play *Internal testing* | Link por correo, sin publicar |
| Actualizaciones OTA del web layer | Capgo o Capawesome Cloud | Opcional; evita reinstalar el APK por cambios de UI |
| Imágenes | Supabase Storage con transformación (`?width=300`) | O bundlear en `assets/` en WebP |

### Costo estimado

$0/mes durante desarrollo y demo (todo en free tier). Si se pasa a un modelo LLM de pago: ~US$1–3/mes con 1.000 conversaciones de 100 palabras.

---

## 6. Reparto sugerido (equipo móvil de 2)

| Persona A | Persona B |
|---|---|
| Fase 0: 0.1–0.6 · Fase 1: CartService, página Mi compra, tabs | Fase 0: 0.7–0.12 · Fase 1: ScannerService, product-card, header |
| Fase 2: chat (historial, memoria, intents, carrito por voz) | Fase 2: VoiceService, backend/proxy, layout móvil de home |
| Fase 3: presupuesto | Fase 3: nutrición Open Food Facts + llamar al personal |

Ramas: `main` protegida · `feat/<fase>-<hallazgo>` · PR con `security-review` y `web-design-guidelines` antes de merge.

---

## 7. Cómo verificar cada fase

```bash
npx ng lint
npx ng build --configuration production
npx ng test --watch=false --browsers=ChromeHeadless
npx cap sync android
npx cap run android      # dispositivo físico: voz, cámara y escáner solo se prueban ahí
```

Métricas objetivo al cierre de Fase 2 (vs. auditoría):

| Métrica | Auditoría | Objetivo |
|---|---|---|
| Errores `ng lint` | 9 | 0 |
| Warnings `ng build` | 13 | 0 |
| `home.page.ts` | 785 líneas | < 250 |
| `!important` | 93 | < 20 |
| Assets en `src/` | 4,3 MB | < 800 KB |
| Dependencias sin uso | 7 | 0 |
| Latencia chat | 14–20 s | < 3 s (con proxy + modelo rápido) |
| Specs que compilan | No | Sí, y `CartService` con tests |
