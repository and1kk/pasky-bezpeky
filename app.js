// ============================================================================
// Паски безпеки в транспорті — Фізичний проєкт (10-А клас)
// Виконав: Дмитренко Андрій Володимирович
// ============================================================================

const TOTAL_SLIDES = 9;
let currentSlide = 0;
const G_ACCEL = 9.81;

const SLIDE_NAMES = [
  "1. Титул",
  "2. Теорія: Інерція",
  "3. Показ: 2 авто",
  "4. Теорія: Імпульс",
  "5. Показ: Краш-тест",
  "6. Теорія: Енергія і тиск",
  "7. Показ: Висота і тиск",
  "8. Показ: Котушка",
  "9. Підсумки"
];

function initDeck() {
  const container = document.getElementById("pageButtons");
  container.innerHTML = "";
  for (let i = 0; i < TOTAL_SLIDES; i++) {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (i === currentSlide ? " active" : "");
    btn.textContent = SLIDE_NAMES[i];
    btn.onclick = () => goToSlide(i);
    container.appendChild(btn);
  }
  syncNavUI();
}

function goToSlide(idx) {
  if (idx < 0 || idx >= TOTAL_SLIDES) return;
  currentSlide = idx;
  document.querySelectorAll(".slide").forEach((el, i) => {
    el.classList.toggle("active", i === currentSlide);
  });
  syncNavUI();
  renderActiveSlide();
}

function stepSlide(delta) {
  goToSlide(currentSlide + delta);
}

function syncNavUI() {
  document.getElementById("slideCounter").textContent = `СЛАЙД ${currentSlide + 1} / ${TOTAL_SLIDES}`;
  document.getElementById("btnPrev").disabled = currentSlide === 0;
  document.getElementById("btnNext").disabled = currentSlide === TOTAL_SLIDES - 1;
  document.querySelectorAll(".page-btn").forEach((b, i) => {
    b.classList.toggle("active", i === currentSlide);
  });
}

document.getElementById("btnFullscreen").addEventListener("click", toggleFullscreen);

const planModal = document.getElementById("planModal");
document.getElementById("btnPlan").addEventListener("click", openPlanModal);
document.getElementById("btnClosePlan").addEventListener("click", closePlanModal);
planModal.addEventListener("click", (e) => {
  if (e.target === planModal) closePlanModal();
});

function openPlanModal() {
  planModal.classList.add("open");
  planModal.setAttribute("aria-hidden", "false");
  let activeStep = null;
  document.querySelectorAll(".plan-step").forEach((el) => {
    const isCur = Number(el.dataset.planSlide) === currentSlide;
    el.classList.toggle("current", isCur);
    if (isCur) activeStep = el;
  });
  if (activeStep) {
    activeStep.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function closePlanModal() {
  planModal.classList.remove("open");
  planModal.setAttribute("aria-hidden", "true");
}

function jumpToSlideFromPlan(idx) {
  goToSlide(idx);
  closePlanModal();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && planModal.classList.contains("open")) {
    e.preventDefault();
    closePlanModal();
    return;
  }
  if (e.key === "p" || e.key === "P" || e.key === "з" || e.key === "З") {
    e.preventDefault();
    if (planModal.classList.contains("open")) closePlanModal();
    else openPlanModal();
    return;
  }
  if (planModal.classList.contains("open")) return;

  if (e.key === "ArrowRight" || e.key === "PageDown") {
    e.preventDefault();
    stepSlide(1);
  } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
    e.preventDefault();
    stepSlide(-1);
  } else if (e.key === " " || e.code === "Space") {
    if (currentSlide === 2) {
      e.preventDefault();
      startInertiaSim();
    } else if (currentSlide === 4) {
      e.preventDefault();
      runCrashLabAnim();
    }
  } else if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А") {
    toggleFullscreen();
  }
});

function renderActiveSlide() {
  if (currentSlide === 2) drawInertiaCanvas();
  if (currentSlide === 4) updateCrashLab();
  if (currentSlide === 6) updateEnergyPressure();
  if (currentSlide === 7) startReelLoop();
}

// ============================================================================
// СПІЛЬНІ ФУНКЦІЇ МАЛЮВАННЯ РЕАЛІСТИЧНОГО АВТОМОБІЛЯ ТА МАНЕКЕНА HYBRID III
// ============================================================================

/**
 * Малює реалістичний автомобіль у розрізі (кузов, моторний відсік, капот, що зминається,
 * лобове скло, стійки A/B/C, крісло з підголівником, кермо, торпедо, колеса з гальмівними дисками)
 */
