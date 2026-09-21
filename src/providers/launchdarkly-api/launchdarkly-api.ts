import fetch from 'isomorphic-fetch';
import lodash from 'lodash';
import { FlagItem } from 'hooks/use-list-flags/types';

export interface LaunchDarklyApiFetchProps {
  path: string;
  query?: Record<string, string | null>;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: BodyInit | null | undefined;
  skip?: boolean;
  headers?: Record<string, string>;
}

export class LaunchDarklyApi {
  apiKey: string;

  constructor({ apiKey }: { apiKey: string }) {
    this.apiKey = apiKey;
  }

  async fetch<T>({
    path,
    query,
    method,
    body,
    headers = {},
    skip = false,
  }: LaunchDarklyApiFetchProps): Promise<T | null> {
    if (skip) {
      return Promise.resolve(null);
    }
    const pathWithPrefix = path.startsWith('/') ? path : `/${path}`;
    let url = `https://app.launchdarkly.com${pathWithPrefix}`;
    if (query) {
      const queryString = new URLSearchParams(
        lodash.omitBy(query, lodash.isNil) as Record<string, string>,
      ).toString();
      url = `${url}?${queryString}`;
    }
    console.info(`${method} ${url}`);
    const response = await fetch(url, {
      method,
      body,
      headers: {
        Authorization: this.apiKey,
        'LD-API-Version': '20240415',
        ...headers,
      },
    });
    if (!response.ok) {
      throw new Error(`${method} ${url} failed with status ${response.status}`);
    }
    const json: T = await response.json();
    return json;
  }

  async patchFlag({
    projectKey,
    flagKey,
    operations,
    comment,
  }: {
    projectKey: string;
    flagKey: string;
    operations: Array<{
      op: 'replace' | 'add'; // e.g. "replace". "remove"?
      path: string; // e.g. "/description"
      value: string | number | boolean; // "new value"
    }>;
    comment: string;
  }): Promise<FlagItem | null> {
    return this.fetch<FlagItem | null>({
      path: `/api/v2/flags/${projectKey}/${flagKey}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patch: operations,
        comment,
      }),
    });
  }

  async semanticPatchFlag({
    projectKey,
    flagKey,
    environmentKey,
    instructions,
    comment,
    ignoreConflicts,
  }: {
    projectKey: string;
    flagKey: string;
    environmentKey: string;
    instructions: Array<Record<string, any>>;
    comment?: string;
    ignoreConflicts?: boolean;
  }): Promise<FlagItem | null> {
    let query = {};
    if (ignoreConflicts) {
      query = { ignoreConflicts: true };
    }
    return this.fetch<FlagItem | null>({
      path: `/api/v2/flags/${projectKey}/${flagKey}`,
      query,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json; domain-model=launchdarkly.semanticpatch',
      },
      body: JSON.stringify({
        environmentKey: environmentKey,
        instructions,
        comment,
      }),
    });
  }

  async fetchAllPages<T extends { items: Array<any> }>({
    path,
    query,
    pageSize,
    skip = false,
  }: {
    path: string;
    query?: Record<string, string | null>;
    pageSize: number;
    skip?: boolean;
  }): Promise<T | null> {
    if (skip) {
      return Promise.resolve(null);
    }
    // Fetch page 0 alone first. Most lists fit in one page (or are empty),
    // so this avoids firing wasted parallel requests in the common case.
    const firstResponse = await this.fetch<T>({
      path,
      query: {
        ...query,
        limit: pageSize.toString(),
        offset: '0',
      },
      method: 'GET',
    });

    const firstItems = firstResponse?.items ?? [];
    if (firstItems.length < pageSize) {
      // Last (or only) page — nothing more to fetch.
      return firstResponse;
    }

    // Page 0 was full, so there may be more.
    const allItems: Array<any> = [...firstItems];
    const reportedTotalCount = (firstResponse as any)?.totalCount;

    if (typeof reportedTotalCount === 'number') {
      // We know exactly how many pages remain — fetch them all in one shot.
      const totalPages = Math.ceil(reportedTotalCount / pageSize);
      const remainingPageIndexes = Array.from(
        { length: Math.max(totalPages - 1, 0) },
        (_, i) => i + 1,
      );
      const remainingResponses = await Promise.all(
        remainingPageIndexes.map((pageIndex) =>
          this.fetch<T>({
            path,
            query: {
              ...query,
              limit: pageSize.toString(),
              offset: (pageIndex * pageSize).toString(),
            },
            method: 'GET',
          }),
        ),
      );
      for (const pageResponse of remainingResponses) {
        allItems.push(...(pageResponse?.items ?? []));
      }
    } else {
      // No reliable totalCount from this endpoint — fetch subsequent pages
      // in parallel batches instead of trusting a computed page count. A
      // batch is the last one once any page in it comes back short.
      const BATCH_CONCURRENCY = 4;
      let nextPageIndex = 1;
      let done = false;

      while (!done) {
        const batchPageIndexes = Array.from(
          { length: BATCH_CONCURRENCY },
          (_, i) => nextPageIndex + i,
        );
        const batchResponses = await Promise.all(
          batchPageIndexes.map((pageIndex) =>
            this.fetch<T>({
              path,
              query: {
                ...query,
                limit: pageSize.toString(),
                offset: (pageIndex * pageSize).toString(),
              },
              method: 'GET',
            }),
          ),
        );

        for (const pageResponse of batchResponses) {
          const items = pageResponse?.items ?? [];
          allItems.push(...items);
          if (items.length < pageSize) {
            done = true;
            break;
          }
        }

        nextPageIndex += BATCH_CONCURRENCY;
      }
    }

    return {
      ...firstResponse,
      items: allItems,
      totalCount: allItems.length,
    } as unknown as T;
  }
}
