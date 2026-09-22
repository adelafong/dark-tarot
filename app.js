
const state = {
  lang: 'both',
  step: 0,
  form: {topic:'general', question:'', timeframe:'', person:'', context:'', spread:3, deck:'full', reversals:true},
  preparedDeck: [],
  drawIndex: 0,
  drawn: [],
  shuffling: false,
  cards: []
};

const ui = {
  zh: {
    stepNames: ['主题', '问题', '背景', '牌阵', '洗牌', '抽牌', '结果'],
    ritual: [
      '先静下来，专注在你真正想问的问题上。',
      '把问题说得越清楚，牌给出的方向会越贴近你。',
      '想想时间范围、相关的人，以及你最想知道什么。',
      '现在选择最适合你的牌阵与阅读方式。',
      '闭上眼睛几秒，把问题放进牌里，然后开始洗牌。',
      '请按照直觉一张一张翻牌，像真正抽牌一样慢慢来。',
      '结果出来后，先读整体，再看每张牌的讯息。'
    ],
    topics: {
      general:['综合','整体方向、当下能量与趋势'],
      love:['感情','关系、喜欢的人、复合、互动发展'],
      career:['事业','工作机会、前途、行动与结果'],
      study:['学业','学习状态、考试、作品与压力'],
      money:['金钱','收入、稳定度、资源与现实问题'],
      self:['自我成长','疗愈、内心课题、信念与状态']
    },
    spreadInfo: {
      1:['单张牌','快速看当下核心讯息'],
      3:['三张牌','过去 / 现在 / 未来'],
      5:['五张牌','现状 / 挑战 / 隐藏影响 / 建议 / 发展结果']
    },
    positions: {
      1:['现在'],
      3:['过去','现在','未来'],
      5:['现状','挑战','隐藏影响','建议','发展结果']
    },
    focusIntro: {
      general:'这组牌主要反映你目前整体的能量与趋势。',
      love:'这组牌放在感情里看，重点是情绪回应、关系互动与发展方向。',
      career:'这组牌放在事业里看，重点是机会、压力、行动与结果。',
      study:'这组牌放在学业里看，重点是专注、表现、压力与调整。',
      money:'这组牌放在现实与金钱里看，重点是稳定、安全感、投入与回报。',
      self:'这组牌放在内在成长里看，重点是情绪、信念与目前的人生课题。'
    }
  },
  en: {
    stepNames: ['Topic', 'Question', 'Context', 'Spread', 'Shuffle', 'Draw', 'Result'],
    ritual: [
      'Slow down and focus on the question you truly want to ask.',
      'The clearer the question, the more precise the reading will feel.',
      'Think about timeframe, people involved, and what you most want to understand.',
      'Now choose the spread and reading style that fits your situation.',
      'Close your eyes for a few seconds, place your question into the deck, then shuffle.',
      'Turn the cards one by one and let the reveal happen slowly, like a real reading.',
      'Read the overall message first, then move into each individual card.'
    ],
    topics: {
      general:['General','overall direction, present energy and trend'],
      love:['Love','relationships, crush, reconciliation, connection'],
      career:['Career','work, opportunity, direction and results'],
      study:['Study','learning state, exams, projects and pressure'],
      money:['Money','income, stability, resources and practical concerns'],
      self:['Self growth','healing, inner lessons, beliefs and emotional state']
    },
    spreadInfo: {
      1:['One card','a quick look at the core energy right now'],
      3:['Three cards','past / present / future'],
      5:['Five cards','situation / challenge / hidden influence / advice / likely outcome']
    },
    positions: {
      1:['Current energy'],
      3:['Past','Present','Future'],
      5:['Situation','Challenge','Hidden influence','Advice','Likely outcome']
    },
    focusIntro: {
      general:'This spread reflects the main energy and trend around your situation.',
      love:'In love, this spread focuses on feelings, interaction and direction of the connection.',
      career:'In career, this spread focuses on opportunity, pressure, action and results.',
      study:'In study, this spread focuses on concentration, performance, pressure and adjustment.',
      money:'In money matters, this spread focuses on stability, resources, effort and return.',
      self:'In self-growth, this spread focuses on emotions, beliefs and current life lessons.'
    }
  }
};

