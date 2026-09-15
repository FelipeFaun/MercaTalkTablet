import { ComponentFixture, TestBed } from '@angular/core/testing';
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
      providers: [provideIonicAngular()]
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
});
