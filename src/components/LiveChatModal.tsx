import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export const LiveChatModal: React.FC = () => {
  const { isChatModalOpen, setChatModalOpen, isDarkMode } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Olá! Sou o Assistente Virtual SmartCard BUS. Como posso te ajudar hoje?',
      time: 'Agora',
    },
  ]);

  if (!isChatModalOpen) return null;

  const handleSend = (textToSend?: string) => {
    const txt = (textToSend || inputText).trim();
    if (!txt) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: txt,
      time: 'Agora',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Simulated automated response based on transit keywords
    setTimeout(() => {
      let botReply =
        'Entendido! Registrei sua solicitação. Caso precise de atendimento humano adicional, nosso protocolo é #VP-' +
        Math.floor(100000 + Math.random() * 900000);

      const lower = txt.toLowerCase();
      if (lower.includes('saldo') || lower.includes('recarga')) {
        botReply =
          'Recargas via Pix caem instantaneamente. Se você fez por boleto, o prazo bancário é de até 24h úteis. Você pode conferir os detalhes na aba "Extrato".';
      } else if (lower.includes('catraca') || lower.includes('qr')) {
        botReply =
          'Para passar na catraca, certifique-se de aumentar o brilho da tela ao máximo ou utilize o leitor NFC encostando a traseira do celular.';
      } else if (lower.includes('estudante') || lower.includes('comprovante')) {
        botReply =
          'Você pode renovar o comprovante de matrícula diretamente na aba "Passes" clicando em "Renovar Comprovante". A validação leva menos de 5 minutos.';
      } else if (lower.includes('bloquear') || lower.includes('perdi')) {
        botReply =
          'Você pode bloquear seu passe imediatamente pela aba "Passes". Seu saldo permanece seguro e pode ser transferido a qualquer momento.';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: botReply,
          time: 'Agora',
        },
      ]);
    }, 600);
  };

  return (
    <Modal
      visible={isChatModalOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setChatModalOpen(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.botAvatar}>
                <MaterialIcons name="support-agent" size={22} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.botName}>Suporte ao Passageiro SmartCard BUS</Text>
                <View style={styles.onlineRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Atendimento 24h Disponível</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setChatModalOpen(false)}
            >
              <MaterialIcons name="close" size={22} color={themeColors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Quick topic pills */}
          <View style={styles.quickPillsRow}>
            <TouchableOpacity
              style={styles.quickPill}
              onPress={() => handleSend('Dúvida sobre recarga e saldo')}
            >
              <Text style={styles.quickPillText}>Recarga</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickPill}
              onPress={() => handleSend('Como funciona o QR Code na catraca?')}
            >
              <Text style={styles.quickPillText}>Catraca QR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickPill}
              onPress={() => handleSend('Renovar passe estudante')}
            >
              <Text style={styles.quickPillText}>Estudante</Text>
            </TouchableOpacity>
          </View>

          {/* Messages list */}
          <ScrollView style={styles.messagesList} showsVerticalScrollIndicator={false}>
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.msgBubble,
                  m.sender === 'user' ? styles.userBubble : styles.botBubble,
                ]}
              >
                <Text
                  style={[
                    styles.msgText,
                    m.sender === 'user' ? styles.userText : styles.botText,
                  ]}
                >
                  {m.text}
                </Text>
                <Text
                  style={[
                    styles.msgTime,
                    m.sender === 'user' ? styles.userTime : styles.botTime,
                  ]}
                >
                  {m.time}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Input field */}
          <View style={styles.inputBar}>
            <TextInput
              style={[styles.textInput, { outlineStyle: 'none' } as any]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Digite sua dúvida ou problema..."
              placeholderTextColor={themeColors.outline}
              onSubmitEditing={() => handleSend()}
            />
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => handleSend()}
            >
              <MaterialIcons name="send" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
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
    height: '82%',
    backgroundColor: themeColors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.surfaceContainerHigh,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: themeColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botName: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: themeColors.secondary,
  },
  onlineText: {
    fontSize: 10,
    color: themeColors.secondary,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPillsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
  },
  quickPill: {
    backgroundColor: themeColors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.primary,
  },
  messagesList: {
    flex: 1,
    paddingVertical: 8,
  },
  msgBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: themeColors.primaryContainer,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: themeColors.surfaceContainerLow,
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  userText: {
    color: '#ffffff',
  },
  botText: {
    color: themeColors.onSurface,
  },
  msgTime: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  botTime: {
    color: themeColors.outline,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    marginTop: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: themeColors.onSurface,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: themeColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
