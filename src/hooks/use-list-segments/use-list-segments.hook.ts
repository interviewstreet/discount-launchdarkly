import { useLdGetPaginated, UseLdGetPaginatedAPI } from 'hooks/use-ld-get-paginated';
import { SegmentItem } from './types';

export interface ListSegmentsResponse {
  items: Array<SegmentItem>;
  totalCount?: number;
}

interface UseSegmentsInterface {
  env: string | null;
  projectKey: string | null;
}

export const useListSegments = ({
  env,
  projectKey,
}: UseSegmentsInterface): UseLdGetPaginatedAPI<ListSegmentsResponse> => {
  // https://apidocs.launchdarkly.com/tag/Segments#operation/getSegments
  // Fetches all segments across all pages (max 50 per page, API v20240415)
  if (!env || !projectKey) {
    return {
      loading: true,
      response: null,
      refetch: async () => {},
    };
  }

  return useLdGetPaginated<ListSegmentsResponse>(
    {
      path: `/api/v2/segments/${projectKey}/${env}`,
      pageSize: 50,
    },
    [projectKey, env],
  );
};
