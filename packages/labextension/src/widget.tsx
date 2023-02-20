import React, { useRef, useState, useEffect } from 'react';
import { ISignal } from '@lumino/signaling';
import { ReactWidget, ISessionContext } from '@jupyterlab/apputils';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { Kernel } from '@jupyterlab/services';
import { TranslationBundle } from '@jupyterlab/translation';
import { requestAPI } from './handler';
import { KernelUsagePanel } from './panel';
import useInterval from './useInterval';
import { formatForDisplay } from './format';
import { IWidgetWithSession } from './types';
import { KernelWidgetTracker } from './tracker';

type Usage = {
  timestamp: Date | null;
  kernel_id: string;
  hostname: string;
  kernel_cpu: number;
  kernel_memory: number;
  pid: number;
  host_cpu_percent: number;
  cpu_count: number;
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

const KERNEL_USAGE_CLASS = 'jp-KernelUsage-content';
const TIMEOUT_CLASS = 'jp-KernelUsage-timedOut';

type KernelChangeCallback = (
  _sender: ISessionContext,
  args: IChangedArgs<
    Kernel.IKernelConnection | null,
    Kernel.IKernelConnection | null,
    'kernel'
  >
) => void;
let kernelChangeCallback: {
  callback: KernelChangeCallback;
  panel: IWidgetWithSession;
} | null = null;

/**
 * Reasons for lack of usage data.
 */
namespace NoUsageReason {
  export interface INotSupported {
    reason: 'not_supported';
    kernel_version: string | undefined;
  }
  export interface ITimeout {
    reason: 'timeout';
    timeout_ms: number | undefined;
  }
  export interface INoKernelWidget {
    reason: 'no_kernel_widget';
  }
  export interface INoKernel {
    reason: 'no_kernel';
  }
  export interface ILoading {
    reason: 'loading';
  }
}

type NoUsageReason =
  | NoUsageReason.INotSupported
  | NoUsageReason.ITimeout
  | NoUsageReason.INoKernelWidget
  | NoUsageReason.INoKernel
  | NoUsageReason.ILoading;

const BlankReason = (props: {
  reason: NoUsageReason;
  trans: TranslationBundle;
}) => {
  const { reason } = props;
  if (reason.reason === 'not_supported') {
    return (
      <div className="jp-KernelUsage-section-separator">
        {props.trans.__(
          'Please check with your system administrator that you are running IPyKernel version 6.10.0 or above.'
        )}
        {reason.kernel_version
          ? props.trans.__(
              'Detected IPyKernel version: %1',
              reason.kernel_version
            )
          : props.trans.__('No IPyKernel installation detected.')}
      </div>
    );
  } else if (reason.reason === 'no_kernel_widget') {
    return (
      <div className="jp-KernelUsage-section-separator">
        {props.trans.__(
          'Switch to a notebook or console to see kernel usage details.'
        )}
      </div>
    );
  } else if (reason.reason === 'no_kernel') {
    return (
      <div className="jp-KernelUsage-section-separator">
        {props.trans.__('No active kernel found.')}
      </div>
    );
  } else {
    return (
      <div className="jp-KernelUsage-section-separator">
        {props.trans.__('Reason: %1.', reason.reason)}
      </div>
    );
  }
};

const KernelUsage = (props: {
  currentChanged: ISignal<KernelWidgetTracker, IWidgetWithSession | null>;
  panel: KernelUsagePanel;
  trans: TranslationBundle;
}) => {
  const { panel } = props;
  const [kernelId, setKernelId] = useState<string>();
  const [path, setPath] = useState<string>();
  const [usage, setUsage] = useState<Usage | undefined>();
  const [blankStateReason, setReason] = useState<NoUsageReason | undefined>({
    reason: 'loading',
  });

  useInterval(async () => {
    if (kernelId && panel.isVisible) {
      requestUsage(kernelId).catch(() => {
        console.warn(`Request failed for ${kernelId}. Kernel restarting?`);
      });
    }
  }, POLL_INTERVAL_SEC * 1000);

  const kernelIdRef = useRef<string | undefined>(kernelId);
  kernelIdRef.current = kernelId;

  const requestUsage = (kid: string) => {
    return requestAPI<any>(`get_usage/${kid}`).then((data) => {
      // The kernel reply may arrive late due to lax timeouts, so we need to
      // check if it is for the current kernel

      if (kid !== kernelIdRef.current) {
        // Ignore outdated response, but preserve current reason
        return;
      }

      if (data.content?.reason) {
        const reason = data.content;
        setReason(reason);
        return;
      } else {
        setReason(undefined);
      }

      const usage: Usage = {
        ...data.content,
        timestamp: new Date(),
        kernel_id: kid,
      };
      setUsage(usage);
    });
  };

  useEffect(() => {
    const createKernelChangeCallback = (panel: IWidgetWithSession) => {
      return (
        _sender: ISessionContext,
        args: IChangedArgs<
          Kernel.IKernelConnection | null,
          Kernel.IKernelConnection | null,
          'kernel'
        >
      ) => {
        const newKernelId = args.newValue?.id;
        if (newKernelId) {
          setKernelId(newKernelId);
          const path = panel?.sessionContext.session?.model.path;
          setPath(path);
          requestUsage(newKernelId);
        } else {
          // Kernel was disposed
          setReason({ reason: 'no_kernel' });
          setKernelId(newKernelId);
        }
      };
    };

    const notebookChangeCallback = (
      _: KernelWidgetTracker,
      panel: IWidgetWithSession | null
    ) => {
      if (panel === null) {
        setKernelId(undefined);
        setReason({
          reason: 'no_kernel_widget',
        });
        return;
      }
      if (kernelChangeCallback) {
        kernelChangeCallback.panel.sessionContext.kernelChanged.disconnect(
          kernelChangeCallback.callback
        );
      }
      kernelChangeCallback = {
        callback: createKernelChangeCallback(panel),
        panel,
      };
      panel.sessionContext.kernelChanged.connect(kernelChangeCallback.callback);

      if (panel.sessionContext.session?.kernel?.id !== kernelId) {
        const kernelId = panel.sessionContext.session?.kernel?.id;
        if (kernelId) {
          setKernelId(kernelId);
          const path = panel.sessionContext.session?.model.path;
          setPath(path);
          setUsage(undefined);
          setReason({ reason: 'loading' });
          requestUsage(kernelId);
        } else {
          setKernelId(undefined);
          setReason({ reason: 'no_kernel' });
        }
      }
    };
    props.currentChanged.connect(notebookChangeCallback);
    return () => {
      props.currentChanged.disconnect(notebookChangeCallback);
      // In the ideal world we would disconnect kernelChangeCallback from
      // last panel here, but this can lead to a race condition. Instead,
      // we make sure there is ever only one callback active by holding
      // it in a global state.
    };
  }, [kernelId]);

  if (
    blankStateReason &&
    blankStateReason?.reason !== 'timeout' &&
    blankStateReason?.reason !== 'loading'
  ) {
    return (
      <>
        <h3 className="jp-KernelUsage-section-separator">
          {props.trans.__('Kernel usage not available')}
        </h3>
        <BlankReason trans={props.trans} reason={blankStateReason} />
      </>
    );
  }
  if (kernelId) {
    return (
      <>
        <h3 className="jp-KernelUsage-section-separator">
          {props.trans.__('Kernel usage')}
        </h3>
        {blankStateReason?.reason === 'timeout' ? (
          <strong>
            {props.trans.__('Timed out in: %1 ms', blankStateReason.timeout_ms)}
          </strong>
        ) : null}
        <div className="jp-KernelUsage-separator">
          {props.trans.__('Notebook:')} {path}
        </div>
        <div className="jp-KernelUsage-separator">
          {props.trans.__('Kernel ID:')} {kernelId}
        </div>
        <div
          className={
            blankStateReason?.reason === 'timeout' ? TIMEOUT_CLASS : ''
          }
        >
          {usage ? (
            <>
              <div className="jp-KernelUsage-separator">
                {props.trans.__('Kernel Host:')} {usage.hostname}
              </div>
              <div className="jp-KernelUsage-separator">
                {props.trans.__('Timestamp:')}{' '}
                {usage.timestamp?.toLocaleString()}
              </div>
              <div className="jp-KernelUsage-separator">
                {props.trans.__('Process ID:')} {usage.pid}
              </div>
              <div className="jp-KernelUsage-separator">
                {props.trans.__('CPU:')} {usage.kernel_cpu}
              </div>
              <div className="jp-KernelUsage-separator">
                {props.trans.__('Memory:')}{' '}
                {formatForDisplay(usage.kernel_memory)}
              </div>
              <hr className="jp-KernelUsage-section-separator"></hr>
              <h4 className="jp-KernelUsage-section-separator">
                {props.trans.__('Host CPU')}
              </h4>
              {usage.host_cpu_percent && (
                <div className="jp-KernelUsage-separator">
                  {props.trans._n(
                    '%2%% used on %1 CPU',
                    '%2%% used on %1 CPUs',
                    usage.cpu_count,
                    usage.host_cpu_percent.toFixed(1)
                  )}
                </div>
              )}
              <h4 className="jp-KernelUsage-section-separator">
                {props.trans.__('Host Virtual Memory')}
              </h4>
              <div className="jp-KernelUsage-separator">
                {props.trans.__('Active:')}{' '}
                {formatForDisplay(usage.host_virtual_memory.active)}
              </div>
              <div className="jp-KernelUsage-separator">
                {props.trans.__('Available:')}{' '}
                {formatForDisplay(usage.host_virtual_memory.available)}
              </div>
              <div className="jp-KernelUsage-separator">
                {props.trans.__('Free:')}{' '}
                {formatForDisplay(usage.host_virtual_memory.free)}
              </div>
              <div className="jp-KernelUsage-separator">
                {props.trans.__('Inactive:')}{' '}
                {formatForDisplay(usage.host_virtual_memory.inactive)}
              </div>
              {usage.host_virtual_memory.percent && (
                <div className="jp-KernelUsage-separator">
                  {props.trans.__('Percent used:')}{' '}
                  {usage.host_virtual_memory.percent.toFixed(1)}%
                </div>
              )}
              <div className="jp-KernelUsage-separator">
                {props.trans.__('Total:')}{' '}
                {formatForDisplay(usage.host_virtual_memory.total)}
              </div>
              <div className="jp-KernelUsage-separator">
                {props.trans.__('Used:')}{' '}
                {formatForDisplay(usage.host_virtual_memory.used)}
              </div>
              <div className="jp-KernelUsage-separator">
                {props.trans.__('Wired:')}{' '}
                {formatForDisplay(usage.host_virtual_memory.wired)}
              </div>
            </>
          ) : blankStateReason?.reason === 'loading' ? (
            <div className="jp-KernelUsage-separator">
              {props.trans.__('Loading…')}
            </div>
          ) : (
            <div className="jp-KernelUsage-separator">
              {props.trans.__('Usage data is missing')}
            </div>
          )}
        </div>
      </>
    );
  }
  return <h3>{props.trans.__('Kernel usage is missing')}</h3>;
};

export class KernelUsageWidget extends ReactWidget {
  private _currentChanged: ISignal<
    KernelWidgetTracker,
    IWidgetWithSession | null
  >;
  private _panel: KernelUsagePanel;
  private _trans: TranslationBundle;
  constructor(props: {
    currentChanged: ISignal<KernelWidgetTracker, IWidgetWithSession | null>;
    panel: KernelUsagePanel;
    trans: TranslationBundle;
  }) {
    super();
    this._currentChanged = props.currentChanged;
    this._panel = props.panel;
    this._trans = props.trans;
    this.addClass(KERNEL_USAGE_CLASS);
  }

  protected render(): React.ReactElement<any> {
    return (
      <KernelUsage
        currentChanged={this._currentChanged}
        panel={this._panel}
        trans={this._trans}
      />
    );
  }
}
