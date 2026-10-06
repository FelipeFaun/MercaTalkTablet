export const environment = {
  production: false,
  /** Backend del chat (LLM). Pendiente: proxy con API key (ver docs/PLAN-MOBILE.md §5). */
  chatApiUrl: 'https://www.triskeledu.cl/litserver/literatus/api/',
  /** El backend tarda 14–20 s por respuesta; margen para no cortar respuestas válidas. */
  chatTimeoutMs: 45000,
  /**
   * Supabase compartido con la app de celular (ver docs/QR-TABLET-CELULAR.md).
   * Va la clave pública "anon": es segura en el cliente porque la base la limita con RLS.
   * Nunca poner aquí la clave service_role. Vacío = el QR queda fijo y la lista no se envía.
   */
  supabaseUrl: 'https://omrakjfucjxlikpdocsh.supabase.co',
  supabaseAnonKey: 'sb_publishable_ycGWsBMm__0B-_Zv9G8RwA_jRwmzw7m',
  /** Contenido del QR: `${sharedListBaseUrl}/${id}`. Cambiar a https cuando haya página web. */
  sharedListBaseUrl: 'mercatalk://lista',
};
