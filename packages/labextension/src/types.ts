import { Widget } from '@lumino/widgets';
import { ISessionContext } from '@jupyterlab/apputils';
import { NotebookPanel } from '@jupyterlab/notebook';
import { ConsolePanel } from '@jupyterlab/console';

/**
 * Interface used to abstract away widgets with kernel to avoid introducing
 * spurious dependencies on properties specific to e.g. notebook or console.
 */
export interface IWidgetWithSession extends Widget {
  /**
   * Session context providing kernel access.
   */
  sessionContext: ISessionContext;
}

/**
 * Check if given widget is one of the widgets known to have kernel session.
 *
 * Note: we could switch to duck-typing in future.
 */
export function hasKernelSession(
  widget: Widget
): widget is ConsolePanel | NotebookPanel {
  return widget instanceof ConsolePanel || widget instanceof NotebookPanel;
}