function drawDetailedCar(ctx, opts) {
  const {
    x,
    floorY,
    scale = 1.0,
    crumple = 0, // 0..1 (ступінь деформації передка)
    dummyState,  // { slideX, torsoAngle, headAngle, kneeHit }
    beltMode = 1, // 0 = no belt, 1 = 3-point belt, 2 = belt + airbag
    airbagDeploy = 0, // 0..1
    wheelAngle = 0,
    bodyColor = "#D8DCE2"
  } = opts;

  ctx.save();
  ctx.translate(x, floorY);
  ctx.scale(scale, scale);

  const crumplePx = crumple * 52; // Зминання носової частини до 52 px
  const hoodBuckleY = crumple * 26; // Капот вигинається догори при ударі
  const totalLen = 410 - crumplePx;

  // 1. Тінь під автомобілем
  ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
  ctx.beginPath();
  ctx.ellipse(200 - crumplePx * 0.4, -4, 185 - crumplePx * 0.4, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Задня та верхня частина кузова (зовнішній силует седана)
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = "#1A1F24";
  ctx.lineWidth = 3;

  ctx.beginPath();
  // Задній бампер
  ctx.moveTo(0, -34);
  ctx.lineTo(0, -88);
  // Багажник і заднє скло (C-стійка)
  ctx.lineTo(36, -96);
  ctx.lineTo(90, -158);
  // Дах
  ctx.lineTo(228, -158);
  // Лобове скло (A-стійка)
  ctx.lineTo(295, -96);
  // Капот (згинається будиночком при краш-тесті!)
  ctx.lineTo(352 - crumplePx * 0.5, -92 - hoodBuckleY);
  ctx.lineTo(totalLen, -74);
  // Передній бампер
  ctx.lineTo(totalLen, -28);
  // Днище / пороги
  ctx.lineTo(0, -28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Моторний відсік у розрізі (двигун і лонжерони, що деформуються)
  ctx.fillStyle = "#4A525D";
  ctx.strokeStyle = "#1A1F24";
  ctx.lineWidth = 2;
  const engX = 315 - crumplePx * 0.35;
  ctx.fillRect(engX, -82, 46 - crumplePx * 0.25, 42);
  ctx.strokeRect(engX, -82, 46 - crumplePx * 0.25, 42);

  // Ребра радіатора та зім'яті лонжерони спереду
  ctx.strokeStyle = crumple > 0.1 ? "#B81D13" : "#222222";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(295, -45);
  ctx.lineTo(330 - crumplePx * 0.4, -45 - hoodBuckleY * 0.4);
  ctx.lineTo(365 - crumplePx * 0.7, -45 + hoodBuckleY * 0.3);
  ctx.lineTo(totalLen - 6, -45);
  ctx.stroke();

  // Фара спереду
  ctx.fillStyle = crumple > 0.3 ? "#E05A00" : "#FFF8D6";
  ctx.beginPath();
  ctx.rect(totalLen - 14, -72, 12, 16);
  ctx.fill();
  ctx.stroke();

  // 4. Віконний проріз салону (відкритий розріз, щоб було ідеально видно манекен)
  ctx.fillStyle = "#F7F9FB";
  ctx.strokeStyle = "#1A1F24";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(56, -34);
  ctx.lineTo(56, -94);
  ctx.lineTo(96, -148);
  ctx.lineTo(224, -148);
  ctx.lineTo(286, -92);
  ctx.lineTo(286, -34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Підлога салону та упор для ніг (педальний вузол)
  ctx.fillStyle = "#333942";
  ctx.beginPath();
  ctx.moveTo(56, -34);
  ctx.lineTo(286, -34);
  ctx.lineTo(286, -78);
  ctx.lineTo(262, -40);
  ctx.lineTo(56, -40);
  ctx.closePath();
  ctx.fill();

  // 5. Торпедо (приладова панель) та рульова колонка з кермом
  ctx.fillStyle = "#2A3038";
  ctx.beginPath();
  ctx.moveTo(286, -96);
  ctx.lineTo(242, -96);
  ctx.lineTo(236, -72);
  ctx.lineTo(286, -68);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Вал керма та обід керма у профіль
  const steerHubX = 228;
  const steerHubY = -98;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(252, -84);
  ctx.lineTo(steerHubX, steerHubY);
  ctx.stroke();

  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(steerHubX - 8, steerHubY + 18);
  ctx.lineTo(steerHubX + 7, steerHubY - 18);
  ctx.stroke();

  // 6. Автомобільне крісло з бічною підтримкою та підголівником
  const seatBaseX = 128;
  const seatBaseY = -42;

  ctx.fillStyle = "#3B424C";
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 2;

  // Спинка крісла
  ctx.beginPath();
  ctx.roundRect(seatBaseX - 18, seatBaseY - 82, 18, 80, 6);
  ctx.fill();
  ctx.stroke();

  // Підголівник
  ctx.beginPath();
  ctx.roundRect(seatBaseX - 16, seatBaseY - 108, 18, 22, 5);
  ctx.fill();
  ctx.stroke();

  // Подушка сидіння
  ctx.beginPath();
  ctx.roundRect(seatBaseX - 10, seatBaseY - 12, 58, 14, 5);
  ctx.fill();
  ctx.stroke();

  // Центральна стійка кузова B-pillar (де кріпиться котушка та верхня петля паска)
  const bPillarX = seatBaseX - 22;
  ctx.fillStyle = "#555D68";
  ctx.fillRect(bPillarX - 4, -148, 8, 110);

  // 7. Подушка безпеки AIRBAG (якщо активована)
  if (beltMode === 2 && airbagDeploy > 0.02) {
    const bagR = airbagDeploy * 36;
    ctx.save();
    ctx.fillStyle = "rgba(232, 244, 255, 0.92)";
    ctx.strokeStyle = "#0B3C68";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(steerHubX - 20, steerHubY - 4, bagR * 0.95, bagR * 1.15, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Шви подушки безпеки
    ctx.strokeStyle = "#7BA3C7";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(steerHubX - 6, steerHubY - 4);
    ctx.lineTo(steerHubX - 20 - bagR * 0.7, steerHubY - 12);
    ctx.moveTo(steerHubX - 6, steerHubY - 4);
    ctx.lineTo(steerHubX - 20 - bagR * 0.7, steerHubY + 8);
    ctx.stroke();
    ctx.restore();
  }

  // 8. Малюємо реалістичний багатосегментний манекен Hybrid III
  drawArticulatedDummy(ctx, {
    seatBaseX,
    seatBaseY,
    bPillarX,
    dummyState,
    beltMode
  });

  // 9. Колеса з шинами, дисками та спицями
  drawDetailedWheel(ctx, 74, -26, 26, wheelAngle);
  drawDetailedWheel(ctx, 330 - crumplePx * 0.65, -26, 26, wheelAngle);

  ctx.restore();
}

/**
 * Малює реалістичний шарнірний манекен людини (Hybrid III):
 * таз, стегно, коліно, гомілка, стопа, грудна клітка, шия, голова з розміткою, плече, передпліччя, кисть
 * + триточковий пасок безпеки поверх торса й тазу
 */
function drawArticulatedDummy(ctx, { seatBaseX, seatBaseY, bPillarX, dummyState, beltMode }) {
  const slideX = dummyState.slideX || 0;      // зміщення тазу вперед (px)
  const torsoAng = dummyState.torsoAngle || 0; // нахил тулуба вперед (рад)
  const headAng = dummyState.headAngle || 0;   // додатковий нахил голови/шиї (рад)
  const isDangerHit = dummyState.dangerHit || false;

  // Координати тазу (H-point — точка кульшового суглоба)
  const hipX = seatBaseX + 14 + slideX;
  const hipY = seatBaseY - 18;

  // Коліно та стопа
  const kneeX = Math.min(238, hipX + 52 + slideX * 0.25);
  const kneeY = hipY - 4;
  const footX = 256;
  const footY = -44;

  // 1. Ноги (стегно -> колінний шарнір -> гомілка -> черевик)
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Стегно
  ctx.strokeStyle = "#1E3A5F";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(kneeX, kneeY);
  ctx.stroke();

  // Гомілка
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(kneeX, kneeY);
  ctx.lineTo(footX, footY);
  ctx.stroke();

  // Черевик на педалі
  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.ellipse(footX + 5, footY - 3, 11, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Калібрувальний шарнір коліна
  ctx.fillStyle = "#F5B800";
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(kneeX, kneeY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 2. Тулуб (від тазу до плечового суглоба)
  const torsoLen = 54;
  const shoulderX = hipX + Math.sin(torsoAng) * torsoLen;
  const shoulderY = hipY - Math.cos(torsoAng) * torsoLen;

  // Анатомічний контур грудної клітки та спини
  ctx.strokeStyle = isDangerHit ? "#B81D13" : "#254B7C";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(shoulderX, shoulderY);
  ctx.stroke();

  // Жовта смуга на грудях манекена Euro NCAP
  ctx.strokeStyle = "#F5B800";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(hipX + Math.sin(torsoAng) * 20, hipY - Math.cos(torsoAng) * 20);
  ctx.lineTo(hipX + Math.sin(torsoAng) * 40, hipY - Math.cos(torsoAng) * 40);
  ctx.stroke();

  // 3. Шия та Голова (з підборіддям, потилицею та міткою центру мас)
  const neckLen = 14;
  const totalHeadAng = torsoAng + headAng;
  const headCenterX = shoulderX + Math.sin(totalHeadAng) * (neckLen + 10);
  const headCenterY = shoulderY - Math.cos(totalHeadAng) * (neckLen + 10);

  // Шийний відділ
  ctx.strokeStyle = "#555555";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(headCenterX, headCenterY);
  ctx.stroke();

  // Голова у профіль
  ctx.save();
  ctx.translate(headCenterX, headCenterY);
  ctx.rotate(totalHeadAng);

  ctx.fillStyle = isDangerHit ? "#D93829" : "#E8C39E";
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Череп + виступ носа/підборіддя праворуч
  ctx.ellipse(0, 0, 12.5, 14.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Кругла чорно-жовта мітка краш-тесту на скроні манекена
  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.arc(1, -1, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#F5B800";
  ctx.beginPath();
  ctx.moveTo(1, -1);
  ctx.arc(1, -1, 5.5, 0, Math.PI / 2);
  ctx.lineTo(1, -1);
  ctx.arc(1, -1, 5.5, Math.PI, (Math.PI * 3) / 2);
  ctx.fill();
  ctx.restore();

  // 4. ТРИТОЧКОВИЙ ПАСОК БЕЗПЕКИ (якщо увімкнений: beltMode === 1 або 2)
  if (beltMode >= 1) {
    const chestBeltX = hipX + Math.sin(torsoAng) * 42 + 6;
    const chestBeltY = hipY - Math.cos(torsoAng) * 42 + 2;

    // Котушка внизу стійки B
    ctx.fillStyle = "#111111";
    ctx.fillRect(bPillarX - 6, seatBaseY - 10, 12, 12);

    // Верхня петля на стійці B
    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.arc(bPillarX, seatBaseY - 78, 4, 0, Math.PI * 2);
    ctx.fill();

    // Діагональна + поясна стрічка паска безпеки (яскраво-червона/помаранчева для наочності)
    ctx.strokeStyle = "#D9381E";
    ctx.lineWidth = 5;
    ctx.beginPath();
    // Від верхньої точки стійки B через плече/груди до замка біля стегна
    ctx.moveTo(bPillarX, seatBaseY - 78);
    ctx.lineTo(chestBeltX, chestBeltY);
    ctx.lineTo(hipX - 2, hipY + 4);
    // Поясна гілка через таз до нижнього анкера
    ctx.lineTo(hipX + 12, hipY - 2);
    ctx.lineTo(seatBaseX - 6, seatBaseY - 4);
    ctx.stroke();

    // Замок ременя безпеки
    ctx.fillStyle = "#111111";
    ctx.fillRect(hipX - 6, hipY + 2, 8, 8);
  }

  // 5. Рука (плече -> лікоть -> передпліччя -> кисть до керма)
  const elbowX = shoulderX + 18 + Math.sin(torsoAng) * 10;
  const elbowY = shoulderY + 18;
  const handX = Math.min(228, elbowX + 26);
  const handY = elbowY - 12;

  ctx.strokeStyle = "#315B8E";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY + 4);
  ctx.lineTo(elbowX, elbowY);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  // Шарнір плеча та ліктя
  ctx.fillStyle = "#F5B800";
  ctx.beginPath();
  ctx.arc(shoulderX, shoulderY + 4, 4, 0, Math.PI * 2);
  ctx.arc(elbowX, elbowY, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawDetailedWheel(ctx, cx, cy, r, angle) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Покришка
  ctx.fillStyle = "#1C2024";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Металевий обід диска
  ctx.fillStyle = "#D0D4DC";
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.64, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 5 спиць диска
  ctx.strokeStyle = "#444B54";
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
    ctx.stroke();
  }

  // Маточина колеса
  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawVectorArrow(ctx, x1, y1, x2, y2, color, text) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const ang = Math.atan2(y2 - y1, x2 - x1);
  const head = 9;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(ang - Math.PI / 6), y2 - head * Math.sin(ang - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(ang + Math.PI / 6), y2 - head * Math.sin(ang + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  if (text) {
    ctx.font = "bold 14px sans-serif";
    const tw = ctx.measureText(text).width;
    const midX = (x1 + x2) / 2 - tw / 2;
    const midY = y1 - 10;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(midX - 4, midY - 13, tw + 8, 17);
    ctx.fillStyle = color;
    ctx.fillText(text, midX, midY);
  }
  ctx.restore();
}

// ============================================================================
// СЛАЙД 3 (ПОКАЗ №1): ПОРІВНЯННЯ ДВОХ АВТОМОБІЛІВ У РУСІ (ІНЕРЦІЯ)
// ============================================================================
let inertiaSpeedKmh = 50;
let inertiaSlow = true;
let inertiaAnimId = null;
let inertiaSim = {
  running: false,
  carX: 70,
  wheelRot: 0,
  crashed: false,
  crumple: 0,
  noBeltProgress: 0,
  withBeltProgress: 0
};

function setInertiaSpeed(kmh) {
  inertiaSpeedKmh = kmh;
  const v0 = (kmh / 3.6).toFixed(1).replace(".", ",");
  document.getElementById("inertiaSpeedLabel").textContent = `${kmh} км/год (${v0} м/с)`;
  const btns = document.querySelectorAll("#inertiaSpeedGroup .btn-choice");
  btns.forEach((b) => b.classList.toggle("active", b.textContent.startsWith(String(kmh))));
  resetInertiaSim();
}

function setInertiaSlow(isSlow) {
  inertiaSlow = isSlow;
  const btns = document.querySelectorAll("#inertiaSlowGroup .btn-choice");
  btns[0].classList.toggle("active", isSlow);
  btns[1].classList.toggle("active", !isSlow);
}

function resetInertiaSim() {
  if (inertiaAnimId) cancelAnimationFrame(inertiaAnimId);
  inertiaSim = {
    running: false,
    carX: 70,
    wheelRot: 0,
    crashed: false,
    crumple: 0,
    noBeltProgress: 0,
    withBeltProgress: 0
  };
  drawInertiaCanvas();
}

function startInertiaSim() {
  resetInertiaSim();
  inertiaSim.running = true;
  const speedScale = inertiaSlow ? 0.25 : 0.9;
  const moveStep = (inertiaSpeedKmh / 50) * 11 * speedScale;
  const barrierX = 1040;
  const carFrontOffset = 410 * 0.88; // with scale = 0.88

  function tick() {
    if (!inertiaSim.running) return;

    if (!inertiaSim.crashed) {
      inertiaSim.carX += moveStep;
      inertiaSim.wheelRot += moveStep * 0.04;
      if (inertiaSim.carX + carFrontOffset >= barrierX) {
        inertiaSim.carX = barrierX - carFrontOffset;
        inertiaSim.crashed = true;
      }
    } else {
      const rate = (inertiaSlow ? 0.018 : 0.07) * (inertiaSpeedKmh / 50);
      const maxCrumple = Math.min(1, inertiaSpeedKmh / 85);

      if (inertiaSim.crumple < maxCrumple) {
        inertiaSim.crumple = Math.min(maxCrumple, inertiaSim.crumple + rate * 1.4);
        inertiaSim.carX += (1 - inertiaSim.crumple) * 1.5;
      }

      // Непристебнутий манекен летить уперед зі швидкістю v0 до удару об кермо та скло
      if (inertiaSim.noBeltProgress < 1) {
        inertiaSim.noBeltProgress = Math.min(1, inertiaSim.noBeltProgress + rate * 1.15);
      }

      // Пристебнутий манекен плавно нахиляється вперед у межах розтягу паска і зупиняється
      if (inertiaSim.withBeltProgress < 1) {
        inertiaSim.withBeltProgress = Math.min(1, inertiaSim.withBeltProgress + rate * 1.3);
      }

      if (inertiaSim.noBeltProgress >= 1 && inertiaSim.withBeltProgress >= 1 && inertiaSim.crumple >= maxCrumple) {
        inertiaSim.running = false;
      }
    }

    drawInertiaCanvas();
    if (inertiaSim.running) {
      inertiaAnimId = requestAnimationFrame(tick);
    }
  }

  inertiaAnimId = requestAnimationFrame(tick);
}

function drawInertiaCanvas() {
  const canvas = document.getElementById("canvasInertia");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Міліметрова сітка на тлі
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#EFEFEF";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < W; gx += 40) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
  }
  for (let gy = 0; gy < H; gy += 40) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  }

  // Горизонтальна лінія поділу двох доріжок
  ctx.strokeStyle = "#222222";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();

  // Чіткі короткі заголовки доріжок (без зайвого тексту — усе розповідає доповідач)
  ctx.fillStyle = "#FDECEB";
  ctx.fillRect(0, 0, W, 34);
  ctx.fillStyle = "#B81D13";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("ДОСЛІД А (ВГОРІ): БЕЗ ПАСКА БЕЗПЕКИ  |  Гальмівний шлях тіла s₁ = 0,04 м", 16, 23);

  ctx.fillStyle = "#E7F4EC";
  ctx.fillRect(0, H / 2 + 1, W, 34);
  ctx.fillStyle = "#146334";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("ДОСЛІД Б (ВНИЗУ): З ТРИТОЧКОВИМ ПАСКОМ  |  Гальмівний шлях тіла s₂ = 0,55 м", 16, H / 2 + 24);

  // Дорога для обох доріжок
  const floor1 = 196;
  const floor2 = H - 14;
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, floor1); ctx.lineTo(W, floor1);
  ctx.moveTo(0, floor2); ctx.lineTo(W, floor2);
  ctx.stroke();

  // Бетонні перешкоди справа
  const barrierX = 1040;
  drawCrashBarrierBlock(ctx, barrierX, 36, 70, floor1 - 36);
  drawCrashBarrierBlock(ctx, barrierX, H / 2 + 36, 70, floor2 - (H / 2 + 36));

  // Стан манекена БЕЗ ПАСКА (верхнє авто)
  const pNo = inertiaSim.noBeltProgress;
  const dummyNoBelt = {
    slideX: pNo * 58,           // таз з'їжджає з сидіння вперед до торпедо
    torsoAngle: pNo * 0.72,     // грудна клітка б'є в кермо
    headAngle: pNo * 0.42,      // голова б'є в лобове скло
    dangerHit: pNo > 0.85
  };

  // Стан манекена З ПАСКОМ (нижнє авто)
  const pYes = inertiaSim.withBeltProgress;
  // Спочатку нахиляється вперед на 0.34 рад, потім трохи повертається в спинку крісла
  const curveYes = Math.sin(pYes * Math.PI * 0.75);
  const dummyWithBelt = {
    slideX: curveYes * 8,       // таз надійно утриманий поясним ременем
    torsoAngle: curveYes * 0.34,// контрольований нахил грудної клітки
    headAngle: curveYes * 0.25,
    dangerHit: false
  };

  // Малюємо верхнє авто (Без паска)
  drawDetailedCar(ctx, {
    x: inertiaSim.carX,
    floorY: floor1,
    scale: 0.88,
    crumple: inertiaSim.crumple,
    dummyState: dummyNoBelt,
    beltMode: 0,
    airbagDeploy: 0,
    wheelAngle: inertiaSim.wheelRot,
    bodyColor: "#E4E6EB"
  });

  // Малюємо нижнє авто (З триточковим паском)
  drawDetailedCar(ctx, {
    x: inertiaSim.carX,
    floorY: floor2,
    scale: 0.88,
    crumple: inertiaSim.crumple,
    dummyState: dummyWithBelt,
    beltMode: 1,
    airbagDeploy: 0,
    wheelAngle: inertiaSim.wheelRot,
    bodyColor: "#DCE6F2"
  });

  // Короткі числові показники справа від бар'єра після зупинки
  if (inertiaSim.crashed) {
    const v0 = inertiaSpeedKmh / 3.6;
    const gNo = ((v0 * v0) / (2 * 0.04) / G_ACCEL).toFixed(0);
    const gYes = ((v0 * v0) / (2 * 0.55) / G_ACCEL).toFixed(1);

    ctx.fillStyle = "#FDECEB";
    ctx.strokeStyle = "#B81D13";
    ctx.lineWidth = 2;
    ctx.fillRect(1125, 65, 215, 85);
    ctx.strokeRect(1125, 65, 215, 85);
    ctx.fillStyle = "#B81D13";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("БЕЗ ПАСКА:", 1138, 92);
    ctx.fillStyle = "#111111";
    ctx.font = "bold 14px Consolas, monospace";
    ctx.fillText(`s₁ = 0,04 м`, 1138, 116);
    ctx.fillText(`n₁ = ${gNo} g`, 1138, 138);

    ctx.fillStyle = "#E7F4EC";
    ctx.strokeStyle = "#146334";
    ctx.fillRect(1125, H / 2 + 65, 215, 85);
    ctx.strokeRect(1125, H / 2 + 65, 215, 85);
    ctx.fillStyle = "#146334";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("З ПАСКОМ:", 1138, H / 2 + 92);
    ctx.fillStyle = "#111111";
    ctx.font = "bold 14px Consolas, monospace";
    ctx.fillText(`s₂ = 0,55 м`, 1138, H / 2 + 116);
    ctx.fillText(`n₂ = ${gYes} g`, 1138, H / 2 + 138);
  }
}

function drawCrashBarrierBlock(ctx, x, y, w, h) {
  ctx.fillStyle = "#444950";
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 2;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);

  // Чорно-помаранчева розмітка на грані удару
  for (let sy = y; sy < y + h - 14; sy += 28) {
    ctx.fillStyle = ((sy - y) / 28) % 2 === 0 ? "#E05A00" : "#111111";
    ctx.fillRect(x, sy, 14, 28);
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("БЕТОН", x + 18, y + h / 2 + 4);
}

// ============================================================================
// СЛАЙД 5 (ПОКАЗ №2): СТЕНД КРАШ-ТЕСТУ САЛОНУ + ОСЦИЛОГРАФ F(t)
// ============================================================================
let labMode = 1; // 0 = no belt, 1 = 3-point belt, 2 = belt + airbag
let labAnimId = null;
let labProgress = 0; // 0..1 під час анімації удару

function setLabSpeed(kmh) {
  document.getElementById("labSpeedSlider").value = kmh;
  updateCrashLab();
}

function setLabMass(kg) {
  document.getElementById("labMassSlider").value = kg;
  updateCrashLab();
}

function setLabMode(mode) {
  labMode = mode;
  const btns = document.querySelectorAll("#labModeGroup .btn-choice");
  btns.forEach((b, i) => b.classList.toggle("active", i === mode));
  updateCrashLab();
}

function computeLabPhysics() {
  const vKmh = Number(document.getElementById("labSpeedSlider").value);
  const m = Number(document.getElementById("labMassSlider").value);
  const v0 = vKmh / 3.6;
  const p = m * v0;
  const ekKj = (0.5 * m * v0 * v0) / 1000;

  // Реальні параметри часу зупинки тіла (мс) та ефективного шляху (м):
  let dtMs = 95;
  if (labMode === 0) {
    // Без паска: жорсткий удар об кермо триває 16–22 мс
    dtMs = 18;
  } else if (labMode === 1) {
    // Триточковий пасок + деформація лонжеронів: ~90–110 мс
    dtMs = 95;
  } else {
    // Триточковий пасок + Airbag: ~125–140 мс
    dtMs = 130;
  }

  const dtSec = dtMs / 1000;
  const fAvgN = p / dtSec;
  const fAvgKn = fAvgN / 1000;
  const tons = fAvgN / (1000 * G_ACCEL);
  const aAvg = fAvgN / m;
  const gLoad = aAvg / G_ACCEL;

  return { vKmh, m, v0, p, ekKj, dtMs, fAvgKn, tons, gLoad };
}

function updateCrashLab() {
  if (labAnimId) cancelAnimationFrame(labAnimId);
  labProgress = 1; // За замовчуванням показуємо фазу максимального навантаження, щоб одразу було видно різницю

  const phys = computeLabPhysics();

  document.getElementById("labSpeedText").textContent = `${phys.vKmh} км/год (${phys.v0.toFixed(1).replace(".", ",")} м/с)`;
  document.getElementById("labMassText").textContent = `${phys.m} кг`;

  document.getElementById("labCellP").textContent = `${Math.round(phys.p)} кг·м/с`;
  document.getElementById("labCellEk").textContent = `${phys.ekKj.toFixed(1).replace(".", ",")} кДж`;
  document.getElementById("labCellDt").textContent = `${phys.dtMs} мс (${(phys.dtMs / 1000).toFixed(3).replace(".", ",")} с)`;
  document.getElementById("labCellF").textContent = `${phys.fAvgKn.toFixed(1).replace(".", ",")} кН (${phys.tons.toFixed(2).replace(".", ",")} т)`;
  document.getElementById("labCellG").textContent = `${phys.gLoad.toFixed(1).replace(".", ",")} g`;

  const vCell = document.getElementById("labCellVerdict");
  const gCell = document.getElementById("labCellG");
  const fCell = document.getElementById("labCellF");

  if (phys.gLoad > 42) {
    vCell.textContent = "СМЕРТЕЛЬНЕ ПЕРЕВАНТАЖЕННЯ (> 42 g)";
    vCell.style.color = "var(--red)";
    gCell.style.color = "var(--red)";
    fCell.style.color = "var(--red)";
  } else if (phys.gLoad > 24) {
    vCell.textContent = "Межа міцності грудної клітки (ризик травм)";
    vCell.style.color = "var(--amber)";
    gCell.style.color = "var(--amber)";
    fCell.style.color = "var(--amber)";
  } else {
    vCell.textContent = "БЕЗПЕЧНЕ УТРИМАННЯ ТІЛА (< 24 g)";
    vCell.style.color = "var(--green)";
    gCell.style.color = "var(--green)";
    fCell.style.color = "var(--green)";
  }

  drawCrashLabCanvas(phys, labProgress);
}

function resetCrashLabAnim() {
  if (labAnimId) cancelAnimationFrame(labAnimId);
  labProgress = 0;
  drawCrashLabCanvas(computeLabPhysics(), 0);
}

function runCrashLabAnim() {
  if (labAnimId) cancelAnimationFrame(labAnimId);
  labProgress = 0;
  const phys = computeLabPhysics();

  function frame() {
    labProgress = Math.min(1, labProgress + 0.018);
    drawCrashLabCanvas(phys, labProgress);
    if (labProgress < 1) {
      labAnimId = requestAnimationFrame(frame);
    }
  }
  labAnimId = requestAnimationFrame(frame);
}

function drawCrashLabCanvas(phys, prog) {
  const canvas = document.getElementById("canvasCrashLab");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // Сітка креслення
  ctx.strokeStyle = "#EFEFEF";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < W; gx += 40) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
  }
  for (let gy = 0; gy < H; gy += 40) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  }

  // Вертикальний розділювач: Ліворуч — Крупний план авто та манекена, Праворуч — Графік F(t)
  const splitX = 760;
  ctx.strokeStyle = "#222222";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(splitX, 0);
  ctx.lineTo(splitX, H);
  ctx.stroke();

  // Верхні підписи зон
  ctx.fillStyle = "#F5F5F2";
  ctx.fillRect(0, 0, splitX - 1, 36);
  ctx.fillRect(splitX + 1, 0, W - splitX, 36);
  ctx.strokeStyle = "#222222";
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.lineTo(W, 36);
  ctx.stroke();

  ctx.fillStyle = "#111111";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("1. СТЕНД КРАШ-ТЕСТУ У РОЗРІЗІ (Манекен Hybrid III + Деформація кузова)", 16, 24);
  ctx.fillText("2. ОСЦИЛОГРАМА ІМПУЛЬСУ СИЛИ F(t) ПІД ЧАС ЗІТКНЕННЯ", splitX + 18, 24);

  // --- ЛІВА ЧАСТИНА: ВЕЛИКИЙ РОЗРІЗ АВТОМОБІЛЯ ---
  const floorY = 365;
  ctx.strokeStyle = "#222222";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(10, floorY);
  ctx.lineTo(splitX - 10, floorY);
  ctx.stroke();

  // Нерухомий бетонний блок краш-тесту
  drawCrashBarrierBlock(ctx, 645, 55, 95, floorY - 55);

  const speedScale = phys.vKmh / 90;
  const curCrumple = prog * Math.min(1, speedScale * 0.9);

  let dummyState = { slideX: 0, torsoAngle: 0, headAngle: 0, dangerHit: false };
  if (labMode === 0) {
    dummyState = {
      slideX: prog * 56,
      torsoAngle: prog * 0.72,
      headAngle: prog * 0.45,
      dangerHit: prog > 0.75
    };
  } else if (labMode === 1) {
    dummyState = {
      slideX: prog * 9,
      torsoAngle: prog * Math.min(0.42, 0.28 * speedScale),
      headAngle: prog * 0.28,
      dangerHit: false
    };
  } else {
    dummyState = {
      slideX: prog * 7,
      torsoAngle: prog * Math.min(0.32, 0.22 * speedScale),
      headAngle: prog * 0.14,
      dangerHit: false
    };
  }

  const carScale = 1.42;
  const carFrontAtScale = (410 - curCrumple * 52) * carScale;
  const carX = 645 - carFrontAtScale;

  drawDetailedCar(ctx, {
    x: carX,
    floorY,
    scale: carScale,
    crumple: curCrumple,
    dummyState,
    beltMode: labMode,
    airbagDeploy: labMode === 2 ? prog : 0,
    wheelAngle: 0,
    bodyColor: "#DCE3EC"
  });

  // Вектор гальмівної сили F або інерції p поверх манекена
  if (prog > 0.15) {
    if (labMode === 0) {
      drawVectorArrow(ctx, 310, 120, 440, 120, "#B81D13", `Удар за інерцією: F = ${phys.fAvgKn.toFixed(1)} кН`);
    } else {
      drawVectorArrow(ctx, 350, 120, 210, 120, "#146334", `Гальмівна сила паска: F = ${phys.fAvgKn.toFixed(1)} кН`);
    }
  }

  // --- ПРАВА ЧАСТИНА: ГРАФІК F(t) ---
  drawImpulseGraphOnLab(ctx, splitX + 68, 70, W - splitX - 96, H - 125, phys, prog);
}

function drawImpulseGraphOnLab(ctx, gx, gy, gw, gh, phys, prog) {
  const maxTimeMs = 150;
  const maxForceKn = 90;

  // Горизонтальні лінії сітки (кН)
  ctx.font = "bold 12px Consolas, monospace";
  ctx.fillStyle = "#333333";
  ctx.strokeStyle = "#DCDCDC";
  ctx.lineWidth = 1;

  for (let f = 0; f <= maxForceKn; f += 15) {
    const y = gy + gh - (f / maxForceKn) * gh;
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx + gw, y);
    ctx.stroke();
    ctx.fillText(`${f} кН`, gx - 52, y + 4);
  }

  // Вертикальні лінії сітки (мс)
  for (let t = 0; t <= maxTimeMs; t += 30) {
    const x = gx + (t / maxTimeMs) * gw;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x, gy + gh);
    ctx.stroke();
    ctx.fillText(`${t} мс`, x - 16, gy + gh + 20);
  }

  // Лінія безпечного порогу (≈ 28 кН)
  const ySafe = gy + gh - (28 / maxForceKn) * gh;
  ctx.strokeStyle = "#B81D13";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(gx, ySafe);
  ctx.lineTo(gx + gw, ySafe);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#B81D13";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("Межа міцності грудної клітки (~28 кН)", gx + 12, ySafe - 6);

  // Крива сили F(t) для поточного режиму
  const dt = phys.dtMs;
  const fPeak = Math.min(maxForceKn, phys.fAvgKn * 1.25);
  const activeTime = dt * prog;

  const isDanger = phys.gLoad > 42;
  const strokeCol = isDanger ? "#B81D13" : phys.gLoad > 24 ? "#E05A00" : "#146334";
  const fillCol = isDanger ? "rgba(184,29,19,0.22)" : phys.gLoad > 24 ? "rgba(224,90,0,0.22)" : "rgba(20,99,52,0.22)";

  if (activeTime > 0) {
    ctx.beginPath();
    ctx.moveTo(gx, gy + gh);
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * activeTime;
      const f = fPeak * Math.sin((Math.PI * t) / dt);
      const px = gx + (t / maxTimeMs) * gw;
      const py = gy + gh - (f / maxForceKn) * gh;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(gx + (activeTime / maxTimeMs) * gw, gy + gh);
    ctx.closePath();
    ctx.fillStyle = fillCol;
    ctx.fill();

    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }

  // Осі координат
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx, gy + gh);
  ctx.lineTo(gx + gw, gy + gh);
  ctx.stroke();

  // Написи у вільному полі графіка
  ctx.fillStyle = "#111111";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(`Площа під графіком = Імпульс Δp = ${Math.round(phys.p)} Н·с (СТАЛА ВЕЛИЧИНА)`, gx + 12, gy + gh + 42);
}

