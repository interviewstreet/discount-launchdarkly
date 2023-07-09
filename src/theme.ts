import { extendTheme } from '@chakra-ui/react';
import { mode, StyleFunctionProps } from '@chakra-ui/theme-tools';
import {  MultiSelectTheme } from 'chakra-multiselect'

export const theme = extendTheme({
  initialColorMode: 'dark',
  useSystemColorMode: false,
  fonts: {
    heading: `Inconsolata, monospace`,
    body: `Inconsolata, monospace`,
  },
  components: {
    MultiSelect: MultiSelectTheme
  },
  styles: {
    global: (props: StyleFunctionProps) => ({
      body: {
        color: mode('gray.800', 'whiteAlpha.900')(props),
        bg: mode('gray.50', 'gray.800')(props),
      },
    }),
  },
});
