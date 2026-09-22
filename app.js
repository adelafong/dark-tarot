
const state = {
  lang: 'both',
  mode: 'reading',
  step: 0,
  form: {topic:'general', question:'', timeframe:'', person:'', context:'', spread:3, deck:'full', reversals:true},
  preparedDeck: [],
  drawIndex: 0,
  drawn: [],
  shuffling: false,
  countdown: 0,
  sound: true,
  volume: .38,
  audioCtx: null,
  masterGain: null,
  ambientNodes: [],
  ambientTimer: null,
  countdownTimer: null,
  dailyPool: [],
  dailySelected: null,
  cards: [],
  introEntered: false
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

function audio(){
  if(!state.audioCtx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    state.audioCtx = new AC();
    state.masterGain = state.audioCtx.createGain();
    state.masterGain.gain.value = state.sound ? state.volume : 0;
    state.masterGain.connect(state.audioCtx.destination);
  }
  if(state.audioCtx.state === 'suspended') state.audioCtx.resume();
  return state.audioCtx;
}

function setMasterVolume(){
  if(!state.masterGain) return;
  const target=state.sound ? state.volume : 0;
  state.masterGain.gain.setTargetAtTime(target,state.audioCtx.currentTime,.05);
}

function startAmbient(){
  const ctx=audio(); if(!ctx || state.ambientNodes.length) return;
  const anchor=ctx.createGain();
  anchor.gain.value=.0001;
  anchor.connect(state.masterGain);
  state.ambientNodes=[anchor];
  scheduleAmbientMelody();
}

function playAmbientBell(freq,when=0,duration=1.8,amp=.018){
  const ctx=audio(); if(!ctx || !state.sound) return;
  const osc=ctx.createOscillator();
  const overtone=ctx.createOscillator();
  const g=ctx.createGain();
  const filter=ctx.createBiquadFilter();
  osc.type='sine'; overtone.type='sine';
  osc.frequency.value=freq; overtone.frequency.value=freq*2.01;
  filter.type='lowpass'; filter.frequency.value=1800;
  const t=ctx.currentTime+when;
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(amp,t+.04);
  g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  osc.connect(filter); overtone.connect(filter); filter.connect(g); g.connect(state.masterGain);
  osc.start(t); overtone.start(t); osc.stop(t+duration+.05); overtone.stop(t+duration+.05);
}

function scheduleAmbientMelody(){
  if(state.ambientTimer) clearTimeout(state.ambientTimer);
  if(!state.sound || !state.ambientNodes.length) return;
  const scale=[220,261.63,329.63,246.94,196,293.66,329.63,261.63];
  const pattern=[0,2,1,4,5,3,6,1];
  let i=0;
  const phrase=()=>{
    if(!state.sound || !state.ambientNodes.length) return;
    const base=scale[pattern[i%pattern.length]];
    playAmbientBell(base,0,2.4,.012);
    if(i%2===0) playAmbientBell(base/2,.12,3,.007);
    if(i%4===3) playAmbientBell(base*1.5,.4,1.8,.006);
    i++;
    state.ambientTimer=setTimeout(phrase,1450+(i%3)*180);
  };
  phrase();
}

function stopAmbient(){
  if(state.ambientTimer){ clearTimeout(state.ambientTimer); state.ambientTimer=null; }
  state.ambientNodes.forEach(n=>{try{if(n.stop)n.stop()}catch(e){} try{if(n.disconnect)n.disconnect()}catch(e){}});
  state.ambientNodes=[];
}

function playTone(freq=520, duration=.09, gain=.035){
  const ctx = audio(); if(!ctx) return;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration);
  osc.connect(g); g.connect(state.masterGain);
  osc.start(); osc.stop(ctx.currentTime + duration);
}

function playFlipSound(){
  playTone(420,.055,.025);
  setTimeout(()=>playTone(720,.12,.018),45);
}

function playShuffleSound(){
  const ctx = audio(); if(!ctx) return;
  const length = Math.floor(ctx.sampleRate * .34);
  const buffer = ctx.createBuffer(1,length,ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<length;i++) data[i]=(Math.random()*2-1)*(1-i/length);
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type='bandpass'; filter.frequency.value=1450; filter.Q.value=.7;
  gain.gain.value=.026;
  src.buffer=buffer; src.connect(filter); filter.connect(gain); gain.connect(state.masterGain);
  src.start();
}

