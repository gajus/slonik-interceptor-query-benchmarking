// @flow

import type {
  ConnectionTypeType,
  InterceptorType,
} from 'slonik';
import prettyMs from 'pretty-ms';
import {
  table,
} from 'table';
import {
  format,
} from 'pg-formatter';
import {
  wrapQuery,
} from '../utilities';

/**
 * @property connections Internal connections property. Exposed for development purposes. (Default: {})
 * @property printTable Dictates whether to output the benchmark table. Exposed for development purposes. (Default: true)
 * @property targetConnectionTypes Dictates which connections to benchmark. (Default: [EXPLICIT])
 */
type UserConfigurationType = {|
  // eslint-disable-next-line flowtype/no-weak-types
  +connections?: Object,
  +printTable?: boolean,
  +targetConnectionTypes?: $ReadOnlyArray<ConnectionTypeType>,
|};

const defaultConfiguration = {
  connections: {},
  printTable: true,
  targetConnectionTypes: [
    'EXPLICIT',
  ],
};

export default (userConfiguration?: UserConfigurationType): InterceptorType => {
  const configuration = {
    ...defaultConfiguration,
    ...userConfiguration,
  };

  return {
    afterPoolConnection: (context) => {
      if (configuration.targetConnectionTypes.includes(context.connectionType)) {
        configuration.connections[context.connectionId] = {
          queries: {},
        };
      }

      return null;
    },
    afterQueryExecution: async (context) => {
      if (!configuration.connections[context.connectionId]) {
        return null;
      }

      const startTime = configuration.connections[context.connectionId].queries[context.originalQuery.sql].queryStartTimes[context.queryId];

      configuration.connections[context.connectionId].queries[context.originalQuery.sql].durations.push(Number(process.hrtime.bigint() - startTime) / 1000000);

      return null;
    },
    beforePoolConnectionRelease: (context) => {
      if (!configuration.connections[context.connectionId]) {
        return null;
      }

      let totalQueryExecutionTime = 0;

      let queries = Object
        .values(configuration.connections[context.connectionId].queries)

        // eslint-disable-next-line flowtype/no-weak-types
        .map((query: Object) => {
          const total = query.durations.reduce((accumulator, currentValue) => {
            return accumulator + currentValue;
          }, 0);

          totalQueryExecutionTime += total;

          const average = total / query.durations.length;

          return {
            ...query,
            average,
            executionCount: query.durations.length,
            total,
          };
        });

      queries.sort((a, b) => {
        return a.total - b.total;
      });

      queries = queries.map((summary) => {
        return [
          wrapQuery(
            format(summary.sql, {
              spaces: 2,
            }),
          ),
          summary.executionCount,
          prettyMs(summary.average),
          prettyMs(summary.total),
          (summary.total / totalQueryExecutionTime * 100).toFixed(2) + '%',
        ];
      });

      queries.unshift([
        'Query',
        'Execution\ncount',
        'Average\ntime',
        'Total\ntime',
        'Total\ntime %',
      ]);

      if (configuration.printTable) {
        // eslint-disable-next-line no-console
        console.log(table(queries));
      }

      // eslint-disable-next-line fp/no-delete
      delete configuration.connections[context.connectionId];

      return null;
    },
    beforeQueryExecution: async (context) => {
      if (!configuration.connections[context.connectionId]) {
        return null;
      }

      if (!configuration.connections[context.connectionId].queries[context.originalQuery.sql]) {
        configuration.connections[context.connectionId].queries[context.originalQuery.sql] = {
          durations: [],
          queryStartTimes: {},
          sql: context.originalQuery.sql,
        };
      }

      configuration.connections[context.connectionId].queries[context.originalQuery.sql].queryStartTimes[context.queryId] = process.hrtime.bigint();

      return null;
    },
  };
};
