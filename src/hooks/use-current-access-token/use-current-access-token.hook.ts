import { useLdGet, UseLdGetAPI } from 'hooks/use-ld-get';
import { AccessTokenItem } from 'hooks/use-list-access-tokens';

interface CallerIdentityResponse {
  tokenId?: string;
}

export const useCurrentAccessToken = (): UseLdGetAPI<AccessTokenItem> => {
  // https://launchdarkly.com/docs/api/other/get-caller-identity
  // Resolves the current token's id without listing/paginating all tokens.
  const { response: callerIdentity, loading: loadingIdentity } =
    useLdGet<CallerIdentityResponse>(
      {
        path: '/api/v2/caller-identity',
        method: 'GET',
      },
      [],
    );

  const tokenId = callerIdentity?.tokenId;

  // https://apidocs.launchdarkly.com/tag/Access-tokens#operation/getToken
  const {
    response: accessToken,
    loading: loadingToken,
    refetch,
  } = useLdGet<AccessTokenItem>(
    {
      skip: !tokenId,
      path: `/api/v2/tokens/${tokenId}`,
      method: 'GET',
    },
    [tokenId],
  );

  return {
    loading: loadingIdentity || loadingToken,
    response: accessToken,
    refetch,
  };
};
