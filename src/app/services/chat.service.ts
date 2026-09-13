import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { BrandService } from '../core/brand.service';
import { CartService, unitPriceOf } from '../core/cart.service';
import { CatalogService } from '../core/catalog.service';
import { IntentService } from '../core/intent.service';
import { PromptBuilderService } from '../core/prompt-builder.service';
import { Product } from '../models/catalog.model';
import { CartIntent, ChatMessage, Intent } from '../models/chat.model';
import { formatClp } from '../shared/pipes/clp.pipe';

export interface ApiResponse {
  reply: string;
  context?: string;
  error?: string;
}

export type ResponseLength = 'very_brief' | 'brief' | 'normal' | 'complete' | 'very_complete';

const COMMAND_MAP: Record<ResponseLength, string> = {
  very_brief: 'USER_CHAT_TEXT_VERY_BRIEF',
  brief: 'USER_CHAT_TEXT_BRIEF',
  normal: 'USER_CHAT_TEXT_NORMAL',
  complete: 'USER_CHAT_TEXT_COMPLETE',
  very_complete: 'USER_CHAT_TEXT_VERY_COMPLETE'
};

export class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Conversación con el asistente: historial en pantalla, memoria de los últimos
 * turnos, datos del catálogo como contexto y órdenes sobre el carrito que se
 * resuelven en el dispositivo sin llamar al modelo.
 */
