// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import { URLExt } from '@jupyterlab/coreutils';

import { TextItem } from '@jupyterlab/statusbar';

import { ServerConnection } from '@jupyterlab/services';

import { TranslationBundle } from '@jupyterlab/translation';

import { Poll } from '@lumino/polling';

import React from 'react';

import { MemoryUnit, MEMORY_UNIT_LIMITS, convertToLargestUnit } from './format';

import { resourceItem } from './text';

/**
 * A VDomRenderer for showing memory usage by a kernel.
 */
export class MemoryUsage extends VDomRenderer<MemoryUsage.Model> {
  /**
   * Construct a new memory usage status item.
   */
  constructor(trans: TranslationBundle) {
    super(new MemoryUsage.Model({ refreshRate: 5000 }));
    this._trans = trans;
  }

  /**
   * Render the memory usage status item.
   */
  render(): JSX.Element {
    if (!this.model) {
      return <div></div>;
    }
    let text: string;
    if (this.model.memoryLimit === null) {
      text = this._trans.__(
        'Mem: %1 %2',
        this.model.currentMemory.toFixed(Private.DECIMAL_PLACES),
        this.model.units
      );
    } else {
      text = this._trans.__(
        'Mem: %1 / %2 %3',
        this.model.currentMemory.toFixed(Private.DECIMAL_PLACES),
        this.model.memoryLimit.toFixed(Private.DECIMAL_PLACES),
        this.model.units
      );
    }
    if (!this.model.usageWarning) {
      return (
        <TextItem
          title={this._trans.__('Current memory usage')}
          source={text}
        />
      );
    } else {
      return (
        <TextItem
          title={this._trans.__('Current memory usage')}
          source={text}
          className={resourceItem}
        />
      );
    }
  }

  private _trans: TranslationBundle;
}

/**
 * A namespace for MemoryUsage statics.
 */
export namespace MemoryUsage {
  /**
   * A VDomModel for the memory usage status item.
   */
  export class Model extends VDomModel {
    /**
     * Construct a new memory usage model.
     *
     * @param options: the options for creating the model.
     */
    constructor(options: Model.IOptions) {
      super();
      this._poll = new Poll<Private.IMetricRequestResult>({
        factory: () => Private.factory(),
        frequency: {
          interval: options.refreshRate,
          backoff: true,
        },
        name: '@jupyterlab/statusbar:MemoryUsage#metrics',
      });
      this._poll.ticked.connect((poll) => {
        const { payload, phase } = poll.state;
        if (phase === 'resolved') {
          this._updateMetricsValues(payload);
          return;
        }
        if (phase === 'rejected') {
          const oldMetricsAvailable = this._metricsAvailable;
          this._metricsAvailable = false;
          this._currentMemory = 0;
          this._memoryLimit = null;
          this._units = 'B';

          if (oldMetricsAvailable) {
            this.stateChanged.emit();
          }
          return;
        }
      });
    }

    /**
     * Whether the metrics server extension is available.
     */
    get metricsAvailable(): boolean {
      return this._metricsAvailable;
    }

    /**
     * The current memory usage/
     */
    get currentMemory(): number {
      return this._currentMemory;
    }

    /**
     * The current memory limit, or null if not specified.
     */
    get memoryLimit(): number | null {
      return this._memoryLimit;
    }

    /**
     * The units for memory usages and limits.
     */
    get units(): MemoryUnit {
      return this._units;
    }

    /**
     * The warning for memory usage.
     */
    get usageWarning(): boolean {
      return this._warn;
    }

    /**
     * Dispose of the memory usage model.
     */
    dispose(): void {
      super.dispose();
      this._poll.dispose();
    }

    /**
     * Given the results of the metrics request, update model values.
     */
    private _updateMetricsValues(
      value: Private.IMetricRequestResult | null
    ): void {
      const oldMetricsAvailable = this._metricsAvailable;
      const oldCurrentMemory = this._currentMemory;
      const oldMemoryLimit = this._memoryLimit;
      const oldUnits = this._units;
      const oldUsageWarning = this._warn;

      if (value === null) {
        this._metricsAvailable = false;
        this._currentMemory = 0;
        this._memoryLimit = null;
        this._units = 'B';
        this._warn = false;
      } else {
        const numBytes = value.pss ?? value.rss;
        const memoryLimits = value.limits.memory;
        const memoryLimit = memoryLimits?.pss ?? memoryLimits?.rss ?? null;
        const [currentMemory, units] = convertToLargestUnit(numBytes);
        const usageWarning = value.limits.memory
          ? value.limits.memory.warn
          : false;

        this._metricsAvailable = true;
        this._currentMemory = currentMemory;
        this._units = units;
        this._memoryLimit = memoryLimit
          ? memoryLimit / MEMORY_UNIT_LIMITS[units]
          : null;
        this._warn = usageWarning;
      }

      if (
        this._currentMemory !== oldCurrentMemory ||
        this._units !== oldUnits ||
        this._memoryLimit !== oldMemoryLimit ||
        this._metricsAvailable !== oldMetricsAvailable ||
        this._warn !== oldUsageWarning
      ) {
        this.stateChanged.emit(void 0);
      }
    }

    private _currentMemory = 0;
    private _memoryLimit: number | null = null;
    private _metricsAvailable = false;
    private _poll: Poll<Private.IMetricRequestResult>;
    private _units: MemoryUnit = 'B';
    private _warn = false;
  }

  /**
   * A namespace for Model statics.
   */
  export namespace Model {
    /**
     * Options for creating a MemoryUsage model.
     */
    export interface IOptions {
      /**
       * The refresh rate (in ms) for querying the server.
       */
      refreshRate: number;
    }
  }
}

/**
 * A namespace for module private statics.
 */
namespace Private {
  /**
   * The number of decimal places to use when rendering memory usage.
   */
  export const DECIMAL_PLACES = 2;

  /**
   * Settings for making requests to the server.
   */
  const SERVER_CONNECTION_SETTINGS = ServerConnection.makeSettings();

  /**
   * The url endpoint for making requests to the server.
   */
  const METRIC_URL = URLExt.join(
    SERVER_CONNECTION_SETTINGS.baseUrl,
    'api/metrics/v1'
  );

  /**
   * The shape of a response from the metrics server extension.
   */
  export interface IMetricRequestResult {
    rss: number;
    pss?: number;
    limits: {
      memory?: {
        rss: number;
        pss?: number;
        warn: boolean;
      };
    };
  }

  /**
   * Make a request to the backend.
   */
  export async function factory(): Promise<IMetricRequestResult> {
    const request = ServerConnection.makeRequest(
      METRIC_URL,
      {},
      SERVER_CONNECTION_SETTINGS
    );
    const response = await request;

    return await response.json();
  }
}
