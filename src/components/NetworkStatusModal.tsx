import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';

export const NetworkStatusModal: React.FC = () => {
  const { isNetworkModalOpen, setNetworkModalOpen, transitLines, isDarkMode } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  if (!isNetworkModalOpen) return null;

  return (
    <Modal
      visible={isNetworkModalOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setNetworkModalOpen(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Status da Malha de Transporte</Text>
              <Text style={styles.subtitle}>Informações de operação</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setNetworkModalOpen(false)}
            >
              <MaterialIcons name="close" size={22} color={themeColors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {transitLines.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma informação de transporte disponível.</Text>
            ) : transitLines.map((line) => (
              <View key={line.id} style={styles.lineCard}>
                <View style={styles.lineHeader}>
                  <View style={styles.lineLeft}>
                    <View style={[styles.lineDot, { backgroundColor: line.color }]} />
                    <Text style={styles.lineName}>{line.name}</Text>
                  </View>
                  <View style={styles.statusPill}>
                    <MaterialIcons name="check-circle" size={14} color={themeColors.secondary} />
                    <Text style={styles.statusText}>Operação Normal</Text>
                  </View>
                </View>
                <Text style={styles.lineDesc}>{line.description}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.closeModalBtn}
            onPress={() => setNetworkModalOpen(false)}
          >
            <Text style={styles.closeModalBtnText}>Fechar Detalhes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (themeColors: typeof Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(19, 27, 46, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '75%',
    backgroundColor: themeColors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.surfaceContainerHigh,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: themeColors.onSurface,
  },
  subtitle: {
    fontSize: 11,
    color: themeColors.onSurfaceVariant,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingVertical: 12,
  },
  emptyText: {
    paddingVertical: 24,
    fontSize: 13,
    color: themeColors.outline,
    textAlign: 'center',
  },
  lineCard: {
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lineName: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: themeColors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.onSecondaryContainer,
  },
  lineDesc: {
    fontSize: 11,
    color: themeColors.onSurfaceVariant,
    lineHeight: 16,
  },
  closeModalBtn: {
    backgroundColor: themeColors.surfaceContainerHigh,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  closeModalBtnText: {
    color: themeColors.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
});
