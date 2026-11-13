// Theme and design tokens for SmartCard BUS
// Based on DESIGN.md specification

export const Colors = {
  primary: '#003ec8',
  primaryContainer: '#0d53fc',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#e0e3ff',
  primaryFixed: '#dde1ff',
  primaryFixedDim: '#b7c4ff',
  onPrimaryFixed: '#001452',
  onPrimaryFixedVariant: '#0038b7',

  secondary: '#006c4a',
  secondaryContainer: '#82f5c1',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#00714e',
  secondaryFixed: '#85f8c4',
  secondaryFixedDim: '#68dba9',
  onSecondaryFixed: '#002114',
  onSecondaryFixedVariant: '#005137',

  tertiary: '#6f4500',
  tertiaryContainer: '#905a00',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#ffdfbe',
  tertiaryFixed: '#ffddb8',
  tertiaryFixedDim: '#ffb95f',
  onTertiaryFixed: '#2a1700',
  onTertiaryFixedVariant: '#653e00',

  surface: '#faf8ff',
  surfaceDim: '#d2d9f4',
  surfaceBright: '#faf8ff',
  surfaceVariant: '#dae2fd',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f3ff',
  surfaceContainer: '#eaedff',
  surfaceContainerHigh: '#e2e7ff',
  surfaceContainerHighest: '#dae2fd',

  onSurface: '#131b2e',
  onSurfaceVariant: '#434656',
  inverseSurface: '#283044',
  inverseOnSurface: '#eef0ff',
  surfaceTint: '#004bee',

  outline: '#737688',
  outlineVariant: '#c3c5d9',

  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',
};

export const DarkColors = {
  primary: '#0d53fc',
  primaryContainer: '#003ec8',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#dbe5ff',
  primaryFixed: '#dde1ff',
  primaryFixedDim: '#b7c4ff',
  onPrimaryFixed: '#001452',
  onPrimaryFixedVariant: '#c4d0ff',

  secondary: '#65d5a6',
  secondaryContainer: '#174a38',
  onSecondary: '#062014',
  onSecondaryContainer: '#b2f2d2',
  secondaryFixed: '#85f8c4',
  secondaryFixedDim: '#68dba9',
  onSecondaryFixed: '#002114',
  onSecondaryFixedVariant: '#b2f2d2',

  tertiary: '#e9b968',
  tertiaryContainer: '#5b421d',
  onTertiary: '#2a1700',
  onTertiaryContainer: '#ffe2b7',
  tertiaryFixed: '#44351e',
  tertiaryFixedDim: '#e2ae5d',
  onTertiaryFixed: '#fff0d4',
  onTertiaryFixedVariant: '#e7be80',

  surface: '#11151d',
  surfaceDim: '#0c1017',
  surfaceBright: '#303744',
  surfaceVariant: '#272e3a',
  surfaceContainerLowest: '#171c25',
  surfaceContainerLow: '#1b222d',
  surfaceContainer: '#202834',
  surfaceContainerHigh: '#293342',
  surfaceContainerHighest: '#343f50',

  onSurface: '#f0f2f7',
  onSurfaceVariant: '#c1c8d4',
  inverseSurface: '#e2e6ee',
  inverseOnSurface: '#222832',
  surfaceTint: '#83aaff',

  outline: '#9ca8bb',
  outlineVariant: '#4a5567',

  error: '#ffb4ab',
  errorContainer: '#93000a',
  onError: '#690005',
  onErrorContainer: '#ffdad6',
} satisfies typeof Colors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  margin: 16,
};

export const Radii = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  pill: 9999,
};
