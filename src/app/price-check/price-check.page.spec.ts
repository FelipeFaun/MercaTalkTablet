import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PriceCheckPage } from './price-check.page';

describe('PriceCheckPage', () => {
  let component: PriceCheckPage;
  let fixture: ComponentFixture<PriceCheckPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PriceCheckPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
