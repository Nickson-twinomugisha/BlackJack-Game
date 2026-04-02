let deck = [];
let playerHand = [];
let dealerHand = [];
let splitHand = [];
let balance = 1000;
let currentBet = 0;
let splitBet = 0;
let currentHand = 'player';
let canDouble = true;
let canSplit = false;
let insuranceTaken = false;

const suits = ['♠', '♥', '♦', '♣'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const LEVEL_XP = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3800, 5200, 7000, 9300, 12200, 15800, 20200, 25500, 32000, 40000, 50000, 62500];
const STREAK_BONUSES = { 3: '1.5x', 5: '2x', 7: '2.5x', 10: '3x', 15: '4x' };

const ACHIEVEMENTS = [
  { id: 'first_win', name: 'First Blood', desc: 'Win your first hand', icon: '🎯', condition: s => s.wins >= 1 },
  { id: 'blackjack_1', name: 'Lucky 21', desc: 'Get a blackjack', icon: '🃏', condition: s => s.blackjacks >= 1 },
  { id: 'hot_streak', name: 'On Fire', desc: 'Win 5 in a row', icon: '🔥', condition: s => s.bestStreak >= 5 },
  { id: 'veteran', name: 'High Roller', desc: 'Play 100 hands', icon: '🎰', condition: s => s.hands >= 100 },
  { id: 'big_winner', name: 'Whale', desc: 'Win $5000 in one hand', icon: '💰', condition: s => s.biggestWin >= 5000 },
  { id: 'lucky_7', name: 'Seven Heaven', desc: 'Win 7 in a row', icon: '7️⃣', condition: s => s.bestStreak >= 7 },
  { id: 'pro', name: 'Professional', desc: 'Reach level 10', icon: '⭐', condition: (_, p) => p.level >= 10 },
  { id: 'champion', name: 'Champion', desc: 'Reach level 20', icon: '🏆', condition: (_, p) => p.level >= 20 },
  { id: 'dealer_buster', name: 'House Crusher', desc: 'Bust the dealer 10 times', icon: '💥', condition: s => s.dealerBusts >= 10 },
  { id: 'streak_10', name: 'Unstoppable', desc: 'Win 10 in a row', icon: '⚡', condition: s => s.bestStreak >= 10 },
  { id: 'rich', name: 'Millionaire', desc: 'Accumulate $10,000', icon: '💎', condition: s => s.peakBalance >= 10000 },
  { id: 'perfectionist', name: 'Perfectionist', desc: 'Get 10 blackjacks', icon: '✨', condition: s => s.blackjacks >= 10 },
  { id: 'grinder', name: 'The Grinder', desc: 'Play 500 hands', icon: '⚙️', condition: s => s.hands >= 500 },
  { id: 'streak_15', name: 'God Mode', desc: 'Win 15 in a row', icon: '👑', condition: s => s.bestStreak >= 15 },
  { id: 'century', name: 'Century', desc: 'Play 1000 hands', icon: '🎯', condition: s => s.hands >= 1000 },
  { id: 'dedicated', name: 'Dedicated', desc: 'Win 500 hands', icon: '🎖️', condition: s => s.wins >= 500 },
];

let stats = loadStats();
let progression = loadProgression();

function loadStats() {
  const saved = localStorage.getItem('blackjack_stats');
  return saved ? JSON.parse(saved) : {
    hands: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0,
    biggestWin: 0, totalWon: 0, totalLost: 0, currentStreak: 0, bestStreak: 0,
    dealerBusts: 0, lastResult: null, peakBalance: 1000
  };
}

function loadProgression() {
  const saved = localStorage.getItem('blackjack_progression');
  return saved ? JSON.parse(saved) : {
    xp: 0, level: 1, achievements: [], unlockedThemes: ['default']
  };
}

function saveStats() { localStorage.setItem('blackjack_stats', JSON.stringify(stats)); }
function saveProgression() { localStorage.setItem('blackjack_progression', JSON.stringify(progression)); }

