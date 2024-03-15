import { ReactWidget } from '@jupyterlab/apputils';

import React, { useState, useEffect, ReactElement } from 'react';

import { IndicatorComponent } from './indicator';

import { ResourceUsage } from './model';

export const DEFAULT_DISK_LABEL = 'Disk: ';

/**
 * A DiskView component to display disk usage.
 */
const DiskViewComponent = ({
  model,
  label,
}: {
  model: ResourceUsage.Model;
  label: string;
}): ReactElement => {
  const [text, setText] = useState('');
  const [values, setValues] = useState<number[]>([]);

  const update = (): void => {
    const { maxDisk, currentDisk, diskUnits } = model;
    const precision = ['B', 'KB', 'MB'].indexOf(diskUnits) > 0 ? 0 : 2;
    const newText = `${currentDisk.toFixed(precision)} / ${maxDisk.toFixed(
      precision
    )} ${diskUnits}`;
    const newValues = model.values.map((value) => value.diskPercent);
    setText(newText);
    setValues(newValues);
  };

  useEffect(() => {
    model.stateChanged.connect(update);
    return (): void => {
      model.stateChanged.disconnect(update);
    };
  }, [model]);
  console.log('DiskViewComponent created');
  return (
    <IndicatorComponent
      enabled={model.diskAvailable}
      values={values}
      label={label}
      color={'#c27ba0'}
      text={text}
    />
  );
};

export namespace DiskView {
  /**
   * Create a new MemoryView React Widget.
   *
   * @param model The resource usage model.
   * @param label The label next to the component.
   */
  export const createDiskView = (
    model: ResourceUsage.Model,
    label: string
  ): ReactWidget => {
    return ReactWidget.create(
      <DiskViewComponent model={model} label={label} />
    );
  };
}
