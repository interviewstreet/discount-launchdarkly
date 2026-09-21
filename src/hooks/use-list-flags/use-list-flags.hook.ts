import { useLdGetPaginated, UseLdGetPaginatedAPI } from 'hooks/use-ld-get-paginated';
import { FlagItem } from './types';

export interface ListFlagsResponse {
  totalCount: number;
  items: Array<FlagItem>;
}

interface UseFlagsInterface {
  env: string | null;
  projectKey?: string;
  archived?: boolean;
}

export const useListFlags = ({
  env,
  projectKey,
  archived,
}: UseFlagsInterface): UseLdGetPaginatedAPI<ListFlagsResponse> => {
  // https://apidocs.launchdarkly.com/tag/Feature-flags#operation/getFeatureFlags
  // Fetches all flags across all pages (max 100 per page, API v20240415)
  if (!env) {
    return {
      loading: true,
      response: null,
      refetch: async () => {},
    };
  }

  return useLdGetPaginated<ListFlagsResponse>(
    {
      path: `/api/v2/flags/${projectKey}`,
      pageSize: 100,
      query: {
        env,
        summary: 'false', // Include all rules/targeting
        archived: (archived ?? false).toString(),
      },
    },
    [projectKey, env, archived],
  );
};