function getLevelXp(level) { return LEVEL_XP[Math.min(level, LEVEL_XP.length - 1)] || LEVEL_XP[LEVEL_XP.length - 1]; }
function getXpForNextLevel(level) { return (LEVEL_XP[Math.min(level, LEVEL_XP.length - 1)] || LEVEL_XP[LEVEL_XP.length - 1]) - (LEVEL_XP[Math.min(level - 1, LEVEL_XP.length - 1)] || 0); }

function addXP(amount) {
  progression.xp += amount;
  const xpNeeded = getXpForNextLevel(progression.level);
  while (progression.xp >= xpNeeded && progression.level < 20) {
    progression.xp -= xpNeeded;
    progression.level++;
    showLevelUp();
  }
  updateProgressionUI();
  saveProgression();
}

function showLevelUp() {
  const rewards = {
    5: 'Unlocked: Gold Card Back',
    10: 'Unlocked: Platinum Theme',
    15: 'Unlocked: Diamond Card Back',
    20: 'Unlocked: Legendary Theme'
  };
  document.getElementById('newLevelBadge').textContent = progression.level;
  document.getElementById('levelUpReward').textContent = rewards[progression.level] || 'Keep climbing!';
  document.getElementById('levelUpModal').classList.add('active');
}

function showXpPopup(amount) {
  const popup = document.createElement('div');
  popup.className = 'xp-popup';
  popup.textContent = `+${amount} XP`;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
}

function showStreakBonus(multiplier) {
  const bonus = document.createElement('div');
  bonus.className = 'streak-bonus';
  bonus.textContent = `${multiplier} STREAK BONUS!`;
  document.body.appendChild(bonus);
  setTimeout(() => bonus.remove(), 1500);
}

function checkAchievements() {
  const newUnlocks = [];
  ACHIEVEMENTS.forEach(a => {
    if (!progression.achievements.includes(a.id) && a.condition(stats, progression)) {
      progression.achievements.push(a.id);
      newUnlocks.push(a);
    }
  });
  if (newUnlocks.length > 0) {
    saveProgression();
    setTimeout(() => {
      const names = newUnlocks.map(a => `${a.icon} ${a.name}`).join('\n');
      alert(`🏆 Achievement${newUnlocks.length > 1 ? 's' : ''} Unlocked!\n\n${names}`);
    }, 500);
  }
}

function getStreakBonus(streak) {
  let bonus = 1;
  let multiplier = '';
  if (streak >= 15) { bonus = 4; multiplier = '4x'; }
  else if (streak >= 10) { bonus = 3; multiplier = '3x'; }
  else if (streak >= 7) { bonus = 2.5; multiplier = '2.5x'; }
  else if (streak >= 5) { bonus = 2; multiplier = '2x'; }
  else if (streak >= 3) { bonus = 1.5; multiplier = '1.5x'; }
  return { bonus, multiplier };
}

function updateStreakDisplay() {
  const streak = stats.currentStreak;
  const display = document.getElementById('streakDisplay');
  const emoji = document.getElementById('streakEmoji');
  const count = document.getElementById('streakCount');

  count.textContent = streak;
  if (streak >= 5) {
    display.className = 'streak-display streak-hot';
    emoji.textContent = '🔥';
  } else if (streak >= 3) {
    display.className = 'streak-display streak-hot';
    emoji.textContent = '🔥';
  } else {
    display.className = 'streak-display streak-neutral';
    emoji.textContent = streak > 0 ? '⬆️' : '⚖️';
  }

  const { multiplier } = getStreakBonus(streak);
  document.getElementById('bonusText').textContent = multiplier ? `Streak Bonus: ${multiplier}` : '';
}

function updateProgressionUI() {
  const xpNeeded = getXpForNextLevel(progression.level);
  
  document.getElementById('level').textContent = progression.level;
  document.getElementById('xp').textContent = progression.xp;
  document.getElementById('xpNeeded').textContent = xpNeeded;
  document.getElementById('levelProg').textContent = progression.level;
  document.getElementById('xpProg').textContent = progression.xp;
  document.getElementById('xpNeededProg').textContent = xpNeeded;
  document.getElementById('xpBar').style.width = `${(progression.xp / xpNeeded) * 100}%`;
}

