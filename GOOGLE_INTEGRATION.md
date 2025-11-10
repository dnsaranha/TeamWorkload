# 🔗 Integração Google Calendar & Tasks - Guia Completo

## 📋 Visão Geral

Este projeto possui integração completa com Google Calendar e Google Tasks via OAuth 2.0, permitindo sincronização bidirecional de eventos e tarefas.

## 🏗️ Arquitetura

```
React App → Supabase Edge Functions → Google APIs
     ↓
  OAuth 2.0 Flow
     ↓
Token Storage (Supabase)
```

## ⚙️ Configuração Necessária

### 1. Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative as APIs necessárias:
   - Google Calendar API
   - Google Tasks API

4. Configure a tela de consentimento OAuth:
   - Vá para "APIs & Services" > "OAuth consent screen"
   - Escolha "External" (ou "Internal" se for Google Workspace)
   - Preencha as informações obrigatórias
   - Adicione os escopos:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/tasks`

5. Crie credenciais OAuth 2.0:
   - Vá para "APIs & Services" > "Credentials"
   - Clique em "Create Credentials" > "OAuth client ID"
   - Tipo: "Web application"
   - Nome: "Workload Manager"
   - Authorized redirect URIs:
     - `https://ff346da6-1783-49b6-9518-47239a9ccb29.canvases.tempo.build/google-callback`
     - `http://localhost:5173/google-callback` (para desenvolvimento)

6. Copie o **Client ID** e **Client Secret**

### 2. Variáveis de Ambiente

Você precisa configurar as seguintes variáveis de ambiente no Tempo:

#### Frontend (VITE_*)
```
VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
```

#### Backend (Supabase Edge Functions)
```
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_REDIRECT_URI=https://ff346da6-1783-49b6-9518-47239a9ccb29.canvases.tempo.build/google-callback
```

**⚠️ IMPORTANTE:** Configure essas variáveis nas configurações do projeto no Tempo.

## 🚀 Como Usar

### 1. Conectar Conta Google

```typescript
import GoogleAuthCallback from '@/components/GoogleAuthCallback';

function MyComponent() {
  return <GoogleAuthCallback onSuccess={() => console.log('Connected!')} />;
}
```

### 2. Usar Hooks do Google Calendar

```typescript
import {
  useCreateCalendarEvent,
  useTodayEvents,
  useUpcomingEvents,
} from '@/hooks/google-calendar';

function CalendarComponent() {
  // Buscar eventos de hoje
  const { data: todayEvents, isLoading } = useTodayEvents();

  // Criar novo evento
  const createEvent = useCreateCalendarEvent();

  const handleCreateEvent = async () => {
    await createEvent.mutateAsync({
      event: {
        summary: 'Reunião',
        start: { dateTime: '2024-03-20T10:00:00' },
        end: { dateTime: '2024-03-20T11:00:00' },
      },
    });
  };

  return (
    <div>
      {todayEvents?.data?.items.map(event => (
        <div key={event.id}>{event.summary}</div>
      ))}
      <button onClick={handleCreateEvent}>Criar Evento</button>
    </div>
  );
}
```

### 3. Usar Hooks do Google Tasks

```typescript
import {
  useTaskLists,
  useTasks,
  useInsertTask,
  useCompleteTask,
} from '@/hooks/google-tasks';

function TasksComponent() {
  // Listar task lists
  const { data: taskLists } = useTaskLists();

  // Listar tarefas de uma lista
  const { data: tasks } = useTasks({ taskListId: 'list-id' });

  // Criar nova tarefa
  const insertTask = useInsertTask();

  const handleCreateTask = async () => {
    await insertTask.mutateAsync({
      taskListId: 'list-id',
      task: {
        title: 'Nova tarefa',
        status: 'needsAction',
      },
    });
  };

  return (
    <div>
      {tasks?.data?.items.map(task => (
        <div key={task.id}>{task.title}</div>
      ))}
      <button onClick={handleCreateTask}>Criar Tarefa</button>
    </div>
  );
}
```

## 📁 Estrutura de Arquivos

```
src/
├── hooks/
│   ├── google-calendar.ts          # Hooks do Google Calendar
│   ├── google-calendar.examples.tsx # Exemplos de uso
│   ├── google-tasks.ts              # Hooks do Google Tasks
│   └── google-tasks.examples.tsx    # Exemplos de uso
├── components/
│   └── GoogleAuthCallback.tsx       # Componente de autenticação
└── pages/
    └── GoogleCallback.tsx           # Página de callback OAuth

supabase/
├── functions/
│   ├── mcp-proxy/
│   │   └── index.ts                 # Proxy para Google APIs
│   └── google-oauth-callback/
│       └── index.ts                 # Processa callback OAuth
└── migrations/
    └── 20241202000001_create_google_oauth_tokens.sql
```

## 🔐 Segurança

- ✅ Tokens armazenados de forma segura no Supabase
- ✅ Refresh automático de tokens expirados
- ✅ Comunicação via HTTPS
- ✅ Client Secret nunca exposto no frontend
- ✅ Tokens vinculados ao usuário autenticado

## 🔄 Fluxo de Autenticação

1. Usuário clica em "Connect with Google"
2. Redirecionado para tela de consentimento do Google
3. Após autorização, Google redireciona para `/google-callback`
4. Edge Function troca código por tokens
5. Tokens armazenados no banco de dados
6. Usuário redirecionado de volta para a aplicação

## 🛠️ Troubleshooting

### Erro: "Google Client ID not configured"
- Verifique se `VITE_GOOGLE_CLIENT_ID` está configurado nas variáveis de ambiente

### Erro: "Failed to exchange code for tokens"
- Verifique se `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` estão configurados no Supabase
- Confirme que a URI de redirecionamento está cadastrada no Google Cloud Console

### Erro: "Google account not connected"
- O usuário precisa conectar a conta Google primeiro usando o componente `GoogleAuthCallback`

### Token expirado
- Os tokens são automaticamente renovados pela Edge Function `mcp-proxy`
- Se o refresh token estiver inválido, o usuário precisará reconectar a conta

## 📚 Recursos Adicionais

- [Google Calendar API Docs](https://developers.google.com/calendar/api/v3/reference)
- [Google Tasks API Docs](https://developers.google.com/tasks/reference/rest)
- [OAuth 2.0 Flow](https://developers.google.com/identity/protocols/oauth2)

## ✅ Checklist de Configuração

- [ ] Criar projeto no Google Cloud Console
- [ ] Ativar Google Calendar API
- [ ] Ativar Google Tasks API
- [ ] Configurar tela de consentimento OAuth
- [ ] Criar credenciais OAuth 2.0
- [ ] Adicionar URIs de redirecionamento
- [ ] Configurar variáveis de ambiente no Tempo
- [ ] Testar conexão com Google
- [ ] Testar criação de eventos
- [ ] Testar criação de tarefas
