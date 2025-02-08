import React, { useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Center, Spinner } from '@chakra-ui/react';
import { EnvironmentItem, ListEnvironmentsResponse } from 'hooks/use-list-environments';
import { LaunchDarklyConfigContext } from './launchdarkly-config.context';
import { useListAccessTokens } from 'hooks/use-list-access-tokens';
import { useLaunchDarklyApi } from 'hooks/use-launchdarkly-api';
import { DEFAULT_PROJECT_KEY } from './constants';
import { useListProjects } from 'hooks/use-list-projects';

interface LaunchDarklyConfigProviderProps {
  children: ReactNode;
}
export const LaunchDarklyConfigProvider = ({ children }: LaunchDarklyConfigProviderProps) => {
  const { apiKey } = useLaunchDarklyApi();
  const [projectKey, setProjectKey] = useState<string>();
  const [env, setEnv] = useState<EnvironmentItem | null>(null);

  const onSetProjectKey = useCallback(
    (newProjectKey: string) => {
      // important: reset env sot that it doesn't trigger requests to the wrong env:
      setEnv(null);
      setProjectKey(newProjectKey);
    },
    [setProjectKey],
  );

  const { loading: loadingProjects, response: projects } = useListProjects();

  const { loading: loadingAccessTokens, response: accessTokens } = useListAccessTokens();

  useEffect(() => {
    if (projects?.items?.length) {
      const projectQueryParam = new URLSearchParams(window.location.search).get('project') || '';
      const queryParamProject = projects.items.find(
        (project) => project.key === projectQueryParam,
      )?.name;

      const defaultProject =
        projects.items.find((project) => project.key === DEFAULT_PROJECT_KEY) ?? projects.items[0];
      setProjectKey(queryParamProject || defaultProject.key);
    }
  }, [projects]);

  const environments = useMemo(() => {
    if (!projectKey || !projects?.items?.length) {
      return null;
    }
    const project = projects.items.find((p) => p.key === projectKey);
    if (!project) {
      return null;
    }
    return project.environments;
  }, [projects, projectKey]);

  useEffect(() => {
    if (environments?.items?.length) {
      const defaultEnv = environments.items[0];

      let queryParamEnv = null;
      const envQueryParam = new URLSearchParams(window.location.search).get('env') || '';
      if (envQueryParam) {
        queryParamEnv = environments.items.find((env) => env.name === envQueryParam);
      }

      setEnv(queryParamEnv || defaultEnv);
    }
  }, [environments]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('project', projectKey || '');
    url.searchParams.set('env', env?.name || '');
    window.history.replaceState({}, '', url.toString());
  }, [projectKey, env]);

  const accessToken = useMemo(() => {
    if (!accessTokens || !apiKey) {
      return null;
    }
    return accessTokens.items.find((token) => apiKey.endsWith(token.token)) ?? null;
  }, [apiKey, accessTokens]);

  const loading = loadingProjects || loadingAccessTokens || !accessToken || !env || !environments;

  return (
    <LaunchDarklyConfigContext.Provider
      value={{
        loading,
        projectKey: projectKey ?? '',
        setProjectKey: onSetProjectKey,
        projects: projects?.items ?? [],
        env: env as EnvironmentItem,
        envs: environments as ListEnvironmentsResponse,
        setEnv,
        accessToken,
      }}
    >
      {loading ? (
        <Center minH="300" justifyContent={'center'}>
          <Spinner />
        </Center>
      ) : (
        children
      )}
    </LaunchDarklyConfigContext.Provider>
  );
};
