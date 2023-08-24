import { ReactWidget } from '@jupyterlab/apputils';

import React, { useState, useEffect, ReactElement } from 'react';

import { IndicatorComponent } from './indicator';

import { ResourceUsage } from './model';

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
    const { memoryLimit, currentMemory, memoryUnits } = model;
    const precision = ['B', 'KB', 'MB'].indexOf(memoryUnits) > 0 ? 0 : 2;
    const newText = `${currentMemory.toFixed(precision)} ${
      memoryLimit ? '/ ' + memoryLimit.toFixed(precision) : ''
    } ${memoryUnits}`;
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
