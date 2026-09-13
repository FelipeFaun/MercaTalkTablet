import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { PriceCheckerPage } from './price-check.page';

describe('PriceCheckerPage', () => {
  let component: PriceCheckerPage;
  let fixture: ComponentFixture<PriceCheckerPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriceCheckerPage],
      providers: [provideRouter([]), provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(PriceCheckerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
