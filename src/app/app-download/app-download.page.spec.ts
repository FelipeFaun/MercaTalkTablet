import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { AppDownloadPage } from './app-download.page';

describe('AppDownloadPage', () => {
  let component: AppDownloadPage;
  let fixture: ComponentFixture<AppDownloadPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppDownloadPage],
      providers: [provideRouter([]), provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(AppDownloadPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
