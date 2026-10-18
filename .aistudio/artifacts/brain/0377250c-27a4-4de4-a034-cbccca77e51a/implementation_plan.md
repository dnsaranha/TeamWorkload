# Gantt Interativo: Customização Visual, Drag-and-Drop & Dependências Inteligentes

Aprimoramento abrangente da visualização do Gráfico de Gantt, permitindo configurar a exibição de textos e metadados nas barras e na lista lateral, manipular tarefas interativamente via drag-and-drop (mover e redimensionar início/fim), conectar dependências diretamente na linha do tempo e reajustar automaticamente as datas do projeto.

### User Review & Critical Decisions

> [!IMPORTANT]
> As decisões de usabilidade confirmadas na etapa anterior foram incorporadas a esta especificação:
> - **Controle de visualização centralizado**: Menu suspenso (Popover "Exibição & Colunas") no topo do gráfico com persistência em `localStorage`.
> - **Conexão de dependências híbrida**: Ponto de ancoragem interativo de conexão na extremidade da barra para arrastar até a tarefa sucessora, além do botão de atalho para seleção rápida.
> - **Reajuste automático do projeto**: Ao arrastar ou redimensionar uma tarefa para além dos limites do projeto, suas datas de início/fim são reajustadas no banco e um alerta informativo (toast) é apresentado ao usuário.

- **Posicionamento da Descrição**: Opções configuráveis no menu: `dentro` (somente dentro da barra), `fora` (à direita da barra) ou `ambas` (texto conciso dentro e completo fora).
- **Nome do Responsável**: Alternador independente para exibir ou ocultar o nome/avatar do colaborador responsável nas barras e na lateral.
- **Campos Customizáveis**: Seleção de quais informações exibir nas barras (Nome, Responsável, %, Duração em dias, Horas, Datas) e na lista lateral (Numeração, Status, Responsável, Horas, Datas, Progresso, Ações).

---

### 1. Overview & Core Concept

- **O que faz**: Transforma o Gráfico de Gantt em uma ferramenta de edição e visualização completa e dinâmica. O usuário pode personalizar minuciosamente o que é exibido nas barras e na tabela esquerda, reorganizar datas arrastando barras ou suas extremidades com precisão milimétrica e snap diário, ligar dependências graficamente e manter projetos sincronizados sem inconsistências de datas.
- **Público-alvo**: Gestores de projeto, líderes técnicos e membros de equipe que necessitam planejar prazos, visualizar gargalos e ajustar cronogramas com agilidade e clareza visual.
- **Valor agregado**: Elimina o atrito de ter que abrir formulários modais para ajustes triviais de data, oferece legibilidade máxima customizada para diferentes densidades de tela e previne erros comuns de planejamento de cronograma.

---

### 2. User Experience & Visual Design

#### Fluxos de Usuário Principais
1. **Configuração de Exibição**:
   - O usuário clica no botão "Configurações de Exibição" (`SlidersHorizontal`) no topo do Gantt.
   - Um painel suspenso abre com abas limpas: *Barras da Linha do Tempo* e *Tabela Lateral*.
   - Seleciona a posição da descrição (`Dentro`, `Fora` ou `Ambas`), ativa/desativa o nome do responsável e marca as tags desejadas (Progresso, Duração, Horas, Datas).
   - As alterações refletem instantaneamente no gráfico e são salvas no navegador.

2. **Drag-and-Drop de Tarefas (Mover e Redimensionar)**:
   - **Mover Barra Completa**: O usuário clica e arrasta o corpo da barra. Uma prévia com destaque visual e tooltip com as novas datas acompanha o cursor. Ao soltar, a tarefa é atualizada e o gráfico recalculado.
   - **Ajustar Início (Handle Esquerdo)**: O usuário puxa a alça esquerda (`cursor-ew-resize`) para adiantar ou adiar o início.
   - **Ajustar Término (Handle Direito)**: O usuário puxa a alça direita (`cursor-ew-resize`) para expandir ou contrair o prazo final.
   - **Reajuste Automático do Projeto**: Se a nova data de início for anterior ao projeto, ou a data de término ultrapassar o projeto, a entidade do projeto é estendida imediatamente e uma notificação sutil confirma a sincronização.

3. **Criação Visual de Dependências**:
   - **Arrasto de Ponto Conector**: Ao passar o mouse sobre uma barra, surge um conector circular na extremidade direita. O usuário clica e puxa uma linha elástica até a tarefa dependente; ao soltar, a dependência é registrada.
   - **Modo de Conexão Rápida**: O usuário também pode clicar no ícone de corrente (`Link2`) na barra ou linha, ativando o modo de seleção com indicador flutuante ("Selecione a tarefa seguinte").

