import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import { IToolbarWidgetRegistry } from '@jupyterlab/apputils';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { INotebookTracker } from '@jupyterlab/notebook';

import { LabIcon } from '@jupyterlab/ui-components';

import { ICommandPalette } from '@jupyterlab/apputils';

import { IConsoleTracker } from '@jupyterlab/console';

import { IStatusBar } from '@jupyterlab/statusbar';

import { ITranslator } from '@jupyterlab/translation';

import { JSONObject } from '@lumino/coreutils';

import { KernelUsagePanel } from './panel';

import tachometer from '../style/tachometer.svg';

import { ResourceUsage } from './model';

import { ResourceUsageStatus } from './resourceUsage';

import { KernelWidgetTracker } from './tracker';

import { CpuView } from './cpuView';

import { DiskView } from './diskView';

import { MemoryView } from './memoryView';

import { DEFAULT_CPU_LABEL } from './cpuView';
import { DEFAULT_DISK_LABEL } from './diskView';
import { DEFAULT_MEMORY_LABEL } from './memoryView';

/**
 * Disable system monitor panels by default.
 */
const DEFAULT_ENABLE_SYSTEM_MONITOR = false;

/**
 * The default refresh rate.
 */
const DEFAULT_REFRESH_RATE = 5000;

/**
 * An interface for resource settings.
 */
interface IResourceSettings extends JSONObject {
  label: string;
}

namespace CommandIDs {
  export const getKernelUsage = 'kernel-usage:get';
}

/**
 * Initialization data for the jupyter-resource-usage extension.
 */
const resourceStatusPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter-server/resource-usage:status-item',
  autoStart: true,
  requires: [ITranslator],
  optional: [IStatusBar],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    statusBar: IStatusBar | null
  ) => {
    const trans = translator.load('jupyter-resource-usage');
    const item = new ResourceUsageStatus(trans);

    if (statusBar) {
      statusBar.registerStatusItem(resourceStatusPlugin.id, {
        item,
        align: 'left',
        rank: 2,
        isActive: () => item.model.metricsAvailable,
        activeStateChanged: item.model.stateChanged,
      });
    }
  },
};

/**
 * Initialization data for the jupyterlab-system-monitor extension.
 */
const systemMonitorPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter-server/resource-usage:topbar-item',
  autoStart: true,
  requires: [IToolbarWidgetRegistry],
  optional: [ISettingRegistry],
  activate: async (
    app: JupyterFrontEnd,
    toolbarRegistry: IToolbarWidgetRegistry,
    settingRegistry: ISettingRegistry | null
  ) => {
    let enablePlugin = DEFAULT_ENABLE_SYSTEM_MONITOR;
    let refreshRate = DEFAULT_REFRESH_RATE;
    let cpuLabel = DEFAULT_CPU_LABEL;
    let memoryLabel = DEFAULT_MEMORY_LABEL;
    let diskLabel = DEFAULT_DISK_LABEL;

    if (settingRegistry) {
      const settings = await settingRegistry.load(systemMonitorPlugin.id);
      enablePlugin = settings.get('enable').composite as boolean;
      refreshRate = settings.get('refreshRate').composite as number;

      const cpuSettings = settings.get('cpu').composite as IResourceSettings;
      cpuLabel = cpuSettings.label;

      const memorySettings = settings.get('memory')
        .composite as IResourceSettings;
      memoryLabel = memorySettings.label;

      const diskSettings = settings.get('disk').composite as IResourceSettings;
      diskLabel = diskSettings.label;
    }

    const model = new ResourceUsage.Model({ refreshRate });
    await model.refresh();

    if (enablePlugin && model.cpuAvailable) {
      toolbarRegistry.addFactory('TopBar', 'cpu', () => {
        const cpu = CpuView.createCpuView(model, cpuLabel);
        return cpu;
      });
    }

    if (enablePlugin && model.memoryAvailable) {
      toolbarRegistry.addFactory('TopBar', 'memory', () => {
        const memory = MemoryView.createMemoryView(model, memoryLabel);
        return memory;
      });
    }
    if (enablePlugin && model.diskAvailable) {
      toolbarRegistry.addFactory('TopBar', 'disk', () => {
        const disk = DiskView.createDiskView(model, diskLabel);
        return disk;
      });
    }
  },
};

const kernelUsagePlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter-server/resource-usage:kernel-panel-item',
  autoStart: true,
  optional: [ICommandPalette, ILabShell, IConsoleTracker],
  requires: [ITranslator, INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    notebookTracker: INotebookTracker,
    palette: ICommandPalette | null,
    labShell: ILabShell | null,
    consoleTracker: IConsoleTracker | null
  ) => {
    const trans = translator.load('jupyter-resource-usage');

    const { commands, shell } = app;
    const category = trans.__('Kernel Resource');

    let panel: KernelUsagePanel | null = null;

    function createPanel() {
      if (!panel || panel.isDisposed) {
        const tracker = new KernelWidgetTracker({
          notebookTracker,
          labShell,
          consoleTracker,
        });

        panel = new KernelUsagePanel({
          tracker,
          trans,
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
  resourceStatusPlugin,
  systemMonitorPlugin,
  kernelUsagePlugin,
];
export default plugins;
