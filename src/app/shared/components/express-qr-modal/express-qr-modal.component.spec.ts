import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Preferences } from '@capacitor/preferences';
import { ExpressListQrModalComponent } from './express-qr-modal.component';

describe('ExpressListQrModalComponent', () => {
  let component: ExpressListQrModalComponent;
  let fixture: ComponentFixture<ExpressListQrModalComponent>;

  beforeEach(async () => {
    await Preferences.clear();
    await TestBed.configureTestingModule({
      imports: [ExpressListQrModalComponent],
      providers: [provideIonicAngular(), provideRouter([{ path: 'otra', children: [] }])]
    }).compileComponents();

    fixture = TestBed.createComponent(ExpressListQrModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar los items proporcionados por el payload', () => {
    component.payload = {
      title: 'Lista Asado',
      items: [{ name: 'Lomo Vetado', aisle: 'Pasillo 6', qty: '1.5 kg' }],
      total: 15990
    };
    component.ngOnInit();
    expect(component.modalTitle()).toBe('Lista Asado');
    expect(component.displayItems().length).toBe(1);
    expect(component.estimatedTotal()).toBe(15990);
  });

  it('debe emitir dismissModal al presionar el botón cerrar', () => {
    spyOn(component.dismissModal, 'emit');
    component.onDismiss();
    expect(component.dismissModal.emit).toHaveBeenCalled();
  });

  it('sin Supabase configurado muestra el QR fijo de respaldo', () => {
    expect(component.shareState()).toBe('static');
    expect(component.qrDataUrl()).toBeNull();
  });

  it('se cierra al navegar, para que el QR no quede abierto para el siguiente cliente', async () => {
    spyOn(component.dismissModal, 'emit');
    await TestBed.inject(Router).navigateByUrl('/otra');
    expect(component.dismissModal.emit).toHaveBeenCalled();
  });
});