#### Identidade Visual & Design System
- **Seguimento às diretrizes Anti-Slop**: Tipografia limpa, sem pílulas decorativas estáticas, badges funcionais com estados de hover e active distintos.
- **Paleta de Cores Coesa**: Tons neutros refinados com destaques temáticos: Esmeralda para tarefas concluídas, Azul Primário para em progresso, Âmbar para pendentes e Carmesim para conflitos de dependência detectados.
- **Feedback Tátil**: Linhas conectoras com setas SVG direcionais e curvas bezier suaves, alças de redimensionamento visíveis ao hover com micro-animações, e tooltips flutuantes de datas durante o arraste.

---

### 3. Principais Decisões de Produto & Arquitetura

- **Decisão 1: Snap por Dia e Cálculo de Offsets em Pixels**
  - *Abordagem*: O arraste calcula o deslocamento horizontal baseado na largura do dia (`dayWidth`) para o zoom ativo (dias, semanas ou meses), garantindo que a data resultante seja sempre um dia inteiro consistente e sem frações ambíguas.
  - *Motivo*: Evita divergências de fuso horário e mantém consistência com o banco de dados (`YYYY-MM-DD`).

- **Decisão 2: Persistência de Preferências no LocalStorage**
  - *Abordagem*: Armazenamento sob a chave `crono_pulse_gantt_settings` com fallback inteligente para padrões agradáveis.
  - *Motivo*: Preserva a configuração predileta do usuário entre recargas e sessões sem onerar chamadas de rede.

- **Decisão 3: Verificação de Limites do Projeto em Tempo Real**
  - *Abordagem*: Ao finalizar o drop ou redimensionamento, se `task.project_id` existir, compara `newStart < project.start_date` e `newEnd > project.end_date`. Se ultrapassar, aciona `projectService.update` e notifica o usuário.
  - *Motivo*: Garante integridade do plano macro do projeto e automatiza uma tarefa manual tediosa.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          GanttChart Component                          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Controls Toolbar: Zoom, Search, Filters, View Settings Popover   │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
│                                    │                                   │
│            ┌───────────────────────┴───────────────────────┐           │
│            ▼                                               ▼           │
│  ┌───────────────────────────┐           ┌───────────────────────────┐ │
│  │ Left Side: Task Tree List │           │ Right Side: Timeline Grid │ │
│  │                           │           │                           │ │
│  │ - Configurable Columns    │           │ - Date Header (Weeks/Days)│ │
│  │ - Sequence Number (#)     │           │ - Background Day Grid     │ │
│  │ - Status Icon & Name      │           │ - SVG Bezier Link Arrows  │ │
│  │ - Assignee Name / Hours   │           │ - Dragging Connect Line   │ │
│  │ - Dates & Progress Bar    │           │ - Drag & Resize Task Bars │ │
│  │ - Quick Link / Edit / Del │           │ - Configurable Label Mode │ │
│  └───────────────────────────┘           └─────────────┬─────────────┘ │
│                                                        │               │
│                                                        ▼               │
│                                    ┌─────────────────────────────────┐ │
│                                    │ Drag & Drop Engine (PointerEvt) │ │
│                                    │ - Move Task Bar (dx -> days)    │ │
│                                    │ - Resize Start (left handle)    │ │
│                                    │ - Resize End (right handle)     │ │
│                                    │ - Dependency Anchor Drag Link   │ │
│                                    └─────────────────┬───────────────┘ │
│                                                      │                 │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │
                                                       ▼
                                     ┌─────────────────────────────────┐
                                     │ taskService & projectService    │
                                     │ - Update task dates & deps      │
                                     │ - Auto-expand project dates     │
                                     │ - Persist order & settings      │
                                     └─────────────────────────────────┘
```

#### Modelo de Configuração de Exibição (`GanttDisplaySettings`)
```typescript
interface GanttDisplaySettings {
  labelPosition: "inside" | "outside" | "both";
  showAssigneeOnBar: boolean;
  showAssigneeInList: boolean;
  barDetails: {
    name: boolean;
    progress: boolean;
    duration: boolean;
    hours: boolean;
    dates: boolean;
  };
  listColumns: {
    seqNumber: boolean;
    statusIcon: boolean;
    assignee: boolean;
    hours: boolean;
    dates: boolean;
    progress: boolean;
    actions: boolean;
  };
}
```

#### Gestão de Eventos de Arraste (Pointer / Mouse Events)
- O arraste de barra e redimensionamento utilizará ouvintes globais `pointermove` e `pointerup` no `window` enquanto ativo para garantir fluidez mesmo se o cursor sair ligeiramente da área da barra.
- A linha de dependência durante o arraste calcula coordenadas SVG dinâmicas partindo da âncora de saída até a posição do ponteiro do mouse, destacando a barra-alvo quando sobreposta.
