import { Component } from '@angular/core';
import { 
  IonContent
} from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../shared/pipes/translate.pipe';

@Component({
  selector: 'app-app-download',
  templateUrl: './app-download.page.html',
  styleUrls: ['./app-download.page.scss'],
  standalone: true,
  imports: [
    AppHeaderComponent,
    RouterModule,
    IonContent,
    TranslatePipe
  ]
})
export class AppDownloadPage {
  
  // URLs de descarga (reemplaza con las tuyas)
  readonly downloadUrls = {
    directDownload: 'https://play.google.com/store/search?q=lider&c=apps&hl=es_419',
    playStore: 'https://play.google.com/store/search?q=lider&c=apps&hl=es_419'
  };

  // Rutas de imágenes QR
  readonly qrCodes = {
    directDownload: 'assets/qr/QR.png',
    playStore: 'assets/qr/QR.png'
  };

  downloadDirect() {
    window.open(this.downloadUrls.directDownload, '_blank');
  }

  openPlayStore() {
    window.open(this.downloadUrls.playStore, '_blank');
  }
}