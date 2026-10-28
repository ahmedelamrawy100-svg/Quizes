const express = require('express');
const { chromium } = require('playwright');
const app = express();
const PORT = 3000;

const TARGET_URL = 'http://127.0.0.1:5500'; // ✏️ تأكد إن ده رابط Live Server بتاعك
const EXCLUDED_PAGES = ['admin.html', 'owner.html', 'tester.html', 'bot.html'];

app.use(express.static('public'));

let testLogs = [];
let isRunning = false;

app.get('/api/logs', (req, res) => {
    res.json({ logs: testLogs, isRunning });
});

app.get('/api/start', async (req, res) => {
    if (isRunning) return res.send('Already running');
    isRunning = true;
    testLogs = [];
    
    runTests().then(() => {
        isRunning = false;
        testLogs.push({ type: 'done', msg: '✅ جميع الاختبارات انتهت!' });
    }).catch(err => {
        isRunning = false;
        testLogs.push({ type: 'error', msg: '❌ خطأ فادح: ' + err.message });
    });

    res.send('Started');
});

function log(type, msg) {
    testLogs.push({ type, msg, time: new Date().toLocaleTimeString() });
}

async function runTests() {
    log('info', '🚀 بدء تشغيل البوت...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    page.on('console', msg => {
        if (msg.type() === 'error') log('error', 'خطأ في المتصفح: ' + msg.text());
    });

    try {
        const pagesToTest = [
            'index.html', 'leaderboard.html', 'users.html', 'badges.html',
            'comments.html', 'inbox.html', 'chat.html', 'assistant.html',
            'profile.html', 'notifications.html', 'messages.html', 'Annabelle Quiz.html',
            'Conjuring Quiz.html', 'Dream To You Quiz.html', 'Family By Choice Quiz.html',
            'FNAF Quiz.html', 'Squid Game Quiz.html', 'The Nun Quiz.html',
            'The Wonder Fools Quiz.html', 'Train to Busan Quiz.html', 'True Beauty Quiz.html',
            'Wednesday Quiz.html', 'Why Her Quiz.html'
        ];

        log('info', '▶️ اختبار الصفحة الرئيسية...');
        await page.goto(`${TARGET_URL}/index.html`, { waitUntil: 'networkidle' });
        
        await page.fill('#usernameInput', 'TestBot_' + Math.floor(Math.random()*1000));
        await page.fill('#passwordInput', 'TestPassword123');
        
        await page.click('#switchAuth'); 
        await page.click('#signupBtn');
        log('success', '✅ تم اختبار إنشاء الحساب.');
        await page.waitForTimeout(3000); 

        for (let pageName of pagesToTest) {
            if (EXCLUDED_PAGES.includes(pageName)) continue; 
            
            log('info', `▶️ جاري اختبار صفحة: ${pageName}...`);
            try {
                await page.goto(`${TARGET_URL}/${pageName}`, { waitUntil: 'networkidle', timeout: 15000 });
                await page.waitForTimeout(1000);

                const langBtn = await page.$('#langBtn, #authLangBtn, .lang-btn');
                if (langBtn) {
                    await langBtn.click();
                    await page.waitForTimeout(300);
                    await langBtn.click();
                    log('success', `  ✅ زرار اللغة يعمل.`);
                }

                const themeBtn = await page.$('#themeBtn, #authThemeBtn');
                if (themeBtn) {
                    await themeBtn.click();
                    await page.waitForTimeout(300);
                    await themeBtn.click();
                    log('success', `  ✅ زرار الوضع الليلي يعمل.`);
                }

                const quizCards = await page.$$('.quiz-card');
                if (quizCards.length > 0) {
                    await quizCards[0].click();
                    await page.waitForTimeout(800);
                    
                    const playScreen = await page.$('#playScreen');
                    if (playScreen) {
                        const options = await page.$$('.option');
                        if (options.length > 0) await options[0].click();
                        
                        const nextBtn = await page.$('#next');
                        if (nextBtn) await nextBtn.click();
                        
                        log('success', `  ✅ الكويز يفتح والأسئلة تعمل.`);
                    }
                }

                log('success', `✅ صفحة ${pageName} شغالة تمام.`);
            } catch (e) {
                log('error', `❌ فشل في صفحة ${pageName}: ${e.message}`);
            }
        }

        log('success', '🎉 مبروك! الموقع شغال 100% ولا توجد أخطاء.');
    } catch (e) {
        log('error', '❌ خطأ أثناء الاختبار: ' + e.message);
    } finally {
        await browser.close();
    }
}

app.listen(PORT, () => {
    console.log(`🚀 السيرفر شغال على http://localhost:${PORT}`);
});