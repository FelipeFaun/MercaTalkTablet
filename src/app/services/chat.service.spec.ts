import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';

import { ChatService, toPlainText } from './chat.service';
import { CartService } from '../core/cart.service';

function fakeReply(reply: string): Response {
  return new Response(JSON.stringify({ reply }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('ChatService', () => {
  let service: ChatService;
  let cart: CartService;
  let fetchSpy: jasmine.Spy<typeof fetch>;

  beforeEach(async () => {
    await Preferences.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatService);
    cart = TestBed.inject(CartService);
    fetchSpy = spyOn(window, 'fetch');
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('parte con el saludo del asistente en el historial', () => {
    expect(service.messages().length).toBe(1);
    expect(service.messages()[0].role).toBe('assistant');
    expect(service.lastReply()).toContain('Liderín');
  });

  it('el mensaje del usuario y la respuesta quedan en el historial (C4)', async () => {
    fetchSpy.and.resolveTo(fakeReply('La leche cuesta 999 pesos.'));
    await service.send('cuánto vale la leche soprole');
    const roles = service.messages().map(m => m.role);
    expect(roles).toEqual(['assistant', 'user', 'assistant']);
    expect(service.messages()[1].text).toBe('cuánto vale la leche soprole');
    expect(service.lastReply()).toBe('La leche cuesta 999 pesos.');
  });

  it('envía al backend el contexto del producto y los turnos previos', async () => {
    fetchSpy.and.resolveTo(fakeReply('ok'));
    await service.send('cuánto vale la leche soprole');
    fetchSpy.and.resolveTo(fakeReply('ok 2'));
    await service.send('¿y la sin lactosa?');

    const body = JSON.parse(fetchSpy.calls.mostRecent().args[1]?.body as string);
    expect(body.user_text).toContain('CONVERSACIÓN PREVIA');
    expect(body.user_text).toContain('cuánto vale la leche soprole');
    expect(body.user_text).toContain('Leche sin lactosa Colun');
    expect(body.user_text).toContain('sin Markdown');
    expect(body.context).not.toContain('Nunda');
    expect(body.context).not.toContain('Carlos Méndez');
    expect(body.context).not.toContain('ASSISTANT_SEX');
    expect(fetchSpy.calls.mostRecent().args[1]?.credentials).toBeUndefined();
  });

  it('limpia el Markdown de la respuesta (2.6)', async () => {
    fetchSpy.and.resolveTo(fakeReply('**Leche Entera Soprole** a *999* 🔥\n\n\n- oferta'));
    await service.send('precio de la leche');
    expect(service.lastReply()).toBe('Leche Entera Soprole a 999\n\noferta');
  });

  it('reintenta una vez si el servidor falla (B7)', async () => {
    fetchSpy.and.returnValues(
      Promise.resolve(new Response('caído', { status: 503 })),
      Promise.resolve(fakeReply('recuperado')),
    );
    await service.send('hola, qué tal');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(service.lastReply()).toBe('recuperado');
  });

  it('responde con un mensaje útil si el backend no está disponible', async () => {
    fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));
    await service.send('hola');
    expect(service.lastReply()).toContain('No pude responder');
    expect(service.isLoading()).toBeFalse();
  });

  describe('carrito por chat (2.8, sin llamar al modelo)', () => {
    it('"agrega dos leches soprole" agrega y confirma con el total', async () => {
      const reply = await service.send('agrega dos leches soprole');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(cart.find(1)?.qty).toBe(2);
      expect(reply.text).toContain('Agregué 2 × Leche Entera Soprole');
      expect(reply.text).toContain('$1.998');
    });

    it('pide precisar cuando hay varias opciones', async () => {
      const reply = await service.send('agrega leche');
      expect(cart.isEmpty()).toBeTrue();
      expect(reply.text).toContain('¿Cuál quieres agregar?');
      expect(reply.text).toContain('Soprole');
      expect(reply.text).toContain('Colun');
    });

    it('"cuánto llevo" resume la compra y "saca" quita', async () => {
      await service.send('agrega arroz tucapel');
      const total = await service.send('¿cuánto llevo?');
      expect(total.text).toContain('Arroz Grado 1');
      expect(total.text).toContain('Total: $1.490');

      const removed = await service.send('saca el arroz');
      expect(removed.text).toContain('Quité Arroz Grado 1');
      expect(cart.isEmpty()).toBeTrue();
    });

    it('"vacía el carrito" limpia todo', async () => {
      await service.send('agrega dos yogures');
      await service.send('vacía el carrito');
      expect(cart.isEmpty()).toBeTrue();
    });
  });
});

describe('toPlainText', () => {
  it('quita negritas, títulos, viñetas y emojis', () => {
    expect(toPlainText('# Título\n**negrita** y *cursiva* `código` 🍳')).toBe('Título\nnegrita y cursiva código');
  });
});
