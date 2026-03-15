const PROMO_START = new Date('2026-03-13T00:00:00-04:00'); // ET
const PROMO_END = new Date('2026-03-27T23:59:59-04:00'); // ET
const PEAK_START = 8;   // 8 AM ET
const PEAK_END = 14;  // 2 PM ET

const MESSAGES = {
    POST_PROMO: [
        "The golden age has ended. Back to paying full price like a peasant",
        "Promo concluded. Your 5-hour cap is mourning its lost double",
        "Lore update: The 2x era is now ancient history"
    ],
    PEAK_HOURS: [
        "I guess I'll pay the full price",
        "Claude is too popular to be cheap right now",
        "Pay some respect to your weekly usage limit",
        "Rate limits are currently behaving normally. How boring"
    ],
    OFF_PEAK: [
        "Go burn your tokens NOW",
        "Buy one token, get one free",
        "Two tokens for the price of one",
        "Burn tokens like Claude would file a lawsuit"
    ]
};

function getRandomMessage(type) {
    const pool = MESSAGES[type];
    return pool[Math.floor(Math.random() * pool.length)];
}

let lastType = null;

function getET() {
    return new Date(
        new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    );
}

function pad(n) { return String(n).padStart(2, '0'); }

function etToLocal(etDate) {
    const year = etDate.getFullYear();
    const month = etDate.getMonth() + 1;
    const day = etDate.getDate();
    const hour = etDate.getHours();
    const isoStr = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:00:00-04:00`;
    return new Date(isoStr);
}

// Share functionality
document.getElementById('share-btn').addEventListener('click', async () => {
    const answer = document.getElementById('big-answer').textContent;
    const sub = document.getElementById('hero-sub').textContent;
    const shareText = `Is Claude 2x now? ${answer}. ${sub}`;
    const shareUrl = window.location.href;

    if (navigator.share) {
        try {
            await navigator.share({ title: 'Is Claude 2x Now?', text: shareText, url: shareUrl });
        } catch (e) { /* user cancelled */ }
    } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        const btn = document.getElementById('share-btn');
        btn.style.color = 'var(--orange)';
        setTimeout(() => btn.style.color = '', 1500);
    }
});

// ---- Tick ----
function tick() {
    const now = new Date();
    const et = getET();
    const hour = et.getHours();

    const isPromoActive = now >= PROMO_START && now <= PROMO_END;
    const day = et.getDay(); // 0=Sun, 6=Sat
    const isWeekend = (day === 0 || day === 6);
    const isOffPeak = isWeekend || !(hour >= PEAK_START && hour < PEAK_END);
    const is2x = isPromoActive && isOffPeak;

    const answer = document.getElementById('big-answer');
    const heroSub = document.getElementById('hero-sub');

    // Proximity logic
    let proximityMsg = "";
    const currentETMillis = et.getTime();

    let nextTransitionET = new Date(et);
    if (isWeekend) {
        // Weekend: next transition is Monday 8 AM (peak starts)
        const daysUntilMonday = day === 0 ? 1 : 2; // Sun=1day, Sat=2days
        nextTransitionET.setDate(nextTransitionET.getDate() + daysUntilMonday);
        nextTransitionET.setHours(PEAK_START, 0, 0, 0);
    } else if (hour < PEAK_START) {
        nextTransitionET.setHours(PEAK_START, 0, 0, 0);
    } else if (hour < PEAK_END) {
        nextTransitionET.setHours(PEAK_END, 0, 0, 0);
    } else {
        // After peak on a weekday
        if (day === 5) {
            // Friday after peak -> next peak is Monday 8 AM
            nextTransitionET.setDate(nextTransitionET.getDate() + 3);
        } else {
            nextTransitionET.setDate(nextTransitionET.getDate() + 1);
        }
        nextTransitionET.setHours(PEAK_START, 0, 0, 0);
    }

    const diffToNext = nextTransitionET.getTime() - currentETMillis;
    const isSoon = diffToNext <= 1800000; // 30 mins

    if (isSoon) {
        if (is2x) {
            proximityMsg = "Ending soon";
        } else if (isPromoActive) {
            proximityMsg = "Starting soon";
        }
    }

    let statusType;
    if (!isPromoActive) {
        statusType = 'POST_PROMO';
        answer.textContent = proximityMsg || "No";
        answer.className = 'display-answer inactive';
    } else if (!isOffPeak) {
        statusType = 'PEAK_HOURS';
        answer.textContent = proximityMsg || "No";
        answer.className = 'display-answer inactive';
    } else {
        statusType = 'OFF_PEAK';
        answer.textContent = proximityMsg || "Yes";
        answer.className = 'display-answer active';
    }

    if (statusType !== lastType) {
        heroSub.innerHTML = getRandomMessage(statusType);
        lastType = statusType;
    }

    // --- Time Calculations ---
    const localTransition = etToLocal(nextTransitionET);
    const localDateTimeStr = localTransition.toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });

    // --- Update UI ---
    const displayLabel = document.getElementById('display-label');
    const displayValue = document.getElementById('display-value');

    const hCount = Math.floor(diffToNext / 3_600_000);
    const mCount = Math.floor((diffToNext % 3_600_000) / 60_000);
    const sCount = Math.floor((diffToNext % 60_000) / 1_000);
    const countdownStr = `${pad(hCount)}:${pad(mCount)}:${pad(sCount)}`;

    const nextStateName = is2x ? 'peak' : 'off-peak';

    displayLabel.textContent = `${nextStateName} in`;
    displayValue.textContent = countdownStr;

    // Status label: "Off-Peak until Mar 16, 9:00 PM"
    const labelStr = is2x ? 'Off-Peak until' : 'Peak until';
    document.getElementById('status-label').textContent = `${labelStr} ${localDateTimeStr}`;

    // --- Promo Progress ---
    const total = PROMO_END - PROMO_START;
    const elapsed = Math.max(0, Math.min(now - PROMO_START, total));
    const pct = (elapsed / total) * 100;

    document.getElementById('progress-fill').style.width = `${pct}%`;
    document.getElementById('progress-pct').textContent = `${pct.toFixed(1)}%`;

    // Days left calculation
    const msLeft = PROMO_END - now;
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    const daysText = daysLeft > 0 ? `${daysLeft} days left` : "Promotion ended";
    document.getElementById('progress-days').textContent = daysText;
}

tick();
setInterval(tick, 1000);
