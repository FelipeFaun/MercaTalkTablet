import { Routes } from '@angular/router';

// Todas las páginas viven dentro de la barra de pestañas (TabsPage).
// Las URLs se mantienen: /home, /price-check, /cart, /offers, /more, /recipes...
export const routes: Routes = [
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
    redirectTo: 'home',
  },
];
