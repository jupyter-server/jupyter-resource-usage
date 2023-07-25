// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomModel } from '@jupyterlab/apputils';

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

import { Poll } from '@lumino/polling';

import { MemoryUnit, MEMORY_UNIT_LIMITS, convertToLargestUnit } from './format';

/**
 * Number of values to keep in memory.
 */
const N_BUFFER = 20;

/**
 * A namespace for ResourcUsage statics.
 */
export namespace ResourceUsage {
  /**
   * A model for the resource usage items.
   */
  export class Model extends VDomModel {
    /**
     * Construct a new resource usage model.
     *
     * @param options The options for creating the model.
     */
    constructor(options: Model.IOptions) {
      super();
      for (let i = 0; i < N_BUFFER; i++) {
        this._values.push({ memoryPercent: 0, cpuPercent: 0 });
      }
      this._poll = new Poll<Private.IMetricRequestResult | null>({
        factory: (): Promise<Private.IMetricRequestResult | null> =>
          Private.factory(),
        frequency: {
          interval: options.refreshRate,
          backoff: true,
        },
        name: '@jupyterlab/statusbar:ResourceUsage#metrics',
      });
      this._poll.ticked.connect((poll) => {
        const { payload, phase } = poll.state;
        if (phase === 'resolved') {
          this._updateMetricsValues(payload);
          return;
        }
        if (phase === 'rejected') {
          const oldMemoryAvailable = this._memoryAvailable;
          const oldCpuAvailable = this._cpuAvailable;
          this._memoryAvailable = false;
          this._cpuAvailable = false;
          this._currentMemory = 0;
          this._memoryLimit = null;
          this._cpuLimit = null;
          this._units = 'B';

          if (oldMemoryAvailable || oldCpuAvailable) {
            this.stateChanged.emit();
          }
          return;
        }
      });
    }

    /**
     * A promise that resolves after the next request.
     */
    async refresh(): Promise<void> {
      await this._poll.refresh();
      await this._poll.tick;
    }

    /**
     * Whether the metrics server extension is available.
     */
    get metricsAvailable(): boolean {
      return this._memoryAvailable || this._cpuAvailable;
    }

    /**
     * Whether the memory metric is available.
     */
    get memoryAvailable(): boolean {
      return this._memoryAvailable;
    }

    /**
     * Whether the cpu metric is available.
     */
    get cpuAvailable(): boolean {
      return this._cpuAvailable;
    }

    /**
     * The current memory usage.
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
     * The current cpu limit, or null if not specified.
     */
    get cpuLimit(): number | null {
      return this._cpuLimit;
    }

    /**
     * The units for memory usages and limits.
     */
    get units(): MemoryUnit {
      return this._units;
    }

    /**
     * The current cpu percent.
     */
    get currentCpuPercent(): number {
      return this._currentCpuPercent;
    }

    /**
     * Get a list of the last metric values.
     */
    get values(): Model.IMetricValue[] {
      return this._values;
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
     *
     * @param value The metric request result.
     */
    private _updateMetricsValues(
      value: Private.IMetricRequestResult | null
    ): void {
      if (value === null) {
        this._memoryAvailable = false;
        this._cpuAvailable = false;
        this._currentMemory = 0;
        this._memoryLimit = null;
        this._units = 'B';
        this._warn = false;
        return;
      }

      const numBytes = value.pss ?? value.rss;
      const memoryLimits = value.limits.memory;
      const memoryLimit = memoryLimits?.pss ?? memoryLimits?.rss ?? null;
      const [currentMemory, units] = convertToLargestUnit(numBytes);
      const usageWarning = value.limits.memory
        ? value.limits.memory.warn
        : false;

      this._memoryAvailable = numBytes !== undefined;
      this._currentMemory = currentMemory;
      this._units = units;
      this._memoryLimit = memoryLimit
        ? memoryLimit / MEMORY_UNIT_LIMITS[units]
        : null;
      const memoryPercent = this.memoryLimit
        ? Math.min(this._currentMemory / this.memoryLimit, 1)
        : 0;
      this._warn = usageWarning;

      this._cpuLimit = value.limits.cpu ? value.limits.cpu.cpu : null;
      this._cpuAvailable = value.cpu_percent !== undefined;
      this._currentCpuPercent =
        value.cpu_percent !== undefined ? value.cpu_percent / 100 : 0;

      this._values.push({ memoryPercent, cpuPercent: this._currentCpuPercent });
      this._values.shift();
      this.stateChanged.emit(void 0);
    }

    private _memoryAvailable = false;
    private _cpuAvailable = false;
    private _currentMemory = 0;
    private _currentCpuPercent = 0;
    private _memoryLimit: number | null = null;
    private _cpuLimit: number | null = null;
    private _poll: Poll<Private.IMetricRequestResult | null>;
    private _units: MemoryUnit = 'B';
    private _warn = false;
    private _values: Model.IMetricValue[] = [];
  }

  /**
   * A namespace for Model statics.
   */
  export namespace Model {
    /**
     * Options for creating a ResourceUsage model.
     */
    export interface IOptions {
      /**
       * The refresh rate (in ms) for querying the server.
       */
      refreshRate: number;
    }

    /**
     * An interface for metric values.
     */
    export interface IMetricValue {
      /**
       * The memory percentage.
       */
      memoryPercent: number;

      /**
       * The cpu percentage.
       */
      cpuPercent: number;
    }
  }
}

/**
 * A namespace for module private statics.
 */
namespace Private {
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
    cpu_percent?: number;
    cpu_count?: number;
    limits: {
      memory?: {
        rss: number;
        pss?: number;
        warn: boolean;
      };
      cpu?: {
        cpu: number;
        warn: boolean;
      };
    };
  }

  /**
   * Make a request to the backend.
   */
  export const factory = async (): Promise<IMetricRequestResult | null> => {
    const request = ServerConnection.makeRequest(
      METRIC_URL,
      {},
      SERVER_CONNECTION_SETTINGS
    );
    const response = await request;

    if (response.ok) {
      return await response.json();
    }

    return null;
  };
}
