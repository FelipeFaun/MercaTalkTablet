import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController, provideIonicAngular } from '@ionic/angular/standalone';

import { CartPage } from './cart.page';
import { CartService } from '../core/cart.service';
import { Product } from '../models/catalog.model';

const leche: Product = {
  id: 1, name: 'Leche Entera', brand: 'Soprole', price: 1250, image: '', barcode: '1', category: 'Lácteos',
  inOffer: true, offerPrice: 999,
};

describe('CartPage', () => {
  let component: CartPage;
  let fixture: ComponentFixture<CartPage>;
  let cart: CartService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [provideRouter([]), provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(CartPage);
    component = fixture.componentInstance;
    cart = TestBed.inject(CartService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('presupuesto (Fase 3)', () => {
    it('budgetPercent es 0 sin presupuesto y se topa en 100 al pasarse', () => {
      expect(component.budgetPercent()).toBe(0);
      cart.setBudget(1000);
      cart.add(leche, 2); // 1.998 de 1.000
      expect(component.budgetPercent()).toBe(100);
    });

    it('editBudget abre un alert con el monto actual precargado y "Guardar" fija el presupuesto', async () => {
      const alertController = TestBed.inject(AlertController);
      const createSpy = spyOn(alertController, 'create').and.callThrough();

      await component.editBudget();

      const config = createSpy.calls.mostRecent().args[0]!;
      expect(config.header).toBe('Fijar un presupuesto');
      expect((config.inputs as { value?: number }[])[0].value).toBeUndefined();

      const guardar = (config.buttons as { text: string; handler?: (data: unknown) => void }[])
        .find(b => b.text === 'Guardar')!;
      guardar.handler!({ amount: '25000' });
      expect(cart.budget()).toBe(25000);
    });

    it('con presupuesto fijado, el alert ofrece "Quitar" y precarga el monto', async () => {
      cart.setBudget(30000);
      const alertController = TestBed.inject(AlertController);
      const createSpy = spyOn(alertController, 'create').and.callThrough();

      await component.editBudget();

      const config = createSpy.calls.mostRecent().args[0]!;
      expect(config.header).toBe('Cambiar presupuesto');
      expect((config.inputs as { value?: number }[])[0].value).toBe(30000);

      const quitar = (config.buttons as { text: string; handler?: () => void }[]).find(b => b.text === 'Quitar')!;
      quitar.handler!();
      expect(cart.budget()).toBeNull();
    });

    it('editBudget ignora un monto inválido o negativo', async () => {
      const alertController = TestBed.inject(AlertController);
      const createSpy = spyOn(alertController, 'create').and.callThrough();

      await component.editBudget();
      const config = createSpy.calls.mostRecent().args[0]!;
      const guardar = (config.buttons as { text: string; handler?: (data: unknown) => void }[])
        .find(b => b.text === 'Guardar')!;

      guardar.handler!({ amount: '-5' });
      expect(cart.budget()).toBeNull();
      guardar.handler!({ amount: 'abc' });
      expect(cart.budget()).toBeNull();
    });
  });
});
