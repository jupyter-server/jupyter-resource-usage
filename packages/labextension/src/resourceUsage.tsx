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
        '%1 %2 %3',
        this.model.memLabel,
        this.model.currentMemory.toFixed(Private.DECIMAL_PLACES),
        this.model.memUnits
      );
    } else {
      text = this._trans.__(
        '%1 %2 / %3 %4',
        this.model.memLabel,
        this.model.currentMemory.toFixed(Private.DECIMAL_PLACES),
        this.model.memoryLimit.toFixed(Private.DECIMAL_PLACES),
        this.model.memUnits
      );
    }
    if (this.model.cpuAvailable) {
      text = `${this.model.cpuLabel} ${(
        this.model.currentCpuPercent * 100
      ).toFixed(Private.DECIMAL_PLACES)} % | ${text}`;
    }
    if (this.model.diskAvailable) {
      text = `${this.model.diskLabel} ${this.model.currentDisk.toFixed(
        Private.DECIMAL_PLACES
      )} / ${this.model.maxDisk.toFixed(Private.DECIMAL_PLACES)} ${
        this.model.diskUnits
      } | ${text}`;
    }
    if (!this.model.usageWarnings.hasWarning) {
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
