import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { environment } from '../../environments/environment';
import { LanguageService } from '../core/language.service';
import { BrandService } from '../core/brand.service';
import { CartService, unitPriceOf } from '../core/cart.service';
import { CatalogService } from '../core/catalog.service';
import { IntentService } from '../core/intent.service';
import { PromptBuilderService } from '../core/prompt-builder.service';
import { Product } from '../models/catalog.model';
import { CartIntent, ChatMessage, Intent, ChatActionWidget } from '../models/chat.model';
import { ProductHelper } from '../core/product-helper';
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
  private langService = inject(LanguageService);
  private cart = inject(CartService);
  private catalog = inject(CatalogService);
  private intents = inject(IntentService);
  private prompts = inject(PromptBuilderService);

  private lastReferencedProduct: Product | null = null;

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

  get welcomeText(): string {
    const assistantName = this.brand.currentBrand().assistantName;
    const storeName = this.brand.currentBrand().storeName;
    return this.langService.t('home.chatWelcome', { name: assistantName, store: storeName });
  }

  constructor() {
    this.reset();

    // Al cambiar el idioma de la app, si la conversación solo contiene el saludo inicial, actualizarlo reactivamente
    effect(() => {
      this.langService.currentLang(); // dependencia reactiva
      untracked(() => {
        if (this._messages().length <= 1) {
          this.reset();
        }
      });
    });
  }

  // VOLVER A EMPEZAR LA CONVERSACIÓN
  reset(): void {
    this._messages.set([{ role: 'assistant', text: this.welcomeText, at: Date.now() }]);
  }

  // ENVIAR UN MENSAJE Y OBTENER LA RESPUESTA (queda en el historial con widgets)
  async send(text: string): Promise<ChatMessage> {
    const userText = text.trim();
    if (!userText) throw new ApiError('Escribe algo para enviar');
    if (this._isLoading()) throw new ApiError('Espera la respuesta anterior');

    const history = this._messages();
    this.push('user', userText);
    this._isLoading.set(true);

    try {
      const intent = this.intents.analyze(userText);
      let reply = '';
      let widget: ChatActionWidget | undefined;

      if (intent.products.length > 0) {
        this.lastReferencedProduct = intent.products[0];
      }

      if (intent.cart) {
        reply = this.handleCart(intent.cart);
      } else if (intent.type === 'ubicacion' && intent.products.length > 0) {
        const prod = intent.products[0];
        const aisle = prod.supermarketLocation?.aisle || 'Pasillo 1';
        const shelf = prod.supermarketLocation?.shelf || 'Estante 1';
        reply = `Encontré ${prod.name} ${prod.brand}. Está en el ${aisle}, ${shelf}.`;
        widget = {
          type: 'product_location',
          product: prod,
          title: `${prod.name} ${prod.brand}`
        };
      } else if (intent.type === 'ofertas' && intent.offers.length > 0) {
        reply = `Encontré ${intent.offers.length} promociones disponibles:`;
        widget = {
          type: 'offers_list',
          title: `Ofertas destacadas`,
          offers: intent.offers
        };
      } else if (intent.type === 'mas_barato') {
        const target = (intent.products.length > 0 ? intent.products[0] : this.lastReferencedProduct)
          || this.catalog.getProducts().find(p => p.id === 2);

        if (target) {
          const alts = ProductHelper.findCheaperAlternatives(target, this.catalog.getProducts());
          if (alts.length > 0) {
            reply = `Encontré ${alts.length} opciones más económicas frente a ${target.name} (${formatClp(target.price)}). Puedes ahorrar hasta ${formatClp(alts[0].savings)}:`;
            widget = {
              type: 'cheaper_alternatives',
              referenceProduct: target,
              cheaperAlternatives: alts
            };
          } else {
            reply = `${target.name} ya es la opción con el mejor precio disponible en su categoría.`;
          }
        } else {
          reply = `Dime qué producto necesitas y te buscaré las alternativas más baratas.`;
        }
      } else if (intent.type === 'comparar' && intent.products.length >= 2) {
        reply = `Listo, aquí tienes la comparación directa entre ${intent.products[0].name} y ${intent.products[1].name}:`;
        widget = {
          type: 'compare_ready',
          products: intent.products.slice(0, 3)
        };
      } else if (intent.type === 'precio' && intent.products.length > 0) {
        const prod = intent.products[0];
        const price = prod.inOffer && prod.offerPrice ? prod.offerPrice : prod.price;
        reply = `${prod.name} de ${prod.brand} cuesta ${formatClp(price)}${prod.inOffer ? ' (en oferta)' : ''}.`;
        widget = {
          type: 'product_price',
          product: prod,
          title: `${prod.name} ${prod.brand}`
        };
      } else {
        reply = await this.askModel(userText, intent, history);
        if (intent.products.length > 0) {
          widget = {
            type: 'product_location',
            product: intent.products[0],
            title: `${intent.products[0].name} ${intent.products[0].brand}`
          };
        }
      }

      return this.push('assistant', reply, widget);
    } catch (error) {
      const defaultErr = this.langService.t('home.cannotAnswer');
      const message = error instanceof ApiError
        ? `${defaultErr}: ${error.message}.`
        : defaultErr;
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
          const budget = this.cart.budget();
          const budgetLine = budget !== null ? ` Tu presupuesto es ${formatClp(budget)}.` : '';
          return `Tu compra está vacía por ahora. Dime "agrega" y un producto, o escanéalo, y te voy sumando.${budgetLine}`;
        }
        const lines = this.cart.items()
          .map(item => `${item.qty} × ${item.name} (${formatClp(unitPriceOf(item) * item.qty)})`)
          .join(', ');
        const savings = this.cart.savings() > 0 ? ` Ahorras ${formatClp(this.cart.savings())} en ofertas.` : '';
        return `Llevas ${lines}. Total: ${formatClp(this.cart.total())}.${savings}${this.budgetNote()}`;
      }
      case 'clear':
        this.cart.clear();
        return 'Listo, vacié tu compra. Empezamos de nuevo cuando quieras.';
      case 'add': {
        if (cart.product) {
          this.cart.add(cart.product, cart.qty);
          const unit = cart.product.inOffer && cart.product.offerPrice !== undefined ? cart.product.offerPrice : cart.product.price;
          const offer = cart.product.inOffer ? ' en oferta' : '';
          return `Agregué ${cart.qty} × ${name(cart.product)} a ${formatClp(unit)}${offer}. ${status()}${this.budgetNote()}`;
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
      case 'setBudget': {
        if (cart.amount === undefined) {
          const current = this.cart.budget();
          return current !== null
            ? `Tu presupuesto actual es ${formatClp(current)}. Dime un monto nuevo, por ejemplo "mi presupuesto es 30000", para cambiarlo.`
            : 'Dime cuánto quieres gastar, por ejemplo "mi presupuesto es 30000" o "no quiero gastar más de 20 mil".';
        }
        this.cart.setBudget(cart.amount);
        const base = `Listo, tu presupuesto queda en ${formatClp(cart.amount)}.`;
        if (this.cart.isEmpty()) return base;
        return this.cart.budgetStatus() === 'over'
          ? `${base} Ya llevas ${formatClp(this.cart.total())}, te pasaste por ${formatClp(this.cart.total() - cart.amount)}.${this.suggestCheaperAlternative()}`
          : `${base} ${status()}`;
      }
      case 'clearBudget':
        this.cart.setBudget(null);
        return 'Listo, quité tu presupuesto.';
    }
  }

  /** Aviso al 80 % y al pasarse del presupuesto (Fase 3); vacío si no aplica. */
  private budgetNote(): string {
    const status = this.cart.budgetStatus();
    if (!status || status === 'ok') return '';
    const budget = this.cart.budget()!;
    if (status === 'over') {
      const over = this.cart.total() - budget;
      return ` Te pasaste del presupuesto de ${formatClp(budget)} por ${formatClp(over)}.${this.suggestCheaperAlternative()}`;
    }
    const percent = Math.round((this.cart.total() / budget) * 100);
    return ` Vas en ${formatClp(this.cart.total())} de tu presupuesto de ${formatClp(budget)} (${percent}%).`;
  }

  /** El producto en oferta más barato que aún no está en el carrito. */
  private suggestCheaperAlternative(): string {
    const inCart = new Set(this.cart.items().map(item => item.productId));
    const cheapest = this.catalog.getProducts()
      .filter(p => p.inOffer && p.offerPrice !== undefined && !inCart.has(p.id))
      .sort((a, b) => (a.offerPrice ?? a.price) - (b.offerPrice ?? b.price))[0];
    return cheapest ? ` Puedes reemplazar algo por ${cheapest.name} ${cheapest.brand}, está en oferta a ${formatClp(cheapest.offerPrice!)}.` : '';
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
          character_name: this.brand.currentBrand().id,
          language: this.langService.currentLang()
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

  private push(role: ChatMessage['role'], text: string, widget?: ChatActionWidget): ChatMessage {
    const message: ChatMessage = { role, text, at: Date.now(), widget };
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
