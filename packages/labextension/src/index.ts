import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { LabIcon } from '@jupyterlab/ui-components';
import { ICommandPalette } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
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
const extension: JupyterFrontEndPlugin<void> = {
  id: '@jupyter-server/resource-usage:memory-status-item',
  autoStart: true,
  requires: [IStatusBar, ITranslator, ICommandPalette, INotebookTracker],
  optional: [ILauncher],
  activate: (
    app: JupyterFrontEnd,
    statusBar: IStatusBar,
    translator: ITranslator,
    palette: ICommandPalette,
    notebookTracker: INotebookTracker,
    launcher: ILauncher | null
  ) => {
    const item = new MemoryUsage(translator);

    statusBar.registerStatusItem(extension.id, {
      item,
      align: 'left',
      rank: 2,
      isActive: () => item.model.metricsAvailable,
      activeStateChanged: item.model.stateChanged,
    });

    const { commands, shell } = app;
    const category = 'Kernel Resource';

    async function createPanel(): Promise<KernelUsagePanel> {
      const panel = new KernelUsagePanel({
        widgetAdded: notebookTracker.widgetAdded,
        currentNotebookChanged: notebookTracker.currentChanged,
      });
      shell.add(panel, 'right', { rank: 200 });
      return panel;
    }

    commands.addCommand(CommandIDs.getKernelUsage, {
      label: 'Kernel Usage',
      caption: 'Kernel Usage',
      icon: new LabIcon({
        name: 'jupyterlab-kernel-usage:icon',
        svgstr: tachometer,
      }),
      execute: createPanel,
    });

    palette.addItem({ command: CommandIDs.getKernelUsage, category });

    createPanel();
  },
};

export default extension;
