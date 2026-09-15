import { Component, EventEmitter, OnDestroy, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '../../pipes/translate.pipe';

export type IncidentType = 'spill' | 'cleaning' | 'other';

@Component({
  selector: 'app-incident-report-modal',
  standalone: true,
  imports: [CommonModule, IonIcon, TranslatePipe],
  templateUrl: './incident-report-modal.component.html',
  styleUrls: ['./incident-report-modal.component.scss']
})
export class IncidentReportModalComponent implements OnDestroy {
  @Output() dismissModal = new EventEmitter<void>();

  readonly submitted = signal<boolean>(false);
  readonly selectedIncident = signal<IncidentType | null>(null);
  readonly countdownSeconds = signal<number>(5);

  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  selectIncident(type: IncidentType) {
    this.selectedIncident.set(type);
    this.submitted.set(true);
    this.startCountdown();
  }

  startCountdown() {
    this.countdownSeconds.set(5);
    this.clearTimer();
    this.countdownInterval = setInterval(() => {
      const current = this.countdownSeconds() - 1;
      if (current <= 0) {
        this.clearTimer();
        this.dismissModal.emit();
      } else {
        this.countdownSeconds.set(current);
      }
    }, 1000);
  }

  private clearTimer() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  onDismiss() {
    this.clearTimer();
    this.dismissModal.emit();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}
