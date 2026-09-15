import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { IncidentReportModalComponent } from './incident-report-modal.component';

describe('IncidentReportModalComponent', () => {
  let component: IncidentReportModalComponent;
  let fixture: ComponentFixture<IncidentReportModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentReportModalComponent],
      providers: [provideIonicAngular()]
    }).compileComponents();

    fixture = TestBed.createComponent(IncidentReportModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe registrar incidente de derrame y activar temporizador de retorno', () => {
    component.selectIncident('spill');
    expect(component.submitted()).toBeTrue();
    expect(component.selectedIncident()).toBe('spill');
    expect(component.countdownSeconds()).toBe(5);
  });

  it('debe registrar incidente de aseo', () => {
    component.selectIncident('cleaning');
    expect(component.submitted()).toBeTrue();
    expect(component.selectedIncident()).toBe('cleaning');
  });

  it('debe emitir dismissModal al cerrar manualmente', () => {
    spyOn(component.dismissModal, 'emit');
    component.onDismiss();
    expect(component.dismissModal.emit).toHaveBeenCalled();
  });
});
