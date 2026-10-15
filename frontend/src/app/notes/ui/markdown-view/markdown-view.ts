import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { parseMarkdown } from '../../utils/markdown';

/** Affiche une note mise en forme. Tout passe par des interpolations Angular (échappées) : aucun innerHTML. */
@Component({
  selector: 'app-markdown',
  imports: [NgTemplateOutlet],
  templateUrl: './markdown-view.html',
  styleUrl: './markdown-view.scss',
})
export class MarkdownView {
  readonly source = input.required<string>();
  protected readonly blocks = computed(() => parseMarkdown(this.source()));
}
