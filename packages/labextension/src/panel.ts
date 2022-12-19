import { Message } from '@lumino/messaging';
import { ISignal } from '@lumino/signaling';
import {
  nullTranslator,
  ITranslator,
  TranslationBundle,
} from '@jupyterlab/translation';
import { StackedPanel } from '@lumino/widgets';
import { LabIcon } from '@jupyterlab/ui-components';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { KernelUsageWidget } from './widget';
import tachometer from '../style/tachometer.svg';

const PANEL_CLASS = 'jp-KernelUsage-view';

export class KernelUsagePanel extends StackedPanel {
  constructor(
    props: {
      widgetAdded: ISignal<INotebookTracker, NotebookPanel | null>;
      currentNotebookChanged: ISignal<INotebookTracker, NotebookPanel | null>;
    },
    translator?: ITranslator
  ) {
    super();
    this.translator = translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this.addClass(PANEL_CLASS);
    this.id = 'kernelusage-panel-id';
    this.title.caption = this._trans.__('Kernel Usage');
    this.title.icon = new LabIcon({
      name: 'jupyterlab-kernel-usage:icon',
      svgstr: tachometer,
    });
    this.title.closable = true;
    const widget = new KernelUsageWidget({
      widgetAdded: props.widgetAdded,
      currentNotebookChanged: props.currentNotebookChanged,
      panel: this,
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

  protected translator: ITranslator;
  private _trans: TranslationBundle;
}
