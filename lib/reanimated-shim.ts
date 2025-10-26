// Lightweight shim that tries to require 'react-native-reanimated' at runtime.
// If not available or if running in Expo Go where native worklets mismatch,
// exports safe no-op fallbacks for the most common APIs used in the app.

type AnyModule = any;

const noop = () => null;

// Static requires so Metro can statically analyze dependencies
let reanimated: AnyModule | null = null;
try {
  // eslint-disable-next-line global-require
  reanimated = require('react-native-reanimated');
} catch (e) {
  reanimated = null;
}

// static require for react-native
const ReactNative = require('react-native');

// Shim default Animated-like object
const ShimDefault = {
  View: ReactNative.View,
  Text: ReactNative.Text,
};

const defaultExport = reanimated ? (reanimated.default || reanimated) : ShimDefault;
const FadeInExport = reanimated && reanimated.FadeIn ? reanimated.FadeIn : (noop as any);
const FadeOutExport = reanimated && reanimated.FadeOut ? reanimated.FadeOut : (noop as any);
const useSharedValueExport = reanimated && reanimated.useSharedValue ? reanimated.useSharedValue : (() => ({ value: 0 }));
const withTimingExport = reanimated && reanimated.withTiming ? reanimated.withTiming : ((v: any) => v);

export default defaultExport as any;
export const FadeIn = FadeInExport as any;
export const FadeOut = FadeOutExport as any;
export const useSharedValue = useSharedValueExport as any;
export const withTiming = withTimingExport as any;
