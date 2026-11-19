import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  JupyterLab,
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

const TOPBAR_PLUGIN_ID = '@jupyter-server/resource-usage:topbar-item';

let sharedModel: Promise<ResourceUsage.Model> | null = null;

/**
 * Get the model polling the metrics endpoint, creating it on first use.
 *
 * The status bar item and the top bar items show the same metrics, so they
 * share one model. Separate models would each poll the server on their own
 * schedule, and since the server reports the CPU usage averaged over the time
 * since the previous request, they would show different values.
 */
const getSharedModel = (
  app: JupyterFrontEnd,
  info: JupyterLab.IInfo | null,
  settingRegistry: ISettingRegistry | null
): Promise<ResourceUsage.Model> => {
  if (!sharedModel) {
    sharedModel = (async () => {
      let refreshRate = DEFAULT_REFRESH_RATE;
      if (settingRegistry) {
        const settings = await settingRegistry.load(TOPBAR_PLUGIN_ID);
        refreshRate = settings.get('refreshRate').composite as number;
      }
      const model = new ResourceUsage.Model({
        refreshRate,
        serverSettings: app.serviceManager.serverSettings,
        refreshStandby: () => {
          if (info) {
            return !info.isConnected || 'when-hidden';
          }
          return 'when-hidden';
        },
      });
      await model.refresh();
      return model;
    })();
  }
  return sharedModel;
};

/**
 * Initialization data for the jupyter-resource-usage extension.
 */
const resourceStatusPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter-server/resource-usage:status-item',
  autoStart: true,
  requires: [ITranslator],
  optional: [IStatusBar, JupyterLab.IInfo, ISettingRegistry],
  activate: async (
    app: JupyterFrontEnd,
    translator: ITranslator,
    statusBar: IStatusBar | null,
    info: JupyterLab.IInfo | null,
    settingRegistry: ISettingRegistry | null
  ) => {
    const trans = translator.load('jupyter-resource-usage');
    const model = await getSharedModel(app, info, settingRegistry);
    const item = new ResourceUsageStatus(trans, model);

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
  id: TOPBAR_PLUGIN_ID,
  autoStart: true,
  requires: [IToolbarWidgetRegistry],
  optional: [ISettingRegistry, JupyterLab.IInfo],
  activate: async (
    app: JupyterFrontEnd,
    toolbarRegistry: IToolbarWidgetRegistry,
    settingRegistry: ISettingRegistry | null,
    info: JupyterLab.IInfo | null
  ) => {
    let enablePlugin = DEFAULT_ENABLE_SYSTEM_MONITOR;
    let cpuLabel = DEFAULT_CPU_LABEL;
    let memoryLabel = DEFAULT_MEMORY_LABEL;
    let diskLabel = DEFAULT_DISK_LABEL;

    if (settingRegistry) {
      const settings = await settingRegistry.load(systemMonitorPlugin.id);
      enablePlugin = settings.get('enable').composite as boolean;

      const cpuSettings = settings.get('cpu').composite as IResourceSettings;
      cpuLabel = cpuSettings.label;

      const memorySettings = settings.get('memory')
        .composite as IResourceSettings;
      memoryLabel = memorySettings.label;

      const diskSettings = settings.get('disk').composite as IResourceSettings;
      diskLabel = diskSettings.label;
    }

    if (!enablePlugin) {
      return;
    }

    const model = await getSharedModel(app, info, settingRegistry);

    if (model.cpuAvailable) {
      toolbarRegistry.addFactory('TopBar', 'cpu', () => {
        const cpu = CpuView.createCpuView(model, cpuLabel);
        return cpu;
      });
    }

    if (model.memoryAvailable) {
      toolbarRegistry.addFactory('TopBar', 'memory', () => {
        const memory = MemoryView.createMemoryView(model, memoryLabel);
        return memory;
      });
    }
    if (model.diskAvailable) {
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
    const { serverSettings } = app.serviceManager;
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
          serverSettings,
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
