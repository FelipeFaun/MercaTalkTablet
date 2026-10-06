import { Pipe, PipeTransform, inject } from '@angular/core';
import { CatalogI18nService } from '../../core/catalog-i18n.service';

/**
 * Nombre de un producto en el idioma activo:
 * {{ product.name | productName:product.id }} · {{ item.name | productName:item.productId }}
 * Impuro (como translate): se actualiza al cambiar de idioma.
 */
@Pipe({
  name: 'productName',
  standalone: true,
  pure: false,
})
export class ProductNamePipe implements PipeTransform {
  private readonly catalogI18n = inject(CatalogI18nService);

  transform(name: string, productId: number | null | undefined): string {
    return this.catalogI18n.productName(productId, name);
  }
}

/**
 * Categorías, secciones, pasillos y otros textos del catálogo en el idioma activo:
 * {{ product.category | term }} · {{ location.aisle | term }}
 */
@Pipe({
  name: 'term',
  standalone: true,
  pure: false,
})
export class CatalogTermPipe implements PipeTransform {
  private readonly catalogI18n = inject(CatalogI18nService);

  transform(text: string | null | undefined): string {
    return this.catalogI18n.term(text);
  }
}

/** Cantidades armadas en el código ("2 bolsa(s)", "1 un (10 porc.)") en el idioma activo */
@Pipe({
  name: 'quantity',
  standalone: true,
  pure: false,
})
export class CatalogQuantityPipe implements PipeTransform {
  private readonly catalogI18n = inject(CatalogI18nService);

  transform(text: string | null | undefined): string {
    return this.catalogI18n.quantity(text);
  }
}
