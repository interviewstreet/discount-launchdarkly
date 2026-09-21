import { useLaunchDarklyApi } from 'hooks/use-launchdarkly-api';
import { useLaunchDarklyConfig } from 'hooks/use-launchdarkly-config';
import { FlagItem } from 'hooks/use-list-flags';
import { useCallback, useMemo, useState } from 'react';

// https://apidocs.launchdarkly.com/tag/Feature-flags#operation/patchFeatureFlag

interface OnToggleFlagTargetingInterface {
  instruction: 'turnFlagOff' | 'turnFlagOn';
  comment: string;
}

export interface OnUpdateFlagGlobalsInterface {
  name: string;
  description: string;
  usingMobileKey: boolean;
  usingEnvironmentId: boolean;
  comment: string;
}

interface OnSetFlagArchivedInterface {
  value: boolean;
  comment: string;
}

export interface OnUpdateFlagDefaultRulesInterface {
  fallthroughVariationId: string | null;
  offVariationId: string;
  comment: string;
}

export interface OnUpdateFlagIndividualTargetsInterface {
  addUserTargets: Array<{ variationId: string; values: Array<string> }>;
  removeUserTargets: Array<{ variationId: string; values: Array<string> }>;
  comment: string;
}

interface UseUpdateFlagAPI {
  isUpdatingFlag: boolean;
  onToggleFlagTargeting: (props: OnToggleFlagTargetingInterface) => Promise<FlagItem | null>;
  onUpdateFlagGlobals: (props: OnUpdateFlagGlobalsInterface) => Promise<FlagItem | null>;
  onSetFlagArchived: (props: OnSetFlagArchivedInterface) => Promise<FlagItem | null>;
  onUpdateFlagDefaultRules: (props: OnUpdateFlagDefaultRulesInterface) => Promise<FlagItem | null>;
  onUpdateFlagIndividualTargets: (
    props: OnUpdateFlagIndividualTargetsInterface,
  ) => Promise<FlagItem | null>;
}

export const useUpdateFlag = ({ flagKey }: { flagKey: string }): UseUpdateFlagAPI => {
  const [isUpdatingFlag, setIsUpdatingFlag] = useState<boolean>(false);
  const { launchDarklyApi } = useLaunchDarklyApi();
  const { projectKey, env } = useLaunchDarklyConfig();
  const canUpdate = useMemo(() => {
    return !!env && !!projectKey;
  }, [env, projectKey]);

  const onToggleFlagTargeting = useCallback(
    async ({ instruction, comment }: OnToggleFlagTargetingInterface) => {
      if (!canUpdate) {
        return Promise.resolve(null);
      }
      setIsUpdatingFlag(true);
      try {
        const response = await launchDarklyApi.semanticPatchFlag({
          projectKey,
          flagKey,
          environmentKey: env.key,
          instructions: [{ kind: instruction }],
          comment,
        });
        return response;
      } finally {
        setIsUpdatingFlag(false);
      }
    },
    [canUpdate, env],
  );

  const onUpdateFlagGlobals = useCallback(
    async ({
      name,
      description,
      usingMobileKey,
      usingEnvironmentId,
    }: OnUpdateFlagGlobalsInterface) => {
      if (!canUpdate) {
        return Promise.resolve(null);
      }
      setIsUpdatingFlag(true);
      try {
        const response = await launchDarklyApi.patchFlag({
          projectKey,
          flagKey,
          comment: 'Updating name / description',
          operations: [
            { op: 'replace', path: '/name', value: name },
            { op: 'replace', path: '/description', value: description },
            {
              op: 'replace',
              path: '/clientSideAvailability/usingMobileKey',
              value: usingMobileKey,
            },
            {
              op: 'replace',
              path: '/clientSideAvailability/usingEnvironmentId',
              value: usingEnvironmentId,
            },
          ],
        });
        return response;
      } finally {
        setIsUpdatingFlag(false);
      }
    },
    [canUpdate, env],
  );

  const onSetFlagArchived = useCallback(
    async ({ value, comment }: OnSetFlagArchivedInterface) => {
      if (!canUpdate) {
        return Promise.resolve(null);
      }
      setIsUpdatingFlag(true);
      try {
        const response = await launchDarklyApi.patchFlag({
          projectKey,
          flagKey,
          comment,
          operations: [{ op: 'replace', path: '/archived', value }],
        });
        return response;
      } finally {
        setIsUpdatingFlag(false);
      }
    },
    [canUpdate, env],
  );

  const onUpdateFlagDefaultRules = useCallback(
    async ({
      fallthroughVariationId,
      offVariationId,
      comment,
    }: OnUpdateFlagDefaultRulesInterface) => {
      if (!canUpdate) {
        return Promise.resolve(null);
      }
      setIsUpdatingFlag(true);
      const instructions = [
        {
          kind: 'updateOffVariation',
          variationId: offVariationId,
        },
      ];
      // Some existing flags use rollouts, which are different type of update:
      if (fallthroughVariationId) {
        instructions.push({
          kind: 'updateFallthroughVariationOrRollout',
          variationId: fallthroughVariationId,
        });
      }

      try {
        const response = await launchDarklyApi.semanticPatchFlag({
          projectKey,
          flagKey,
          environmentKey: env.key,
          ignoreConflicts: true,
          instructions,
          comment,
        });
        return response;
      } finally {
        setIsUpdatingFlag(false);
      }
    },
    [canUpdate, env],
  );

  // {"comment":"","environmentKey":"development","instructions":[{"kind":"addUserTargets","values":["user-gee"],"variationId":"57a40920-e071-49db-88d1-9b7c73190c0d"},{"kind":"addUserTargets","values":["user-gee2"],"variationId":"7d80718b-1252-4fdb-bd54-d2dec134493c"}]}
  // {"comment":"","environmentKey":"development","instructions":[{"kind":"removeUserTargets","values":["user-pedro"],"variationId":"57a40920-e071-49db-88d1-9b7c73190c0d"}]}

  const onUpdateFlagIndividualTargets = useCallback(
    async ({
      addUserTargets,
      removeUserTargets,
      comment,
    }: OnUpdateFlagIndividualTargetsInterface) => {
      if (!canUpdate) {
        return Promise.resolve(null);
      }
      const instructions: Array<Record<string, any>> = [];
      addUserTargets.forEach((addUser) => {
        instructions.push({
          kind: 'addUserTargets',
          values: addUser.values,
          variationId: addUser.variationId,
        });
      });
      removeUserTargets.forEach((removeUser) => {
        instructions.push({
          kind: 'removeUserTargets',
          values: removeUser.values,
          variationId: removeUser.variationId,
        });
      });
      if (!instructions.length) {
        return Promise.resolve(null);
      }

      setIsUpdatingFlag(true);
      try {
        const response = await launchDarklyApi.semanticPatchFlag({
          projectKey,
          flagKey,
          environmentKey: env.key,
          ignoreConflicts: true,
          instructions,
          comment,
        });
        return response;
      } finally {
        setIsUpdatingFlag(false);
      }
    },
    [canUpdate, env],
  );

  return {
    isUpdatingFlag,
    onToggleFlagTargeting,
    onUpdateFlagGlobals,
    onSetFlagArchived,
    onUpdateFlagDefaultRules,
    onUpdateFlagIndividualTargets,
  };
};
