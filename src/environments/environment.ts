export const environment = {
  production: false,
  /** Backend del chat (LLM). Pendiente: proxy con API key (ver docs/PLAN-MOBILE.md §5). */
  chatApiUrl: 'https://www.triskeledu.cl/litserver/literatus/api/',
  /** El backend tarda 14–20 s por respuesta; margen para no cortar respuestas válidas. */
  chatTimeoutMs: 45000,
};
