const G1_DATA = [
{ emoji:'🐱', answer:'Cat',    choices:['Cat','Dog','Bird','Fish'] },
{ emoji:'🍎', answer:'Apple',  choices:['Mango','Apple','Grape','Orange'] },
{ emoji:'🚗', answer:'Car',    choices:['Boat','Plane','Car','Train'] },
{ emoji:'📚', answer:'Book',   choices:['Book','Pen','Ruler','Bag'] },
{ emoji:'🌙', answer:'Moon',   choices:['Sun','Star','Moon','Cloud'] },
{ emoji:'🐘', answer:'Elephant', choices:['Tiger','Elephant','Rabbit','Horse'] },
{ emoji:'🍕', answer:'Pizza',  choices:['Burger','Pizza','Sushi','Pasta'] },
{ emoji:'🌊', answer:'Wave',   choices:['River','Wave','Lake','Rain'] },
];

const G2_DATA = [
{ words:['Apple','Banana','Grape','Carrot'], odd:'Carrot', hint:'Category: Fruits vs Vegetables' },
{ words:['Red','Blue','Green','Circle'],     odd:'Circle', hint:'Category: Colors vs Shapes' },
{ words:['Cat','Dog','Fish','Eagle'],         odd:'Eagle',  hint:'Category: Ground pets vs Birds' },
{ words:['Happy','Sad','Angry','Running'],   odd:'Running', hint:'Category: Emotions vs Actions' },
{ words:['Rose','Tulip','Daisy','Bamboo'],   odd:'Bamboo', hint:'Category: Flowers vs Trees' },
{ words:['January','March','Monday','July'], odd:'Monday',  hint:'Category: Months vs Days' },
{ words:['Piano','Guitar','Drum','Painting'],odd:'Painting',hint:'Category: Musical Instruments vs Art' },
{ words:['Swim','Run','Jump','Sleep'],       odd:'Sleep',   hint:'Category: Active sports vs Rest' },
];

const G3_DATA = [
{ id:'Kucing',   answer:'Cat',     choices:['Cat','Cow','Car'] },
{ id:'Buku',     answer:'Book',    choices:['Book','Cook','Look'] },
{ id:'Rumah',    answer:'House',   choices:['Horse','House','Mouse'] },
{ id:'Pohon',    answer:'Tree',    choices:['Free','Three','Tree'] },
{ id:'Langit',   answer:'Sky',     choices:['Sea','Sky','Shy'] },
{ id:'Bunga',    answer:'Flower',  choices:['Flour','Flower','Power'] },
{ id:'Matahari', answer:'Sun',     choices:['Gun','Fun','Sun'] },
{ id:'Ikan',     answer:'Fish',    choices:['Dish','Fish','Wish'] },
];

// STATE
let gameMode = 1;
let players = [{ name: "Player 1", score: 0 }, { name: "Player 2", score: 0 }];
let currentPlayerIdx = 0;
let currentGame = null;
let currentQ = 0;
let roundScore = 0;
let currentData = [];
let waitingNext = false;

let g3AnimId = null;
let g3Y = 0;
let g3TimerStart = 0;
let g3Duration = 0;
let g3Answered = false;
let g3ArenaH = 0;

const LEADERBOARD_KEY = 'echa_english_leaderboard';

// LOCAL STORAGE LEADERBOARD
function loadLeaderboard() {
try {
const data = localStorage.getItem(LEADERBOARD_KEY);
return data ? JSON.parse(data) : [];
} catch (e) { return []; }
}

function saveLeaderboard(entry) {
const scores = loadLeaderboard();
scores.push({
...entry,
timestamp: new Date().toISOString(),
id: Date.now() + '_' + Math.random().toString(36).substr(2, 9)
});
if (scores.length > 100) scores.shift();
try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(scores)); }
catch (e) { console.warn('Failed to save:', e); }
return scores;
}

function clearLeaderboard() {
if (confirm('Are you sure you want to clear all saved scores? 🗑️')) {
localStorage.removeItem(LEADERBOARD_KEY);
renderLeaderboard('all');
}
}

function getGameLabel(type) {
const labels = { game1: '🖼️ Picture', game2: '🔍 Odd One', game3: '⚡ Translate' };
return labels[type] || type;
}

function getGameTagClass(type) {
const classes = { game1: 'tag-game1', game2: 'tag-game2', game3: 'tag-game3' };
return classes[type] || 'tag-game1';
}

function formatDate(iso) {
const d = new Date(iso);
return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}

let currentLeaderboardFilter = 'all';

