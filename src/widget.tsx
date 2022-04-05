import React, { useState } from 'react';
import { Poll } from '@lumino/polling';
import { ISignal } from '@lumino/signaling';
import { ReactWidget, ISessionContext } from '@jupyterlab/apputils';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { Kernel } from '@jupyterlab/services';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { requestAPI } from './handler';
import useInterval from './useInterval';
import { formatForDisplay } from './format';

type Usage = {
  timestamp: Date | null;
  kernelId: string;
  hostname: string;
  kernel_cpu: number;
  kernel_memory: number;
  pid: number;
  host_cpu_percent: number;
  host_virtual_memory: {
    active: number;
    available: number;
    free: number;
    inactive: number;
    percent: number;
    total: number;
    used: number;
    wired: number;
  };
};

const POLL_INTERVAL_SEC = 5;

const POLL_MAX_INTERVAL_SEC = 300;

type KernelPoll = {
  poll: Poll<void, any, 'stand-by'>;
  path: string;
  usage: Usage | undefined;
};

const kernelPools = new Map<string, KernelPoll>();

const KernelUsage = (props: {
  widgetAdded: ISignal<INotebookTracker, NotebookPanel | null>;
  currentNotebookChanged: ISignal<INotebookTracker, NotebookPanel | null>;
}) => {
  const [kernelId, setKernelId] = useState<string>();
  const [refresh, setRefresh] = useState<boolean>(true);

  useInterval(async () => {
    setRefresh(!refresh);
  }, POLL_INTERVAL_SEC * 1000);

  const requestUsage = async (kernelId: string) => {
    requestAPI<any>(`get_usage/${kernelId}`)
      .then(data => {
        const kernelPoll = kernelPools.get(kernelId);
        if (kernelPoll) {
          kernelPoll.usage = {
            ...data.content,
            kernelId,
            timestamp: new Date()
          };
          kernelPools.set(kernelId, kernelPoll);
        }
      })
      .catch(reason => {
        console.error(
          `The kernelusage server extension has returned an error.\n${reason}`
        );
        const kernelPoll = kernelPools.get(kernelId);
        kernelPoll?.poll.stop().then(() => {
          kernelPools.delete(kernelId);
        });
      });
  };

  const doPoll = (kernelId: string, path: string) => {
    let kernelPoll = kernelPools.get(kernelId);
    if (!kernelPoll) {
      const poll = new Poll<void, any, 'stand-by'>({
        auto: true,
        factory: () => requestUsage(kernelId),
        frequency: {
          interval: POLL_INTERVAL_SEC * 1000,
          backoff: true,
          max: POLL_MAX_INTERVAL_SEC * 1000
        },
        name: `@jupyterlab/kernel:KernelUsage#${kernelId}`,
        standby: 'never'
      });
      kernelPoll = {
        poll,
        path,
        usage: undefined
      };
      kernelPools.set(kernelId, kernelPoll);
    }
  };

  props.currentNotebookChanged.connect(
    (sender: INotebookTracker, panel: NotebookPanel | null) => {
      panel?.sessionContext.kernelChanged.connect(
        (
          _sender: ISessionContext,
          args: IChangedArgs<
            Kernel.IKernelConnection | null,
            Kernel.IKernelConnection | null,
            'kernel'
          >
        ) => {
          const kernelId = args.newValue?.id;
          if (kernelId) {
            setKernelId(kernelId);
            const path = panel?.sessionContext.session?.model.path;
            doPoll(kernelId as string, path as string);
          }
        }
      );
      if (panel?.sessionContext.session?.id !== kernelId) {
        if (panel?.sessionContext.session?.kernel?.id) {
          const kernelId = panel?.sessionContext.session?.kernel?.id;
          if (kernelId) {
            setKernelId(kernelId);
            const path = panel?.sessionContext.session?.model.path;
            doPoll(kernelId as string, path);
          }
        }
      }
    }
  );

  if (kernelId) {
    const kernelPool = kernelPools.get(kernelId);
    if (kernelPool && kernelPool.usage) {
      return !kernelPool.usage.hostname ? (
        <>
          <h3 className="jp-KernelUsage-section-separator">
            Kernel usage details are not available
          </h3>
          <div className="jp-KernelUsage-section-separator">
            Please check with your system administrator that you running
            IPyKernel version 6.10.0 or above.
          </div>
        </>
      ) : (
        <>
          <h3 className="jp-KernelUsage-section-separator">Kernel usage</h3>
          <div className="jp-KernelUsage-separator">
            Kernel Host: {kernelPool.usage.hostname}
          </div>
          <div className="jp-KernelUsage-separator">
            Notebook: {kernelPool.path}
          </div>
          <div className="jp-KernelUsage-separator">Kernel ID: {kernelId}</div>
          <div className="jp-KernelUsage-separator">
            Timestamp: {kernelPool.usage.timestamp?.toLocaleString()}
          </div>
          <div className="jp-KernelUsage-separator">
            Process ID: {kernelPool.usage.pid}
          </div>
          <div className="jp-KernelUsage-separator">
            CPU: {kernelPool.usage.kernel_cpu}
          </div>
          <div className="jp-KernelUsage-separator">
            Memory: {formatForDisplay(kernelPool.usage.kernel_memory)}
          </div>
          <hr className="jp-KernelUsage-section-separator"></hr>
          <h4 className="jp-KernelUsage-section-separator">Host CPU</h4>
          <div className="jp-KernelUsage-separator">
            Percentage {kernelPool.usage.host_cpu_percent.toFixed(1)}
          </div>
          <h4 className="jp-KernelUsage-section-separator">
            Host Virtual Memory
          </h4>
          <div className="jp-KernelUsage-separator">
            Active:{' '}
            {formatForDisplay(kernelPool.usage.host_virtual_memory.active)}
          </div>
          <div className="jp-KernelUsage-separator">
            Available:{' '}
            {formatForDisplay(kernelPool.usage.host_virtual_memory.available)}
          </div>
          <div className="jp-KernelUsage-separator">
            Free: {formatForDisplay(kernelPool.usage.host_virtual_memory.free)}
          </div>
          <div className="jp-KernelUsage-separator">
            Inactive:{' '}
            {formatForDisplay(kernelPool.usage.host_virtual_memory.inactive)}
          </div>
          <div className="jp-KernelUsage-separator">
            Percent: {kernelPool.usage.host_virtual_memory.percent.toFixed(1)}
          </div>
          <div className="jp-KernelUsage-separator">
            Total:{' '}
            {formatForDisplay(kernelPool.usage.host_virtual_memory.total)}
          </div>
          <div className="jp-KernelUsage-separator">
            Used: {formatForDisplay(kernelPool.usage.host_virtual_memory.used)}
          </div>
          <div className="jp-KernelUsage-separator">
            Wired:{' '}
            {formatForDisplay(kernelPool.usage.host_virtual_memory.wired)}
          </div>
        </>
      );
    }
  }
  return <h3>Kernel usage is not available</h3>;
};

export class KernelUsageWidget extends ReactWidget {
  private _widgetAdded: ISignal<INotebookTracker, NotebookPanel | null>;
  private _currentNotebookChanged: ISignal<
    INotebookTracker,
    NotebookPanel | null
  >;
  constructor(props: {
    widgetAdded: ISignal<INotebookTracker, NotebookPanel | null>;
    currentNotebookChanged: ISignal<INotebookTracker, NotebookPanel | null>;
  }) {
    super();
    this._widgetAdded = props.widgetAdded;
    this._currentNotebookChanged = props.currentNotebookChanged;
  }

  protected render(): React.ReactElement<any> {
    return (
      <KernelUsage
        widgetAdded={this._widgetAdded}
        currentNotebookChanged={this._currentNotebookChanged}
      />
    );
  }
}
