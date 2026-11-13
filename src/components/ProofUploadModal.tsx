import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { isStudentPass } from '../utils/passTypes';

export const ProofUploadModal: React.FC = () => {
  const { isProofModalOpen, setProofModalOpen, renewStudentProof, cards, isDarkMode, showNotification } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const studentCard = cards.find((card) => isStudentPass(card.type)) || cards[0];

  if (!isProofModalOpen) return null;

  const handleSimulatePick = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          const sizeMb = Math.max(0.1, file.size / (1024 * 1024)).toFixed(1);
          setSelectedFile(`${file.name} (${sizeMb} MB)`);
        }
      };
      input.click();
      return;
    }
    setSelectedFile('declaracao_matricula_2026.pdf (1.4 MB)');
  };

  const handleConfirmUpload = () => {
    const fileToSubmit = selectedFile || 'declaracao_matricula_2026.pdf (1.4 MB)';
    if (!studentCard) {
      setProofModalOpen(false);
      return;
    }
    renewStudentProof(studentCard.id, fileToSubmit);
    setProofModalOpen(false);
    setSelectedFile(null);
    showNotification(
      'Comprovante Validado',
      'Sua cota mensal e a validade do Passe Estudante foram renovadas com 50% de desconto.',
      'success'
    );
  };

  return (
    <Modal
      visible={isProofModalOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setProofModalOpen(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Renovar Comprovante Escolar</Text>
              <Text style={styles.subtitle}>Validação semestral do benefício de 50%</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setProofModalOpen(false)}
            >
              <MaterialIcons name="close" size={22} color={themeColors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Upload Area */}
          <TouchableOpacity
            style={[styles.uploadBox, selectedFile && styles.uploadBoxSelected]}
            onPress={handleSimulatePick}
          >
            <View style={styles.iconCircle}>
              <MaterialIcons
                name={selectedFile ? 'picture-as-pdf' : 'cloud-upload'}
                size={32}
                color={selectedFile ? themeColors.secondary : themeColors.primary}
              />
            </View>
            <Text style={styles.uploadTitle}>
              {selectedFile ? selectedFile : 'Toque para selecionar o comprovante'}
            </Text>
            <Text style={styles.uploadSub}>
              Formatos aceitos: PDF, JPG ou PNG (Máximo 10 MB)
            </Text>
          </TouchableOpacity>

          <View style={styles.infoTip}>
            <MaterialIcons name="verified" size={16} color={themeColors.secondary} />
            <Text style={styles.infoTipText}>
              Aprovação instantânea para instituições cadastradas na SPTrans / EMTU.
            </Text>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleConfirmUpload}>
            <MaterialIcons name="check" size={20} color="#ffffff" />
            <Text style={styles.submitBtnText}>Enviar para Análise</Text>
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
    backgroundColor: themeColors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
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
    marginBottom: 18,
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
  uploadBox: {
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: themeColors.surfaceContainerHighest,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadBoxSelected: {
    borderColor: themeColors.secondary,
    backgroundColor: themeColors.secondaryContainer + '30',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: themeColors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.onSurface,
    textAlign: 'center',
  },
  uploadSub: {
    fontSize: 11,
    color: themeColors.outline,
    marginTop: 4,
  },
  infoTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: themeColors.surfaceContainerHigh,
    padding: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoTipText: {
    fontSize: 11,
    color: themeColors.onSurface,
    flex: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: themeColors.primaryContainer,
    height: 52,
    borderRadius: 14,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