@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private brand = inject(BrandService);
  private cart = inject(CartService);
  private catalog = inject(CatalogService);
  private intents = inject(IntentService);
  private prompts = inject(PromptBuilderService);

  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _isLoading = signal(false);

  readonly messages = this._messages.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly lastReply = computed(() => {
    const messages = this._messages();
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].text;
    }
    return '';
  });

  readonly welcomeText = `¡Hola! Soy ${this.brand.brand.assistantName}. Puedo decirte precios, ofertas, dónde está cada producto y llevar la cuenta de tu compra. ¿En qué te ayudo?`;

  constructor() {
    this.reset();
  }

  // VOLVER A EMPEZAR LA CONVERSACIÓN
  reset(): void {
    this._messages.set([{ role: 'assistant', text: this.welcomeText, at: Date.now() }]);
  }

  // ENVIAR UN MENSAJE Y OBTENER LA RESPUESTA (queda en el historial)
  async send(text: string): Promise<ChatMessage> {
    const userText = text.trim();
    if (!userText) throw new ApiError('Escribe algo para enviar');
    if (this._isLoading()) throw new ApiError('Espera la respuesta anterior');

    const history = this._messages();
    this.push('user', userText);
    this._isLoading.set(true);

    try {
      const intent = this.intents.analyze(userText);
      const reply = intent.cart
        ? this.handleCart(intent.cart)
        : await this.askModel(userText, intent, history);
      return this.push('assistant', reply);
    } catch (error) {
      const message = error instanceof ApiError
        ? `No pude responder: ${error.message}.`
        : 'No pude responder ahora. Intenta de nuevo en un momento.';
      return this.push('assistant', message);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ---------- carrito por chat (2.8) ----------

  private handleCart(cart: CartIntent): string {
    const name = (product: Product) => `${product.name} ${product.brand}`;
    const status = () => this.cart.isEmpty()
      ? 'Tu compra quedó vacía.'
      : `Llevas ${formatClp(this.cart.total())} en ${this.cart.count()} ${this.cart.count() === 1 ? 'producto' : 'productos'}.`;

    switch (cart.command) {
      case 'total': {
        if (this.cart.isEmpty()) {
          return 'Tu compra está vacía por ahora. Dime "agrega" y un producto, o escanéalo, y te voy sumando.';
        }
        const lines = this.cart.items()
          .map(item => `${item.qty} × ${item.name} (${formatClp(unitPriceOf(item) * item.qty)})`)
          .join(', ');
        const savings = this.cart.savings() > 0 ? ` Ahorras ${formatClp(this.cart.savings())} en ofertas.` : '';
        return `Llevas ${lines}. Total: ${formatClp(this.cart.total())}.${savings}`;
      }
      case 'clear':
        this.cart.clear();
        return 'Listo, vacié tu compra. Empezamos de nuevo cuando quieras.';
      case 'add': {
        if (cart.product) {
          this.cart.add(cart.product, cart.qty);
          const unit = cart.product.inOffer && cart.product.offerPrice !== undefined ? cart.product.offerPrice : cart.product.price;
          const offer = cart.product.inOffer ? ' en oferta' : '';
          return `Agregué ${cart.qty} × ${name(cart.product)} a ${formatClp(unit)}${offer}. ${status()}`;
        }
        if (cart.candidates.length > 1) {
          const options = cart.candidates.slice(0, 4).map(p => `${name(p)} (${formatClp(p.inOffer && p.offerPrice !== undefined ? p.offerPrice : p.price)})`).join(', ');
          return `¿Cuál quieres agregar? Tengo ${options}. Dime la marca y lo sumo.`;
        }
        return 'No encontré ese producto en el catálogo. Prueba con el nombre como aparece en la etiqueta o escanéalo.';
      }
      case 'remove': {
        const target = cart.product ?? cart.candidates.find(p => this.cart.find(p.id));
        if (!target) {
          return cart.candidates.length > 1
            ? `¿Cuál quito? En tu compra tienes ${this.cart.items().map(i => i.name).join(', ')}.`
            : 'No encontré ese producto en tu compra.';
        }
        if (!this.cart.find(target.id)) {
          return `${name(target)} no está en tu compra. ${status()}`;
        }
        this.cart.remove(target.id);
        return `Quité ${name(target)} de tu compra. ${status()}`;
      }
    }
  }

  // ---------- modelo ----------

  private async askModel(userText: string, intent: Intent, history: ChatMessage[]): Promise<string> {
    const prompt = this.prompts.build(userText, intent, history.filter(m => m.text !== this.welcomeText));
    const response = await this.request(prompt, 'normal');
    let reply = toPlainText(response.reply);

    // Receta: sumamos los productos del catálogo que usa (dato duro, sin regex sobre el texto del modelo)
    if (intent.type === 'receta' && intent.recipes.length > 0) {
      const products = this.catalog.getRecipeProducts(intent.recipes[0]);
      if (products.length > 0) {
        const lines = products.map(p => `${p.name} ${p.brand} ${formatClp(p.inOffer && p.offerPrice !== undefined ? p.offerPrice : p.price)}${p.inOffer ? ' (oferta)' : ''}`);
        reply += `\n\nEn ${this.brand.brand.storeName} tenemos: ${lines.join(', ')}. Dime "agrega" y el producto para sumarlo a tu compra.`;
      }
    }
    return reply;
  }

  /** Llama al backend con timeout y un reintento (B7). */
  private async request(text: string, responseLength: ResponseLength): Promise<ApiResponse> {
    try {
      return await this.fetchOnce(text, responseLength);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode !== undefined && error.statusCode < 500) {
        throw error; // 4xx no se reintenta
      }
      return await this.fetchOnce(text, responseLength);
    }
  }

  private async fetchOnce(text: string, responseLength: ResponseLength): Promise<ApiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), environment.chatTimeoutMs);

    try {
      const response = await fetch(`${environment.chatApiUrl}ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          command: COMMAND_MAP[responseLength],
          user_text: text,
          context: this.prompts.characterContext,
          character_name: 'liderin',
          language: 'es'
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        let errorMessage = `error del servidor (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.error) errorMessage = errorData.error;
        } catch {
          // Si la respuesta no es JSON, usa mensaje por defecto
        }
        throw new ApiError(errorMessage, response.status);
      }

      const data = await response.json();
      if (!data || typeof data.reply !== 'string') {
        throw new ApiError('respuesta inválida del servidor');
      }
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') throw new ApiError('el servidor tardó demasiado');
      if (!navigator.onLine) throw new ApiError('no hay conexión a internet');
      throw new ApiError('no pude conectar con el servidor');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private push(role: ChatMessage['role'], text: string): ChatMessage {
    const message: ChatMessage = { role, text, at: Date.now() };
    this._messages.update(messages => [...messages, message]);
    return message;
  }
}

/** La respuesta se muestra con interpolación (nunca innerHTML); aquí se limpia el Markdown residual (2.6). */
export function toPlainText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[ 	]*[-*•][ 	]+/gm, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
