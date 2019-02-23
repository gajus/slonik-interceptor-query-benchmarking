// @flow

import type {
  InterceptorType
} from 'slonik';
import prettyMs from 'pretty-ms';
import {
  table
} from 'table';
import {
  format
} from 'pg-formatter';
import {
  wrapQuery
} from '../utilities';

/**
 * @property connections Internal connections property. Exposed for development purposes.
 */
type UserConfigurationType = {|
  // eslint-disable-next-line flowtype/no-weak-types
  +connections?: Object,
  +printTable?: boolean
|};

const defaultConfiguration = {
  connections: {},
  printTable: true
};

export default (userConfiguration?: UserConfigurationType): InterceptorType => {
  const configuration = {
    ...defaultConfiguration,
    ...userConfiguration
  };

  return {
    afterPoolConnection: (context) => {
      configuration.connections[context.connectionId] = {
        queries: {}
      };
    },
    afterQueryExecution: async (context, query, result) => {
      const startTime = configuration.connections[context.connectionId].queries[context.originalQuery.sql].queryStartTimes[context.queryId];

      configuration.connections[context.connectionId].queries[context.originalQuery.sql].durations.push(Number(process.hrtime.bigint() - startTime) / 1000000);

      return result;
    },
    beforePoolConnectionRelease: (context) => {
      let queries = Object
        .values(configuration.connections[context.connectionId].queries)

        // eslint-disable-next-line flowtype/no-weak-types
        .map((query: Object) => {
          const total = query.durations.reduce((accumulator, currentValue) => {
            return accumulator + currentValue;
          }, 0);

          const average = total / query.durations.length;

          return {
            ...query,
            average,
            executionCount: query.durations.length,
            total
          };
        });

      queries.sort((a, b) => {
        return a.total - b.total;
      });

      queries = queries.map((summary) => {
        return [
          wrapQuery(
            format(summary.sql, {
              spaces: 2
            })
          ),
          summary.executionCount,
          prettyMs(summary.average),
          prettyMs(summary.total)
        ];
      });

      queries.unshift([
        'Query',
        'Execution\ncount',
        'Average\ntime',
        'Total\ntime'
      ]);

      if (configuration.printTable) {
        // eslint-disable-next-line no-console
        console.log(table(queries));
      }

      // eslint-disable-next-line fp/no-delete
      delete configuration.connections[context.connectionId];
    },
    beforeQueryExecution: async (context) => {
      if (!configuration.connections[context.connectionId].queries[context.originalQuery.sql]) {
        configuration.connections[context.connectionId].queries[context.originalQuery.sql] = {
          durations: [],
          queryStartTimes: {},
          sql: context.originalQuery.sql
        };
      }

      configuration.connections[context.connectionId].queries[context.originalQuery.sql].queryStartTimes[context.queryId] = process.hrtime.bigint();
    }
  };
};
