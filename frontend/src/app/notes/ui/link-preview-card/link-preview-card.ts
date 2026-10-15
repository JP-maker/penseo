import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { LinkPreviewService } from '../../data/link-preview.service';
import { LinkPreview } from '../../data/models';

/** Carte d'aperçu d'une URL. N'affiche rien tant que l'aperçu n'est pas là, ou s'il est indisponible. */
@Component({
  selector: 'app-link-preview',
  templateUrl: './link-preview-card.html',
  styleUrl: './link-preview-card.scss',
})
export class LinkPreviewCard {
  private readonly service = inject(LinkPreviewService);

  readonly url = input.required<string>();
  protected readonly preview = signal<LinkPreview | null>(null);
  protected readonly host = computed(() => {
    try {
      return new URL(this.url()).hostname;
    } catch {
      return this.url();
    }
  });

  constructor() {
    effect(() => {
      const url = this.url();
      this.preview.set(null);
      void this.service.get(url).then((preview) => {
        // Si l'URL a changé pendant l'attente, cette réponse est périmée.
        if (this.url() === url) this.preview.set(preview);
      });
    });
  }
}
