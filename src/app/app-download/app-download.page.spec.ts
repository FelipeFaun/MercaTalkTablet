import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppDownloadPage } from './app-download.page';

describe('AppDownloadPage', () => {
  let component: AppDownloadPage;
  let fixture: ComponentFixture<AppDownloadPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AppDownloadPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
