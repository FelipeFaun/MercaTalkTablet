# Lista de la tablet al celular (QR)

Cómo pasa la compra del kiosko (este proyecto) a la app de celular. Las dos apps usan **el mismo proyecto de Supabase**; cada una con su propio código.

## Flujo

```
TABLET (kiosko, sin login)                 SUPABASE                         CELULAR (app)
──────────────────────────                 ────────                         ─────────────
"Llevar lista a mi celular"
  └─ insert en shared_lists  ───────────▶  fila nueva (vence en 30 min)
  └─ muestra QR:
     mercatalk://lista/<id>  ··· escanea ··························▶ lee <id> del QR
                                                                     └─ rpc claim_shared_list(<id>)
                                           claimed_at = now()  ◀───────┘   (devuelve la lista)
  └─ cada 3 s: rpc shared_list_claimed(<id>)
     → true: "¡Lista recibida en tu celular!"
```

## 1. Poner en marcha Supabase (una sola vez, una persona)

1. Crear el proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecutar [`supabase/migrations/20261006183000_shared_lists.sql`](../supabase/migrations/20261006183000_shared_lists.sql).
3. En **Project Settings → API** copiar la **Project URL** y la clave **anon public**:
   - Tablet: en `src/environments/environment.ts` y `environment.prod.ts` → `supabaseUrl` y `supabaseAnonKey`.
   - Celular: lo mismo en su configuración.
4. Opcional: programar la limpieza de listas vencidas con pg_cron (instrucciones al final del SQL).

> La clave **anon** puede ir en las apps: la base la limita con RLS. La clave **service_role** nunca va en ninguna app.
> El plan gratis pausa el proyecto tras ~1 semana sin uso: abrirlo en el dashboard antes de cada demo.

Mientras `supabaseUrl` esté vacío, la tablet sigue mostrando el QR fijo de antes (no se rompe nada).

## 2. Contenido del QR

```
mercatalk://lista/<id>
```

- `<id>` es un UUID v4 (ej. `08cace3a-9239-474d-a1ed-78241b410b30`).
- Regla para leerlo: **tomar el último segmento después de `/`**. Así sigue funcionando si más adelante se cambia a `https://<dominio>/l/<id>` (`sharedListBaseUrl` en el environment de la tablet).

## 3. Lo que tiene que hacer la app de celular

**Abrir el QR**, de una de estas formas (o ambas):

- **Escáner dentro de la app** (lo más simple): leer el texto del QR y sacar el `<id>`.
- **Cámara del teléfono**: registrar el esquema `mercatalk` para que el enlace abra la app. En Android (`AndroidManifest.xml`, dentro de la `<activity>` principal):

  ```xml
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="mercatalk" android:host="lista" />
  </intent-filter>
  ```

  Con Capacitor, el enlace llega en `App.addListener('appUrlOpen', ({ url }) => ...)`.

**Tomar la lista** con `claim_shared_list`. La marca como recibida (la tablet lo muestra) y, si el usuario inició sesión, la asocia a su cuenta:

```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function recibirLista(qrText: string) {
  const id = qrText.trim().split('/').pop();
  const { data, error } = await supabase.rpc('claim_shared_list', { list_id: id });
  if (error) throw error;
  if (!data?.length) throw new Error('La lista no existe o ya venció (duran 30 minutos)');
  return data[0]; // { id, brand_id, title, items, total, language, created_at, expires_at, claimed_at }
}
```

`get_shared_list(list_id)` devuelve lo mismo **sin** marcarla como recibida (útil para una vista previa).

## 4. Formato de la lista

| Campo | Tipo | Ejemplo |
|---|---|---|
| `id` | uuid | `08cace3a-…` |
| `brand_id` | text | `lider`, `jumbo`, `santaisabel`, `unimarc`, `mayorista10` |
| `title` | text | `Mi Compra Actual`, `Lista para Asado / 18 de Septiembre (6-10 personas)` |
| `items` | jsonb (array) | ver abajo |
| `total` | integer (CLP) | `990` |
| `language` | text | `es`, `en`, `pt` (idioma que usaba el cliente en la tablet) |
| `expires_at` | timestamptz | creada + 30 min |
| `claimed_at` | timestamptz \| null | cuándo la tomó el celular |

Cada elemento de `items` (los campos opcionales se omiten si no aplican):

| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | Siempre |
| `qty` | number | Unidades. Es `1` cuando la cantidad viene como texto |
| `qtyLabel` | string? | Cantidad como texto, ej. `"2 kg"` (calculadora de eventos) |
| `aisle` | string? | `"Pasillo 2"` |
| `productId` | number? | Id del catálogo (`products.id`) cuando viene del carrito |
| `unitPrice` | number? | Precio normal por unidad (CLP) |
| `offerPrice` | number? | Precio de oferta por unidad (CLP) |

Ejemplo real:

```json
{
  "id": "0f886bca-155f-41f0-93a4-7e6ad9f54963",
  "brand_id": "lider",
  "title": "Mi Compra Actual",
  "total": 990,
  "language": "es",
  "items": [
    { "name": "Azúcar", "qty": 1, "aisle": "Pasillo 2", "productId": 8, "unitPrice": 1450, "offerPrice": 990 }
  ]
}
```

## 5. Probar sin la app de celular

Con la tablet mostrando un QR, en el **SQL Editor** de Supabase:

```sql
-- la lista más reciente
select id, title, total, claimed_at from public.shared_lists order by created_at desc limit 1;

-- simular que el celular la tomó (la tablet muestra "¡Lista recibida!" en ~3 s)
select * from public.claim_shared_list('<id>');
```

## Dónde está en la tablet

- `src/app/core/shared-list.service.ts`: guarda la lista y consulta si fue recibida.
- `src/app/shared/components/express-qr-modal/`: QR dinámico, estados (generando, listo, recibida, error) y cierre automático al navegar.
- Se abre desde **Mi compra → Llevar lista a mi celular** y desde la **calculadora de eventos**.
