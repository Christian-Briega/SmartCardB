import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { PASS_TYPE_OPTIONS, PASS_TYPES } from '../utils/passTypes';

export const PassSelectionScreen: React.FC = () => {
  const { completePassSelection, isDarkMode } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.intro}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="confirmation-number" size={30} color={themeColors.primary} />
        </View>
        <Text style={styles.title}>Escolha seu tipo de passe</Text>
        <Text style={styles.subtitle}>
          Selecione uma opção para continuar. Você poderá vincular outros passes à sua carteira depois.
        </Text>
      </View>

      <View style={styles.options}>
        {PASS_TYPES.map((type) => {
          const option = PASS_TYPE_OPTIONS[type];
          return (
            <TouchableOpacity
              key={type}
              style={styles.optionCard}
              onPress={() => completePassSelection(type)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Selecionar passe ${option.label}`}
            >
              <View style={[styles.optionIcon, { backgroundColor: option.colors[0] }]}>
                <MaterialIcons name={option.icon} size={23} color="#ffffff" />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <MaterialIcons name="arrow-forward-ios" size={16} color={themeColors.outline} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.specialNote}>
        <MaterialIcons name="info-outline" size={18} color={themeColors.tertiary} />
        <Text style={styles.specialNoteText}>
          O Passe Especial é destinado a entidades beneficentes.
        </Text>
      </View>
    </ScrollView>
  );
};

const createStyles = (themeColors: typeof Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.surface,
    },
    content: {
      padding: Spacing.margin,
      paddingBottom: 28,
      maxWidth: 680,
      width: '100%',
      alignSelf: 'center',
    },
    intro: {
      alignItems: 'center',
      marginBottom: 20,
    },
    iconCircle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: themeColors.surfaceContainerHigh,
      marginBottom: 12,
    },
    title: {
      color: themeColors.onSurface,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 6,
    },
    subtitle: {
      color: themeColors.onSurfaceVariant,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      maxWidth: 360,
    },
    options: {
      gap: 10,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor: themeColors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    optionIcon: {
      width: 44,
      height: 44,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionText: {
      flex: 1,
    },
    optionTitle: {
      color: themeColors.onSurface,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 3,
    },
    optionDescription: {
      color: themeColors.onSurfaceVariant,
      fontSize: 11,
      lineHeight: 15,
    },
    specialNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: themeColors.tertiaryFixed,
      marginTop: 16,
    },
    specialNoteText: {
      flex: 1,
      color: themeColors.onTertiaryFixed,
      fontSize: 11,
      lineHeight: 16,
    },
  });
