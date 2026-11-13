import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  isDarkMode?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Componente de Skeleton Loading com animação de pulso suave (Protocolo Anti-Gravidade).
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 10,
  isDarkMode = false,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0',
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

export const HomeCardSkeleton: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = false }) => {
  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDarkMode ? '#111827' : '#F1F5F9',
          borderColor: isDarkMode ? '#1E293B' : '#E2E8F0',
        },
      ]}
    >
      <View style={styles.rowBetween}>
        <SkeletonLoader width={140} height={22} borderRadius={8} isDarkMode={isDarkMode} />
        <SkeletonLoader width={84} height={24} borderRadius={12} isDarkMode={isDarkMode} />
      </View>
      <View style={{ marginVertical: 20, gap: 10 }}>
        <SkeletonLoader width={110} height={14} borderRadius={6} isDarkMode={isDarkMode} />
        <SkeletonLoader width={180} height={38} borderRadius={10} isDarkMode={isDarkMode} />
      </View>
      <View style={styles.rowBetween}>
        <SkeletonLoader width={130} height={18} borderRadius={6} isDarkMode={isDarkMode} />
        <SkeletonLoader width={110} height={36} borderRadius={10} isDarkMode={isDarkMode} />
      </View>
    </View>
  );
};

export const TransactionSkeleton: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = false }) => {
  return (
    <View style={styles.txList}>
      {[1, 2, 3].map((idx) => (
        <View
          key={idx}
          style={[
            styles.txRow,
            {
              backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
              borderColor: isDarkMode ? '#1E293B' : '#E2E8F0',
            },
          ]}
        >
          <SkeletonLoader width={42} height={42} borderRadius={12} isDarkMode={isDarkMode} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonLoader width="65%" height={15} borderRadius={6} isDarkMode={isDarkMode} />
            <SkeletonLoader width="40%" height={12} borderRadius={6} isDarkMode={isDarkMode} />
          </View>
          <SkeletonLoader width={68} height={18} borderRadius={6} isDarkMode={isDarkMode} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  cardContainer: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    minHeight: 215,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txList: {
    gap: 10,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
});