function pulseShuffleAudio(){
  if(!state.sound || !state.shuffling) return;
  playShuffleSound();
  setTimeout(pulseShuffleAudio, 420);
}

function setSoundLabel(){
  const b=document.getElementById('soundBtn');
  if(b) b.textContent = state.sound ? (state.lang==='en'?'MUSIC ON':'音乐 ON') : (state.lang==='en'?'MUSIC OFF':'音乐 OFF');
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

function cardStorySentence(item,posZh,posEn){
  const c=item.card;
  const kw=item.reversed?c.keywords_reversed:c.keywords_upright;
  const modeZh=item.reversed?'逆位':'正位';
  const modeEn=item.reversed?'reversed':'upright';
  const zhMap={
    '过去':'在故事的开端，','现在':'来到现在，','未来':'接下来，','现状':'这件事目前的核心是，','挑战':'真正的阻力在于，','隐藏影响':'表面之下，','建议':'牌给出的转折点是，','发展结果':'如果沿着现在的能量继续走，'
  };
  const enMap={
    'Past':'At the beginning of this story, ','Present':'In the present moment, ','Future':'From here, ','Current energy':'Right now, ','Situation':'At the heart of the situation, ','Challenge':'The main tension is that ','Hidden influence':'Under the surface, ','Advice':'The turning point comes through ','Likely outcome':'If the current energy continues, '
  };
  const zh=(zhMap[posZh]||'这一张牌显示，')+c.title_zh+modeZh+'带出「'+kw+'」的主题。'+buildChineseMeaning(c,item.reversed,posZh);
  const en=(enMap[posEn]||'This card shows that ')+c.title_en+' '+modeEn+' brings the theme of '+kw+'. '+(item.reversed?c.meaning_reversed:c.meaning_upright);
  return {zh,en};
}

function buildStoryNarrative(){
  const zhPos=ui.zh.positions[state.form.spread];
  const enPos=ui.en.positions[state.form.spread];
  const parts=state.drawn.map((item,i)=>cardStorySentence(item,zhPos[i],enPos[i]));
  const q=state.form.question?('你问的是「'+state.form.question+'」。'):'这次牌阵没有被一个单一问题限制，所以它更像是在描绘你目前的一段人生章节。';
  const qEn=state.form.question?('Your question is: “'+state.form.question+'.”'):'Because there is no single fixed question, this reading acts more like a portrait of your current chapter.';
  const context=state.form.context?('你补充的背景是：'+state.form.context+'。'):' ';
  const contextEn=state.form.context?('The context you gave is: '+state.form.context+'.'):' ';
  let zhOpening=q+' '+context+' '+ui.zh.focusIntro[state.form.topic];
  let enOpening=qEn+' '+contextEn+' '+ui.en.focusIntro[state.form.topic];

  let zhFlow=''; let enFlow='';
  if(state.form.spread===1){
    zhFlow='这不是一条复杂的时间线，而像是一盏灯照在当下。'+parts[0].zh+' 这张牌不是替你做决定，而是在指出今天最值得看清的一件事。';
    enFlow='This is not a long timeline; it is more like a lamp shining on the present. '+parts[0].en+' The card is not making the decision for you, but showing what deserves your attention most right now.';
  } else if(state.form.spread===3){
    zhFlow=parts[0].zh+' '+parts[1].zh+' 这表示过去留下的东西，正在现在这个节点上被重新面对。'+parts[2].zh+' 所以这三张牌连起来并不是三个孤立答案，而是一条从旧经验、当下选择，到下一阶段走向的连续故事。';
    enFlow=parts[0].en+' '+parts[1].en+' This suggests that something carried forward from the past is being confronted again in the present. '+parts[2].en+' Together, the three cards form one continuous story moving from prior experience, through the present choice, toward the next stage.';
  } else {
    zhFlow=parts[0].zh+' '+parts[1].zh+' '+parts[2].zh+' 这三张先把舞台搭好：你看到的表面问题，和真正推动它的力量并不完全相同。'+parts[3].zh+' 这里是整组牌最重要的转折，因为它说明你并不是只能被局势推着走。'+parts[4].zh+' 因此最后一张更像“目前道路的终点提示”，不是不能改变的命运。';
    enFlow=parts[0].en+' '+parts[1].en+' '+parts[2].en+' These first cards set the stage: the visible problem and the force actually driving it are not exactly the same. '+parts[3].en+' This is the key turning point of the spread, because it shows where you still have agency. '+parts[4].en+' The final card is therefore best read as the destination of the current road, not an unchangeable fate.';
  }

  const majors=state.drawn.filter(x=>x.card.arcana==='Major Arcana').length;
  const reversals=state.drawn.filter(x=>x.reversed).length;
  const zhTone=(majors>=2?'大阿尔卡那出现得比较多，说明这件事不只是短期情绪，而像是一个更重要的人生课题。':'这组牌更偏向日常层面的选择和调整，重点在具体行动。')+(reversals>=Math.ceil(state.drawn.length/2)?' 同时逆位偏多，表示很多能量目前不是直接向外发展，而是在内心、延迟、犹豫或尚未说出口的部分里发生。':' 整体能量相对外显，事情更容易通过行动、沟通或实际变化被看见。');
  const enTone=(majors>=2?'Several Major Arcana cards suggest that this is not only a passing mood, but part of a larger life lesson.':'The spread leans more toward everyday choices and practical adjustment, so concrete action matters here.')+(reversals>=Math.ceil(state.drawn.length/2)?' The number of reversals also suggests that much of the energy is internal, delayed, hesitant, or not yet fully expressed.':' The energy is relatively outward and visible, so change is more likely to show through action, communication, or practical developments.');

  const zhClose='把整组牌当成一个故事看，它真正强调的不是“事情一定会怎样”，而是“你现在站在哪里、什么正在推动你、以及你还能怎样回应”。这也是你目前最有力量的地方。';
  const enClose='Read as one story, the spread is less about “what must happen” and more about where you are now, what is moving the situation, and how you can still respond. That is where your agency remains.';

  return {zh:[zhOpening,zhFlow,zhTone,zhClose],en:[enOpening,enFlow,enTone,enClose]};
}

function buildSummary(){
  const zhPositions=ui.zh.positions[state.form.spread];
  const enPositions=ui.en.positions[state.form.spread];
  const results=state.drawn.map((item,i)=>cardResultBlock(item,zhPositions[i],enPositions[i])).join('');
  const story=buildStoryNarrative();
  const storyHtml=state.lang==='zh'
    ? story.zh.map(p=>'<p>'+escapeHtml(p)+'</p>').join('')
    : state.lang==='en'
      ? story.en.map(p=>'<p>'+escapeHtml(p)+'</p>').join('')
      : story.zh.map(p=>'<p>'+escapeHtml(p)+'</p>').join('')+'<div class="story-divider">✦</div>'+story.en.map(p=>'<p class="en">'+escapeHtml(p)+'</p>').join('');
  return `
    <div class="step-header">
      <div class="eyebrow">REVEAL</div>
      <h2>${text('你的完整故事解读','Your full narrative reading')}</h2>
      <p>${text('先把整组牌当成一段故事来读，再回到每张牌看细节。','Read the spread first as one continuous story, then return to each card for detail.')}</p>
    </div>
    <div class="story-reading">
      <div class="story-kicker">${text('整体故事线','THE STORYLINE')}</div>
      <div class="story-body">${storyHtml}</div>
    </div>
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
              ${state.countdown ? `<div class="countdown-orb"><span>${state.countdown}</span><small>${text('专注你的问题','Focus on your question')}</small><div class="countdown-actions"><button onclick="skipCountdown()">${text('跳过','Skip')}</button><button onclick="cancelCountdown()">${text('取消','Cancel')}</button></div></div>` : ''}
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

function beginShuffleNow(){
  if(state.countdownTimer){ clearInterval(state.countdownTimer); state.countdownTimer=null; }
  state.countdown=0;
  state.shuffling=true;
  renderWizard();
  playShuffleSound();
  setTimeout(pulseShuffleAudio,380);
  setTimeout(()=>{
    prepareDeck();
    state.shuffling=false;
    playTone(620,.18,.025);
    renderWizard();
  },3000);
}

function startShuffle(){
  if(state.shuffling || state.countdown) return;
  audio();
  state.countdown=3;
  renderWizard();
  state.countdownTimer=setInterval(()=>{
    playTone(300+(4-state.countdown)*70,.08,.018);
    state.countdown-=1;
    if(state.countdown>0){ renderWizard(); return; }
    clearInterval(state.countdownTimer);
    state.countdownTimer=null;
    beginShuffleNow();
  },1000);
}

function skipCountdown(){
  if(!state.countdown) return;
  beginShuffleNow();
}

function cancelCountdown(){
  if(state.countdownTimer){ clearInterval(state.countdownTimer); state.countdownTimer=null; }
  state.countdown=0;
  renderWizard();
}

function revealCard(slotIndex){
  if(state.step !== 5) return;
  if(slotIndex !== state.drawn.length) return;
  const card = state.preparedDeck[state.drawIndex];
  if(!card) return;
  playFlipSound();
  if(navigator.vibrate) navigator.vibrate(18);
  const reversed = state.form.reversals ? Math.random() < 0.5 : false;
  state.drawn.push({card, reversed});
  state.drawIndex += 1;
  renderWizard();
}



function enterSite(mode='reading'){
  state.introEntered=true;
  audio();
  startAmbient();
  playTone(240,.16,.018);
  setTimeout(()=>playTone(420,.22,.015),110);
  const gate=document.getElementById('introGate');
  document.body.classList.remove('intro-open');
  if(gate) gate.classList.add('closing');
  setTimeout(()=>{ if(gate) gate.remove(); },980);
  setMode(mode);
  window.scrollTo({top:0,behavior:'smooth'});
}

function localDateKey(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function secureShuffle(arr){
  const a=[...arr];
  if(window.crypto && crypto.getRandomValues){
    const buf=new Uint32Array(a.length);
    crypto.getRandomValues(buf);
    for(let i=a.length-1;i>0;i--){
      const j=buf[i]%(i+1);
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }
  return shuffle(a);
}

function getDailySaved(){
  try{
    const raw=localStorage.getItem('darkTarotDailyDraw');
    if(!raw) return null;
    const obj=JSON.parse(raw);
    return obj.date===localDateKey()?obj:null;
  }catch(e){ return null; }
}

function setMode(mode){
  state.mode=mode;
  const reading=document.getElementById('readingMode');
  const daily=document.getElementById('dailyMode');
  const gallery=document.getElementById('galleryPanel');
  reading.classList.toggle('hidden', mode!=='reading');
  daily.classList.toggle('hidden', mode!=='daily');
  gallery.classList.toggle('hidden', mode!=='reading');
  document.getElementById('readingModeBtn').classList.toggle('active',mode==='reading');
  document.getElementById('dailyModeBtn').classList.toggle('active',mode==='daily');
  if(mode==='daily') renderDaily();
}

function prepareDailyPool(){
  if(!state.dailyPool.length) state.dailyPool=secureShuffle(state.cards.map((card,index)=>({card,index})));
}

function dailyMeaning(card,reversed){
  const keywords=reversed?card.keywords_reversed:card.keywords_upright;
  const meaning=reversed?card.meaning_reversed:card.meaning_upright;
  const zh=buildChineseMeaning(card,reversed,'现在');
  return {keywords,meaning,zh};
}

function chooseDailyCard(slot){
  if(state.dailySelected) return;
  prepareDailyPool();
  const pick=state.dailyPool[slot];
  if(!pick) return;
  const reversed=Math.random()<.5;
  state.dailySelected={date:localDateKey(),cardId:pick.card.id,reversed,slot};
  localStorage.setItem('darkTarotDailyDraw',JSON.stringify(state.dailySelected));
  playFlipSound();
  if(navigator.vibrate) navigator.vibrate([18,35,18]);
  renderDaily();
}

function renderDaily(){
  const root=document.getElementById('dailyStage');
  if(!root) return;
  const saved=getDailySaved();
  if(saved) state.dailySelected=saved;
  prepareDailyPool();

  if(state.dailySelected){
    const card=state.cards.find(c=>c.id===state.dailySelected.cardId);
    if(!card){ localStorage.removeItem('darkTarotDailyDraw'); state.dailySelected=null; return renderDaily(); }
    const idx=state.cards.findIndex(c=>c.id===card.id);
    const m=dailyMeaning(card,state.dailySelected.reversed);
    const ori=state.dailySelected.reversed?text('逆位','Reversed'):text('正位','Upright');
    root.innerHTML=`
      <div class="daily-hero">
        <div class="eyebrow">DAILY DRAW</div>
        <h2>${text('今天，你抽到的是','Your card for today')}</h2>
        <p class="sub">${text('这张牌会保留到今天结束。明天再回来，会重新展开整副牌。','This card stays with you for the rest of today. Come back tomorrow for a new spread.')}</p>
      </div>
      <div class="daily-result">
        <div class="daily-card-large revealed">
          <div class="flip"><div class="face back"></div><div class="face front">${spriteArt(idx,state.dailySelected.reversed)}</div></div>
        </div>
        <div class="daily-message">
          <div class="badge">${ori}</div>
          <h2>${escapeHtml(card.title_en)}</h2>
          <div class="cn-name">${escapeHtml(card.title_zh)}</div>
          <div class="text-block"><strong>${text('今日关键词','Today’s keywords')}</strong><br>${escapeHtml(m.keywords)}</div>
          <div class="text-block" style="margin-top:12px"><strong>${text('今日讯息','Today’s message')}</strong><br>${state.lang==='en'?escapeHtml(m.meaning):state.lang==='zh'?escapeHtml(m.zh):`${escapeHtml(m.zh)}<br><span class="en">${escapeHtml(m.meaning)}</span>`}</div>
          <div class="daily-note">${text('把它当作今天值得留意的主题，而不是固定预言。','Use it as a theme to notice today rather than a fixed prediction.')}</div>
        </div>
      </div>`;
    return;
  }

  root.innerHTML=`
    <div class="daily-hero">
      <div class="eyebrow">DAILY DRAW</div>
      <h2>${text('每日一抽','One card for today')}</h2>
      <p class="sub">${text('不要急着选。左右滑动整副牌，停在最吸引你的那一张，然后点下去。','Do not rush. Move across the full deck, stop at the card that pulls you in, then tap it.')}</p>
    </div>
    <div class="daily-instruction">${text('78 张牌都在这里 · 凭第一直觉选择一张','All 78 cards are here · choose with your first instinct')}</div>
    <div class="daily-scroll">
      <div class="daily-fan">
        ${state.dailyPool.map((x,i)=>`<button class="daily-pick" style="--i:${i};--rot:${((i%13)-6)*0.45}deg" onclick="chooseDailyCard(${i})" aria-label="Choose card ${i+1}">
          <span class="mini-back"><span class="back-star">✦</span></span>
        </button>`).join('')}
      </div>
    </div>
    <div class="daily-hint">${text('提示：你看不到牌面，直到真正选中它。','You will not see the face until you actually choose it.')}</div>
  `;
}

function restartReading(){
  state.step = 0;
  state.form = {topic:'general', question:'', timeframe:'', person:'', context:'', spread:3, deck:'full', reversals:true};
  state.preparedDeck = [];
  state.drawIndex = 0;
  state.drawn = [];
  state.shuffling = false;
  state.countdown = 0;
  if(state.countdownTimer){ clearInterval(state.countdownTimer); state.countdownTimer=null; }
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
  const q=(document.getElementById('searchInput').value||'').toLowerCase();
  const suit=document.getElementById('suitFilter').value;
  const items=state.cards.filter(card=>{
    const hit=`${card.title_en} ${card.title_zh} ${card.suit}`.toLowerCase().includes(q);
    const okSuit=suit==='all'||card.suit===suit||(suit==='Major'&&card.arcana==='Major Arcana');
    return hit&&okSuit;
  });
  document.getElementById('galleryGrid').innerHTML=items.length?items.map(card=>{
    const idx=state.cards.findIndex(x=>x.id===card.id);
    return `<div class="g-card" onclick="openCardModal('${card.id}')">
      <div class="mini-frame">${spriteArt(idx)}</div>
      <div class="name">${escapeHtml(card.title_en)}</div>
      <div class="zh">${escapeHtml(card.title_zh)}</div>
    </div>`;
  }).join(''):`<div class="empty">${text('没有符合条件的卡牌。','No cards matched your search.')}</div>`;
}

function openCardModal(id){
  const card=state.cards.find(c=>c.id===id);
  if(!card) return;
  const idx=state.cards.findIndex(c=>c.id===id);
  const upZh=buildChineseMeaning(card,false,'现在');
  const revZh=buildChineseMeaning(card,true,'现在');
  const upText=state.lang==='en'?escapeHtml(card.meaning_upright):state.lang==='zh'?escapeHtml(upZh):escapeHtml(upZh)+'<br><span class="en">'+escapeHtml(card.meaning_upright)+'</span>';
  const revText=state.lang==='en'?escapeHtml(card.meaning_reversed):state.lang==='zh'?escapeHtml(revZh):escapeHtml(revZh)+'<br><span class="en">'+escapeHtml(card.meaning_reversed)+'</span>';
  const html='<div class="card-detail-layout">'+
    '<div class="card-detail-art">'+spriteArt(idx)+'</div>'+
    '<div class="card-detail-copy">'+
      '<div class="eyebrow">'+escapeHtml(card.arcana)+' · '+escapeHtml(card.suit||'')+'</div>'+
      '<h2>'+escapeHtml(card.title_en)+'</h2>'+
      '<div class="cn-name">'+escapeHtml(card.title_zh)+'</div>'+
      '<div class="meaning-block"><h3>'+text('正位','Upright')+'</h3><div class="keywords">'+escapeHtml(card.keywords_upright)+'</div><p>'+upText+'</p></div>'+
      '<div class="meaning-block"><h3>'+text('逆位','Reversed')+'</h3><div class="keywords">'+escapeHtml(card.keywords_reversed)+'</div><p>'+revText+'</p></div>'+
      '<div class="action-row"><button class="primary" onclick="downloadCardById(\''+card.id+'\')">'+text('下载这张牌','Download this card')+'</button><button class="ghost" onclick="closeCardModal()">'+text('关闭','Close')+'</button></div>'+
    '</div></div>';
  document.getElementById('cardModalContent').innerHTML=html;
  const modal=document.getElementById('cardModal');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}

function closeCardModal(){
  const modal=document.getElementById('cardModal');
  if(!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
}

function downloadCardById(id){
  const card=state.cards.find(c=>c.id===id);
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
    renderDaily();
    setSoundLabel();
  });
  document.getElementById('soundBtn').addEventListener('click', () => {
    state.sound = !state.sound;
    audio();
    setMasterVolume();
    if(state.sound){ startAmbient(); playTone(520,.09,.02); } else { stopAmbient(); }
    setSoundLabel();
  });
  const volumeSlider=document.getElementById('volumeSlider');
  if(volumeSlider){
    volumeSlider.value=Math.round(state.volume*100);
    volumeSlider.addEventListener('input',e=>{
      state.volume=Number(e.target.value)/100;
      audio();
      setMasterVolume();
    });
  }
  document.getElementById('restartBtn').addEventListener('click', restartReading);
  document.getElementById('readingModeBtn').addEventListener('click',()=>setMode('reading'));
  document.getElementById('dailyModeBtn').addEventListener('click',()=>setMode('daily'));
  const enterReading=document.getElementById('enterReadingBtn');
  const enterDaily=document.getElementById('enterDailyBtn');
  if(enterReading) enterReading.addEventListener('click',()=>enterSite('reading'));
  if(enterDaily) enterDaily.addEventListener('click',()=>enterSite('daily'));
  document.getElementById('searchInput').addEventListener('input', renderGallery);
  document.getElementById('suitFilter').addEventListener('change', renderGallery);
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeCardModal(); });
  document.body.classList.add('intro-open');
  updateProgress();
  setSoundLabel();
  renderWizard();
  renderGallery();
  renderDaily();
  setMode(state.mode);
}

init();
