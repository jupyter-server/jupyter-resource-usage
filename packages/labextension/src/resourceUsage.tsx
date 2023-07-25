// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomRenderer } from '@jupyterlab/apputils';

import { TextItem } from '@jupyterlab/statusbar';

import { TranslationBundle } from '@jupyterlab/translation';

import React from 'react';

import { ResourceUsage } from './model';

import { resourceItem } from './text';

/**
 * A VDomRenderer for showing resource usage by a kernel.
 */
export class ResourceUsageStatus extends VDomRenderer<ResourceUsage.Model> {
  /**
   * Construct a new resource usage status item.
   */
  constructor(trans: TranslationBundle) {
    super(new ResourceUsage.Model({ refreshRate: 5000 }));
    this._trans = trans;
  }

  /**
   * Render the resource usage status item.
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
    if (this.model.cpuAvailable) {
      text = `CPU: ${(this.model.currentCpuPercent * 100).toFixed(
        Private.DECIMAL_PLACES
      )} % ${text}`;
    }
    if (!this.model.usageWarning) {
      return (
        <TextItem
          title={this._trans.__('Current resource usage')}
          source={text}
        />
      );
    } else {
      return (
        <TextItem
          title={this._trans.__('Current resource usage')}
          source={text}
          className={resourceItem}
        />
      );
    }
  }

  private _trans: TranslationBundle;
}

/**
 * A namespace for module private statics.
 */
namespace Private {
  /**
   * The number of decimal places to use when rendering memory usage.
   */
  export const DECIMAL_PLACES = 2;
}
