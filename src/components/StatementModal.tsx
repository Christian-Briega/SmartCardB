import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';

export const StatementModal: React.FC = () => {
  const { isStatementModalOpen, setStatementModalOpen, transactions, selectedCard, isDarkMode } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);
  const [filter, setFilter] = useState<'all' | 'trip' | 'recharge'>('all');

  if (!isStatementModalOpen) return null;

  const filteredTx = transactions.filter((tx) => {
    if (filter === 'trip') return tx.type === 'trip';
    if (filter === 'recharge') return tx.type === 'recharge' || tx.type === 'transfer_in';
    return true;
  });

  return (
    <Modal
      visible={isStatementModalOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setStatementModalOpen(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Grab Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Extrato de Uso & Recargas</Text>
              <Text style={styles.subtitle}>
                {selectedCard
                  ? `${selectedCard.title} • Saldo atual: R$ ${selectedCard.balance
                      .toFixed(2)
                      .replace('.', ',')}`
                  : 'Nenhum passe selecionado'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setStatementModalOpen(false)}
            >
              <MaterialIcons name="close" size={22} color={themeColors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.pill, filter === 'all' && styles.activePill]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.pillText, filter === 'all' && styles.activePillText]}>
                Todos ({transactions.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, filter === 'trip' && styles.activePill]}
              onPress={() => setFilter('trip')}
            >
              <Text style={[styles.pillText, filter === 'trip' && styles.activePillText]}>
                Viagens
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, filter === 'recharge' && styles.activePill]}
              onPress={() => setFilter('recharge')}
            >
              <Text style={[styles.pillText, filter === 'recharge' && styles.activePillText]}>
                Recargas
              </Text>
            </TouchableOpacity>
          </View>

          {/* Transactions List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {filteredTx.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma movimentação registrada.</Text>
            ) : filteredTx.map((tx) => {
              const isPositive = tx.amount > 0;
              return (
                <View key={tx.id} style={styles.item}>
                  <View
                    style={[
                      styles.iconContainer,
                      isPositive ? styles.iconPositive : styles.iconNegative,
                    ]}
                  >
                    <MaterialIcons
                      name={
                        tx.type === 'trip'
                          ? 'directions-bus'
                          : tx.type === 'recharge'
                          ? 'bolt'
                          : 'swap-horiz'
                      }
                      size={20}
                      color={isPositive ? themeColors.secondary : themeColors.primary}
                    />
                  </View>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{tx.title}</Text>
                    <Text style={styles.itemSubtitle}>{tx.subtitle}</Text>
                    <Text style={styles.itemTime}>
                      {tx.date} às {tx.time}
                    </Text>
                  </View>

                  <View style={styles.itemAmountContainer}>
                    <Text
                      style={[
                        styles.itemAmount,
                        isPositive ? styles.amountPositive : styles.amountNegative,
                      ]}
                    >
                      {isPositive ? '+' : ''}R$ {Math.abs(tx.amount).toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (themeColors: typeof Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(19, 27, 46, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '80%',
    minHeight: 400,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: themeColors.outlineVariant,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  subtitle: {
    fontSize: 12,
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: themeColors.surfaceContainerLow,
  },
  activePill: {
    backgroundColor: themeColors.primaryContainer,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.onSurfaceVariant,
  },
  activePillText: {
    color: '#ffffff',
  },
  list: {
    flex: 1,
  },
  emptyText: {
    paddingVertical: 24,
    fontSize: 13,
    textAlign: 'center',
    color: themeColors.outline,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.surfaceContainerHigh,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconPositive: {
    backgroundColor: themeColors.secondaryContainer,
  },
  iconNegative: {
    backgroundColor: themeColors.surfaceContainerHigh,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.onSurface,
  },
  itemSubtitle: {
    fontSize: 11,
    color: themeColors.onSurfaceVariant,
    marginTop: 1,
  },
  itemTime: {
    fontSize: 10,
    color: themeColors.outline,
    marginTop: 2,
  },
  itemAmountContainer: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  amountPositive: {
    color: themeColors.secondary,
  },
  amountNegative: {
    color: themeColors.onSurface,
  },
});
