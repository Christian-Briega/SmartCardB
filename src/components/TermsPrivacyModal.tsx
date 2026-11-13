import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';

export const TermsPrivacyModal: React.FC = () => {
  const {
    isTermsModalOpen,
    setTermsModalOpen,
    isPrivacyModalOpen,
    setPrivacyModalOpen,
    isDarkMode,
  } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  const documents = [
    {
      key: 'terms',
      visible: isTermsModalOpen,
      title: 'Termos de Uso',
      subtitle: 'Regras para usar os serviços SmartCard BUS',
      onClose: () => setTermsModalOpen(false),
      sections: [
        {
          title: '1. Sobre o serviço',
          text: 'O SmartCard BUS reúne recursos para consultar passes, acompanhar saldo e organizar recargas e informações de mobilidade em um só aplicativo.',
        },
        {
          title: '2. Cadastro e segurança da conta',
          text: 'Mantenha seus dados atualizados e proteja suas credenciais. O titular é responsável pelas atividades realizadas a partir de sua conta e deve comunicar qualquer acesso suspeito pelos canais de atendimento.',
        },
        {
          title: '3. Uso dos passes',
          text: 'Os passes vinculados a benefícios pessoais, como Estudante e Vale-Transporte, devem ser usados pelo titular e conforme as regras do benefício e do operador de transporte. Não compartilhe códigos de acesso ou comprovantes de uso.',
        },
        {
          title: '4. Recargas e saldo',
          text: 'Confira o passe e o valor antes de confirmar uma recarga ou transferência. A atualização do saldo pode depender da confirmação do meio de pagamento e da integração com o operador responsável.',
        },
        {
          title: '5. Disponibilidade e uso adequado',
          text: 'Não tente alterar, reproduzir ou utilizar indevidamente QR Codes, cartões ou recursos do aplicativo. A disponibilidade dos serviços pode variar conforme manutenção, conexão e sistemas de terceiros.',
        },
      ],
    },
    {
      key: 'privacy',
      visible: isPrivacyModalOpen,
      title: 'Política de Privacidade',
      subtitle: 'Como os dados pessoais são tratados',
      onClose: () => setPrivacyModalOpen(false),
      sections: [
        {
          title: '1. Dados que podem ser utilizados',
          text: 'Podem ser tratados os dados informados no cadastro, como nome, CPF, e-mail e telefone, além das informações de passes, recargas e preferências registradas durante o uso do aplicativo.',
        },
        {
          title: '2. Finalidades',
          text: 'Essas informações são utilizadas para identificar o usuário, exibir seus passes e movimentações, atender solicitações e apoiar recursos de segurança e comunicação relacionados ao serviço.',
        },
        {
          title: '3. Compartilhamento',
          text: 'Os dados só devem ser compartilhados quando necessário para executar o serviço, atender uma solicitação do usuário ou cumprir obrigação legal, limitando o compartilhamento ao objetivo correspondente.',
        },
        {
          title: '4. Proteção e retenção',
          text: 'São adotadas medidas razoáveis para evitar acesso ou uso indevido. Os dados devem ser mantidos somente pelo período necessário às finalidades informadas ou ao cumprimento de obrigações aplicáveis.',
        },
        {
          title: '5. Direitos do titular',
          text: 'Nos termos da LGPD, o titular pode solicitar confirmação de tratamento, acesso, correção e, quando aplicável, eliminação ou revisão de dados. As solicitações podem ser feitas pelos canais de atendimento do aplicativo.',
        },
      ],
    },
  ];

  return (
    <>
      {documents.map((document) => (
        <Modal
          key={document.key}
          visible={document.visible}
          transparent
          animationType="slide"
          onRequestClose={document.onClose}
        >
          <Pressable style={styles.overlay} onPress={document.onClose}>
            <Pressable
              style={styles.sheet}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.header}>
                <View style={styles.headingCopy}>
                  <Text style={styles.title}>{document.title}</Text>
                  <Text style={styles.subtitle}>{document.subtitle}</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={document.onClose}
                  accessibilityRole="button"
                  accessibilityLabel={`Fechar ${document.title}`}
                >
                  <MaterialIcons name="close" size={22} color={themeColors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                {document.sections.map((section) => (
                  <View key={section.title}>
                    <Text style={styles.sectionHeader}>{section.title}</Text>
                    <Text style={styles.text}>{section.text}</Text>
                  </View>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      ))}
    </>
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
  headingCopy: {
    flex: 1,
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
    paddingVertical: 14,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.primary,
    marginTop: 10,
    marginBottom: 4,
  },
  text: {
    fontSize: 12,
    color: themeColors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 8,
  },
});