// ============================================================================
// СЛАЙД 7 (ПОКАЗ №3): ВИСОТА ПАДІННЯ З БУДИНКУ + ТИСК НА СКЕЛЕТ ЛЮДИНИ
// ============================================================================
let epBeltType = 2; // 0 = 6mm cord, 1 = 2-point lap belt, 2 = 3-point Bohlin belt

function setEpSpeed(kmh) {
  document.getElementById("epSpeedSlider").value = kmh;
  updateEnergyPressure();
}

function setEpBelt(type) {
  epBeltType = type;
  const btns = document.querySelectorAll("#epBeltGroup .btn-choice");
  btns.forEach((b, i) => b.classList.toggle("active", i === type));
  updateEnergyPressure();
}

function updateEnergyPressure() {
  const slider = document.getElementById("epSpeedSlider");
  if (!slider) return;
  const vKmh = Number(slider.value);
  const v0 = vKmh / 3.6;
  const m = 75;
  const ekKj = (0.5 * m * v0 * v0) / 1000;
  const hEq = (v0 * v0) / (2 * G_ACCEL);
  const floors = Math.max(1, Math.round(hEq / 3.0));

  document.getElementById("epSpeedVal").textContent = `${vKmh} км/год (h = ${hEq.toFixed(1).replace(".", ",")} м, ~${floors} пов.)`;

  const beltData = [
    { name: "Вузький трос (6 мм)", sCm2: 35, pKpa: 4000, col: "#B81D13", desc: "Тиск 4000 кПа — прорізання тканин" },
    { name: "2-точковий поясний ремінь", sCm2: 140, pKpa: 1000, col: "#E05A00", desc: "Тиск 1000 кПа на м'який живіт і поперек" },
    { name: "3-точковий пасок (47 мм)", sCm2: 280, pKpa: 500, col: "#146334", desc: "Тиск 500 кПа на міцні кістки тазу і грудини" }
  ];

  const curBelt = beltData[epBeltType];
  document.getElementById("epPressureVal").textContent = `p = ${curBelt.pKpa} кПа (S = ${curBelt.sCm2} см²)`;

  drawEnergyPressureCanvas(vKmh, ekKj, hEq, floors, beltData);
}

