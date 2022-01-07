import React, { useState, useEffect } from 'react';
import { Poll } from '@lumino/polling';
import { ISignal } from '@lumino/signaling';
import { ReactWidget } from '@jupyterlab/apputils';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { requestAPI } from './handler';

type Usage = {
  kernel_cpu: number;
  kernel_memory: number;
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

const UNKONWN_USAGE: Usage = {
  kernel_cpu: -1,
  kernel_memory: -1,
  host_cpu_percent: -1,
  host_virtual_memory: {
    active: -1,
    available: -1,
    free: -1,
    inactive: -1,
    percent: -1,
    total: -1,
    used: -1,
    wired: -1
  }
};

const POLL_INTERVAL_SEC = 5;

const POLL_MAX_INTERVAL_SEC = 300;

type KernelPoll = {
  poll: Poll;
  usage: Usage;
};

const polls = new Map<string, KernelPoll>();

const getUsage = (kernelId: string) => {
  const kernelPoll = polls.get(kernelId);
  if (kernelPoll) {
    return kernelPoll.usage;
  }
  return UNKONWN_USAGE;
};

const KernelUsage = (props: {
  signal: ISignal<INotebookTracker, NotebookPanel | null>;
}) => {
  const [kernelId, setKernelId] = useState<string>();
  const [refresh, setRefresh] = useState<boolean>(true);
  useEffect(() => {
    if (kernelId) {
      const poll = polls.get(kernelId);
      if (!poll) {
        const requestUsage = async (kernelId: string) => {
          requestAPI<any>(`get_usage/${kernelId}`)
            .then(data => {
              const kernelPoll = polls.get(kernelId);
              if (kernelPoll) {
                kernelPoll.usage = data.content;
                polls.set(kernelId, kernelPoll);
              }
              setRefresh(!refresh);
            })
            .catch(reason => {
              console.error(
                `The kernelusage server extension has returned an error.\n${reason}`
              );
              const kernelPoll = polls.get(kernelId);
              kernelPoll?.poll.stop().then(() => {
                polls.delete(kernelId);
              });
            });
        };
        const newPoll = new Poll({
          auto: true,
          factory: () => requestUsage(kernelId),
          frequency: {
            interval: POLL_INTERVAL_SEC * 1000,
            backoff: true,
            max: POLL_MAX_INTERVAL_SEC * 1000
          },
          name: `@jupyterlab/kernel:KernelUsage#${kernelId}`,
          standby: 'when-hidden'
        });
        polls.set(kernelId, {
          poll: newPoll,
          usage: UNKONWN_USAGE
        });
      }
    }
  }, [kernelId]);
  props.signal.connect(
    (sender: INotebookTracker, panel: NotebookPanel | null) => {
      if (panel?.sessionContext.session?.id !== kernelId) {
        if (panel?.sessionContext.session?.kernel?.id) {
          setKernelId(panel?.sessionContext.session?.kernel?.id);
        }
      }
    }
  );
  return (
    <>
      <h3 className="jp-kernelusage-separator">Kernel Usage</h3>
      <div className="jp-kernelusage-separator">Kernel ID: {kernelId}</div>
      <div className="jp-kernelusage-separator">
        CPU: {kernelId && getUsage(kernelId).kernel_cpu}
      </div>
      <div className="jp-kernelusage-separator">
        Memory: {kernelId && getUsage(kernelId).kernel_memory}
      </div>
      <hr></hr>
      <h4 className="jp-kernelusage-separator">Host CPU</h4>
      <div className="jp-kernelusage-separator">
        Percentage {kernelId && getUsage(kernelId).host_cpu_percent}
      </div>
      <h4 className="jp-kernelusage-separator">Host Virtual Memory</h4>
      <div className="jp-kernelusage-separator">
        Active: {kernelId && getUsage(kernelId).host_virtual_memory.active}
      </div>
      <div className="jp-kernelusage-separator">
        Available:{' '}
        {kernelId && getUsage(kernelId).host_virtual_memory.available}
      </div>
      <div className="jp-kernelusage-separator">
        Free: {kernelId && getUsage(kernelId).host_virtual_memory.free}
      </div>
      <div className="jp-kernelusage-separator">
        Inactive: {kernelId && getUsage(kernelId).host_virtual_memory.inactive}
      </div>
      <div className="jp-kernelusage-separator">
        Percent: {kernelId && getUsage(kernelId).host_virtual_memory.percent}
      </div>
      <div className="jp-kernelusage-separator">
        Total: {kernelId && getUsage(kernelId).host_virtual_memory.total}
      </div>
      <div className="jp-kernelusage-separator">
        Used: {kernelId && getUsage(kernelId).host_virtual_memory.used}
      </div>
      <div className="jp-kernelusage-separator">
        Wired: {kernelId && getUsage(kernelId).host_virtual_memory.wired}
      </div>
    </>
  );
};

export class KernelUsageWidget extends ReactWidget {
  private _signal: ISignal<INotebookTracker, NotebookPanel | null>;
  constructor(props: {
    signal: ISignal<INotebookTracker, NotebookPanel | null>;
  }) {
    super();
    this._signal = props.signal;
  }

  protected render(): React.ReactElement<any> {
    return <KernelUsage signal={this._signal} />;
  }
}
