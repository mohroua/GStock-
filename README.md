<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<link rel="manifest" href="/manifest.json">

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>📖 رفيق الحافظ</title>

<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#00897b">
<meta name="color-scheme" content="light dark"> 
<style>
:root {
  --primary-color: #00897b;
  --secondary-color: #26a69a;
  --light-bg: #f9fdfa;
  --dark-bg: #1e272e; /* خلفية الوضع الداكن */
  --card-bg: #ffffff;
  --card-bg-dark: #2c3e50; /* خلفية البطاقة الداكنة */
  --dark-text: #2c3e50;
  --white-text: #ffffff;
  --alert-color: #e74c3c;
  --focus-color: #fdd835;
  --shadow-color: rgba(0,0,0,0.1);
}
body {
  font-family: 'Tahoma','Arial',sans-serif;
  background-color: var(--light-bg);
  color: var(--dark-text);
  margin:0; padding:20px;
  text-align:center;
  direction: rtl; /* تأكيد الاتجاه */
  transition:background-color .4s, color .4s;
}
.dark-mode {
  background-color: var(--dark-bg);
  color: #f1f1f1;
}
.dark-mode .hifz-tool-container {
    background-color: var(--card-bg-dark);
    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
}
.dark-mode .input-group label {
    color: var(--secondary-color);
}
.dark-mode select, .dark-mode input {
    background-color: #444;
    color: #f1f1f1;
    border-color: #666;
}
.dark-mode .timer-display {
    background: #331f1f;
    color: var(--alert-color);
}
.dark-mode #instruction-area {
    background: #34495e;
}
.hifz-tool-container {
  max-width:600px;margin:30px auto;
  padding:30px;border-radius:15px;
  background-color:var(--card-bg);
  box-shadow:0 10px 30px var(--shadow-color);
  border-top:6px solid var(--primary-color);
}
h2 {
  color:var(--primary-color);
  margin-bottom:20px;
  font-size:1.8em;
}
.input-group{text-align:right;margin-bottom:12px;}
.input-group label{color:var(--primary-color);font-weight:bold;}
select,input{
  width:100%;padding:10px;margin-top:5px;
  border:1px solid #ccc;border-radius:8px;
}
.timer-display{
  font-size:3em;font-weight:bold;color:var(--alert-color);
  margin:20px auto;padding:15px;border:2px solid var(--alert-color);
  border-radius:12px;background:#fff3e0;
  width:max-content;
}
#instruction-area{
  background:#e0f2f1;border-right:5px solid var(--secondary-color);
  border-radius:10px;padding:15px;margin:20px 0;text-align:right;
}
.dark-mode #instruction-area #current-instruction {
    color: #f1f1f1;
}

button{
  padding:12px 20px;border:none;border-radius:30px;
  font-weight:bold;margin:5px;cursor:pointer;
  color:var(--white-text);transition:.2s;
}
button:hover{transform:scale(1.05);}
#start-btn{background:var(--primary-color);}
#recite-btn{background:#3498db;}
#reset-btn{background:var(--alert-color);}
.conf-btn{
  padding:10px 15px;margin:5px;border-radius:8px;color:white;
}
#conf-perfect{background:#2ecc71;}
#conf-partial{background:#f1c40f;}
#conf-weak{background:#c0392b;}
.mode-toggle{
  position:fixed;bottom:15px;left:15px;
  background:#444;color:white;border-radius:50%;
  width:45px;height:45px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;font-size:1.2em;
  z-index: 100; /* لضمان ظهوره فوق العناصر الأخرى */
}
</style>
</head>
<body>
<div class="hifz-tool-container">
  <h2>🌿 رفيق الحافظ 📖</h2>
  <div class="input-group">
    <label for="hifz-surah">اختر السورة:</label>
    <select id="hifz-surah"></select>
  </div>
  <div class="input-group">
    <label for="hifz-line-details">تفاصيل الحفظ (الصفحة ونطاق الأسطر):</label>
    <input id="hifz-line-details" value="السطر 1-2 من الصفحة">
  </div>
  <div class="timer-display"><span id="timer-minutes">01</span>:<span id="timer-seconds">00</span></div>
  <div id="instruction-area">
    <p id="current-instruction">اضغط "ابدأ" للبدء بطريقة الدقيقتين.</p>
    <p id="chunk-info">التركيز على: السطر الأول من الصفحة</p>
  </div>
  <button id="start-btn">ابدأ جلسة الحفظ</button>
  <button id="recite-btn" disabled>↩️ انتهيت للتسميع</button>
  <button id="reset-btn" disabled>🔄 إعادة</button>

  <div id="confidence-meter" style="display:none;">
    <p><b>قيّم تسميعك لهذا الجزء:</b></p>
    <button id="conf-perfect" class="conf-btn" data-rating="3">إتقان تام 💚</button>
    <button id="conf-partial" class="conf-btn" data-rating="2">إتقان جزئي 💛</button>
    <button id="conf-weak" class="conf-btn" data-rating="1">ضعيف ❤️</button>
  </div>
