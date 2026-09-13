import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { OffersPage } from './offers.page';

describe('OffersPage', () => {
  let component: OffersPage;
  let fixture: ComponentFixture<OffersPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OffersPage],
      providers: [provideRouter([]), provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(OffersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
