import { Component, inject, input } from '@angular/core';
import { IonHeader, IonToolbar } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { BrandService } from '../../../core/brand.service';

/**
 * Barra azul superior que antes se repetía en cada página.
 * Mismo markup y clases (.blue-toolbar, .header-content, .logo-section,
 * .title-section, .empty-space) para que los estilos existentes sigan aplicando.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IonHeader, IonToolbar, RouterLink],
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
})
export class AppHeaderComponent {
  private brandService = inject(BrandService);

  /** Título centrado; vacío = solo logo. */
  title = input('');

  readonly brand = this.brandService.brand;
}
