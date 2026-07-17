/**
 * Primitives stylables par className (NativeWind v5 / react-native-css).
 * Le polyfill global étant désactivé (metro.config.js), tout composant
 * acceptant `className` doit passer par ces wrappers — les écrans importent
 * depuis `@/tw`, pas depuis react-native directement.
 */
import React from 'react';
import { Link as RouterLink } from 'expo-router';
import {
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
} from 'react-native';
import { useCssElement, useNativeVariable } from 'react-native-css';

type WithClassName<C extends React.ElementType> = React.ComponentProps<C> & {
  className?: string;
};

/**
 * Contournement TS2590 (TS 6) : l'union des props de certains composants RN
 * (style/children fonctions d'état, props du router) croisée avec les génériques
 * de useCssElement dépasse la limite de complexité du compilateur. On aplatit le
 * type du composant pour l'appel interne au strict nécessaire du mapping
 * (style, contentContainerStyle) ; l'API publique reste typée par WithClassName.
 */
type StyleTarget = React.ComponentType<{
  style?: unknown;
  contentContainerStyle?: unknown;
}>;

export const View = (props: WithClassName<typeof RNView>) => {
  return useCssElement(RNView, props, { className: 'style' });
};
View.displayName = 'CSS(View)';

export const Text = (props: WithClassName<typeof RNText>) => {
  return useCssElement(RNText, props, { className: 'style' });
};
Text.displayName = 'CSS(Text)';

export const Pressable = (props: WithClassName<typeof RNPressable>) => {
  return useCssElement(RNPressable as StyleTarget, props, { className: 'style' });
};
Pressable.displayName = 'CSS(Pressable)';

export const TextInput = (props: WithClassName<typeof RNTextInput>) => {
  return useCssElement(RNTextInput, props, { className: 'style' });
};
TextInput.displayName = 'CSS(TextInput)';

export const ScrollView = (
  props: WithClassName<typeof RNScrollView> & { contentContainerClassName?: string },
) => {
  return useCssElement(RNScrollView as StyleTarget, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  });
};
ScrollView.displayName = 'CSS(ScrollView)';

export const Link = (props: WithClassName<typeof RouterLink>) => {
  return useCssElement(RouterLink as unknown as StyleTarget, props, { className: 'style' });
};

/** Lit une variable CSS du thème côté natif (ex: useCSSVariable('--color-accent')). */
export const useCSSVariable =
  process.env.EXPO_OS !== 'web' ? useNativeVariable : (variable: string) => `var(${variable})`;