function text(zh, en){
  if(state.lang === 'zh') return zh;
  if(state.lang === 'en') return en;
  return `${zh}<br><span class="en">${en}</span>`;
}

function currentUI(){
  return state.lang === 'en' ? ui.en : ui.zh;
}

function escapeHtml(str=''){
  return String(str).replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function filteredDeck(){
  let deck = [...state.cards];
  if(state.form.deck === 'major') deck = deck.filter(c => c.arcana === 'Major Arcana');
  if(state.form.deck === 'minor') deck = deck.filter(c => c.arcana === 'Minor Arcana');
  return deck;
}

function prepareDeck(){
  const deck = shuffle(filteredDeck());
  state.preparedDeck = deck;
  state.drawIndex = 0;
  state.drawn = [];
}

function spriteArt(index, reversed=false, mini=false){
  const col = index % 10;
  const row = Math.floor(index / 10);
  return `<div class="art ${reversed?'reversed':''}">
    <div class="sprite" style="left:-${col*100}%;top:-${row*100}%;${reversed?'transform:rotate(180deg);transform-origin:center center;':''}"></div>
  </div>`;
}

function cardResultBlock(item, posZh, posEn){
  const c = item.card;
  const idx = state.cards.findIndex(x => x.id === c.id);
  const reversed = item.reversed;
  const orientation = reversed ? text('逆位','Reversed') : text('正位','Upright');
  const keywords = reversed ? c.keywords_reversed : c.keywords_upright;
  const meaning = reversed ? c.meaning_reversed : c.meaning_upright;
  const zhExplain = buildChineseMeaning(c, reversed, posZh);
  return `<article class="result-card">
    <div>
      <div class="card-frame revealed"><div class="flip"><div class="face back"></div><div class="face front">${spriteArt(idx, reversed)}</div></div></div>
    </div>
    <div>
      <div class="badge">${state.lang === 'en' ? posEn : state.lang === 'zh' ? posZh : `${posZh} · ${posEn}`}</div>
      <h3>${escapeHtml(c.title_en)}</h3>
      <div class="cn-name">${escapeHtml(c.title_zh)} · ${orientation}</div>
      <div class="text-block"><strong>${text('关键词','Keywords')}</strong><br>${escapeHtml(keywords)}</div>
      <div class="text-block" style="margin-top:10px"><strong>${text('牌义','Meaning')}</strong><br>${state.lang==='en' ? escapeHtml(meaning) : state.lang==='zh' ? escapeHtml(zhExplain) : `${escapeHtml(zhExplain)}<br><span class="en">${escapeHtml(meaning)}</span>`}</div>
    </div>
  </article>`;
}

function buildChineseMeaning(card, reversed, positionZh){
  const title = card.title_zh;
  const base = reversed ? card.meaning_reversed : card.meaning_upright;
  let posText = '';
  if(positionZh === '过去') posText = '这张牌说明过去的影响仍然在作用。';
  else if(positionZh === '现在') posText = '这张牌反映你现在最直接面对的能量。';
  else if(positionZh === '未来') posText = '这张牌代表照目前趋势发展，接下来可能出现的方向。';
  else if(positionZh === '现状') posText = '这张牌指出事情目前的核心状态。';
  else if(positionZh === '挑战') posText = '这张牌指出阻力、压力或目前最卡住的地方。';
  else if(positionZh === '隐藏影响') posText = '这张牌指出表面不明显、但正在影响结果的因素。';
  else if(positionZh === '建议') posText = '这张牌给你现在最值得参考的态度与做法。';
  else if(positionZh === '发展结果') posText = '这张牌代表照目前能量继续发展时，最可能靠近的结果。';
  const mode = reversed ? '逆位' : '正位';
  return `${posText}${title}${mode}的重点是「${(reversed?card.keywords_reversed:card.keywords_upright)}」。${simpleTranslateBase(base)}`;
}

function simpleTranslateBase(en){
  const map = [
    ['A leap into the unknown opens a new chapter.','代表一个新的篇章正在展开。'],
    ['Move carefully; impulsive choices or fear of beginning may block the path.','提醒你不要冲动，也不要因为害怕开始而停住。'],
    ['Not everything is visible yet; move with intuition.','现在事情还没有完全明朗，先跟随直觉慢慢看。'],
    ['Warmth, visibility, and confidence support the outcome.','这张牌带来明亮、肯定与更清晰的发展。'],
    ['An old chapter is closing so a new one can emerge.','旧阶段正在结束，为新阶段让出空间。'],
    ['A clear truth or decisive idea cuts through the fog.','有一个清楚的想法或真相正在浮现。'],
    ['Emotional wholeness and belonging are strongly present.','它强调情感上的满足、归属感与和谐。'],
    ['A practical new beginning is taking root.','一个现实层面的新开始正在慢慢落地。']
  ];
  const found = map.find(([k]) => en === k);
  return found ? found[1] : '它提醒你把这张牌的关键词放回你现在的情境里理解，答案会更贴近你。';
}

function buildSummary(){
  const zhPositions = ui.zh.positions[state.form.spread];
  const enPositions = ui.en.positions[state.form.spread];
  const results = state.drawn.map((item, i) => cardResultBlock(item, zhPositions[i], enPositions[i])).join('');
  const majors = state.drawn.filter(x => x.card.arcana === 'Major Arcana').length;
  const reversedCount = state.drawn.filter(x => x.reversed).length;
  const suitCount = state.drawn.reduce((acc, x) => {
    acc[x.card.suit] = (acc[x.card.suit]||0)+1;
    return acc;
  }, {});
  let zhSummary = `${ui.zh.focusIntro[state.form.topic]} `;
  let enSummary = `${ui.en.focusIntro[state.form.topic]} `;
  zhSummary += `这次牌阵里，大阿尔卡那有 ${majors} 张，逆位有 ${reversedCount} 张。`;
  enSummary += `This spread contains ${majors} Major Arcana card(s) and ${reversedCount} reversed card(s).`;
  if(suitCount.Cups){ zhSummary += ' 圣杯偏多，表示情绪与关系议题较突出。'; enSummary += ' Cups are prominent, highlighting emotional and relational themes.'; }
  if(suitCount.Wands){ zhSummary += ' 权杖偏多，表示行动力、热度与推进感很重要。'; enSummary += ' Wands are prominent, highlighting momentum, passion and action.'; }
  if(suitCount.Swords){ zhSummary += ' 宝剑偏多，表示沟通、压力或真相是关键。'; enSummary += ' Swords are prominent, pointing to communication, pressure or truth.'; }
  if(suitCount.Pentacles){ zhSummary += ' 星币偏多，表示现实、稳定与资源问题值得关注。'; enSummary += ' Pentacles are prominent, pointing to stability, resources and practical matters.'; }
  return `
    <div class="step-header">
      <div class="eyebrow">REVEAL</div>
      <h2>${text('你的占卜结果','Your reading result')}</h2>
      <p>${text('先看整体讯息，再慢慢读每一张牌。','Read the overall message first, then move through each card slowly.')}</p>
    </div>
    <div class="summary-box text-block">${state.lang==='en' ? escapeHtml(enSummary) : state.lang==='zh' ? escapeHtml(zhSummary) : `${escapeHtml(zhSummary)}<br><span class="en">${escapeHtml(enSummary)}</span>`}</div>
    <div class="result-grid">${results}</div>
    <div class="action-row"><button class="primary" onclick="restartReading()">${text('再抽一次','Start another reading')}</button></div>
  `;
}

function updateProgress(){
  const list = document.getElementById('progressList');
  list.innerHTML = currentUI().stepNames.map((name, i) => `
    <div class="progress-item ${i < state.step ? 'done' : i === state.step ? 'current' : ''}">
      <div class="progress-dot"></div>
      <div class="progress-text">${escapeHtml(name)}</div>
    </div>
  `).join('');
  document.getElementById('ritualText').innerHTML = state.lang === 'en' ? ui.en.ritual[state.step] : state.lang === 'zh' ? ui.zh.ritual[state.step] : `${ui.zh.ritual[state.step]}<br><span class="en">${ui.en.ritual[state.step]}</span>`;
}

function gotoStep(step){
  state.step = step;
  updateProgress();
  renderWizard();
}

function nextStep(){ gotoStep(Math.min(6, state.step + 1)); }
function prevStep(){ gotoStep(Math.max(0, state.step - 1)); }

function topicChoices(){
  return Object.entries(currentUI().topics).map(([key, val]) => `
    <button class="choice ${state.form.topic===key?'selected':''}" onclick="setTopic('${key}')">
      <div class="c-title">${state.lang==='en' ? ui.en.topics[key][0] : ui.zh.topics[key][0]}</div>
      <div class="c-desc">${state.lang==='en' ? ui.en.topics[key][1] : ui.zh.topics[key][1]}</div>
    </button>
  `).join('');
}

function setTopic(key){ state.form.topic = key; renderWizard(); }
function setSpread(n){ state.form.spread = n; renderWizard(); }
function setDeck(v){ state.form.deck = v; renderWizard(); }

function renderWizard(){
  const root = document.getElementById('wizard');
  const step = state.step;
  if(step === 0){
    root.innerHTML = `
      <div class="step active">
        <div class="step-header"><div class="eyebrow">STEP 1</div><h2>${text('你想问哪一种主题？','What is your reading about?')}</h2><p>${text('先决定主轴，让整个占卜更聚焦。','Choose a main focus so the reading feels more centered and intentional.')}</p></div>
        <div class="choice-grid">${topicChoices()}</div>
        <div class="action-row"><button class="primary" onclick="nextStep()">${text('继续','Continue')}</button></div>
      </div>`;
  }
  if(step === 1){
    root.innerHTML = `
      <div class="step active">
        <div class="step-header"><div class="eyebrow">STEP 2</div><h2>${text('把问题说清楚一点','State your question clearly')}</h2><p>${text('像真的面对塔罗师一样，把最想知道的事写出来。','Write your main question as if you were sitting in front of a tarot reader.')}</p></div>
        <div class="field"><label>${text('你的问题','Your question')}</label><textarea id="questionField" placeholder="${state.lang==='en'?'For example: What will happen between me and this person in the next three months?':'例如：我和这个人接下来三个月会怎么发展？'}">${escapeHtml(state.form.question)}</textarea></div>
        <div class="action-row"><button class="ghost" onclick="prevStep()">${text('返回','Back')}</button><button class="primary" onclick="saveQuestion()">${text('继续','Continue')}</button></div>
      </div>`;
  }
  if(step === 2){
    root.innerHTML = `
      <div class="step active">
        <div class="step-header"><div class="eyebrow">STEP 3</div><h2>${text('再补充一点背景','Add a little more context')}</h2><p>${text('不是必须，但加入时间范围、对象、背景后，结果会更贴近你。','Not required, but timeframe, person and context help the reading feel more specific.')}</p></div>
        <div class="inline">
          <div class="field"><label>${text('时间范围','Timeframe')}</label><input id="timeField" type="text" value="${escapeHtml(state.form.timeframe)}" placeholder="${state.lang==='en'?'Next month / next 3 months / this week':'例如：这周 / 接下来三个月'}"></div>
          <div class="field"><label>${text('相关对象','Person involved')}</label><input id="personField" type="text" value="${escapeHtml(state.form.person)}" placeholder="${state.lang==='en'?'ex-partner / crush / manager':'例如：喜欢的人 / 前任 / 上司'}"></div>
        </div>
        <div class="field"><label>${text('补充背景','Context')}</label><textarea id="contextField" placeholder="${state.lang==='en'?'For example: We are in no contact now, but I still want to know if reconciliation is possible.':'例如：我们现在没有联系，但我想知道还有没有复合可能。'}">${escapeHtml(state.form.context)}</textarea></div>
        <div class="action-row"><button class="ghost" onclick="prevStep()">${text('返回','Back')}</button><button class="primary" onclick="saveContext()">${text('继续','Continue')}</button></div>
      </div>`;
  }
  if(step === 3){
    root.innerHTML = `
      <div class="step active">
        <div class="step-header"><div class="eyebrow">STEP 4</div><h2>${text('选择牌阵与阅读方式','Choose your spread and reading style')}</h2><p>${text('你可以选单张、三张或五张，也可以决定是否使用逆位。','Choose one-card, three-card or five-card spread, and decide whether to use reversals.')}</p></div>
        <div class="card">
          <div class="choice-grid">
            ${[1,3,5].map(n => `<button class="choice ${state.form.spread===n?'selected':''}" onclick="setSpread(${n})"><div class="c-title">${state.lang==='en'?ui.en.spreadInfo[n][0]:ui.zh.spreadInfo[n][0]}</div><div class="c-desc">${state.lang==='en'?ui.en.spreadInfo[n][1]:ui.zh.spreadInfo[n][1]}</div></button>`).join('')}
          </div>
          <div class="inline" style="margin-top:16px">
            <div class="field"><label>${text('使用牌组','Deck')}</label>
              <select id="deckField">
                <option value="full" ${state.form.deck==='full'?'selected':''}>${state.lang==='en'?'Full deck · 78 cards':'完整牌组 · 78 张'}</option>
                <option value="major" ${state.form.deck==='major'?'selected':''}>${state.lang==='en'?'Major Arcana only':'仅大阿尔卡那'}</option>
                <option value="minor" ${state.form.deck==='minor'?'selected':''}>${state.lang==='en'?'Minor Arcana only':'仅小阿尔卡那'}</option>
              </select>
            </div>
            <div class="checks">
              <label class="check"><input id="reverseField" type="checkbox" ${state.form.reversals?'checked':''}> ${text('启用逆位','Use reversed cards')}</label>
            </div>
          </div>
        </div>
        <div class="action-row"><button class="ghost" onclick="prevStep()">${text('返回','Back')}</button><button class="primary" onclick="saveSpread()">${text('继续洗牌','Continue to shuffle')}</button></div>
      </div>`;
  }
  if(step === 4){
    root.innerHTML = `
      <div class="step active">
        <div class="step-header"><div class="eyebrow">STEP 5</div><h2>${text('洗牌前，先把问题放进牌里','Before shuffling, place your question into the deck')}</h2><p>${text('可以先闭上眼睛几秒。准备好后，再按下开始洗牌。','Close your eyes for a few seconds if you want. When ready, press shuffle.')}</p></div>
        <div class="center-stage">
          <div>
            <div class="shuffle-wrap">
              <div id="deckStack" class="deck-stack ${state.shuffling?'shuffling':''}">
                <div class="back-card"></div>
                <div class="back-card"></div>
                <div class="back-card"></div>
                <div class="back-card"></div>
              </div>
            </div>
            <p class="soft-text">${state.lang==='en' ? escapeHtml(state.form.question || 'Focus on your question.') : escapeHtml(state.form.question || '在心里专注你的问题。')}</p>
            <div class="action-row" style="justify-content:center">
              <button class="ghost" onclick="prevStep()">${text('返回','Back')}</button>
              <button class="primary" ${state.shuffling?'disabled':''} onclick="startShuffle()">${text(state.shuffling?'正在洗牌...':'开始洗牌', state.shuffling?'Shuffling...':'Start shuffle')}</button>
              <button class="secondary ${state.preparedDeck.length?'':'hidden'}" onclick="gotoStep(5)">${text('开始抽牌','Begin drawing')}</button>
            </div>
          </div>
        </div>
      </div>`;
  }
  if(step === 5){
    const positionsZh = ui.zh.positions[state.form.spread];
    const positionsEn = ui.en.positions[state.form.spread];
    root.innerHTML = `
      <div class="step active">
        <div class="step-header"><div class="eyebrow">STEP 6</div><h2>${text('一张一张翻开你的牌','Reveal your cards one by one')}</h2><p>${text('按顺序点击每个位置，慢慢抽，像真实塔罗占卜一样。','Click each position in order and reveal the cards slowly, like a real tarot reading.')}</p></div>
        <div class="draw-grid">
          ${positionsZh.map((posZh, i) => {
            const posEn = positionsEn[i];
            const drawn = state.drawn[i];
            return `<div class="draw-slot ${drawn?'done':''}">
              <div class="slot-label">${state.lang==='en'?posEn:state.lang==='zh'?posZh:`${posZh} · ${posEn}`}</div>
              <div class="card-frame ${drawn?'revealed':''}" onclick="revealCard(${i})">
                <div class="flip">
                  <div class="face back"></div>
                  <div class="face front">${drawn ? spriteArt(state.cards.findIndex(x => x.id===drawn.card.id), drawn.reversed) : ''}</div>
                </div>
              </div>
              <div class="slot-help">${drawn ? `${escapeHtml(drawn.card.title_en)}<br><span class="en">${escapeHtml(drawn.card.title_zh)} · ${drawn.reversed ? (state.lang==='en'?'Reversed':'逆位') : (state.lang==='en'?'Upright':'正位')}</span>` : text('点击翻牌','Tap to reveal')}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="action-row"><button class="ghost" onclick="gotoStep(4)">${text('返回洗牌','Back to shuffle')}</button>${state.drawn.length === state.form.spread ? `<button class="primary" onclick="gotoStep(6)">${text('查看结果','See result')}</button>` : ''}</div>
      </div>`;
  }
  if(step === 6){
    root.innerHTML = `<div class="step active">${buildSummary()}</div>`;
  }
}

function saveQuestion(){
  state.form.question = document.getElementById('questionField').value.trim();
  nextStep();
}
function saveContext(){
  state.form.timeframe = document.getElementById('timeField').value.trim();
  state.form.person = document.getElementById('personField').value.trim();
  state.form.context = document.getElementById('contextField').value.trim();
  nextStep();
}
function saveSpread(){
  state.form.deck = document.getElementById('deckField').value;
  state.form.reversals = document.getElementById('reverseField').checked;
  nextStep();
}

function startShuffle(){
  state.shuffling = true;
  renderWizard();
  setTimeout(() => {
    prepareDeck();
    state.shuffling = false;
    renderWizard();
  }, 2600);
}

function revealCard(slotIndex){
  if(state.step !== 5) return;
  if(slotIndex !== state.drawn.length) return;
  const card = state.preparedDeck[state.drawIndex];
  if(!card) return;
  const reversed = state.form.reversals ? Math.random() < 0.5 : false;
  state.drawn.push({card, reversed});
  state.drawIndex += 1;
  renderWizard();
}

function restartReading(){
  state.step = 0;
  state.form = {topic:'general', question:'', timeframe:'', person:'', context:'', spread:3, deck:'full', reversals:true};
  state.preparedDeck = [];
  state.drawIndex = 0;
  state.drawn = [];
  state.shuffling = false;
  updateProgress();
  renderWizard();
}

function downloadCard(card){
  const idx = state.cards.findIndex(x => x.id === card.id);
  const col = idx % 10;
  const row = Math.floor(idx / 10);
  const img = new Image();
  img.onload = () => {
    const cw = img.width / 10;
    const ch = img.height / 8;
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, col*cw, row*ch, cw, ch, 0, 0, cw, ch);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${card.title_en.toLowerCase().replace(/[^a-z0-9]+/g,'_')}.png`;
    a.click();
  };
  img.src = 'tarot_sprite.webp';
}

function renderGallery(){
  const q = (document.getElementById('searchInput').value || '').toLowerCase();
  const suit = document.getElementById('suitFilter').value;
  const items = state.cards.filter(card => {
    const hit = `${card.title_en} ${card.title_zh} ${card.suit}`.toLowerCase().includes(q);
    const okSuit = suit === 'all' || card.suit === suit || (suit === 'Major' && card.arcana === 'Major Arcana');
    return hit && okSuit;
  });
  document.getElementById('galleryGrid').innerHTML = items.length ? items.map(card => {
    const idx = state.cards.findIndex(x => x.id === card.id);
    return `<div class="g-card" onclick="downloadCardById('${card.id}')">
      <div class="mini-frame">${spriteArt(idx)}</div>
      <div class="name">${escapeHtml(card.title_en)}</div>
      <div class="zh">${escapeHtml(card.title_zh)}</div>
    </div>`;
  }).join('') : `<div class="empty">${text('没有符合条件的卡牌。','No cards matched your search.')}</div>`;
}

function downloadCardById(id){
  const card = state.cards.find(c => c.id === id);
  if(card) downloadCard(card);
}

async function init(){
  const res = await fetch('cards.json');
  state.cards = await res.json();
  document.getElementById('langBtn').addEventListener('click', () => {
    state.lang = state.lang === 'both' ? 'zh' : state.lang === 'zh' ? 'en' : 'both';
    updateProgress();
    renderWizard();
    renderGallery();
  });
  document.getElementById('restartBtn').addEventListener('click', restartReading);
  document.getElementById('searchInput').addEventListener('input', renderGallery);
  document.getElementById('suitFilter').addEventListener('change', renderGallery);
  updateProgress();
  renderWizard();
  renderGallery();
}

init();