function renderLeaderboard(filter) {
currentLeaderboardFilter = filter;
const scores = loadLeaderboard();
const tbody = document.getElementById('leaderboardBody');
const emptyMsg = document.getElementById('emptyLeaderboardMsg');

document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
document.getElementById('filter-' + filter)?.classList.add('active');

let filtered = scores;
if (filter !== 'all') filtered = scores.filter(s => s.gameType === filter);
filtered.sort((a, b) => b.score - a.score);

if (filtered.length === 0) {
tbody.innerHTML = '';
emptyMsg.style.display = 'block';
return;
}

emptyMsg.style.display = 'none';
tbody.innerHTML = filtered.map((s, i) => {
const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
return `
<tr>
<td class="${rankClass}">${medal}</td>
<td><strong>${s.playerName}</strong></td>
<td><span class="game-tag ${getGameTagClass(s.gameType)}">${getGameLabel(s.gameType)}</span></td>
<td><strong>${s.score}</strong> pts</td>
<td style="font-size:0.78rem; color:#8c2060;">${formatDate(s.timestamp)}</td>
</tr>
`;
}).join('');
}

function showLeaderboard() {
renderLeaderboard(currentLeaderboardFilter);
showPage('leaderboard');
}

function filterLeaderboard(filter) {
renderLeaderboard(filter);
}

// NAVIGATION
function showPage(id) {
document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
document.getElementById(id).classList.add('active');
const isLobby = (id === 'lobby');
document.getElementById('backBtn').style.display = isLobby ? 'none' : 'inline-block';
}

function goLobby() {
if (g3AnimId) { cancelAnimationFrame(g3AnimId); g3AnimId = null; }
waitingNext = false;
showPage('lobby');
}

function updateGlobalScoreUI() {
document.getElementById('globalP1Score').innerText = players[0].score;
document.getElementById('globalP2Score').innerText = players[1].score;
}

function updateTurnDisplay() {
const turnDiv = document.getElementById('turnIndicator');
if (gameMode === 2) {
turnDiv.style.display = 'block';
turnDiv.innerText = `🎀 Turn: ${players[currentPlayerIdx].name} 🎀`;
} else {
turnDiv.style.display = 'none';
}
}

// MODALS
function openModeSelector() {
document.getElementById('modeModal').classList.add('active');
}

function chooseGameMode(mode) {
gameMode = mode;
document.getElementById('modeModal').classList.remove('active');
players = [{ name: "Player 1", score: 0 }, { name: "Player 2", score: 0 }];
currentPlayerIdx = 0;
updateGlobalScoreUI();

const p2Input = document.getElementById('player2Name');
if (mode === 2) {
p2Input.style.display = 'block';
p2Input.placeholder = "Player 2 name (e.g. Bestie)";
} else {
p2Input.style.display = 'none';
}
document.getElementById('player1Name').value = "";
if (mode === 2) document.getElementById('player2Name').value = "";
document.getElementById('nameModal').classList.add('active');
}

function confirmPlayersStart() {
const p1Val = document.getElementById('player1Name').value.trim();
players[0].name = p1Val !== "" ? p1Val : "Player 1";

if (gameMode === 2) {
const p2Val = document.getElementById('player2Name').value.trim();
players[1].name = p2Val !== "" ? p2Val : "Player 2";
} else {
players[1].name = "";
players[1].score = 0;
}

document.getElementById('nameModal').classList.remove('active');
updateGlobalScoreUI();
showPage('lobby');

// Show welcome message
const welcomeDiv = document.getElementById('welcomeName');
if (gameMode === 1) {
welcomeDiv.innerHTML = `👋 Welcome, <strong>${players[0].name}</strong>! Ready to play? 🎮`;
} else {
welcomeDiv.innerHTML = `👋 Welcome, <strong>${players[0].name}</strong> & <strong>${players[1].name}</strong>! Let's compete! 🎮`;
}
}

// GAME ROUTER
function launchGame(game) {
if (waitingNext) return;
if (g3AnimId) { cancelAnimationFrame(g3AnimId); g3AnimId = null; }
currentGame = game;
currentQ = 0;
roundScore = 0;
waitingNext = false;

if (game === 'game1') currentData = shuffle([...G1_DATA]).slice(0, 5);
else if (game === 'game2') currentData = shuffle([...G2_DATA]).slice(0, 5);
else if (game === 'game3') currentData = shuffle([...G3_DATA]).slice(0, 5);

showPage(game);
updateTurnDisplay();

if (game === 'game1') startG1();
else if (game === 'game2') startG2();
else if (game === 'game3') startG3();
}

