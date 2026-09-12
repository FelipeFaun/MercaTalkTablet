import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StoreLocatorPage } from './store-locator.page';

describe('StoreLocatorPage', () => {
  let component: StoreLocatorPage;
  let fixture: ComponentFixture<StoreLocatorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StoreLocatorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
