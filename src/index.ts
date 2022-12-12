import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { LabIcon } from '@jupyterlab/ui-components';
import { ICommandPalette } from '@jupyterlab/apputils';
import { KernelUsagePanel } from './panel';
import tachometer from '../style/tachometer.svg';

namespace CommandIDs {
  export const getKernelUsage = 'kernel-usage:get';
}

/**
 * Initialization data for the kernelusage extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'kernelusage:plugin',
  requires: [ICommandPalette, INotebookTracker],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    notebookTracker: INotebookTracker
  ) => {
    const { commands, shell } = app;
    const category = 'Kernel Resource';

    let panel: KernelUsagePanel | null = null;

    function createPanel() {
      if (!panel || panel.isDisposed) {
        panel = new KernelUsagePanel({
          widgetAdded: notebookTracker.widgetAdded,
          currentNotebookChanged: notebookTracker.currentChanged
        });
        shell.add(panel, 'right', { rank: 200 });
      }
    }

    commands.addCommand(CommandIDs.getKernelUsage, {
      label: 'Kernel Usage',
      caption: 'Kernel Usage',
      icon: new LabIcon({
        name: 'jupyterlab-kernel-usage:icon',
        svgstr: tachometer
      }),
      execute: createPanel
    });

    palette.addItem({ command: CommandIDs.getKernelUsage, category });

    createPanel();
  }
};

export default plugin;