function restartGameRound() {
if (gameMode === 2) {
currentPlayerIdx = 0;
roundScore = 0;
updateTurnDisplay();
}
launchGame(currentGame);
}

// FEEDBACK
function flash(ok) {
const el = document.getElementById('feedbackOverlay');
el.textContent = ok ? '✅' : '❌';
el.style.opacity = '1';
setTimeout(() => el.style.opacity = '0', 600);
}

function markBtn(btn, ok) {
btn.classList.add(ok ? 'correct' : 'wrong');
}

function disableAll(container) {
container.querySelectorAll('button').forEach(b => b.disabled = true);
}

// GAME 1 — Picture Word Match
function startG1() {
showG1Question();
}

function showG1Question() {
const q = currentData[currentQ];
document.getElementById('g1Counter').textContent = `Question ${currentQ + 1} / 5`;
document.getElementById('g1Progress').style.width = `${(currentQ + 1) * 20}%`;

const emojiBox = document.getElementById('g1Emoji');
emojiBox.textContent = q.emoji;
emojiBox.style.animation = 'none'; emojiBox.offsetHeight;
emojiBox.style.animation = 'popIn 0.35s ease';

const container = document.getElementById('g1Choices');
container.innerHTML = '';
shuffle([...q.choices]).forEach(word => {
const btn = document.createElement('button');
btn.className = 'choice-btn';
btn.textContent = word;
btn.onclick = () => handleG1(btn, word, q.answer, container);
container.appendChild(btn);
});
}

function handleG1(btn, chosen, answer, container) {
if (waitingNext) return;
waitingNext = true;
disableAll(container);
const ok = chosen === answer;
markBtn(btn, ok);
if (!ok) {
container.querySelectorAll('button').forEach(b => { if (b.textContent === answer) markBtn(b, true); });
}
flash(ok);
if (ok) { roundScore++; players[currentPlayerIdx].score += 10; updateGlobalScoreUI(); }
setTimeout(() => {
currentQ++;
waitingNext = false;
if (currentQ < 5) showG1Question();
else finishRound();
}, 900);
}

// GAME 2 — Odd One Out
function startG2() {
showG2Question();
}

function showG2Question() {
const q = currentData[currentQ];
document.getElementById('g2Counter').textContent = `Question ${currentQ + 1} / 5`;
document.getElementById('g2Progress').style.width = `${(currentQ + 1) * 20}%`;
document.getElementById('g2Hint').textContent = `💡 Hint: ${q.hint}`;

const container = document.getElementById('g2Choices');
container.innerHTML = '';
shuffle([...q.words]).forEach(word => {
const btn = document.createElement('button');
btn.className = 'choice-btn odd-btn';
btn.textContent = word;
btn.onclick = () => handleG2(btn, word, q.odd, container);
container.appendChild(btn);
});
}

function handleG2(btn, chosen, odd, container) {
if (waitingNext) return;
waitingNext = true;
disableAll(container);
const ok = chosen === odd;
markBtn(btn, ok);
if (!ok) {
container.querySelectorAll('button').forEach(b => { if (b.textContent === odd) markBtn(b, true); });
}
flash(ok);
if (ok) { roundScore++; players[currentPlayerIdx].score += 10; updateGlobalScoreUI(); }
setTimeout(() => {
currentQ++;
waitingNext = false;
if (currentQ < 5) showG2Question();
else finishRound();
}, 900);
}

// GAME 3 — Quick Translate Catch
function startG3() {
showG3Question();
}

function showG3Question() {
if (g3AnimId) { cancelAnimationFrame(g3AnimId); g3AnimId = null; }
const q = currentData[currentQ];
g3Answered = false;
waitingNext = false;

document.getElementById('g3Counter').textContent = `Question ${currentQ + 1} / 5`;
document.getElementById('g3Progress').style.width = `${(currentQ + 1) * 20}%`;

const arena = document.getElementById('g3Arena');
g3ArenaH = arena.clientHeight;
const wordEl = document.getElementById('g3FallingWord');
wordEl.textContent = q.id;
g3Y = -10;
wordEl.style.top = g3Y + 'px';

g3Duration = 5000;
g3TimerStart = performance.now();
const timeFill = document.getElementById('g3TimeFill');
timeFill.className = 'time-fill';
timeFill.style.width = '100%';

const container = document.getElementById('g3Choices');
container.innerHTML = '';
shuffle([...q.choices]).forEach(word => {
const btn = document.createElement('button');
btn.className = 'choice-btn';
btn.textContent = word;
btn.onclick = () => handleG3(btn, word, q.answer, container);
container.appendChild(btn);
});

g3AnimId = requestAnimationFrame(animateG3);
}

