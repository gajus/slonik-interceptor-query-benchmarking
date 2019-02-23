// @flow

import test from 'ava';
import createQueryBenchmarkingInterceptor from '../../../src/factories/createQueryBenchmarkingInterceptor';

test('afterPoolConnection creates a queries haystack using connectionId', (t) => {
  const configuration = {
    connections: {}
  };

  const interceptor = createQueryBenchmarkingInterceptor(configuration);

  const context = {
    connectionId: 'foo'
  };

  interceptor.afterPoolConnection(context);

  t.deepEqual(configuration.connections, {
    foo: {
      queries: {}
    }
  });
});

test('beforePoolConnectionRelease destroys data associated with the connection', (t) => {
  const configuration = {
    connections: {},
    printTable: false
  };

  const interceptor = createQueryBenchmarkingInterceptor(configuration);

  const context = {
    connectionId: 'foo'
  };

  interceptor.afterPoolConnection(context);
  interceptor.beforePoolConnectionRelease(context);

  t.deepEqual(configuration.connections, {});
});
