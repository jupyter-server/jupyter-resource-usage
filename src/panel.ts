import { Message } from '@lumino/messaging';
import { ISignal } from '@lumino/signaling';
import { StackedPanel } from '@lumino/widgets';
import { LabIcon } from '@jupyterlab/ui-components';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { KernelUsageWidget } from './widget';
import tachometer from '../style/tachometer.svg';

const PANEL_CLASS = 'jp-kernelusage-view';

export class KernelUsagePanel extends StackedPanel {
  constructor(props: {
    widgetAdded: ISignal<INotebookTracker, NotebookPanel | null>;
    currentNotebookChanged: ISignal<INotebookTracker, NotebookPanel | null>;
  }) {
    super();
    this.addClass(PANEL_CLASS);
    this.id = 'kernelusage-panel-id';
    this.title.caption = 'Kernel Usage';
    this.title.icon = new LabIcon({
      name: 'jupyterlab-kernel-usage:icon',
      svgstr: tachometer
    });
    this.title.closable = true;
    const widget = new KernelUsageWidget({
      widgetAdded: props.widgetAdded,
      currentNotebookChanged: props.currentNotebookChanged
    });
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
