import { Injectable, inject } from '@angular/core';
import { BrandService } from './brand.service';
import { ChatMessage, Intent } from '../models/chat.model';
import { OfferView, Product, Recipe } from '../models/catalog.model';
import { formatClp } from '../shared/pipes/clp.pipe';

/** Cuántos turnos previos se envían para que el modelo tenga memoria. */
export const HISTORY_TURNS = 8;

/**
 * Arma el texto que se envía al modelo: conversación previa + datos del
 * catálogo que aplican + instrucción. Sale de HomePage (M3).
 *
 * Pendiente (A7): el prompt del personaje debería vivir en el backend y
 * resolverse por character_name; mientras se llame a triskeledu directo va aquí.
 */
@Injectable({
  providedIn: 'root'
})
export class PromptBuilderService {
  private brand = inject(BrandService);

  /** Contexto del personaje (formato que espera el backend: JSON con "es" y "en"). */
  readonly characterContext = JSON.stringify(buildCharacterContext(this.brand.brand.assistantName, this.brand.brand.storeName));

  build(userText: string, intent: Intent, history: ChatMessage[]): string {
    const parts: string[] = [];

    const previous = history.slice(-HISTORY_TURNS);
    if (previous.length > 0) {
      const transcript = previous
        .map(message => `${message.role === 'user' ? 'Cliente' : this.brand.brand.assistantName}: ${message.text}`)
        .join('\n');
      parts.push(`CONVERSACIÓN PREVIA (para entender referencias como "y la otra?" o "esa"):\n${transcript}`);
    }

    if (intent.products.length > 0) {
      parts.push(`PRODUCTOS DEL CATÁLOGO:\n${intent.products.map(describeProduct).join('\n')}`);
    }
    if (intent.offers.length > 0) {
      parts.push(`OFERTAS VIGENTES:\n${intent.offers.map(describeOffer).join('\n')}`);
    }
    if (intent.recipes.length > 0) {
      parts.push(`RECETAS:\n${intent.recipes.map(describeRecipe).join('\n\n')}`);
    }

    parts.push(`INSTRUCCIÓN: ${instructionFor(intent)} Usa solo los datos entregados; si no tienes el dato, dilo. Responde en texto plano: sin Markdown, sin asteriscos, sin listas con símbolos ni emoticones.`);
    parts.push(`PREGUNTA ACTUAL DEL CLIENTE: "${userText}"`);

    return parts.join('\n\n');
  }
}

function describeProduct(product: Product): string {
  const price = product.inOffer && product.offerPrice !== undefined
    ? `OFERTA ${formatClp(product.offerPrice)} (normal ${formatClp(product.price)})`
    : formatClp(product.price);
  const location = product.supermarketLocation
    ? ` | ${product.supermarketLocation.aisle}, ${product.supermarketLocation.section}, ${product.supermarketLocation.shelf}`
    : '';
  return `- ${product.name} ${product.brand}: ${price}${location}`;
}

function describeOffer(offer: OfferView): string {
  return `- ${offer.product} ${offer.brand}: ${formatClp(offer.price)} (antes ${formatClp(offer.originalPrice)}, ${offer.discount}% dcto., hasta ${offer.validUntil})`;
}

function describeRecipe(recipe: Recipe): string {
  return `${recipe.name} (${recipe.time}, ${recipe.difficulty}): ${recipe.description}\nIngredientes: ${recipe.ingredients.join('; ')}\nPasos: ${recipe.steps.map((step, i) => `${i + 1}. ${step}`).join(' ')}`;
}

function instructionFor(intent: Intent): string {
  switch (intent.type) {
    case 'precio': return 'Responde con los precios exactos y menciona si hay oferta.';
    case 'ubicacion': return 'Responde con la ubicación exacta dentro de la tienda (pasillo, sección, estante).';
    case 'ofertas': return 'Destaca las ofertas: precio de oferta, precio normal, ahorro y hasta cuándo dura.';
    case 'categoria': return 'Muestra una variedad representativa, máximo 3 productos.';
    case 'receta': return 'Entrega la receta con ingredientes y pasos claros, en tono cercano.';
    default: return 'Responde de forma útil y breve.';
  }
}

