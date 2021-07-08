import { t } from '@lingui/macro';
import React, { FC, useMemo } from 'react';

import { SelectableValue } from '@grafana/data';
import { Select } from '@grafana/ui';
import { QueryEditorField } from '.';
import { getAggregationOptionsByMetric } from '../functions';
import { MetricDescriptor, ValueTypes, MetricKind } from '../types';

export interface Props {
  onChange: (metricDescriptor: string) => void;
  metricDescriptor?: MetricDescriptor;
  crossSeriesReducer: string;
  groupBys: string[];
  templateVariableOptions: Array<SelectableValue<string>>;
}
let name1 = 's';

export const Aggregation: FC<Props> = (props) => {
  const aggOptions = useAggregationOptionsByMetric(props);
  const selected = useSelectedFromOptions(aggOptions, props);


  return (
    <QueryEditorField
      labelWidth={18}
      label={t`Group by function`}
      data-testid="cloud-monitoring-aggregation"
    >
      <Select
        width={16}
        onChange={({ value }) => props.onChange(value!)}
        value={selected}
        options={[
          {
            label: t`Template Variables\``,
            options: props.templateVariableOptions,
          },
          {
            label: t`D  ${name1}  Dddd`,
            expanded: true,
            options: aggOptions,
          },
        ]}
        placeholder={t`Select Reducer`}
      />
    </QueryEditorField>
  );
};

const useAggregationOptionsByMetric = ({
  metricDescriptor,
}: Props): Array<SelectableValue<string>> => {
  let a = t`D ${name1} Dddd`;
  const valueType = metricDescriptor?.valueType;
  const metricKind = metricDescriptor?.metricKind;

  return useMemo(() => {
    if (!valueType || !metricKind) {
      return [];
    }

    return getAggregationOptionsByMetric(
      valueType as ValueTypes,
      metricKind as MetricKind
    ).map((a) => ({
      ...a,
      label: a.text,
    }));
  }, [valueType, metricKind]);
};

const useSelectedFromOptions = (
  aggOptions: Array<SelectableValue<string>>,
  props: Props
) => {
  return useMemo(() => {
    const allOptions = [...aggOptions, ...props.templateVariableOptions];
    return allOptions.find((s) => s.value === props.crossSeriesReducer);
  }, [aggOptions, props.crossSeriesReducer, props.templateVariableOptions]);
};
