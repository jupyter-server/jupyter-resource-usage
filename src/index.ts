import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { ICommandPalette } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { jupyterIcon as icon } from '@jupyterlab/ui-components';
import { KernelUsagePanel } from './panel';

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
    notebooks: INotebookTracker,
    launcher: ILauncher | null
  ) => {
    const { commands, shell } = app;
    const category = 'Kernel Resource';

    if (launcher) {
      launcher.add({
        command: CommandIDs.getKernelUsage,
        category: category
      });
    }

    async function createPanel(): Promise<KernelUsagePanel> {
      const panel = new KernelUsagePanel({ signal: notebooks.currentChanged });
      shell.add(panel, 'right', { rank: 200 });
      return panel;
    }

    commands.addCommand(CommandIDs.getKernelUsage, {
      label: 'Kernel Usage',
      caption: 'Kernel Usage',
      icon: icon,
      execute: createPanel
    });

    palette.addItem({ command: CommandIDs.getKernelUsage, category });

    createPanel();
  }
};

export default plugin;