function drawEnergyPressureCanvas(vKmh, ekKj, hEq, floors, beltData) {
  const canvas = document.getElementById("canvasEnergyPressure");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  const midX = 660;
  ctx.strokeStyle = "#222222";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(midX, 0);
  ctx.lineTo(midX, H);
  ctx.stroke();

  // Шапки панелей
  ctx.fillStyle = "#F5F5F2";
  ctx.fillRect(0, 0, midX - 1, 36);
  ctx.fillRect(midX + 1, 0, W - midX, 36);
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.lineTo(W, 36);
  ctx.stroke();

  ctx.fillStyle = "#111111";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("1. ЕКВІВАЛЕНТ ВІЛЬНОГО ПАДІННЯ З БУДИНКУ: m·v²/2 = m·g·h", 16, 24);
  ctx.fillText("2. РОЗПОДІЛ МЕХАНІЧНОГО ТИСКУ p = F / S НА СКЕЛЕТ (при F = 14 кН)", midX + 16, 24);

  // --- ЛІВА ПАНЕЛЬ: БУДИНОК (18 ПОВЕРХІВ) ТА АВТОМОБІЛЬ ---
  const groundY = H - 34;
  const topY = 62;
  const bHeightPx = groundY - topY;
  const maxMeters = 54; // 18 поверхів по 3 м

  // Земля
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, groundY);
  ctx.lineTo(midX - 30, groundY);
  ctx.stroke();

  // Фасад 18-поверхового будинку
  const bx = 90;
  const bw = 135;
  ctx.fillStyle = "#E4E6EB";
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 2;
  ctx.fillRect(bx, topY, bw, bHeightPx);
  ctx.strokeRect(bx, topY, bw, bHeightPx);

  // Поверхи і вікна
  for (let f = 1; f <= 18; f++) {
    const fy = groundY - ((f * 3) / maxMeters) * bHeightPx;
    ctx.strokeStyle = "#C4C8D0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, fy);
    ctx.lineTo(bx + bw, fy);
    ctx.stroke();

    // Вікна
    ctx.fillStyle = f <= floors ? "#FDECEB" : "#FFFFFF";
    for (let wx = bx + 14; wx < bx + bw - 18; wx += 28) {
      ctx.fillRect(wx, fy + 3, 16, 10);
    }

    if (f % 2 === 0 || f === 1) {
      ctx.fillStyle = "#222222";
      ctx.font = "bold 12px Consolas, monospace";
      ctx.fillText(`${f} пов.`, bx - 58, fy + 11);
    }
  }

  // Лінія висоти hEq
  const clampedH = Math.min(maxMeters, hEq);
  const fallY = groundY - (clampedH / maxMeters) * bHeightPx;

  ctx.strokeStyle = "#B81D13";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(bx + bw, fallY);
  ctx.lineTo(bx + bw + 170, fallY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Вектор вільного падіння вниз
  drawVectorArrow(ctx, bx + bw + 65, fallY + 6, bx + bw + 65, groundY - 6, "#B81D13", "");

  // Інформаційна табличка праворуч від будинку
  const boxX = 330;
  ctx.fillStyle = "#F5F5F2";
  ctx.strokeStyle = "#222222";
  ctx.lineWidth = 2;
  ctx.fillRect(boxX, 85, 300, 195);
  ctx.strokeRect(boxX, 85, 300, 195);

  ctx.fillStyle = "#111111";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(`Швидкість: ${vKmh} км/год`, boxX + 16, 118);
  ctx.font = "15px sans-serif";
  ctx.fillText(`У системі СІ: v = ${(vKmh / 3.6).toFixed(1)} м/с`, boxX + 16, 146);
  ctx.fillText(`Кінетична енергія (75 кг):`, boxX + 16, 178);
  ctx.font = "bold 20px Consolas, monospace";
  ctx.fillStyle = "#0B3C68";
  ctx.fillText(`Eₖ = ${ekKj.toFixed(1)} кДж`, boxX + 16, 206);

  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = "#B81D13";
  ctx.fillText(`Висота падіння: h = ${hEq.toFixed(1)} м`, boxX + 16, 240);
  ctx.fillText(`(як падіння з ${floors}-го поверху!)`, boxX + 16, 264);

  // --- ПРАВА ПАНЕЛЬ: АНАТОМІЧНА СХЕМА СКЕЛЕТА ТА ДІАГРАМА ТИСКУ ---
  const tcx = midX + 150;
  // Контур спинки сидіння
  ctx.fillStyle = "#EAEAE6";
  ctx.strokeStyle = "#888888";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(tcx - 78, 56, 156, 320, 18);
  ctx.fill();
  ctx.stroke();

  // Голова та шия анфас
  ctx.fillStyle = "#E8C39E";
  ctx.strokeStyle = "#111111";
  ctx.beginPath();
  ctx.arc(tcx, 95, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(tcx - 9, 118, 18, 16);

  // Контур торса анфас
  ctx.fillStyle = "#F7F9FB";
  ctx.beginPath();
  ctx.roundRect(tcx - 62, 132, 124, 175, 22);
  ctx.fill();
  ctx.stroke();

  // Анатомічні зони скелета:
  // 1) Ключиці та грудна клітка (міцний кістковий каркас)
  ctx.fillStyle = "#DCE6F2";
  ctx.strokeStyle = "#0B3C68";
  ctx.lineWidth = 2;
  ctx.fillRect(tcx - 46, 144, 92, 68);
  ctx.strokeRect(tcx - 46, 144, 92, 68);
  ctx.fillStyle = "#0B3C68";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("КЛЮЧИЦЯ І ГРУДИНА", tcx - 42, 175);
  ctx.font = "11px sans-serif";
  ctx.fillText("(міцний захист)", tcx - 34, 192);

  // 2) Черевна порожнина (м'яка небезпечна зона)
  ctx.fillStyle = "#FDECEB";
  ctx.strokeStyle = "#B81D13";
  ctx.fillRect(tcx - 42, 218, 84, 38);
  ctx.strokeRect(tcx - 42, 218, 84, 38);
  ctx.fillStyle = "#B81D13";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("ЖИВІТ (м'яка зона)", tcx - 38, 241);

  // 3) Тазові кістки (найміцніша кістка)
  ctx.fillStyle = "#DCE6F2";
  ctx.strokeStyle = "#0B3C68";
  ctx.fillRect(tcx - 50, 262, 100, 34);
  ctx.strokeRect(tcx - 50, 262, 100, 34);
  ctx.fillStyle = "#0B3C68";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("КІСТКИ ТАЗУ (міцні)", tcx - 44, 283);

  // Малюємо вибраний пасок поверх анатомічної схеми
  if (epBeltType === 0) {
    // 6-мм трос упоперек живота
    ctx.strokeStyle = "#B81D13";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tcx - 72, 236);
    ctx.lineTo(tcx + 72, 236);
    ctx.stroke();
  } else if (epBeltType === 1) {
    // 2-точковий поясний ремінь по животу
    ctx.strokeStyle = "#E05A00";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(tcx - 72, 238);
    ctx.lineTo(tcx + 72, 238);
    ctx.stroke();
  } else {
    // 3-точковий пасок Нільса Боліна: діагональ по ключиці/грудині + пояс по кістках тазу!
    ctx.strokeStyle = "#146334";
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tcx - 62, 134);
    ctx.lineTo(tcx + 58, 278);
    ctx.moveTo(tcx - 64, 278);
    ctx.lineTo(tcx + 58, 278);
    ctx.stroke();

    // Металевий замок збоку тазу
    ctx.fillStyle = "#111111";
    ctx.fillRect(tcx + 52, 266, 18, 24);
  }

  // Стовпчикова порівняльна шкала тиску p = F / S праворуч від торса
  const barStartX = midX + 320;
  const barMaxW = 260;

  ctx.fillStyle = "#111111";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("Механічний тиск p = F / S:", barStartX, 75);

  beltData.forEach((b, i) => {
    const by = 105 + i * 95;
    const isAct = i === epBeltType;
    const w = (b.pKpa / 4000) * barMaxW;

    ctx.fillStyle = "#111111";
    ctx.font = isAct ? "bold 14px sans-serif" : "13px sans-serif";
    ctx.fillText(`${i + 1}. ${b.name} (S = ${b.sCm2} см²)`, barStartX, by);

    ctx.fillStyle = "#EAEAE6";
    ctx.fillRect(barStartX, by + 8, barMaxW, 28);

    ctx.fillStyle = b.col;
    ctx.globalAlpha = isAct ? 1.0 : 0.35;
    ctx.fillRect(barStartX, by + 8, w, 28);
    ctx.globalAlpha = 1.0;

    ctx.strokeStyle = "#111111";
    ctx.lineWidth = isAct ? 2.5 : 1;
    ctx.strokeRect(barStartX, by + 8, barMaxW, 28);

    ctx.fillStyle = "#111111";
    ctx.font = "bold 14px Consolas, monospace";
    ctx.fillText(`${b.pKpa} кПа`, barStartX + w + 10, by + 27);

    ctx.fillStyle = "#333333";
    ctx.font = "12px sans-serif";
    ctx.fillText(b.desc, barStartX, by + 54);
  });
}

