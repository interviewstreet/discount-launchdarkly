import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Code,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
} from '@chakra-ui/react';
import lodash from 'lodash';
import { CreateFlagParams } from 'hooks/use-create-flag';

export const FlagCreateModal = ({
  isOpen,
  onCancel,
  onConfirmCreate,
  isCreatingFlag,
}: {
  isCreatingFlag: boolean;
  isOpen: boolean;
  onConfirmCreate: (props: CreateFlagParams) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState<string>('');
  const [key, setKey] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [usingMobileKey, setUsingMobilekey] = useState<boolean>(false);
  const [usingEnvironmentId, setUsingEnvironmentId] = useState<boolean>(false);
  const [isPermament, setIsPermament] = useState<boolean>(false);
  const [kind, setKind] = useState<'boolean' | 'string'>('boolean');
  const [stringVariationsCsv, setStringVariationsCsv] = useState<string>('');
  const [tagsCsv, setTagsCsv] = useState<string>('');

  const variations = useMemo(() => {
    if (kind === 'string') {
      const normalizedStrings = lodash.compact(stringVariationsCsv.split(',').map((s) => s.trim()));
      return normalizedStrings.map((s) => ({ value: s }));
    }
    return [{ value: true }, { value: false }];
  }, [kind, stringVariationsCsv]);

  const tags = useMemo(() => {
    const normalizedTags = tagsCsv.split(',').map((tag) => tag.trim());
    return lodash.compact(normalizedTags);
  }, [tagsCsv]);

  const canConfirm = useMemo(() => {
    const hasName = (name ?? '').trim().length > 0;
    const hasKey = (key ?? '').trim().length > 0;
    const hasSufficientVariations = variations.length >= 2;
    const hasDescription = (description ?? '').trim().length > 0;
    return hasName && hasKey && hasSufficientVariations && hasDescription && tags.length !== 0;
  }, [name, key, variations, description, tags]);

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create a new feature flag</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box marginTop="3">
            <FormControl isRequired>
              <FormLabel>Name</FormLabel>
              <Input
                placeholder="Flag name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                isRequired
              />
            </FormControl>
          </Box>
          <Box marginTop="3">
            <FormControl isRequired>
              <FormLabel>Key</FormLabel>
              <Input
                placeholder="Flag key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                isRequired
              />
            </FormControl>
          </Box>
          <Box marginTop="3">
            <FormControl isRequired>
              <FormLabel>Description</FormLabel>
              <Input
                placeholder="Flag description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormControl>
          </Box>
          <Box marginTop="3">
            <FormControl isRequired>
              <FormLabel>Tags</FormLabel>
              <Input
                placeholder="Enter flag type, team name and quarter here as comma separated values"
                value={tagsCsv}
                onChange={(e) => setTagsCsv(e.target.value)}
              />
            </FormControl>
          </Box>
          <Box marginTop="5">
            <FormLabel>
              <b>Client-side SDK availability.</b> Control which client-side SDKs can use this flag.
            </FormLabel>
            <Stack spacing={5} direction="row">
              <Checkbox
                isChecked={usingMobileKey}
                onChange={(e) => setUsingMobilekey(e.target.checked)}
              >
                Mobile (React Native)
              </Checkbox>
              <Checkbox
                isChecked={usingEnvironmentId}
                onChange={(e) => setUsingEnvironmentId(e.target.checked)}
              >
                Web Browser
              </Checkbox>
            </Stack>
          </Box>
          <Box marginTop="5">
            <FormLabel>
              <b>Flag variations</b>
            </FormLabel>
            <Select variant="outline" value={kind} onChange={(e) => setKind(e.target.value as any)}>
              <option value="boolean">Boolean</option>
              <option value="string">String</option>
              {/* add other options eventually: number / JSON */}
            </Select>
            <Box marginTop="3">
              {kind === 'string' ? (
                <>
                  <FormLabel>
                    <p>Enter a comma-separated list of 2+ variations.</p>
                    <p>
                      The default <b>ON</b> variation will be the first string, and the default{' '}
                      <b>OFF</b> variation will be the second string.
                    </p>
                  </FormLabel>
                  <Input
                    placeholder="comma,separated,variations"
                    value={stringVariationsCsv}
                    onChange={(e) => setStringVariationsCsv(e.target.value)}
                  />
                </>
              ) : (
                <FormLabel>
                  The default <b>ON</b> variation will be the <Code>true</Code>, and the default{' '}
                  <b>OFF</b> variation <Code>false</Code>.
                </FormLabel>
              )}
            </Box>
          </Box>
          <Box marginTop="5">
            <Checkbox isChecked={isPermament} onChange={(e) => setIsPermament(e.target.checked)}>
              This is a permanent flag
            </Checkbox>
          </Box>
        </ModalBody>
        <ModalFooter>
          <Button disabled={isCreatingFlag} colorScheme="gray" mr={3} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            colorScheme="gray"
            disabled={!canConfirm || isCreatingFlag}
            isLoading={isCreatingFlag}
            onClick={() =>
              onConfirmCreate({
                name,
                key,
                description,
                clientSideAvailability: {
                  usingEnvironmentId,
                  usingMobileKey,
                },
                variations,
                defaults: {
                  onVariation: 0,
                  offVariation: 1,
                },
                tags,
                temporary: !isPermament,
              })
            }
          >
            Create flag
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
