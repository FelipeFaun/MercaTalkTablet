import { registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';

import { ClpPipe, formatClp } from './clp.pipe';

// El pipe depende de los datos de locale que main.ts registra al arrancar la app
registerLocaleData(localeEsCl);

describe('ClpPipe', () => {
  const pipe = new ClpPipe();

  it('formatea pesos chilenos con separador de miles y sin decimales', () => {
    expect(pipe.transform(1250)).toBe('$1.250');
    expect(pipe.transform(999)).toBe('$999');
    expect(pipe.transform(30000)).toBe('$30.000');
  });

  it('devuelve vacío para null o undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('formatClp entrega el mismo resultado desde TypeScript', () => {
    expect(formatClp(1250)).toBe(pipe.transform(1250));
  });
});
