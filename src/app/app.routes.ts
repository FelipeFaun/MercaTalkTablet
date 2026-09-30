import { Routes } from '@angular/router';

export const routes: Routes = [
  // Ruta de inicio por defecto: redirige a la pantalla de bienvenida / Kiosko
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full',
  },
  // Pantalla de Reposo / Inicio Kiosko con 3 idiomas centrados
  {
    path: 'welcome',
    loadComponent: () => import('./welcome/welcome.page').then((m) => m.WelcomePage),
  },
  // Contenedor principal de la app con barra de pestañas (TabsPage)
  {
    path: '',
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'price-check',
        loadComponent: () => import('./price-check/price-check.page').then((m) => m.PriceCheckerPage),
      },
      {
        path: 'products',
        loadComponent: () => import('./products/products.page').then((m) => m.ProductsPage),
      },
      {
        path: 'cart',
        loadComponent: () => import('./cart/cart.page').then((m) => m.CartPage),
      },
      {
        path: 'offers',
        loadComponent: () => import('./offers/offers.page').then((m) => m.OffersPage),
      },
      {
        path: 'more',
        loadComponent: () => import('./more/more.page').then((m) => m.MorePage),
      },
      {
        path: 'recipes',
        loadComponent: () => import('./recipes/recipes.page').then((m) => m.RecipesPage),
      },
      {
        path: 'store-locator',
        loadComponent: () => import('./store-locator/store-locator.page').then((m) => m.StoreLocatorPage),
      },
      {
        path: 'app-download',
        loadComponent: () => import('./app-download/app-download.page').then((m) => m.AppDownloadPage),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'welcome',
  },
];
