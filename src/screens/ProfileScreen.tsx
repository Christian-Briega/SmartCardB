import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  PanResponder,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';

export const ProfileScreen: React.FC = () => {
  const {
    user,
    updateUser,
    logout,
    setCurrentScreen,
    setStatementModalOpen,
    showConfirmDialog,
    showNotification,
    isDarkMode,
  } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);
  const [showAvatarActions, setShowAvatarActions] = useState(false);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [cropImageSize, setCropImageSize] = useState({ width: 0, height: 0 });
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [isCropDragging, setIsCropDragging] = useState(false);
  const cropOffsetRef = React.useRef({ x: 0, y: 0 });
  const cropStartRef = React.useRef({ x: 0, y: 0 });
  const showNotificationRef = React.useRef(showNotification);
  showNotificationRef.current = showNotification;
  const cropSize = 220;
  const baseCropScale = cropImageSize.width && cropImageSize.height
    ? Math.max(cropSize / cropImageSize.width, cropSize / cropImageSize.height)
    : 1;
  const cropScale = baseCropScale * cropZoom;
  const renderedImageSize = {
    width: cropImageSize.width * cropScale,
    height: cropImageSize.height * cropScale,
  };
  const cropPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          cropStartRef.current = cropOffsetRef.current;
          setIsCropDragging(true);
        },
        onPanResponderMove: (_event, gesture) => {
          const minX = Math.min(0, cropSize - renderedImageSize.width);
          const minY = Math.min(0, cropSize - renderedImageSize.height);
          const nextOffset = {
            x: Math.max(minX, Math.min(0, cropStartRef.current.x + gesture.dx)),
            y: Math.max(minY, Math.min(0, cropStartRef.current.y + gesture.dy)),
          };
          cropOffsetRef.current = nextOffset;
          setCropOffset(nextOffset);
        },
        onPanResponderRelease: () => setIsCropDragging(false),
        onPanResponderTerminate: () => setIsCropDragging(false),
      }),
    [renderedImageSize.height, renderedImageSize.width]
  );

  const handleCropZoom = (zoomDelta: number) => {
    const nextZoom = Math.max(1, Math.min(3, cropZoom + zoomDelta));
    if (nextZoom === cropZoom || !cropImageSize.width || !cropImageSize.height) return;

    const nextScale = baseCropScale * nextZoom;
    const imagePointX = (cropSize / 2 - cropOffset.x) / cropScale;
    const imagePointY = (cropSize / 2 - cropOffset.y) / cropScale;
    const minX = Math.min(0, cropSize - cropImageSize.width * nextScale);
    const minY = Math.min(0, cropSize - cropImageSize.height * nextScale);
    const nextOffset = {
      x: Math.max(minX, Math.min(0, cropSize / 2 - imagePointX * nextScale)),
      y: Math.max(minY, Math.min(0, cropSize / 2 - imagePointY * nextScale)),
    };

    cropOffsetRef.current = nextOffset;
    setCropOffset(nextOffset);
    setCropZoom(nextZoom);
  };

  React.useEffect(() => {
    if (!pendingAvatarUri) return;
    setCropZoom(1);
    Image.getSize(
      pendingAvatarUri,
      (width, height) => {
        setCropImageSize({ width, height });
        const scale = Math.max(cropSize / width, cropSize / height);
        const centeredOffset = {
          x: (cropSize - width * scale) / 2,
          y: (cropSize - height * scale) / 2,
        };
        cropOffsetRef.current = centeredOffset;
        setCropOffset(centeredOffset);
      },
      () => {
        setPendingAvatarUri(null);
        showNotificationRef.current(
          'Erro ao carregar imagem',
          'Não foi possível abrir esta foto.',
          'error'
        );
      }
    );
  }, [pendingAvatarUri]);

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const cropFrame = document.getElementById('profile-avatar-crop-frame');
    if (cropFrame) {
      cropFrame.style.cursor = isCropDragging ? 'grabbing' : 'grab';
    }
  }, [isCropDragging, pendingAvatarUri]);

  const handleChangeAvatar = async () => {
    if (Platform.OS !== 'web') {
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showNotification(
            'Permissão necessária',
            'Permita o acesso às fotos para escolher uma imagem de perfil.',
            'warning'
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (result.canceled) return;

        const imageUri = result.assets[0]?.uri;
        if (!imageUri) {
          showNotification('Erro ao carregar imagem', 'Não foi possível abrir esta foto.', 'error');
          return;
        }

        updateUser({ avatarUri: imageUri });
        showNotification('Foto atualizada', 'Sua foto de perfil foi alterada.', 'success');
      } catch {
        showNotification('Erro ao carregar imagem', 'Não foi possível abrir esta foto.', 'error');
      }
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showNotification('Arquivo inválido', 'Selecione um arquivo de imagem.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          showNotification('Erro ao carregar imagem', 'Não foi possível abrir esta foto.', 'error');
          return;
        }
        setPendingAvatarUri(reader.result);
      };
      reader.onerror = () => {
        showNotification('Erro ao carregar imagem', 'Não foi possível abrir esta foto.', 'error');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleSaveCroppedAvatar = () => {
    if (!pendingAvatarUri || !cropImageSize.width || !cropImageSize.height) return;
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const sourceX = -cropOffset.x / cropScale;
      const sourceY = -cropOffset.y / cropScale;
      const sourceSize = cropSize / cropScale;
      const context = canvas.getContext('2d');
      if (!context) {
        showNotification('Erro ao salvar imagem', 'Não foi possível ajustar esta foto.', 'error');
        return;
      }
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        canvas.width,
        canvas.height
      );
      updateUser({ avatarUri: canvas.toDataURL('image/jpeg', 0.85) });
      setPendingAvatarUri(null);
      setShowAvatarActions(false);
      showNotification('Foto atualizada', 'Sua foto de perfil foi alterada.', 'success');
    };
    image.onerror = () => {
      showNotification('Erro ao carregar imagem', 'Não foi possível abrir esta foto.', 'error');
    };
    image.src = pendingAvatarUri;
  };

  const handleDeleteAvatar = () => {
    showConfirmDialog({
      title: 'Remover foto de perfil',
      message: 'Deseja remover sua foto de perfil?',
      confirmText: 'Remover foto',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: () => {
        updateUser({ avatarUri: undefined });
        setShowAvatarActions(false);
        showNotification('Foto removida', 'Sua foto de perfil foi removida.', 'success');
      },
    });
  };

  const handleLogout = () => {
    showConfirmDialog({
      title: 'Sair da Conta',
      message: 'Deseja realmente desconectar sua conta SmartCard BUS deste dispositivo?',
      confirmText: 'Sair da Conta',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: () => {
        logout();
      },
    });
  };

  const displayName = user.name || 'Nome não informado';
  const displayCpf = user.cpf || 'Não informado';
  const displayEmail = user.email || 'Não informado';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentFrame}>
      {/* User Hero Card */}
      <View style={styles.profileCard}>
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={() => setShowAvatarActions((visible) => !visible)}
          accessibilityRole="button"
          accessibilityLabel="Opções da foto de perfil"
          accessibilityState={{ expanded: showAvatarActions }}
        >
          {user.avatarUri ? (
            <ExpoImage
              source={{ uri: user.avatarUri }}
              style={styles.avatarImage}
              transition={200}
              contentFit="cover"
              cachePolicy="disk"
            />
          ) : (
            <MaterialIcons name="person" size={40} color={themeColors.primary} />
          )}
        </TouchableOpacity>
        {showAvatarActions && (
          <View style={styles.avatarActions}>
            <TouchableOpacity
              style={[styles.avatarActionButton, styles.changeAvatarButton]}
              onPress={handleChangeAvatar}
              accessibilityRole="button"
              accessibilityLabel="Alterar foto de perfil"
            >
              <MaterialIcons name="edit" size={18} color="#ffffff" />
              <Text style={styles.avatarActionText}>Alterar foto</Text>
            </TouchableOpacity>
            {user.avatarUri && (
              <TouchableOpacity
                style={[styles.avatarActionButton, styles.deleteAvatarButton]}
                onPress={handleDeleteAvatar}
                accessibilityRole="button"
                accessibilityLabel="Excluir foto de perfil"
              >
                <MaterialIcons name="delete-outline" size={18} color="#ffffff" />
                <Text style={styles.avatarActionText}>Excluir foto</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userCpf}>CPF: {displayCpf}</Text>

        <View style={styles.userContactPill}>
          <MaterialIcons name="mail-outline" size={14} color={themeColors.primary} />
          <Text style={styles.userContactText}>{displayEmail}</Text>
        </View>
      </View>

      {/* User Access & Credential Level Badge */}
      <View style={styles.accessCard}>
        <View style={styles.accessHeader}>
          <MaterialIcons name="admin-panel-settings" size={20} color={themeColors.primary} />
          <Text style={styles.accessHeaderTitle}>Nível de Acesso & Identidade</Text>
        </View>

        <View style={styles.accessGrid}>
          <View style={styles.accessItem}>
            <Text style={styles.accessItemLabel}>PERFIL DE TRANSPORTE</Text>
            <View style={styles.accessItemRow}>
              <MaterialIcons name="badge" size={15} color="#00BA88" />
              <Text style={styles.accessItemValue}>
                {user.role === 'admin'
                  ? 'Administrador'
                  : user.role === 'operator'
                    ? 'Fiscal de Catraca'
                    : 'Passageiro Registrado'}
              </Text>
            </View>
          </View>

          <View style={styles.accessItem}>
            <Text style={styles.accessItemLabel}>VERIFICAÇÃO KYC</Text>
            <View style={styles.accessItemRow}>
              <MaterialIcons name="verified-user" size={15} color="#00BA88" />
              <Text style={[styles.accessItemValue, { color: '#00BA88' }]}>
                {user.kycStatus === 'verified' ? 'Identidade Verificada' : 'Pendente de Documento'}
              </Text>
            </View>
          </View>

          <View style={styles.accessItem}>
            <Text style={styles.accessItemLabel}>PROTEÇÃO DE SESSÃO</Text>
            <View style={styles.accessItemRow}>
              <MaterialIcons name="lock" size={15} color={themeColors.primary} />
              <Text style={styles.accessItemValue}>Sessão Autenticada • Proteção Ativa</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Access & Security Section */}
      <Text style={styles.sectionHeader}>DADOS DE ACESSO & SEGURANÇA</Text>
      <View style={styles.menuGroup}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setCurrentScreen('security')}
        >
          <View style={[styles.menuIconBox, { backgroundColor: themeColors.surfaceContainerHigh }]}>
            <MaterialIcons name="shield" size={20} color={themeColors.primary} />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuTitle}>Segurança da Conta & Senha</Text>
            <Text style={styles.menuSubtitle}>Alterar senha e gerenciar 2FA</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={themeColors.outline} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setCurrentScreen('biometricsEnroll')}
        >
          <View style={[styles.menuIconBox, { backgroundColor: themeColors.secondaryContainer }]}>
            <MaterialIcons name="fingerprint" size={20} color={themeColors.secondary} />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuTitle}>Biometria & Face ID</Text>
            <Text style={styles.menuSubtitle}>
              {user.biometricsEnabled ? 'Ativado para login e catraca' : 'Desativado'}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={themeColors.outline} />
        </TouchableOpacity>
      </View>

      {/* Transit Preferences Section */}
      <Text style={styles.sectionHeader}>TRANSPORTE & COMPROVANTES</Text>
      <View style={styles.menuGroup}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setStatementModalOpen(true)}
        >
          <View style={[styles.menuIconBox, { backgroundColor: themeColors.surfaceContainerHigh }]}>
            <MaterialIcons name="receipt-long" size={20} color={themeColors.onSurfaceVariant} />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuTitle}>Extrato de Uso & Comprovantes</Text>
            <Text style={styles.menuSubtitle}>Histórico fiscal de viagens e recargas</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={themeColors.outline} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setCurrentScreen('help')}
        >
          <View style={[styles.menuIconBox, { backgroundColor: themeColors.surfaceContainerHigh }]}>
            <MaterialIcons name="help-outline" size={20} color={themeColors.primary} />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuTitle}>Central de Ajuda ao Passageiro</Text>
            <Text style={styles.menuSubtitle}>Dúvidas sobre saldo, catraca e SPTrans</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={themeColors.outline} />
        </TouchableOpacity>
      </View>

      {/* Configurações Section (Modo Escuro & Contas Conectadas) */}
      <Text style={styles.sectionHeader}>CONFIGURAÇÕES</Text>
      <View style={styles.menuGroup}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setCurrentScreen('settings')}
        >
          <View style={[styles.menuIconBox, { backgroundColor: themeColors.surfaceContainerHigh }]}>
            <MaterialIcons name="settings" size={20} color={themeColors.primary} />
          </View>
          <View style={styles.menuTextBox}>
            <Text style={styles.menuTitle}>Configurações do Aplicativo</Text>
            <Text style={styles.menuSubtitle}>
              Modo escuro, contas Google / Apple e preferências
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={themeColors.outline} />
        </TouchableOpacity>
      </View>

      {/* Logout Action (Guaranteed to work on Web & Mobile) */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <MaterialIcons name="logout" size={20} color={themeColors.error} />
        <Text style={styles.logoutBtnText}>Sair da Conta</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>SmartCard BUS • Versão 2.4.0 (Build 88)</Text>
      <View style={{ height: 32 }} />
      </View>

      <Modal
        visible={!!pendingAvatarUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingAvatarUri(null)}
      >
        <View style={styles.cropOverlay}>
          <View style={styles.cropDialog}>
            <Text style={styles.cropTitle}>Ajustar foto de perfil</Text>
            <Text style={styles.cropDescription}>Arraste a imagem para escolher o enquadramento.</Text>
            <View
              nativeID="profile-avatar-crop-frame"
              style={styles.cropFrame}
              {...cropPanResponder.panHandlers}
            >
              {pendingAvatarUri && cropImageSize.width > 0 && (
                <Image
                  source={{ uri: pendingAvatarUri }}
                  style={[
                    styles.cropImage,
                    {
                      width: renderedImageSize.width,
                      height: renderedImageSize.height,
                      transform: [{ translateX: cropOffset.x }, { translateY: cropOffset.y }],
                    },
                  ]}
                />
              )}
            </View>
            <View style={styles.cropZoomControls}>
              <TouchableOpacity
                style={[styles.cropZoomButton, cropZoom <= 1 && styles.cropZoomButtonDisabled]}
                onPress={() => handleCropZoom(-0.25)}
                disabled={cropZoom <= 1}
                accessibilityRole="button"
                accessibilityLabel="Diminuir zoom"
              >
                <MaterialIcons name="zoom-out" size={22} color={themeColors.primary} />
              </TouchableOpacity>
              <Text style={styles.cropZoomLabel}>{Math.round(cropZoom * 100)}%</Text>
              <TouchableOpacity
                style={[styles.cropZoomButton, cropZoom >= 3 && styles.cropZoomButtonDisabled]}
                onPress={() => handleCropZoom(0.25)}
                disabled={cropZoom >= 3}
                accessibilityRole="button"
                accessibilityLabel="Aumentar zoom"
              >
                <MaterialIcons name="zoom-in" size={22} color={themeColors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.cropActions}>
              <TouchableOpacity
                style={styles.cropCancelButton}
                onPress={() => setPendingAvatarUri(null)}
              >
                <Text style={styles.cropCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cropSaveButton}
                onPress={handleSaveCroppedAvatar}
                disabled={!cropImageSize.width}
              >
                <Text style={styles.cropSaveText}>Usar foto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const createStyles = (themeColors: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: themeColors.surface,
  },
  scrollContent: {
    paddingHorizontal: Spacing.margin,
  },
  contentFrame: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  profileCard: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: themeColors.surfaceContainerHigh,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  accessCard: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: themeColors.surfaceContainerHigh,
  },
  accessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  accessHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  accessGrid: {
    gap: 10,
  },
  accessItem: {
    backgroundColor: themeColors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.surfaceContainerHigh,
  },
  accessItemLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: themeColors.outline,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  accessItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accessItemValue: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: themeColors.primaryContainer,
    backgroundColor: themeColors.surfaceContainerHigh,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  avatarActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  changeAvatarButton: {
    backgroundColor: themeColors.primaryContainer,
  },
  deleteAvatarButton: {
    backgroundColor: '#dc2626',
  },
  avatarActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  cropOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(19, 27, 46, 0.65)',
  },
  cropDialog: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: themeColors.surfaceContainerLowest,
  },
  cropTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  cropDescription: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13,
    color: themeColors.onSurfaceVariant,
    textAlign: 'center',
  },
  cropFrame: {
    width: 220,
    height: 220,
    overflow: 'hidden',
    borderRadius: 110,
    backgroundColor: themeColors.surfaceContainerHigh,
  },
  cropZoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 14,
  },
  cropZoomButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: themeColors.surfaceContainerLow,
  },
  cropZoomButtonDisabled: {
    opacity: 0.4,
  },
  cropZoomLabel: {
    minWidth: 48,
    color: themeColors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  cropImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    maxWidth: 'none',
  },
  cropActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    gap: 10,
    marginTop: 22,
  },
  cropCancelButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: themeColors.surfaceContainerLow,
  },
  cropCancelText: {
    color: themeColors.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  cropSaveButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: themeColors.primaryContainer,
  },
  cropSaveText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: themeColors.onSurface,
    marginBottom: 2,
  },
  userCpf: {
    fontSize: 12,
    color: themeColors.outline,
    marginBottom: 8,
  },
  userContactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  userContactText: {
    fontSize: 11,
    color: themeColors.primary,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.outline,
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 20,
    paddingVertical: 6,
    marginBottom: 20,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextBox: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  menuSubtitle: {
    fontSize: 11,
    color: themeColors.onSurfaceVariant,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: themeColors.surfaceContainerHigh,
    marginHorizontal: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 16,
    height: 50,
    borderWidth: 1.5,
    borderColor: themeColors.errorContainer,
    marginBottom: 16,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.error,
  },
  versionText: {
    fontSize: 11,
    color: themeColors.outline,
    textAlign: 'center',
  },
});
