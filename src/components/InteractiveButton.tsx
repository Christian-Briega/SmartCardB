import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  ViewStyle,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface InteractiveButtonProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'tab' | 'none';
}

export const InteractiveButton: React.FC<InteractiveButtonProps> = ({
  children,
  onPress,
  style,
  scaleTo = 0.96,
  disabled = false,
  accessibilityLabel,
  accessibilityRole = 'button',
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 35,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 6,
    }).start();
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={[
        styles.pressable,
        style,
        { transform: [{ scale: scaleAnim }] },
        { cursor: disabled ? 'default' : 'pointer', outlineStyle: 'none' } as any,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    justifyContent: 'center',
  },
});
