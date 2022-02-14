import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { LabIcon } from '@jupyterlab/ui-components';
import { ICommandPalette } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
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
  optional: [ILauncher],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    notebookTracker: INotebookTracker,
    launcher: ILauncher | null
  ) => {
    const { commands, shell } = app;
    const category = 'Kernel Resource';

    async function createPanel(): Promise<KernelUsagePanel> {
      const panel = new KernelUsagePanel({
        widgetAdded: notebookTracker.widgetAdded,
        currentNotebookChanged: notebookTracker.currentChanged
      });
      shell.add(panel, 'right', { rank: 200 });
      return panel;
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
