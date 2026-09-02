const state = {
  npcs: [],
  selectedNpc: null,
  playerId: getOrCreateId('cyber-town-player-id', 'player'),
  conversationId: getOrCreateId('cyber-town-conversation-id', 'conversation'),
};

const npcList = document.querySelector('#npc-list');
const currentNpc = document.querySelector('#current-npc');
const currentRole = document.querySelector('#current-role');
const messages = document.querySelector('#messages');
const form = document.querySelector('#dialogue-form');
const messageInput = document.querySelector('#message');
const formStatus = document.querySelector('#form-status');
const healthDot = document.querySelector('#health-dot');
const healthLabel = document.querySelector('#health-label');
const relationshipLevel = document.querySelector('#relationship-level');
const submitButton = form.querySelector('button');

await initialize();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await sendMessage();
});

messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

async function initialize() {
  try {
    const [healthResponse, npcResponse] = await Promise.all([
      fetch('./health'),
      fetch('./api/v1/npcs'),
    ]);

    if (!healthResponse.ok || !npcResponse.ok) {
      throw new Error('API 返回异常状态。');
    }

    const data = await npcResponse.json();
    state.npcs = data.items;
    healthDot.className = 'status-dot online';
    healthLabel.textContent = '服务正常';
    renderNpcList();
    selectNpc(state.npcs[0]?.id);
  } catch (error) {
    healthDot.className = 'status-dot offline';
    healthLabel.textContent = '服务不可用';
    showStatus(error instanceof Error ? error.message : '初始化失败。', true);
  }
}

function renderNpcList() {
  npcList.replaceChildren(
    ...state.npcs.map((npc) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'npc-button';
      button.dataset.npcId = npc.id;
      button.innerHTML = `
        <span class="npc-avatar" style="background:${npc.accentColor}">${npc.name[0]}</span>
        <span><strong>${npc.name}</strong><small>${npc.role}</small></span>
      `;
      button.addEventListener('click', () => selectNpc(npc.id));
      return button;
    }),
  );
}

function selectNpc(npcId) {
  state.selectedNpc = state.npcs.find((npc) => npc.id === npcId) ?? null;

  for (const button of npcList.querySelectorAll('.npc-button')) {
    button.classList.toggle('active', button.dataset.npcId === npcId);
  }

  if (state.selectedNpc) {
    currentNpc.textContent = state.selectedNpc.name;
    currentRole.textContent = `${state.selectedNpc.role} · ${state.selectedNpc.personality}`;
    messageInput.placeholder = `给${state.selectedNpc.name}发送消息…`;
    messageInput.focus();
  }
}

async function sendMessage() {
  const text = messageInput.value.trim();

  if (!text || !state.selectedNpc) {
    return;
  }

  clearEmptyState();
  appendMessage(text, 'user');
  messageInput.value = '';
  submitButton.disabled = true;
  showStatus('NPC 正在思考…');

  try {
    const response = await fetch('./api/v1/dialogues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: state.playerId,
        npcId: state.selectedNpc.id,
        conversationId: state.conversationId,
        message: text,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message ?? '对话请求失败。');
    }

    appendMessage(data.reply, 'npc');
    relationshipLevel.textContent = `${translateLevel(data.relationship.level)} · ${data.relationship.affinity}`;
    showStatus(`模拟模式 · 请求 ${data.meta.requestId}`);
  } catch (error) {
    appendMessage('连接失败，请确认 API 服务是否正常。', 'npc');
    showStatus(error instanceof Error ? error.message : '发送失败。', true);
  } finally {
    submitButton.disabled = false;
    messageInput.focus();
  }
}

function appendMessage(text, role) {
  const element = document.createElement('div');
  element.className = `message ${role}`;
  element.textContent = text;
  messages.append(element);
  messages.scrollTop = messages.scrollHeight;
}

function clearEmptyState() {
  messages.querySelector('.empty-state')?.remove();
}

function showStatus(text, isError = false) {
  formStatus.textContent = text;
  formStatus.classList.toggle('error', isError);
}

function translateLevel(level) {
  return (
    {
      stranger: '陌生',
      familiar: '熟悉',
      friendly: '友好',
      intimate: '亲密',
      'best-friend': '挚友',
    }[level] ?? level
  );
}

function getOrCreateId(storageKey, prefix) {
  const existing = localStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const value = `${prefix}-${crypto.randomUUID()}`;
  localStorage.setItem(storageKey, value);
  return value;
}
