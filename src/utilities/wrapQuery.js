// @flow

import wrapAnsi from 'wrap-ansi';

export default (query: string): string => {
  return wrapAnsi(query,
    80,
    {
      trim: false
    })
    .split('\n')
    .filter((line) => {
      return line.trim();
    })
    .join('\n');
};