/** Prompt del personaje. Corrige "Nunda" y elimina empleados inventados y ASSISTANT_SEX (B2). */
function buildCharacterContext(assistantName: string, storeName: string): Record<string, Record<string, string>> {
  const plain = 'Responde en texto plano, sin Markdown ni emoticones, sin indicar la cantidad de palabras.';
  const plainEn = 'Answer in plain text, no Markdown, no emojis, do not mention the word count.';
  return {
    es: {
      ASSISTANT_NAME: assistantName.toUpperCase(),
      DEFAULT_ASSISTANT_PROMT: `Eres ${assistantName}, el asistente virtual del supermercado ${storeName} en Chile: alegre, simpático, servicial y siempre atento. Ayudas a los clientes en sus compras diarias: precios, ofertas, ubicación de productos en la tienda, recetas y lo que llevan en su compra. Hablas como un amigo cercano y confiable, con amabilidad, claridad y buen humor, en español de Chile. Nunca usas groserías. Si un tema es delicado, respondes con respeto. Solo entregas precios y datos que aparezcan en la información que se te entrega; si no tienes el dato, lo dices y ofreces ayudar de otra forma. ${plain}`,
      DEFAULT_QUESTION_PROMPT: `Responde con máximo 20 palabras la siguiente pregunta. ${plain} La pregunta es: `,
      USER_CHAT_TEXT_VERY_BRIEF: `Responde con máximo 20 palabras la siguiente pregunta. ${plain} La pregunta es: `,
      USER_CHAT_TEXT_BRIEF: `Responde con máximo 50 palabras la siguiente pregunta. ${plain} La pregunta es: `,
      USER_CHAT_TEXT_NORMAL: `Responde con máximo 100 palabras la siguiente pregunta. ${plain} La pregunta es: `,
      USER_CHAT_TEXT_COMPLETE: `Responde con máximo 150 palabras la siguiente pregunta. ${plain} La pregunta es: `,
      USER_CHAT_TEXT_VERY_COMPLETE: `Responde con máximo 200 palabras la siguiente pregunta. ${plain} La pregunta es: `,
      REWORD_QUESTION: 'Para que una IA generativa pueda ayudar a un cliente de supermercado, sin entrar en temas de violencia, odio o discriminación, reformula la siguiente pregunta:',
      INVALID_ANSWER_PHRASE: 'No puedo responder esa pregunta, hazme otra por favor.',
      EXPLAIN_BRIEFLY_TO_A_CHILD: 'Explícaselo a un cliente de tercera edad en 50 palabras',
      I_DONT_UNDERSTAND: 'NO ENTIENDO',
      PRIMARY_TEACHER: 'ASISTENTE PRINCIPAL',
      PRIMARY_TEACHER_ERROR: 'ERROR DEL ASISTENTE PRINCIPAL',
      I_DONT_KNOW_HOW_TO_ANSWER: 'No sé responder esa pregunta, hazme otra pregunta por favor.',
      ROBOT_COMMAND_WAS_SELECTED: 'Comando de navegación seleccionado',
      OK_DRAWING: 'OK, buscando',
      DRAW_COMMAND: 'BUSCAR',
      MAKE_ME_A_QUESTION: 'Dame una pregunta sobre este producto',
      GIVE_ME_FEEDBACK: 'Entrega una retroalimentación de esta compra como si fueras un experto en retail',
      NO_VALID_ANSWER_FOUND: 'NO se encontró un producto válido en el texto.',
    },
    en: {
      ASSISTANT_NAME: assistantName.toUpperCase(),
      DEFAULT_ASSISTANT_PROMT: `You are ${assistantName}, the virtual assistant of the ${storeName} supermarket in Chile: cheerful, friendly, helpful and always attentive. You help customers with their daily shopping: prices, offers, product location in the store, recipes and what they carry in their cart. You speak like a close, reliable friend, with kindness, clarity and good humor. You never use bad words. Only give prices and facts that appear in the information provided; if you do not have the data, say so and offer to help another way. ${plainEn}`,
      DEFAULT_QUESTION_PROMPT: `Answer the following question in no more than 20 words. ${plainEn} The question is: `,
      USER_CHAT_TEXT_VERY_BRIEF: `Answer the following question in no more than 20 words. ${plainEn} The question is: `,
      USER_CHAT_TEXT_BRIEF: `Answer the following question in no more than 50 words. ${plainEn} The question is: `,
      USER_CHAT_TEXT_NORMAL: `Answer the following question in no more than 100 words. ${plainEn} The question is: `,
      USER_CHAT_TEXT_COMPLETE: `Answer the following question in no more than 150 words. ${plainEn} The question is: `,
      USER_CHAT_TEXT_VERY_COMPLETE: `Answer the following question in no more than 200 words. ${plainEn} The question is: `,
      REWORD_QUESTION: 'To help a generative AI assist a supermarket customer, without violence, hatred or discrimination, reword the following question:',
      INVALID_ANSWER_PHRASE: "I can't answer that question, please ask me another one.",
      EXPLAIN_BRIEFLY_TO_A_CHILD: 'Explain this to an elderly customer in 50 words',
      I_DONT_UNDERSTAND: "I DON'T UNDERSTAND",
      PRIMARY_TEACHER: 'PRIMARY ASSISTANT',
      PRIMARY_TEACHER_ERROR: 'PRIMARY ASSISTANT ERROR',
      I_DONT_KNOW_HOW_TO_ANSWER: "I don't know how to answer that question. Please ask another one.",
      ROBOT_COMMAND_WAS_SELECTED: 'Navigation command selected',
      OK_DRAWING: 'OK, searching',
      DRAW_COMMAND: 'SEARCH',
      MAKE_ME_A_QUESTION: 'Ask me a question about this product',
      GIVE_ME_FEEDBACK: 'Give feedback on this purchase as if you were a retail expert',
      NO_VALID_ANSWER_FOUND: 'No valid product was found in the text.',
    },
  };
}
