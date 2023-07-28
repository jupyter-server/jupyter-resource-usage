import { Message } from '@lumino/messaging';
import { TranslationBundle } from '@jupyterlab/translation';
import { StackedPanel } from '@lumino/widgets';
import { LabIcon } from '@jupyterlab/ui-components';
import { KernelUsageWidget } from './widget';
import { KernelWidgetTracker } from './tracker';

import tachometer from '../style/tachometer.svg';

const PANEL_CLASS = 'jp-KernelUsage-view';

export class KernelUsagePanel extends StackedPanel {
  constructor(props: {
    tracker: KernelWidgetTracker;
    trans: TranslationBundle;
  }) {
    super();
    this.addClass(PANEL_CLASS);
    this.id = 'kernelusage-panel-id';
    this.title.caption = props.trans.__('Kernel Usage');
    this.title.icon = new LabIcon({
      name: 'jupyterlab-kernel-usage:icon',
      svgstr: tachometer,
    });
    this.title.closable = true;

    const widget = new KernelUsageWidget({
      tracker: props.tracker,
      panel: this,
      trans: props.trans,
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
