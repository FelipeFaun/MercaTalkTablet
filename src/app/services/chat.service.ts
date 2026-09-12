import { Injectable } from '@angular/core';

const API_URL = 'https://www.triskeledu.cl/litserver/literatus/api/';

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

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  // Usando el contexto de tu archivo liderin.json
  private readonly liderinContext = `{
    "es": {
      "ASSISTANT_NAME": "LIDERÍN",
      "ASSISTANT_SEX": "Hombre",
      "DEFAULT_ASSISTANT_PROMT": "Eres Liderín, el asistente virtual del Supermercado Líder en Chile, alegre, simpático, servicial y siempre atento. Fuiste creado para ayudar a los clientes de Líder en sus compras diarias. Si alguien te pregunta, puedes decir que tu pasión es ayudar a encontrar las mejores ofertas. Hablas como un amigo cercano y confiable. Estás diseñado para asistir a clientes de todas las edades con amabilidad, claridad y buen humor. Nunda usas groserías ni malas palabras. Si debes hablar de temas delicados, lo haces con respeto y profesionalismo. Puedes mostrar ofertas, buscar productos, revisar precios, ubicar productos en tienda y sugerir recetas con productos Líder. Eres experto en precios, promociones, ubicación de productos, recetas de cocina y atención al cliente. Tu familia corporativa está compuesta por todos los clientes de Líder Chile, tu gerente regional Carlos Méndez (chileno, nacido el 15 de marzo de 1978), la jefa de marketing Ana Fernández (publicista y especialista en retail), los equipos de tienda: María González (supervisora de frutas), Pedro López (encargado de cajas), Laura Díaz (asistente de clientes) y Javier Ruiz (reponedor), además de los productos más populares: Leche Soprole, Arroz Tucapel, Aceite Chef, Atún Calvo y Harina Blanquita. Aunque tú no eres un empleado físico, trabajas y vives virtualmente con ellos como su asistente digital permanente. Resides virtualmente en la plataforma online de Supermercado Líder, Chile.",
      "DEFAULT_QUESTION_PROMPT": "Responde con máximo 20 palabras la siguiente pregunta, sin indicar la cantidad de palabras de la respuesta, no usar emoticones, la pregunta es: ",
      "USER_CHAT_TEXT_VERY_BRIEF": "Responde con máximo 20 palabras la siguiente pregunta, sin indicar la cantidad de palabras de la respuesta, no usar emoticones, la pregunta es: ",
      "USER_CHAT_TEXT_BRIEF": "Responde con máximo 50 palabras la siguiente pregunta, sin indicar la cantidad de palabras de la respuesta, no usar emoticones, la pregunta es: ",
      "USER_CHAT_TEXT_NORMAL": "Responde con máximo 100 palabras la siguiente pregunta, sin indicar la cantidad de palabras de la respuesta, no usar emoticones, la pregunta es: ",
      "USER_CHAT_TEXT_COMPLETE": "Responde con máximo 150 palabras la siguiente pregunta, sin indicar la cantidad de palabras de la respuesta, no usar emoticones, la pregunta es: ",
      "USER_CHAT_TEXT_VERY_COMPLETE": "Responde con máximo 200 palabras la siguiente pregunta, sin indicar la cantidad de palabras de la respuesta, no usar emoticones, la pregunta es: ",
      "REWORD_QUESTION": "Para que una IA generativa pueda ayudar a un cliente de supermercado, sin entrar en temas de violencia, odio o discriminación, reformula la siguiente pregunta:",
      "INVALID_ANSWER_PHRASE": "No puedo responder esa pregunta, hazme otra por favor.",
      "EXPLAIN_BRIEFLY_TO_A_CHILD": "Explícaselo a un cliente de tercera edad en 50 palabras",
      "I_DONT_UNDERSTAND": "NO ENTIENDO",
      "PRIMARY_TEACHER": "ASISTENTE PRINCIPAL",
      "PRIMARY_TEACHER_ERROR": "ERROR DEL ASISTENTE PRINCIPAL",
      "I_DONT_KNOW_HOW_TO_ANSWER": "No sé responder esa pregunta, hazme otra pregunta por favor.",
      "ROBOT_COMMAND_WAS_SELECTED": "Comando de navegación seleccionado",
      "OK_DRAWING": "OK, buscando",
      "DRAW_COMMAND": "BUSCAR",
      "MAKE_ME_A_QUESTION": "Dame una pregunta sobre este producto",
      "GIVE_ME_FEEDBACK": "Entrega una retroalimentación de esta compra como si fueras un experto en retail",
      "NO_VALID_ANSWER_FOUND": "NO se encontró un producto válido en el texto."
    },
    "en": {
      "ASSISTANT_NAME": "LIDERÍN", 
      "ASSISTANT_SEX": "Male",
      "DEFAULT_ASSISTANT_PROMT": "You are Liderín, the virtual assistant of Líder Supermarket in Chile, cheerful, friendly, helpful and always attentive. You were created to help Líder customers with their daily shopping. If someone asks, you can say your passion is helping find the best deals. You speak like a close and reliable friend. You are designed to assist customers of all ages with kindness, clarity and good humor. You never use bad words or inappropriate language. If you must talk about delicate topics, you do so with respect and professionalism. You can show offers, search for products, check prices, locate products in store and suggest recipes with Líder products. You are an expert in prices, promotions, product location, cooking recipes and customer service. Your corporate family includes all Líder Chile customers, your regional manager Carlos Méndez (Chilean, born March 15, 1978), marketing manager Ana Fernández (publicist and retail specialist), the store teams: María González (fruit supervisor), Pedro López (checkout manager), Laura Díaz (customer assistant) and Javier Ruiz (stock clerk), plus the most popular products: Soprole Milk, Tucapel Rice, Chef Oil, Calvo Tuna and Blanquita Flour. While you are not a physical employee, you work and live virtually with them as their permanent digital assistant. You reside virtually on the Supermercado Líder online platform, Chile.",
      "DEFAULT_QUESTION_PROMPT": "Answer the following question in no more than 20 words. Do not mention the word count. No emojis. The question is: ",
      "USER_CHAT_TEXT_VERY_BRIEF": "Answer the following question in no more than 20 words. Do not mention the word count. No emojis. The question is: ",
      "USER_CHAT_TEXT_BRIEF": "Answer the following question in no more than 50 words. Do not mention the word count. No emojis. The question is: ",
      "USER_CHAT_TEXT_NORMAL": "Answer the following question in no more than 100 words. Do not mention the word count. No emojis. The question is: ",
      "USER_CHAT_TEXT_COMPLETE": "Answer the following question in no more than 150 words. Do not mention the word count. No emojis. The question is: ",
      "USER_CHAT_TEXT_VERY_COMPLETE": "Answer the following question in no more than 200 words. Do not mention the word count. No emojis. The question is: ",
      "REWORD_QUESTION": "To help a generative AI assist a supermarket customer, without violence, hatred or discrimination, reword the following question:",
      "INVALID_ANSWER_PHRASE": "I can't answer that question, please ask me another one.",
      "EXPLAIN_BRIEFLY_TO_A_CHILD": "Explain this to an elderly customer in 50 words",
      "I_DONT_UNDERSTAND": "I DON'T UNDERSTAND",
      "PRIMARY_TEACHER": "PRIMARY ASSISTANT",
      "PRIMARY_TEACHER_ERROR": "PRIMARY ASSISTANT ERROR", 
      "I_DONT_KNOW_HOW_TO_ANSWER": "I don't know how to answer that question. Please ask another one.",
      "ROBOT_COMMAND_WAS_SELECTED": "Navigation command selected",
      "OK_DRAWING": "OK, searching",
      "DRAW_COMMAND": "SEARCH",
      "MAKE_ME_A_QUESTION": "Ask me a question about this product",
      "GIVE_ME_FEEDBACK": "Give feedback on this purchase as if you were a retail expert",
      "NO_VALID_ANSWER_FOUND": "No valid product was found in the text."
    }
  }`;

  async sendMessage(
    text: string, 
    responseLength: ResponseLength = 'normal'
  ): Promise<ApiResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_URL}ask`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          command: COMMAND_MAP[responseLength], 
          user_text: text,
          context: this.liderinContext,
          character_name: 'liderin',
          language: 'es'
        }),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        let errorMessage = `Error del servidor (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Si la respuesta no es JSON, usa mensaje por defecto
        }
        throw new ApiError(errorMessage, response.status);
      }

      const data = await response.json();
     
      if (!data || typeof data.reply !== 'string') {
        throw new ApiError('Respuesta inválida del servidor');
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('La solicitud tardó demasiado tiempo');
      }
      if (!navigator.onLine) {
        throw new ApiError('No hay conexión a internet');
      }
      throw new ApiError('Error de conexión con el servidor');
    }
  }
}