function showStats() {
  document.getElementById('statHands').textContent = stats.hands;
  document.getElementById('statWins').textContent = stats.wins;
  document.getElementById('statLosses').textContent = stats.losses;
  document.getElementById('statPushes').textContent = stats.pushes;
  document.getElementById('statBlackjacks').textContent = stats.blackjacks;
  document.getElementById('statBiggestWin').textContent = stats.biggestWin;
  document.getElementById('statTotalWon').textContent = stats.totalWon;
  document.getElementById('statTotalLost').textContent = stats.totalLost;
  document.getElementById('statWinRate').textContent = stats.hands > 0 ? Math.round((stats.wins / stats.hands) * 100) + '%' : '0%';
  document.getElementById('statBestStreak').textContent = stats.bestStreak;
  document.getElementById('statCurrentStreak').textContent = stats.currentStreak;
  document.getElementById('statsModal').classList.add('active');
}

function showAchievements() {
  const grid = document.getElementById('achievementsGrid');
  grid.innerHTML = '';
  let unlocked = 0;
  ACHIEVEMENTS.forEach(a => {
    const isUnlocked = progression.achievements.includes(a.id);
    if (isUnlocked) unlocked++;
    const div = document.createElement('div');
    div.className = `achievement ${isUnlocked ? 'unlocked' : ''}`;
    div.innerHTML = `<div class="achievement-icon">${a.icon}</div><div class="achievement-name">${a.name}</div><div class="achievement-desc">${a.desc}</div>`;
    grid.appendChild(div);
  });
  document.getElementById('achievementCount').textContent = unlocked;
  document.getElementById('achievementTotal').textContent = ACHIEVEMENTS.length;
  document.getElementById('achievementsModal').classList.add('active');
}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function resetProgress() {
  if (confirm('Reset ALL progress? This cannot be undone!')) {
    localStorage.removeItem('blackjack_stats');
    localStorage.removeItem('blackjack_progression');
    stats = { hands: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0, biggestWin: 0, totalWon: 0, totalLost: 0, currentStreak: 0, bestStreak: 0, dealerBusts: 0, lastResult: null, peakBalance: 1000 };
    progression = { xp: 0, level: 1, achievements: [], unlockedThemes: ['default'] };
    balance = 1000;
    updateProgressionUI();
    updateStreakDisplay();
    document.getElementById('balance').textContent = balance;
  }
}

function createDeck() {
  deck = [];
  for (let suit of suits) {
    for (let value of values) {
      deck.push({ suit, value });
    }
  }
  shuffleDeck();
}

