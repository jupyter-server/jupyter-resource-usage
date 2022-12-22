import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { LabIcon } from '@jupyterlab/ui-components';
import { ICommandPalette } from '@jupyterlab/apputils';
import { KernelUsagePanel } from './panel';
import tachometer from '../style/tachometer.svg';

import { IStatusBar } from '@jupyterlab/statusbar';

import { ITranslator } from '@jupyterlab/translation';

import { MemoryUsage } from './memoryUsage';

namespace CommandIDs {
  export const getKernelUsage = 'kernel-usage:get';
}

/**
 * Initialization data for the jupyter-resource-usage extension.
 */
const memoryStatusPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter-server/resource-usage:memory-status-item',
  autoStart: true,
  requires: [IStatusBar, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    statusBar: IStatusBar,
    translator: ITranslator
  ) => {
    const trans = translator.load('jupyter-resource-usage');
    const item = new MemoryUsage(trans);

    statusBar.registerStatusItem(memoryStatusPlugin.id, {
      item,
      align: 'left',
      rank: 2,
      isActive: () => item.model.metricsAvailable,
      activeStateChanged: item.model.stateChanged,
    });
  },
};

const kernelUsagePlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter-server/resource-usage:kernel-panel-item',
  autoStart: true,
  optional: [ICommandPalette],
  requires: [ITranslator, INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    notebookTracker: INotebookTracker,
    palette: ICommandPalette | null
  ) => {
    const trans = translator.load('jupyter-resource-usage');

    const { commands, shell } = app;
    const category = trans.__('Kernel Resource');

    let panel: KernelUsagePanel | null = null;

    function createPanel() {
      if ((!panel || panel.isDisposed) && notebookTracker) {
        panel = new KernelUsagePanel({
          widgetAdded: notebookTracker.widgetAdded,
          currentNotebookChanged: notebookTracker.currentChanged,
          trans: trans,
        });
        shell.add(panel, 'right', { rank: 200 });
      }
    }

    commands.addCommand(CommandIDs.getKernelUsage, {
      label: trans.__('Kernel Usage'),
      caption: trans.__('Kernel Usage'),
      icon: new LabIcon({
        name: 'jupyterlab-kernel-usage:icon',
        svgstr: tachometer,
      }),
      execute: createPanel,
    });

    if (palette) {
      palette.addItem({ command: CommandIDs.getKernelUsage, category });
    }

    createPanel();
  },
};

const plugins: JupyterFrontEndPlugin<any>[] = [
  memoryStatusPlugin,
  kernelUsagePlugin,
];
export default plugins;
