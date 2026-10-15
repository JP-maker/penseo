import { Component } from '@angular/core';
import { NotesPage } from './notes/notes-page/notes-page';

@Component({
  selector: 'app-root',
  imports: [NotesPage],
  template: '<app-notes-page />',
})
export class App {}