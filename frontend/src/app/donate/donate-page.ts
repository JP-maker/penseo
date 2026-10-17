import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

/** Page de don : un QR code PayPal à scanner depuis un téléphone. */
@Component({
  selector: 'app-donate-page',
  templateUrl: './donate-page.html',
  styleUrl: './donate-page.scss',
})
export class DonatePage {
  private readonly router = inject(Router);

  protected home(event: Event): void {
    event.preventDefault();
    void this.router.navigateByUrl('/');
  }
}
