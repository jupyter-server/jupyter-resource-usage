import { ILabShell } from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IConsoleTracker } from '@jupyterlab/console';
import { ISignal, Signal } from '@lumino/signaling';
import { IWidgetWithSession, hasKernelSession } from './types';

/**
 * Tracks widgets with kernels as well as possible given the available tokens.
 */
export class KernelWidgetTracker {
  constructor(options: KernelWidgetTracker.IOptions) {
    const { labShell, notebookTracker, consoleTracker } = options;
    this._currentChanged = new Signal(this);
    if (labShell) {
      labShell.currentChanged.connect((_, update) => {
        const widget = update.newValue;
        if (widget && hasKernelSession(widget)) {
          this._currentChanged.emit(widget);
          this._currentWidget = widget;
        } else {
          this._currentChanged.emit(null);
          this._currentWidget = null;
        }
      });
    } else {
      notebookTracker.currentChanged.connect((_, widget) => {
        this._currentChanged.emit(widget);
        this._currentWidget = widget;
      });
      if (consoleTracker) {
        consoleTracker.currentChanged.connect((_, widget) => {
          this._currentChanged.emit(widget);
          this._currentWidget = widget;
        });
      }
    }
    // handle an existing current widget in case the KernelWidgetTracker
    // is created a bit later, or if there is already a Notebook widget available
    // on page load like in Notebook 7.
    if (labShell?.currentWidget && hasKernelSession(labShell?.currentWidget)) {
      this._currentWidget = labShell.currentWidget;
    } else {
      this._currentWidget =
        notebookTracker.currentWidget ?? consoleTracker?.currentWidget ?? null;
    }
  }

  /**
   * Emits on any change of active widget. The value is a known widget with
   * kernel session or null if user switched to a widget which does not support
   * kernel sessions.
   */
  get currentChanged(): ISignal<
    KernelWidgetTracker,
    IWidgetWithSession | null
  > {
    return this._currentChanged;
  }

  get currentWidget(): IWidgetWithSession | null {
    return this._currentWidget;
  }

  private _currentChanged: Signal<
    KernelWidgetTracker,
    IWidgetWithSession | null
  >;

  private _currentWidget: IWidgetWithSession | null = null;
}

/**
 * Namespace for kernel widget tracker.
 */
export namespace KernelWidgetTracker {
  export interface IOptions {
    notebookTracker: INotebookTracker;
    labShell: ILabShell | null;
    consoleTracker: IConsoleTracker | null;
  }
}
