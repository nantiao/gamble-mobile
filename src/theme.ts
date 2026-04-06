import { StyleSheet } from 'react-native';

export const colors = {
  indigo50: '#eef2ff',
  indigo100: '#e0e7ff',
  indigo200: '#c7d2fe',
  indigo600: '#4f46e5',
  indigo700: '#4338ca',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray900: '#111827',
  white: '#ffffff',
  red50: '#fef2f2',
  red100: '#fee2e2',
  red500: '#ef4444',
  red600: '#dc2626',
  green50: '#ecfdf5',
  green600: '#059669',
  green700: '#047857',
  blackOverlay: 'rgba(0,0,0,0.4)',
};

export const layout = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  maxContent: {
    maxWidth: 448,
    width: '100%',
    alignSelf: 'center',
  },
});
