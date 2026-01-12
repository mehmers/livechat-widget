# @beecorp/livechat-widget

Beecorp LiveChat Widget - React tabanlı, chatflow ve canlı temsilci desteği olan gömülebilir sohbet widget'ı.

## Özellikler

- 🤖 Otomatik chatflow desteği
- 👨‍💼 Canlı temsilci modu
- 📁 Dosya yükleme (JPG, PNG, JPEG)
- 🎨 Özelleştirilebilir tema
- 📱 Responsive tasarım
- 🔒 Token tabanlı güvenlik

## Kurulum

```bash
npm install @beecorp/livechat-widget
# veya
yarn add @beecorp/livechat-widget
```

## Kullanım

### Temel Kullanım

```jsx
import { LiveChat } from '@beecorp/livechat-widget';

function App() {
  return (
    <div>
      <LiveChat
        apiUrl="https://api.example.com"
        token="lc_your_token_here"
      />
    </div>
  );
}
```

### Özelleştirilmiş Kullanım

```jsx
import { LiveChat } from '@beecorp/livechat-widget';

function App() {
  return (
    <LiveChat
      apiUrl="https://api.example.com"
      token="lc_your_token_here"
      position="bottom-right"
      primaryColor="#3B82F6"
      title="Canlı Destek"
      subtitle="Size nasıl yardımcı olabiliriz?"
      placeholder="Mesajınızı yazın..."
      welcomeMessage="Merhaba! Size nasıl yardımcı olabilirim?"
    />
  );
}
```

### Hook Kullanımı

```jsx
import { useLiveChat } from '@beecorp/livechat-widget';

function CustomChat() {
  const {
    messages,
    isLoading,
    error,
    isInitialized,
    sendMessage,
    sendFile,
    initSession,
  } = useLiveChat({
    apiUrl: 'https://api.example.com',
    token: 'lc_your_token_here',
  });

  // Kendi UI'ınızı oluşturun
}
```

## Props

| Prop | Tip | Varsayılan | Açıklama |
|------|-----|------------|----------|
| `apiUrl` | string | - | API sunucu URL'i (zorunlu) |
| `token` | string | - | LiveChat token (zorunlu) |
| `position` | string | `'bottom-right'` | Widget pozisyonu (`'bottom-right'` veya `'bottom-left'`) |
| `primaryColor` | string | `'#3B82F6'` | Ana tema rengi |
| `title` | string | `'Canlı Destek'` | Widget başlığı |
| `subtitle` | string | `'Size nasıl yardımcı olabiliriz?'` | Alt başlık |
| `placeholder` | string | `'Mesajınızı yazın...'` | Input placeholder |
| `welcomeMessage` | string | `'Merhaba! Size nasıl yardımcı olabilirim?'` | Karşılama mesajı |

## API Endpoints

Widget aşağıdaki API endpoint'lerini kullanır:

- `GET /livechat/config` - Widget yapılandırması
- `POST /livechat/init` - Oturum başlatma
- `POST /livechat/message` - Mesaj gönderme
- `GET /livechat/history/:external_user_id` - Sohbet geçmişi

## Lisans

MIT