// ============================================================================
// СЛАЙД 8 (ПОКАЗ №4): ІНЖЕНЕРНА МЕХАНІКА ІНЕРЦІЙНОЇ КОТУШКИ В РОЗРІЗІ
// ============================================================================
let reelMode = 0; // 0 = slow unspool, 1 = inertia ball locks ratchet, 2 = torsion bar twists
let reelAngle = 0;
let torsionTwist = 0;
let reelAnimId = null;

function setReelMode(mode) {
  reelMode = mode;
  torsionTwist = 0;
  const btns = document.querySelectorAll("#reelModeGroup .btn-choice");
  btns.forEach((b, i) => b.classList.toggle("active", i === mode));
}

function startReelLoop() {
  if (reelAnimId) cancelAnimationFrame(reelAnimId);

  function loop() {
    if (currentSlide !== 7) return;
    if (reelMode === 0) {
      reelAngle += 0.022;
    } else if (reelMode === 2) {
      torsionTwist = Math.min(1, torsionTwist + 0.015);
    }
    drawReelCanvas();
    reelAnimId = requestAnimationFrame(loop);
  }
  reelAnimId = requestAnimationFrame(loop);
}

function drawReelCanvas() {
  const canvas = document.getElementById("canvasReel");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // Сітка
  ctx.strokeStyle = "#EFEFEF";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < W; gx += 40) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
  }
  for (let gy = 0; gy < H; gy += 40) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  }

  const isLocked = reelMode === 1 || reelMode === 2;
  const cx = 310;
  const cy = 165;
  const gearR = 96;
  const numTeeth = 16;

  // Корпус котушки на стійці кузова
  ctx.fillStyle = "#F5F5F2";
  ctx.strokeStyle = "#222222";
  ctx.lineWidth = 2.5;
  ctx.fillRect(80, 24, 460, 362);
  ctx.strokeRect(80, 24, 460, 362);

  // Стрічка паска, що виходить вгору з котушки
  ctx.fillStyle = "#D9381E";
  ctx.fillRect(cx + gearR - 18, 24, 18, cy - 24);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 2;
  ctx.strokeRect(cx + gearR - 18, 24, 18, cy - 24);

  if (!isLocked) {
    drawVectorArrow(ctx, cx + gearR + 24, 130, cx + gearR + 24, 45, "#146334", "Вільний хід стрічки");
  } else {
    drawVectorArrow(ctx, cx + gearR + 24, 55, cx + gearR + 24, 130, "#B81D13", "СТРІЧКУ ЗАБЛОКОВАНО!");
  }

  // Храпове зубчасте колесо (Ratchet Gear)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(reelAngle);

  ctx.fillStyle = isLocked ? "#FDECEB" : "#DCE6F2";
  ctx.strokeStyle = isLocked ? "#B81D13" : "#0B3C68";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < numTeeth; i++) {
    const a1 = (i / numTeeth) * Math.PI * 2;
    const a2 = ((i + 0.6) / numTeeth) * Math.PI * 2;
    const a3 = ((i + 1) / numTeeth) * Math.PI * 2;
    ctx.lineTo(Math.cos(a1) * (gearR - 18), Math.sin(a1) * (gearR - 18));
    ctx.lineTo(Math.cos(a2) * gearR, Math.sin(a2) * gearR);
    ctx.lineTo(Math.cos(a3) * (gearR - 18), Math.sin(a3) * (gearR - 18));
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Внутрішній сталевий торсіонний вал (Torsion bar)
  ctx.fillStyle = "#333942";
  ctx.beginPath();
  ctx.arc(0, 0, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Смуги скручування торсіона (для режиму 3)
  ctx.strokeStyle = reelMode === 2 ? "#F5B800" : "#FFFFFF";
  ctx.lineWidth = 3;
  const twistOffset = reelMode === 2 ? torsionTwist * 1.2 : 0;
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(22 * Math.cos(twistOffset), 22 * Math.sin(twistOffset));
  ctx.stroke();

  ctx.restore();

  // Нижній вузол: Храпова собачка (Locking Pawl) + Інерційна сталева кулька в чаші
  const pivotX = cx - 78;
  const pivotY = cy + 115;
  const pawlAng = isLocked ? -0.32 : 0.06;

  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(pawlAng);
  ctx.fillStyle = isLocked ? "#B81D13" : "#444950";
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(0, -9, 108, 18, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Вісь собачки
  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 7, 0, Math.PI * 2);
  ctx.fill();

  // Похила чаша інерційного датчика
  const cupX = cx;
  const cupY = cy + 168;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cupX - 55, cupY - 14);
  ctx.quadraticCurveTo(cupX, cupY + 16, cupX + 55, cupY - 14);
  ctx.stroke();

  // Важка сталева кулька (котиться вперед за І законом Ньютона при гальмуванні авто!)
  const ballX = cupX + (isLocked ? 32 : 0);
  const ballY = cupY - 14 + (isLocked ? -11 : 0);
  ctx.fillStyle = isLocked ? "#B81D13" : "#0B3C68";
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ballX, ballY, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (isLocked) {
    drawVectorArrow(ctx, cupX - 10, cupY + 26, cupX + 65, cupY + 26, "#B81D13", "Інерція кульки (a > 0,7g)");
  }

  // Права частина полотна: Коротке позначення вузлів та фізичних параметрів
  const rx = 580;
  const rw = 745;

  const cards = [
    {
      active: reelMode === 0,
      title: "1. РЕЖИМ ВІЛЬНОГО ХОДУ (a < 0,7g)",
      text1: "Прискорення авто: a = 0,2 м/с²",
      text2: "Стан храповика: ВІДКРИТО (вільне змотування стрічки)"
    },
    {
      active: reelMode === 1,
      title: "2. ІНЕРЦІЙНЕ БЛОКУВАННЯ (a > 0,7g ≈ 6,8 м/с²)",
      text1: "Датчик: сталева інерційна кулька + храпова собачка",
      text2: "Час спрацювання механізму: Δt_блок ≈ 18 мс"
    },
    {
      active: reelMode === 2,
      title: "3. ТОРСІОННИЙ ОБМЕЖУВАЧ СИЛИ (F_межа = 4,5 кН)",
      text1: "Елемент: сталевий стрижень усередині вала котушки",
      text2: "Пластичне скручування вала при силі натягу F > 4,5 кН"
    }
  ];

  cards.forEach((c, i) => {
    const cyBox = 32 + i * 120;
    ctx.fillStyle = c.active ? "#E8F0F8" : "#F5F5F2";
    ctx.strokeStyle = c.active ? "#0B3C68" : "#CCCCCC";
    ctx.lineWidth = c.active ? 3 : 1.5;
    ctx.fillRect(rx, cyBox, rw, 104);
    ctx.strokeRect(rx, cyBox, rw, 104);

    ctx.fillStyle = c.active ? "#0B3C68" : "#222222";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(c.title, rx + 18, cyBox + 28);

    ctx.fillStyle = "#111111";
    ctx.font = "14px sans-serif";
    ctx.fillText(c.text1, rx + 18, cyBox + 58);
    ctx.fillText(c.text2, rx + 18, cyBox + 84);
  });
}

// ============================================================================
// СЛАЙД 9: БЛІЦ-ПИТАННЯ
// ============================================================================
function toggleQa(index) {
  const el = document.getElementById(`qa${index}`);
  if (el) el.classList.toggle("open");
}

window.addEventListener("DOMContentLoaded", () => {
  initDeck();
  resetInertiaSim();
  updateCrashLab();
  updateEnergyPressure();
});
