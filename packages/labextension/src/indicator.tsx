import React, { useState, ReactElement } from 'react';

import { Sparklines, SparklinesLine, SparklinesSpots } from 'react-sparklines';

/**
 * A indicator fill component.
 */
const IndicatorFiller = ({
  percentage,
  color,
}: {
  percentage: number;
  color: string;
}): ReactElement => {
  return (
    <div
      className="jp-IndicatorFiller"
      style={{
        width: `${percentage * 100}%`,
        background: `${color}`,
      }}
    />
  );
};

/**
 * An indicator bar component.
 */
const IndicatorBar = ({
  values,
  percentage,
  baseColor,
}: {
  values: number[];
  percentage: number;
  baseColor: string;
}): ReactElement => {
  const [isSparklines, setIsSparklines] = useState(false);

  const toggleSparklines = (): void => {
    setIsSparklines(!isSparklines);
  };

  const color =
    percentage > 0.5 ? (percentage > 0.8 ? 'red' : 'orange') : baseColor;

  return (
    <div className="jp-IndicatorBar" onClick={(): void => toggleSparklines()}>
      {isSparklines && (
        <Sparklines
          data={values}
          min={0.0}
          max={1.0}
          limit={values.length}
          margin={0}
        >
          <SparklinesLine
            style={{
              stroke: color,
              strokeWidth: 4,
              fill: color,
              fillOpacity: 1,
            }}
          />
          <SparklinesSpots />
        </Sparklines>
      )}
      {!isSparklines && (
        <IndicatorFiller percentage={percentage} color={color} />
      )}
    </div>
  );
};

/**
 * An incicator component for displaying resource usage.
 *
 */
export const IndicatorComponent = ({
  enabled,
  values,
  label,
  color,
  text,
}: {
  enabled: boolean;
  values: number[];
  label: string;
  color: string;
  text: string;
}): ReactElement => {
  const percentage = values[values.length - 1];
  return (
    <>
      {enabled && (
        <div className="jp-IndicatorContainer">
          <div className="jp-IndicatorText">{label}</div>
          {percentage !== null && (
            <div className="jp-IndicatorWrapper">
              <IndicatorBar
                values={values}
                percentage={percentage}
                baseColor={color}
              />
            </div>
          )}
          <div className="jp-IndicatorText">{text}</div>
        </div>
      )}
    </>
  );
};
