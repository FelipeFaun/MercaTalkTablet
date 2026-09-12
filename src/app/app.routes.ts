import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'price-check',
    loadComponent: () => import('./price-check/price-check.page').then((m) => m.PriceCheckerPage),
  },
  {
    path: 'recipes',
    loadComponent: () => import('./recipes/recipes.page').then((m) => m.RecipesPage),
  },
  {
    path: 'offers',
    loadComponent: () => import('./offers/offers.page').then(m => m.OffersPage)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'store-locator',
    loadComponent: () => import('./store-locator/store-locator.page').then(m => m.StoreLocatorPage)
  },
  {
    path: 'app-download',
    loadComponent: () => import('./app-download/app-download.page').then(m => m.AppDownloadPage)
  },
];