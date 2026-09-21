import { useLaunchDarklyApi } from 'hooks/use-launchdarkly-api';
import { useCallback, useEffect, useState } from 'react';

interface UseLdGetPaginatedProps {
  path: string;
  query?: Record<string, string | null>;
  pageSize: number;
}

export interface UseLdGetPaginatedAPI<T> {
  loading: boolean;
  response: T | null;
  refetch: () => Promise<void>;
}

export const useLdGetPaginated = <T extends { items: Array<any> }>(
  props: UseLdGetPaginatedProps,
  dependencyArray: React.DependencyList,
): UseLdGetPaginatedAPI<T> => {
  const [loading, setLoading] = useState<boolean>(true);
  const [response, setResponse] = useState<T | null>(null);
  const { launchDarklyApi } = useLaunchDarklyApi();

  const refetchWithProps = useCallback(
    async (fetchProps: UseLdGetPaginatedProps) => {
      const responseJSON = await launchDarklyApi.fetchAllPages<T>(fetchProps);
      setResponse(responseJSON);
      setLoading(false);
    },
    [launchDarklyApi],
  );

  const refetch = useCallback(() => {
    setLoading(true);
    return refetchWithProps(props);
  }, [props, refetchWithProps]);

  useEffect(() => {
    setLoading(true);
    refetchWithProps(props);
  }, dependencyArray);

  return {
    loading,
    response,
    refetch,
  };
};
