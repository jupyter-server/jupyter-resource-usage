import { Message } from '@lumino/messaging';
import { ISignal } from '@lumino/signaling';
import { StackedPanel } from '@lumino/widgets';
import { KernelUsageWidget } from './widget';
import { jupyterIcon as icon } from '@jupyterlab/ui-components';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

const PANEL_CLASS = 'jp-kernelusage-view';

export class KernelUsagePanel extends StackedPanel {
  constructor(props: {
    signal: ISignal<INotebookTracker, NotebookPanel | null>;
  }) {
    super();
    this.addClass(PANEL_CLASS);
    this.id = 'kernelusage-panel-id';
    this.title.caption = 'Kernel Usage';
    this.title.icon = icon;
    this.title.closable = true;
    const widget = new KernelUsageWidget({ signal: props.signal });
    this.addWidget(widget);
  }

  dispose(): void {
    super.dispose();
  }

  protected onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.dispose();
  }
}
