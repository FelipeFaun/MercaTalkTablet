import { Pipe, PipeTransform } from '@angular/core';
import { formatCurrency } from '@angular/common';

const LOCALE = 'es-CL';

/**
 * Formatea un monto en pesos chilenos: 1250 -> "$1.250".
 * Se usa desde TypeScript (contexto del chat, mensajes) sin pasar por el pipe.
 */
export function formatClp(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }
  return formatCurrency(value, LOCALE, '$', 'CLP', '1.0-0');
}

/**
 * Pipe único para precios en toda la app: {{ product.price | clp }}.
 * Reemplaza a `number`, `toLocaleString('es-CL')` y a interpolar `$` a mano.
 */
@Pipe({
  name: 'clp',
  standalone: true,
})
export class ClpPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatClp(value);
  }
}
