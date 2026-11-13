# 🚀 Protocolo Anti-Gravidade: SmartCard BUS

Este documento é o script mestre para implementar o protocolo "Anti-Gravidade" no seu aplicativo React Native / Expo. O objetivo é remover todo o "peso" (lentidão, vulnerabilidades, design engessado e bugs), fazendo o app flutuar com altíssima performance, segurança de nível bancário e um design de classe mundial.

---

## 🛡️ 1. Segurança Extrema (Nível Bancário)
Para proteger o saldo, os passes e os dados (CPF, E-mail) dos usuários, precisamos blindar o app contra engenharia reversa e vazamento de dados.

### Script de Instalação de Segurança:
```bash
npx expo install expo-secure-store expo-crypto react-native-ssl-pinning
```

### Ações Práticas:
1. **Keychain / Keystore (Substituir AsyncStorage):**
   Nunca salve tokens, senhas ou CPFs no `AsyncStorage`. Use o `expo-secure-store`.
   * **Onde aplicar:** No seu `AppContext.tsx` e `LoginScreen.tsx`.
   ```typescript
   import * as SecureStore from 'expo-secure-store';
   // Salvar token
   await SecureStore.setItemAsync('user_token', 'jwt_super_secreto');
   ```
2. **Criptografia de Dados Locais:**
   No `BiometricsEnrollScreen`, garanta que a biometria seja a chave para descriptografar os dados locais usando `expo-crypto`.
3. **SSL Pinning:**
   Garanta que seu app só se comunique com o seu servidor verdadeiro, prevenindo ataques *Man-in-the-Middle* (MitM) em redes Wi-Fi públicas (muito comum em ônibus e metrôs).
4. **Ofuscação de Código:**
   Se for fazer o build com EAS (Expo Application Services), adicione ofuscação no `app.json` (ProGuard no Android) para evitar engenharia reversa.

---

## 🎨 2. Design e UI/UX (Nível Extremamente Avançado)
Seu design já usa `LinearGradient` e `MaterialIcons`. Vamos elevar isso com **Micro-interações, Glassmorphism e Animações Fluidas a 120fps**.

### Script de Instalação de UI/Animações:
```bash
npx expo install react-native-reanimated react-native-gesture-handler expo-blur
```

### Ações Práticas:
1. **Glassmorphism (Efeito Vidro):**
   No seu `HomeScreen.tsx` e `CardsScreen.tsx`, substitua fundos semitransparentes rígidos pelo `BlurView` do Expo.
   ```tsx
   import { BlurView } from 'expo-blur';
   // Substitua a View do Watermark/Background por:
   <BlurView intensity={80} tint={isDarkMode ? "dark" : "light"} style={styles.glassCard}>
      {/* Conteúdo do passe */}
   </BlurView>
   ```
2. **Micro-interações (Reanimated 3):**
   Quando o usuário tocar em "Recarregar" ou ao deslizar os cartões no `CardsScreen`, o botão deve "afundar" suavemente. 
3. **Skeleton Loading:**
   Enquanto as rotas e saldos carregam na `HomeScreen`, mostre "esqueletos" animados em vez de telas em branco ou *spinners* simples.

---

## ⚡ 3. Otimização de Software (O Verdadeiro Anti-Gravidade)
Fazer o app rodar liso até em celulares muito antigos, economizando bateria e memória.

### Script de Otimização:
```bash
npx expo install expo-image
```

### Ações Práticas:
1. **Ativar Hermes Engine:**
   O Hermes é o motor JavaScript otimizado para React Native. Verifique no seu `app.json`:
   ```json
   "jsEngine": "hermes"
   ```
2. **Memoização de Componentes Pesados:**
   No seu `CardsScreen.tsx`, o carrossel de cartões pode ficar lento se houver muitos re-renders. Envolva o componente do Cartão em `React.memo` e use `useCallback` para as funções de clique (`handleCardPress`, `handleBlockPress`).
3. **Expo Image no lugar de Image:**
   No `ProfileScreen.tsx`, você usa o `<Image>` padrão do React Native. Troque pelo `expo-image`, que tem cache avançado em disco, transições suaves e consome menos memória.
   ```tsx
   import { Image } from 'expo-image';
   <Image source={{ uri: user.avatarUri }} style={styles.avatarImage} transition={200} />
   ```

---

## 🧪 4. Testes de Software (Garantia de Qualidade Zero-Bug)
Um app que mexe com dinheiro (passagens de ônibus/metrô) não pode falhar na catraca.

### Script de Instalação de Testes:
```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native
npm install -g detox-cli
```

### Estrutura de Testes Recomendada:
1. **Testes Unitários (Jest):**
   * Testar a função `isValidCpf` usada no `LoginScreen`.
   * Testar a lógica de cálculo de recarga do `AutoRechargeScreen` (ex: verificar se não permite recarga menor que R$ 10).
2. **Testes de Componente (RNTL):**
   * Renderizar o `CardsScreen` no ambiente de teste e verificar se o botão de "Bloquear" muda a cor e o ícone corretamente ao ser clicado.
3. **Testes E2E (End-to-End com Detox):**
   * Criar um robô que abre o app, digita CPF/Senha no `LoginScreen`, faz login, navega até o `MobilityServicesScreen` e tenta simular um "Empréstimo de saldo".

---

## 🏁 Como Executar este Protocolo:
1. Abra o terminal na raiz do seu projeto.
2. Execute os 4 scripts de instalação fornecidos acima (`npx expo install ...`).
3. Refatore gradualmente os componentes (comece pelo `LoginScreen` colocando o `SecureStore`, depois vá para o `CardsScreen` colocar o `React.memo`).
4. Execute os testes `npm run test` a cada alteração.