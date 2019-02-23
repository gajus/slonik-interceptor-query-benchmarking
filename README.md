# slonik-interceptor-query-benchmarking

[![Travis build status](http://img.shields.io/travis/gajus/slonik-interceptor-query-benchmarking/master.svg?style=flat-square)](https://travis-ci.org/gajus/slonik-interceptor-query-benchmarking)
[![Coveralls](https://img.shields.io/coveralls/gajus/slonik-interceptor-query-benchmarking.svg?style=flat-square)](https://coveralls.io/github/gajus/slonik-interceptor-query-benchmarking)
[![NPM version](http://img.shields.io/npm/v/slonik-interceptor-query-benchmarking.svg?style=flat-square)](https://www.npmjs.org/package/slonik-interceptor-query-benchmarking)
[![Canonical Code Style](https://img.shields.io/badge/code%20style-canonical-blue.svg?style=flat-square)](https://github.com/gajus/canonical)
[![Twitter Follow](https://img.shields.io/twitter/follow/kuizinas.svg?style=social&label=Follow)](https://twitter.com/kuizinas)

Benchmarks [Slonik](https://github.com/gajus/slonik) queries.

## Implementation

Summarizes all queries that were run during the life-time of a connection.

Example output:

```
╔═══════════════════════════════════════════════════════════════╤═══════════╤═════════╤═══════╗
║ Query                                                         │ Execution │ Average │ Total ║
║                                                               │ count     │ time    │ time  ║
╟───────────────────────────────────────────────────────────────┼───────────┼─────────┼───────╢
║ SELECT id FROM seating_plan WHERE auditorium_id = $1 AND      │ 1         │ 176ms   │ 176ms ║
║ fingerprint = $2                                              │           │         │       ║
╟───────────────────────────────────────────────────────────────┼───────────┼─────────┼───────╢
║ UPDATE event SET scrape_event_seating_session = $1,           │ 1         │ 176ms   │ 176ms ║
║ scrape_event_seating_session_created_at = now() WHERE id =    │           │         │       ║
║ $2                                                            │           │         │       ║
╟───────────────────────────────────────────────────────────────┼───────────┼─────────┼───────╢
║ SELECT v1.cinema_id "cinemaId",                               │ 1         │ 182ms   │ 182ms ║
║ last_event_seating_plan_change.seating_plan_id                │           │         │       ║
║ "seatingPlanId" FROM event e1 INNER JOIN venue v1 ON v1.id =  │           │         │       ║
║ e1.venue_id INNER JOIN LATERAL ( SELECT DISTINCT ON           │           │         │       ║
║ (espc1.event_id) espc1.seating_plan_id FROM                   │           │         │       ║
║ event_seating_plan_change espc1 WHERE espc1.event_id = e1.id  │           │         │       ║
║ ORDER BY espc1.event_id, espc1.id DESC )                      │           │         │       ║
║ last_event_seating_plan_change ON TRUE WHERE e1.id = $1       │           │         │       ║
╟───────────────────────────────────────────────────────────────┼───────────┼─────────┼───────╢
║ UPDATE event_seating_lookup SET ended_at =                    │ 1         │ 185ms   │ 185ms ║
║ statement_timestamp(), log = $1, lookup_is_successful = $2,   │           │         │       ║
║ error_name = $3, error_message = $4, error = $5 WHERE id =    │           │         │       ║
║ $6                                                            │           │         │       ║
╟───────────────────────────────────────────────────────────────┼───────────┼─────────┼───────╢
║ SELECT s1.id, s1.location_column "locationColumn",            │ 1         │ 237ms   │ 237ms ║
║ s1.location_row "locationRow", sa1.fuid "seatingAreaFuid"     │           │         │       ║
║ FROM seat s1 INNER JOIN seating_area sa1 ON sa1.id =          │           │         │       ║
║ s1.seating_area_id WHERE s1.seating_plan_id = $1              │           │         │       ║
╟───────────────────────────────────────────────────────────────┼───────────┼─────────┼───────╢
║ SELECT extract(epoch from                                     │ 1         │ 647ms   │ 647ms ║
║ (c1.maximum_event_seating_lookup_duration)) FROM event e1     │           │         │       ║
║ INNER JOIN venue v1 ON v1.id = e1.venue_id INNER JOIN cinema  │           │         │       ║
║ c1 ON c1.id = v1.cinema_id WHERE e1.id = $1                   │           │         │       ║
╟───────────────────────────────────────────────────────────────┼───────────┼─────────┼───────╢
║ SELECT id FROM cinema_foreign_seat_type WHERE cinema_id = $1  │ 133       │ 150ms   │ 19.9s ║
║ AND fuid = $2                                                 │           │         │       ║
╚═══════════════════════════════════════════════════════════════╧═══════════╧═════════╧═══════╝

```

## API

```js
import {
  createQueryBenchmarkingInterceptor
} from 'slonik';

```

```js
/**
 * @property targetConnectionTypes Dictates what connections to benchmark. (Default: [EXPLICIT])
 */
type UserConfigurationType = {|
  +targetConnectionTypes: $ReadOnlyArray<ConnecionTypeType>
|};

(userConfiguration: UserConfigurationType) => InterceptorType;

```

## Example usage

```js
import {
  createPool
} from 'slonik';
import {
  createQueryBenchmarkingInterceptor
} from 'slonik-interceptor-query-benchmarking';

const interceptors = [
  createQueryBenchmarkingInterceptor()
];

const pool = createPool('postgres://', {
  interceptors
});

pool.connect((connection) => {
  return connection.any(sql`
    SELECT
      id,
      code_alpha_2
    FROM country
  `);
});

```

Produces log:

```sql
╔═════════════════╤═══════════╤═════════╤═══════╗
║ Query           │ Execution │ Average │ Total ║
║                 │ count     │ time    │ time  ║
╟─────────────────┼───────────┼─────────┼───────╢
║ SELECT          │ 1         │ 25ms    │ 25ms  ║
║    id,          │           │         │       ║
║    code_alpha_2 │           │         │       ║
║ FROM            │           │         │       ║
║    country      │           │         │       ║
╚═════════════════╧═══════════╧═════════╧═══════╝

```