function animateG3(ts) {
if (g3Answered || waitingNext) return;
const elapsed = ts - g3TimerStart;
const pct = Math.max(0, 1 - elapsed / g3Duration);
const timeFill = document.getElementById('g3TimeFill');
timeFill.style.width = (pct * 100) + '%';
if (pct < 0.3) timeFill.className = 'time-fill danger';

const wordEl = document.getElementById('g3FallingWord');
g3Y = (elapsed / g3Duration) * (g3ArenaH - 60);
wordEl.style.top = Math.min(g3Y, g3ArenaH - 60) + 'px';

if (elapsed >= g3Duration) {
g3Answered = true;
waitingNext = true;
const container = document.getElementById('g3Choices');
const q = currentData[currentQ];
container.querySelectorAll('button').forEach(b => { if (b.textContent === q.answer) markBtn(b, true); });
disableAll(container);
flash(false);
setTimeout(() => {
currentQ++;
waitingNext = false;
currentQ < 5 ? showG3Question() : finishRound();
}, 900);
return;
}
g3AnimId = requestAnimationFrame(animateG3);
}

function handleG3(btn, chosen, answer, container) {
if (g3Answered || waitingNext) return;
g3Answered = true;
waitingNext = true;
cancelAnimationFrame(g3AnimId); g3AnimId = null;
disableAll(container);
const ok = chosen === answer;
markBtn(btn, ok);
if (!ok) container.querySelectorAll('button').forEach(b => { if (b.textContent === answer) markBtn(b, true); });
flash(ok);
if (ok) { roundScore++; players[currentPlayerIdx].score += 10; updateGlobalScoreUI(); }
setTimeout(() => {
currentQ++;
waitingNext = false;
currentQ < 5 ? showG3Question() : finishRound();
}, 900);
}

// RESULT
function finishRound() {
const pointsEarned = roundScore * 10;
updateGlobalScoreUI();

if (gameMode === 2) {
if (currentPlayerIdx === 0) {
currentPlayerIdx = 1;
updateTurnDisplay();
launchGame(currentGame);
return;
}
}
showFinalResult();
}

function showFinalResult() {
const pct = roundScore / 5;
let emoji, title;
if (pct === 1)      { emoji = '🏆'; title = 'Perfect Score! Amazing!'; }
else if (pct >= 0.8){ emoji = '🎉'; title = 'Excellent Work!'; }
else if (pct >= 0.6){ emoji = '😊'; title = 'Good Job, Keep Going!'; }
else if (pct >= 0.4){ emoji = '💪'; title = 'You Can Do Better!'; }
else                 { emoji = '📚'; title = 'Keep Practicing!'; }

const activePlayer = players[currentPlayerIdx];

document.getElementById('resultEmoji').textContent = emoji;
document.getElementById('resultTitle').textContent = gameMode === 2 ? `${activePlayer.name} finished round! ✨` : title;
document.getElementById('resultScore').textContent = `🎯 Round score: ${roundScore} / 5  (${roundScore * 10} points)`;

if (gameMode === 2) {
document.getElementById('resultTotal').textContent = `🏆 ${players[0].name}: ${players[0].score}  |  ${players[1].name}: ${players[1].score}`;
} else {
document.getElementById('resultTotal').textContent = `⭐ Your total: ${players[0].score} points`;
}

const scoreEntry = {
playerName: activePlayer.name,
gameType: currentGame,
score: roundScore * 10,
correctAnswers: roundScore,
totalQuestions: 5,
gameMode: gameMode === 1 ? 'Single' : 'Multiplayer'
};
saveLeaderboard(scoreEntry);
document.getElementById('savedNotice').innerHTML = `💾 Score saved to Leaderboard! 🏆`;

showPage('result');
waitingNext = false;
}

// UTILS
function shuffle(arr) {
for (let i = arr.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[arr[i], arr[j]] = [arr[j], arr[i]];
}
return arr;
}

// INIT
window.launchGame = launchGame;
window.handleAnswer = () => {};
window.restartGameRound = restartGameRound;
window.goLobby = goLobby;
window.openModeSelector = openModeSelector;
window.chooseGameMode = chooseGameMode;
window.confirmPlayersStart = confirmPlayersStart;
window.showLeaderboard = showLeaderboard;
window.filterLeaderboard = filterLeaderboard;
window.clearLeaderboard = clearLeaderboard;

window.onload = () => {
openModeSelector();
updateGlobalScoreUI();
};