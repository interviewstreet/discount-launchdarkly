import React, { useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Center, Spinner } from '@chakra-ui/react';
import { EnvironmentItem, ListEnvironmentsResponse } from 'hooks/use-list-environments';
import { LaunchDarklyConfigContext } from './launchdarkly-config.context';
import { useCurrentAccessToken } from 'hooks/use-current-access-token';
import { DEFAULT_PROJECT_KEY } from './constants';
import { useListProjects } from 'hooks/use-list-projects';

interface LaunchDarklyConfigProviderProps {
  children: ReactNode;
}
export const LaunchDarklyConfigProvider = ({ children }: LaunchDarklyConfigProviderProps) => {
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

  const { loading: loadingAccessToken, response: accessToken } = useCurrentAccessToken();

  useEffect(() => {
    if (projects?.items?.length) {
      const defaultProject =
        projects.items.find((project) => project.key === DEFAULT_PROJECT_KEY) ?? projects.items[0];
      setProjectKey(defaultProject.key);
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
      setEnv(environments.items[0]);
    }
  }, [environments]);

  const loading = loadingProjects || loadingAccessToken || !env || !environments;

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
