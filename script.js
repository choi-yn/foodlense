// 카메라 접근
const video = document.getElementById('camera');
const canvas = document.getElementById('snapshot');
const resultImage = document.getElementById('resultImage');
const captureBtn = document.getElementById('capture');

// Teachable Machine 모델 URL (예시)
const modelURL = "https://teachablemachine.withgoogle.com/models/1r6QwK2vK/";
let model, maxPredictions;

async function loadModel() {
  const tmURL = modelURL + "model.json";
  const metadataURL = modelURL + "metadata.json";
  model = await tmImage.load(tmURL, metadataURL);
  maxPredictions = model.getTotalClasses();
}

// 모델 로드

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(function(stream) {
      video.srcObject = stream;
      video.play();
    })
    .catch(function(err) {
      alert('카메라 접근이 불가합니다: ' + err);
    });
}

// 영양소 정보 가져오기 함수
async function fetchNutritionInfo(foodName) {
  const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodName)}&search_simple=1&action=process&json=1&page_size=1`);
  const data = await res.json();
  if (data.products && data.products.length > 0) {
    const product = data.products[0];
    const nutriments = product.nutriments || {};
    let html = `<b>영양소 정보 (100g 기준):</b><br>`;
    if (nutriments['energy-kcal_100g']) html += `칼로리: ${nutriments['energy-kcal_100g']} kcal<br>`;
    if (nutriments['proteins_100g']) html += `단백질: ${nutriments['proteins_100g']} g<br>`;
    if (nutriments['fat_100g']) html += `지방: ${nutriments['fat_100g']} g<br>`;
    if (nutriments['carbohydrates_100g']) html += `탄수화물: ${nutriments['carbohydrates_100g']} g<br>`;
    if (nutriments['sugars_100g']) html += `당류: ${nutriments['sugars_100g']} g<br>`;
    if (nutriments['fiber_100g']) html += `식이섬유: ${nutriments['fiber_100g']} g<br>`;
    document.getElementById('nutritionInfo').innerHTML = html;
  } else {
    document.getElementById('nutritionInfo').innerHTML = '영양소 정보를 찾을 수 없습니다.';
  }
}

let voicesReady = false;
let cachedVoices = [];

function loadVoices() {
  cachedVoices = window.speechSynthesis.getVoices();
  voicesReady = cachedVoices && cachedVoices.length > 0;
}

// 음성 목록이 바뀌면 다시 로드
window.speechSynthesis.onvoiceschanged = function() {
  loadVoices();
};
// 페이지 로드시도 시도
loadVoices();

function getKoreanVoice() {
  const voices = cachedVoices;
  const koVoices = voices.filter(v => v.lang === 'ko-KR');
  if (koVoices.length > 0) return koVoices[0];
  if (voices.length > 0) return voices[0];
  return null;
}

function speakWithVoice(text) {
  if (!voicesReady) {
    setTimeout(() => speakWithVoice(text), 200);
    return;
  }
  const utter = new window.SpeechSynthesisUtterance(text);
  utter.lang = 'ko-KR';
  const voice = getKoreanVoice();
  if (voice) utter.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// 음성 출력 함수
function speakResult() {
  const food = document.getElementById('foodName').innerText.replace('예측: ', '').replace(/\(.*\)/, '').trim();
  const nutri = document.getElementById('nutritionInfo').innerText.replace(/\n/g, ' ');
  let text = '';
  if (food) text += `${food} 입니다. `;
  if (nutri && nutri !== '영양소 정보를 찾을 수 없습니다.') text += nutri;
  if (!text) text = '결과가 없습니다.';
  speakWithVoice(text);
}

// 사진 찍기 버튼 클릭 시 예측 + 영양소 정보 + 음성 자동 출력
captureBtn.addEventListener('click', async function() {
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataURL = canvas.toDataURL('image/png');
  resultImage.src = dataURL;
  resultImage.style.display = 'block';

  // Teachable Machine 예측
  if (model) {
    const prediction = await model.predict(canvas);
    const best = prediction.reduce((a, b) => (a.probability > b.probability ? a : b));
    document.getElementById('foodName').innerText = `예측: ${best.className} (${(best.probability*100).toFixed(1)}%)`;
    // 영양소 정보 가져오기
    fetchNutritionInfo(best.className);
    setTimeout(speakResult, 1200); // 영양소 정보가 표시된 후 음성 출력 (1.2초 후)
  } else {
    document.getElementById('foodName').innerText = '모델을 불러오는 중입니다...';
    document.getElementById('nutritionInfo').innerText = '';
  }
});

// 모델 정보 음성 안내 함수
function speakModelInfo() {
  const text = '카메라로 음식 사진을 찍으면 음식의 정보를 알려줄게.';
  speakWithVoice(text);
}

// 헬씨(마스코트) 클릭 시 사용법 음성 안내
const mascot = document.querySelector('.mascot');
if (mascot) {
  mascot.style.cursor = 'pointer';
  mascot.onclick = null; // 혹시 모를 중복 방지
  mascot.addEventListener('click', function(e) {
    e.preventDefault();
    speakModelInfo();
  });
}
// 음성안내(스피커) 버튼 클릭 시 결과 읽어주기
const modelInfoBtn = document.getElementById('modelInfoBtn');
if (modelInfoBtn) {
  modelInfoBtn.addEventListener('click', speakResult);
}

// Teachable Machine 라이브러리 로드
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js';
document.head.appendChild(script);