function shuffleDeck() {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function getCardValue(card) {
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return parseInt(card.value);
}

function calculateHandValue(hand) {
  let value = 0;
  let aces = 0;
  for (let card of hand) {
    value += getCardValue(card);
    if (card.value === 'A') aces++;
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

function createCardElement(card, hidden = false) {
  const div = document.createElement('div');
  const isRed = card.suit === '♥' || card.suit === '♦';
  div.className = `card ${isRed ? 'red' : 'black'} ${hidden ? '' : 'revealed'} dealing`;
  div.innerHTML = `
    <div class="card-value">${card.value}</div>
    <div class="card-suit">${card.suit}</div>
    <div class="card-value card-value-bottom">${card.value}</div>
  `;
  return div;
}

function renderHand(hand, containerId, scoreId, score) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  hand.forEach(card => {
    container.appendChild(createCardElement(card));
  });
  if (scoreId) {
    document.getElementById(scoreId).textContent = score < 21 ? `Score: ${score}` : `Score: ${score}`;
  }
}

function updateUI() {
  const playerValue = calculateHandValue(playerHand);
  document.getElementById('playerScore').textContent = `Score: ${playerValue}`;
  renderHand(playerHand, 'playerCards', null, playerValue);

  const dealerValue = calculateHandValue(dealerHand);
  const dealerSection = document.querySelector('.dealer-cards');
  dealerSection.classList.add('dealer-hidden');
  document.getElementById('dealerScore').textContent = dealerHand.length > 0 ? `Score: ${getCardValue(dealerHand[0])} + ?` : '';
  
  const container = document.getElementById('dealerCards');
  container.innerHTML = '';
  dealerHand.forEach((card, i) => {
    if (i === 0) {
      container.appendChild(createCardElement(card, false));
    } else if (dealerSection.classList.contains('dealer-hidden')) {
      container.appendChild(createCardElement(card, true));
    } else {
      container.appendChild(createCardElement(card, false));
    }
  });

  if (splitHand.length > 0) {
    document.getElementById('splitSection').classList.remove('hidden');
    const splitValue = calculateHandValue(splitHand);
    document.getElementById('splitScore').textContent = `Score: ${splitValue}`;
    renderHand(splitHand, 'splitCards', null, splitValue);
  }

  document.getElementById('balance').textContent = balance;
  document.getElementById('currentBet').textContent = currentBet;

  updateButtons();
}

function updateButtons() {
  const hitBtn = document.getElementById('hitBtn');
  const standBtn = document.getElementById('standBtn');
  const doubleBtn = document.getElementById('doubleBtn');
  const splitBtn = document.getElementById('splitBtn');
  const insuranceBtn = document.getElementById('insuranceBtn');

  if (currentHand === 'player') {
    hitBtn.disabled = false;
    standBtn.disabled = false;
    doubleBtn.disabled = !canDouble || balance < currentBet;
    splitBtn.classList.toggle('hidden', !canSplit || balance < currentBet);
    const canInsure = dealerHand.length >= 2 && dealerHand[0].value === 'A' && !insuranceTaken && playerHand.length === 2 && splitHand.length === 0;
    insuranceBtn.classList.toggle('hidden', !canInsure);
  } else if (currentHand === 'split') {
    hitBtn.disabled = false;
    standBtn.disabled = false;
    doubleBtn.disabled = splitHand.length !== 2 || balance < splitBet;
    splitBtn.classList.add('hidden');
    insuranceBtn.classList.add('hidden');
  } else {
    hitBtn.disabled = true;
    standBtn.disabled = true;
    doubleBtn.disabled = true;
    splitBtn.classList.add('hidden');
    insuranceBtn.classList.add('hidden');
  }
}

function placeBet() {
  const betAmount = Math.min(100, balance);
  if (betAmount <= 0) return;
  currentBet = betAmount;
  balance -= currentBet;
  startGame();
}

function startGame() {
  createDeck();
  playerHand = [];
  dealerHand = [];
  splitHand = [];
  currentHand = 'player';
  canDouble = true;
  canSplit = false;
  insuranceTaken = false;
  splitBet = 0;

  document.getElementById('betControls').classList.add('hidden');
  document.getElementById('gameControls').classList.remove('hidden');
  document.getElementById('splitSection').classList.add('hidden');
  document.getElementById('playerResult').innerHTML = '';
  document.getElementById('dealerResult').innerHTML = '';
  document.getElementById('splitResult').innerHTML = '';

  playerHand.push(deck.pop());
  dealerHand.push(deck.pop());
  playerHand.push(deck.pop());
  dealerHand.push(deck.pop());

  if (playerHand[0].value === playerHand[1].value && balance >= currentBet) {
    canSplit = true;
  }

  updateUI();

  if (dealerHand[0].value === 'A') {
    document.getElementById('insuranceBtn').classList.remove('hidden');
  }

  if (calculateHandValue(playerHand) === 21 && dealerHand[0].value !== 'A') {
    setTimeout(() => stand(), 500);
    return;
  }

  updateButtons();
}

function hit() {
  const hand = currentHand === 'player' ? playerHand : splitHand;
  hand.push(deck.pop());
  canDouble = false;
  
  const value = calculateHandValue(hand);
  
  if (value > 21) {
    if (currentHand === 'player') {
      showResult('player', 'Bust!', 'lose');
      recordLoss(currentBet);
      if (splitHand.length > 0) {
        currentHand = 'split';
      } else {
        endGame();
        updateUI();
        return;
      }
    } else {
      showResult('split', 'Bust!', 'lose');
      recordLoss(splitBet);
      const pVal = calculateHandValue(playerHand);
      if (pVal <= 21) {
        currentHand = 'dealer';
        dealerPlay();
        return;
      } else {
        endGame();
        updateUI();
        return;
      }
    }
  }
  updateUI();
}

function stand() {
  if (currentHand === 'player') {
    if (splitHand.length > 0) {
      currentHand = 'split';
    } else {
      currentHand = 'dealer';
      dealerPlay();
      return;
    }
  } else if (currentHand === 'split') {
    currentHand = 'dealer';
    dealerPlay();
    return;
  }
  updateUI();
}

function dealerPlay() {
  const dealerSection = document.querySelector('.dealer-cards');
  dealerSection.classList.remove('dealer-hidden');
  document.getElementById('dealerScore').textContent = `Score: ${calculateHandValue(dealerHand)}`;
  renderHand(dealerHand, 'dealerCards', null, calculateHandValue(dealerHand));

  while (calculateHandValue(dealerHand) < 17) {
    dealerHand.push(deck.pop());
    renderHand(dealerHand, 'dealerCards', null, calculateHandValue(dealerHand));
  }

  determineWinner();
}

function doubleDown() {
  const hand = currentHand === 'player' ? playerHand : splitHand;
  const bet = currentHand === 'player' ? currentBet : splitBet;
  
  if (balance < bet) return;
  
  balance -= bet;
  if (currentHand === 'player') {
    currentBet += bet;
  } else {
    splitBet += bet;
  }
  
  hand.push(deck.pop());
  canDouble = false;
  
  const value = calculateHandValue(hand);
  if (value > 21) {
    if (currentHand === 'player') {
      showResult('player', 'Bust!', 'lose');
      recordLoss(currentBet);
      if (splitHand.length > 0) {
        currentHand = 'split';
      } else {
        endGame();
        updateUI();
        return;
      }
    } else {
      showResult('split', 'Bust!', 'lose');
      recordLoss(splitBet);
      const pVal = calculateHandValue(playerHand);
      if (pVal <= 21) {
        currentHand = 'dealer';
        dealerPlay();
        return;
      } else {
        endGame();
        updateUI();
        return;
      }
    }
  } else {
    stand();
    return;
  }
  updateUI();
}

function split() {
  if (playerHand[0].value !== playerHand[1].value) return;
  if (balance < currentBet) return;

  splitHand.push(playerHand.pop());
  splitBet = currentBet;
  balance -= splitBet;
  canSplit = false;

  playerHand.push(deck.pop());
  splitHand.push(deck.pop());

  canDouble = true;

  updateUI();
}

function insurance() {
  if (dealerHand[0].value !== 'A') return;
  const insuranceAmount = Math.floor(currentBet / 2);
  if (balance < insuranceAmount) return;

  balance -= insuranceAmount;
  insuranceTaken = true;
  updateUI();

  if (dealerHand[1].value === '10' || dealerHand[1].value === 'J' || 
      dealerHand[1].value === 'Q' || dealerHand[1].value === 'K') {
    const dealerSection = document.querySelector('.dealer-cards');
    dealerSection.classList.remove('dealer-hidden');
    document.getElementById('dealerResult').innerHTML = '<div class="result win">Dealer has Blackjack! Insurance pays 2:1</div>';
    
    balance += insuranceAmount * 3;
    
    const pVal = calculateHandValue(playerHand);
    if (pVal === 21 && playerHand.length === 2) {
      balance += currentBet;
      showResult('player', 'Push - Both have Blackjack!', 'push');
      recordPush();
    } else {
      showResult('player', 'Dealer Blackjack! You lose.', 'lose');
      recordLoss(currentBet);
    }
    
    endGame();
  }
}

function showResult(hand, message, type) {
  const resultEl = document.getElementById(hand === 'player' ? 'playerResult' : 'splitResult');
  resultEl.innerHTML = `<div class="result ${type}">${message}</div>`;
}

function recordWin(amount, isBlackjack = false) {
  stats.hands++;
  stats.wins++;
  stats.currentStreak++;
  if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
  if (isBlackjack) stats.blackjacks++;
  stats.totalWon += amount;
  if (amount > stats.biggestWin) stats.biggestWin = amount;
  if (balance > stats.peakBalance) stats.peakBalance = balance;
  
  let xp = 10 + Math.floor(amount / 100);
  if (isBlackjack) xp += 25;
  xp *= getStreakBonus(stats.currentStreak).bonus;
  xp = Math.floor(xp);
  
  showXpPopup(xp);
  addXP(xp);
  
  if (getStreakBonus(stats.currentStreak).multiplier) {
    showStreakBonus(getStreakBonus(stats.currentStreak).multiplier);
  }
  
  checkAchievements();
  updateStreakDisplay();
  saveStats();
}

function recordLoss(amount) {
  stats.hands++;
  stats.losses++;
  stats.currentStreak = 0;
  if (amount > 0) stats.totalLost += amount;
  checkAchievements();
  updateStreakDisplay();
  saveStats();
}

function recordPush() {
  stats.hands++;
  stats.pushes++;
  stats.currentStreak = 0;
  addXP(5);
  updateStreakDisplay();
  saveStats();
}

function determineWinner() {
  const dealerValue = calculateHandValue(dealerHand);
  const playerValue = calculateHandValue(playerHand);
  const splitValue = splitHand.length > 0 ? calculateHandValue(splitHand) : 0;

  const pActive = playerValue <= 21;
  const sActive = splitHand.length > 0 && splitValue <= 21;

  if (dealerValue > 21) {
    document.getElementById('dealerResult').innerHTML = '<div class="result lose">Dealer busts!</div>';
    stats.dealerBusts++;
    
    if (pActive) {
      let winAmount = (playerValue === 21 && playerHand.length === 2) ? Math.floor(currentBet * 2.5) : currentBet * 2;
      balance += winAmount;
      showResult('player', 'You win!', 'win');
      recordWin(winAmount, playerValue === 21 && playerHand.length === 2);
    }
    
    if (sActive) {
      balance += splitBet * 2;
      showResult('split', 'You win!', 'win');
      recordWin(splitBet * 2, false);
    }
  } else if (dealerValue === 21 && dealerHand.length === 2) {
    document.getElementById('dealerResult').innerHTML = '<div class="result lose">Dealer Blackjack!</div>';
    
    if (pActive) {
      if (playerValue === 21 && playerHand.length === 2) {
        balance += currentBet;
        showResult('player', 'Push - Both have Blackjack!', 'push');
        recordPush();
      } else {
        showResult('player', 'You lose!', 'lose');
        recordLoss(currentBet);
      }
    }
    
    if (sActive) {
      if (splitValue === 21 && splitHand.length === 2) {
        balance += splitBet;
        showResult('split', 'Push!', 'push');
        recordPush();
      } else {
        showResult('split', 'You lose!', 'lose');
        recordLoss(splitBet);
      }
    }
  } else {
    if (pActive) {
      if (playerValue > dealerValue) {
        document.getElementById('playerResult').innerHTML = '<div class="result win">You win!</div>';
        let winAmount = (playerValue === 21 && playerHand.length === 2) ? Math.floor(currentBet * 2.5) : currentBet * 2;
        balance += winAmount;
        recordWin(winAmount, playerValue === 21 && playerHand.length === 2);
      } else if (playerValue === dealerValue) {
        document.getElementById('playerResult').innerHTML = '<div class="result push">Push!</div>';
        balance += currentBet;
        recordPush();
      } else {
        document.getElementById('playerResult').innerHTML = '<div class="result lose">Dealer wins!</div>';
        recordLoss(currentBet);
      }
    }

    if (sActive) {
      if (splitValue > dealerValue) {
        balance += splitBet * 2;
        showResult('split', 'You win!', 'win');
        recordWin(splitBet * 2, false);
      } else if (splitValue === dealerValue) {
        balance += splitBet;
        showResult('split', 'Push!', 'push');
        recordPush();
      } else {
        showResult('split', 'Dealer wins!', 'lose');
        recordLoss(splitBet);
      }
    }
  }

  endGame();
}

function endGame() {
  document.getElementById('gameControls').classList.add('hidden');
  document.getElementById('betControls').classList.remove('hidden');
  document.getElementById('balance').textContent = balance;
  currentHand = 'done';
  updateButtons();

  if (balance <= 0) {
    setTimeout(() => {
      if (confirm('Out of money! Start a new game?')) {
        balance = 1000;
        document.getElementById('balance').textContent = balance;
      }
    }, 1000);
  }
}

updateProgressionUI();
updateStreakDisplay();
