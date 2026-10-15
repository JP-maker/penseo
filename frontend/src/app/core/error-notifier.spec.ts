import { vi } from 'vitest';
import { ErrorNotifier } from './error-notifier';

describe('ErrorNotifier', () => {
  it('journalise l’erreur, affiche un message générique et peut être fermé', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const notifier = new ErrorNotifier();

    notifier.handleError(new Error('détail technique secret'));

    expect(log).toHaveBeenCalled();
    expect(notifier.message()).toContain('erreur');
    expect(notifier.message()).not.toContain('secret');

    notifier.dismiss();
    expect(notifier.message()).toBeNull();
    log.mockRestore();
  });
});
