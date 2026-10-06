# MercaTalk Mobile

App móvil de asistente de compras para supermercado: chat con avatar ("Liderín"),
consulta de precios, escáner de códigos de barras, ubicación en pasillos, ofertas y recetas.

**Stack:** Ionic 8 · Angular 20 (standalone) · Capacitor 7 · Android

## Requisitos

- Node.js 22 y npm
- Para Android: Android Studio con SDK y un dispositivo físico o emulador
- Para los tests: un navegador Chromium (Chrome o Edge)

## Instalación

```bash
npm install
```

## Desarrollo en el navegador

```bash
npx ng serve
```

Abre `http://localhost:4200`. El escáner y la voz usan APIs web en el navegador;
en el APK usan los plugins nativos de Capacitor.

## Android

```bash
npx ng build --configuration production
npx cap sync android
npx cap run android
```

`npx cap open android` abre el proyecto en Android Studio. El `appId` es
`cl.mercatalk.app` (ver `capacitor.config.ts`).

## Conexión con la app de celular

"Llevar lista a mi celular" guarda la compra en un Supabase compartido con la app
de celular y muestra un QR con su id. Se activa al completar `supabaseUrl` y
`supabaseAnonKey` en `src/environments/`; sin eso se muestra el QR fijo de antes.
Puesta en marcha, formato del QR y lo que debe hacer la app de celular:
[docs/QR-TABLET-CELULAR.md](docs/QR-TABLET-CELULAR.md).

## Calidad

```bash
npx ng lint                                              # 0 errores
npx ng build --configuration production                  # 0 warnings propios
npx ng test --watch=false --browsers=ChromeHeadless      # tests unitarios
```

Si no tienes Chrome instalado, indica otro Chromium antes de `ng test`:

```bash
# PowerShell
$env:CHROME_BIN = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
# Bash
export CHROME_BIN="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
```

## Estructura

```
src/app/
├── core/            CatalogService (única fuente de productos, ofertas y recetas)
├── data/            catalog.json  (Product raíz; Offer{productId}; Recipe{productIds[]})
├── models/          interfaces del catálogo
├── services/        ProductsService, OffersService, RecipesService (fachadas), ChatService
├── shared/pipes/    ClpPipe: precios en pesos chilenos ($1.250)
├── home/            chat con avatar
├── price-check/     búsqueda + escáner
├── store-locator/   ubicación en tienda
├── offers/  recipes/  app-download/
├── app.icons.ts     registro único de íconos Ionicons
└── app.routes.ts
```

Convenciones: standalone components, imports desde `@ionic/angular/standalone`,
`inject()` en vez de inyección por constructor, control flow `@if/@for`,
precios siempre con el pipe `clp`, íconos nuevos se registran en `app.icons.ts`.

## Plan de trabajo

El plan por fases posterior a la auditoría está en [docs/PLAN-MOBILE.md](docs/PLAN-MOBILE.md).
