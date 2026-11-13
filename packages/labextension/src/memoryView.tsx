import { ReactWidget } from '@jupyterlab/apputils';

import React, { useState, useEffect, ReactElement } from 'react';

import { IndicatorComponent } from './indicator';

import { MemoryUnit } from './format';

import { ResourceUsage } from './model';

export const DEFAULT_MEMORY_LABEL = 'Mem: ';

/**
 * A MemoryView component to display memory usage.
 */
const MemoryViewComponent = ({
  model,
  label,
}: {
  model: ResourceUsage.Model;
  label: string;
}): ReactElement => {
  const [text, setText] = useState('');
  const [values, setValues] = useState<number[]>([]);

  const update = (): void => {
    const { memoryLimitDisplay, memLimitUnits, currentMemory, memUnits } =
      model;
    const toText = (value: number, units: MemoryUnit): string => {
      const precision = ['B', 'KB', 'MB', 'GB'].indexOf(units) > 0 ? 0 : 3;
      return `${value.toFixed(precision)} ${units}`;
    };
    const newText = memoryLimitDisplay
      ? `${toText(currentMemory, memUnits)} / ${toText(
          memoryLimitDisplay,
          memLimitUnits
        )}`
      : toText(currentMemory, memUnits);
    const newValues = model.values.map((value) => value.memoryPercent);
    setText(newText);
    setValues(newValues);
  };

  useEffect(() => {
    model.stateChanged.connect(update);
    return (): void => {
      model.stateChanged.disconnect(update);
    };
  }, [model]);

  return (
    <IndicatorComponent
      enabled={model.memoryAvailable}
      values={values}
      label={label}
      color={'#00B35B'}
      text={text}
    />
  );
};

export namespace MemoryView {
  /**
   * Create a new MemoryView React Widget.
   *
   * @param model The resource usage model.
   * @param label The label next to the component.
   */
  export const createMemoryView = (
    model: ResourceUsage.Model,
    label: string
  ): ReactWidget => {
    return ReactWidget.create(
      <MemoryViewComponent model={model} label={label} />
    );
  };
}