</div>
<div class="mode-toggle" id="mode-toggle">🌙</div>

<script>
// ======================== المتغيرات =========================
const SURAHS=[
    "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
    "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
    "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
    "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
    "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
    "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
    "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
    "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
    "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
    "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
    "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
    "المسد", "الإخلاص", "الفلق", "الناس"
];

const LEARN_TIME = 60; 
const RECITE_TIME = 60; 
const LINES_PER_PAGE = 15;

let isLearningPhase=true, timeLeft=LEARN_TIME, timerInterval, isTimerRunning=false;
let currentLine=1, totalChunks=0;

const timerMin=document.getElementById('timer-minutes');
const timerSec=document.getElementById('timer-seconds');
const startBtn=document.getElementById('start-btn');
const reciteBtn=document.getElementById('recite-btn');
const resetBtn=document.getElementById('reset-btn');
const instruction=document.getElementById('current-instruction');
const chunkInfo=document.getElementById('chunk-info');
const surahSelect=document.getElementById('hifz-surah');
const lineInput=document.getElementById('hifz-line-details');
const confMeter=document.getElementById('confidence-meter');
const confBtns=document.querySelectorAll('.conf-btn');

let selectedVoice = null; // **متغير جديد: لتخزين كائن الصوت المختار**

// ======================== الصوت (مع تفضيل صوت رجالي) =========================
function setArabicVoice(){
  // يجب الانتظار حتى يقوم المتصفح بتحميل الأصوات
  const voices = speechSynthesis.getVoices();
  const arabicVoices = voices.filter(v => v.lang.startsWith('ar-'));
  
  if (arabicVoices.length > 0) {
      // منطق اختيار الصوت الرجالي:
      // نبحث عن صوت يحتوي اسمه على 'male' أو أسماء رجالية شائعة في الأصوات (مثل طارق Tariq/Tarik)
      const maleVoice = arabicVoices.find(
          v => v.name.toLowerCase().includes('male') || 
               v.name.toLowerCase().includes('tarik') ||
               v.name.toLowerCase().includes('tariq')
      );
      
      // نختار الصوت الرجالي إن وجد، وإلا نختار أول صوت عربي متاح.
      selectedVoice = maleVoice || arabicVoices[0]; 
      // يمكنك إلغاء التعليق لرؤية اسم الصوت المختار في وحدة التحكم (Console)
      // console.log(`تم اختيار الصوت: ${selectedVoice ? selectedVoice.name : 'الصوت الافتراضي'}`);
  } else {
      // console.log('لم يتم العثور على أصوات عربية، سيتم استخدام الصوت الافتراضي.');
  }
}

function speak(text){
  if ('speechSynthesis' in window) {
    const utter=new SpeechSynthesisUtterance(text);
    utter.lang='ar-SA';
    utter.pitch=1; utter.rate=0.95;
    
    // تعيين الصوت المختار (الرجالي المفضل)
    if (selectedVoice) {
        utter.voice = selectedVoice;
    }
    
    speechSynthesis.speak(utter);
  }
}
// =======================================================


// ======================== التخزين =========================
function saveProgress(){
  localStorage.setItem('hifzProgress',JSON.stringify({
    surah:surahSelect.value,line:currentLine, totalChunks
  }));
}
function loadProgress(){
  const data=localStorage.getItem('hifzProgress');
  if(!data)return;
  const p=JSON.parse(data);
  surahSelect.value=p.surah||1;
  currentLine=p.line||1;
  totalChunks=p.totalChunks || 0;
}

// ======================== التعليمات =========================
function updateInstructions(){
  const surah=surahSelect.options[surahSelect.selectedIndex].text;
  const line=lineInput.value;
  if(isLearningPhase){
    instruction.innerHTML=`💚 مرحلة <b>الحفظ بالنظر</b> - ركّز على ${line} من سورة ${surah}.`;
    chunkInfo.textContent=`السطر الحالي: ${currentLine}`;
  }else{
    instruction.innerHTML=`💙 مرحلة <b>التسميع الغيبي</b> - أغلق المصحف وسمّع الآن.`;
    chunkInfo.textContent=`تسميع السطر ${currentLine} من سورة ${surah}.`;
  }
}
function updateTimer(){
  timerMin.textContent=String(Math.floor(timeLeft/60)).padStart(2,'0');
  timerSec.textContent=String(timeLeft%60).padStart(2,'0');
}

// ======================== المنطق =========================
function startTimer(){
  if(isTimerRunning)return;
  isTimerRunning=true;
  startBtn.textContent='⏸️ إيقاف مؤقت';
  reciteBtn.disabled=false;
  resetBtn.disabled=false;
  surahSelect.disabled=true;
  lineInput.disabled=true;
  
  speak(isLearningPhase?'ابدأ الآن، ركّز على السطر المحدد.':'الآن أغلق المصحف وسمّع غيبًا.');

  timerInterval=setInterval(()=>{
    timeLeft--; updateTimer();
    if(timeLeft<=0){
      clearInterval(timerInterval);
      isTimerRunning=false;
      speak('انتهى الوقت.');
      
      if(isLearningPhase){
        isLearningPhase=false;
        timeLeft=RECITE_TIME;
        startBtn.textContent='ابدأ التسميع 🗣️';
        updateInstructions();
      }else{
        confMeter.style.display='block';
        startBtn.disabled=true;reciteBtn.disabled=true;
      }
    }
  },1000);
}

function handleConfidence(r){
  confMeter.style.display='none';
  if(r<=2){ // إعادة الحفظ
    speak('أعد المحاولة، يمكنك الإتقان أكثر.');
    isLearningPhase=true;timeLeft=LEARN_TIME;
    startBtn.textContent='🔁 أعد الحفظ';startBtn.disabled=false;
  }else{ // إتقان وتقدم
    totalChunks++;
    speak('أحسنت، تابع السطر التالي.');
    
    // منطق التقدم
    if (currentLine < LINES_PER_PAGE) {
        currentLine++;
    } else {
        currentLine = 1; // العودة للسطر 1 (صفحة جديدة)
        alert("✅ تهانينا! أكملت صفحة كاملة (15 سطراً).");
    }
    
    // منطق التراكم: يظهر تنبيه كل 3 أجزاء متقنة بنجاح.
    if (totalChunks > 0 && totalChunks % 3 === 0) {
         alert(`⭐ مرحلة التراكم: قبل البدء، سمّع آخر 3 أسطر متقنة معاً.`);
    }

    saveProgress();
    isLearningPhase=true;timeLeft=LEARN_TIME;
    startBtn.textContent='ابدأ التالي 🚀';startBtn.disabled=false;
  }
  reciteBtn.disabled=true;
  updateInstructions();updateTimer();
}

function startRecite(){
  if(isLearningPhase){
    clearInterval(timerInterval);
    isTimerRunning=false;
    isLearningPhase=false;
    timeLeft=RECITE_TIME;updateInstructions();
    speak('الآن أغلق المصحف وسمّع غيبًا.');
    startBtn.textContent='استئناف التسميع ▶️';
    reciteBtn.disabled = true;
  }
}

// ======================== الوضع الليلي =========================
const modeToggle=document.getElementById('mode-toggle');
modeToggle.addEventListener('click',()=>{
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  modeToggle.textContent=isDarkMode?'☀️':'🌙';
  localStorage.setItem('darkModeEnabled', isDarkMode ? 'true' : 'false');
});

function loadDarkMode() {
    if (localStorage.getItem('darkModeEnabled') === 'true') {
        document.body.classList.add('dark-mode');
        modeToggle.textContent = '☀️';
    }
}

// ======================== التهيئة =========================
function populateSurahSelect() {
    SURAHS.forEach((s,i)=>{
        const o=document.createElement('option');
        o.value=i+1;o.textContent=s;surahSelect.appendChild(o);
    });
}

// **مهم: ربط دالة اختيار الصوت بحدث تحميل أصوات المتصفح**
window.speechSynthesis.onvoiceschanged = setArabicVoice;


document.addEventListener('DOMContentLoaded',()=>{
  populateSurahSelect(); // تفعيل ملء القائمة
  loadProgress(); // تحميل التقدم
  loadDarkMode(); // تحميل الوضع الداكن

  setArabicVoice(); // محاولة تعيين الأصوات عند التحميل الأولي

  updateInstructions(); updateTimer();

  // ربط الأحداث
  surahSelect.addEventListener('change', updateInstructions);
  lineInput.addEventListener('input', updateInstructions);

  startBtn.onclick=()=>{
    if(isTimerRunning){
      clearInterval(timerInterval);
      isTimerRunning=false;
      startBtn.textContent='▶️ استئناف';
    } else {
      startTimer();
    }
  };
  
  reciteBtn.onclick=startRecite;
  
  resetBtn.onclick=()=>{
    clearInterval(timerInterval);
    isTimerRunning=false;
    isLearningPhase=true;
    timeLeft=LEARN_TIME;
    currentLine=1;
    totalChunks=0;
    
    startBtn.disabled=false;
    reciteBtn.disabled=true;
    resetBtn.disabled=true;
    surahSelect.disabled=false;
    lineInput.disabled=false;
    
    confMeter.style.display='none';
    localStorage.removeItem('hifzProgress'); // مسح التقدم المحفوظ
    
    updateInstructions();
    updateTimer();
  };
  
  confBtns.forEach(b=>b.onclick=e=>handleConfidence(parseInt(e.target.dataset.rating)));
});
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed:', error);
                });
        });
    }
</script>
</body>
</html>
