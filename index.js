const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const token = '8037606268:AAHXAjdNZiVN0yCknhW1vFhBzSRvJPK9U_A'; // ضع التوكن هنا مباشرة
const bot = new TelegramBot(token, { polling: true });

const DB_FILE = 'db.json';


// تحميل قاعدة البيانات من ملف
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ students: [] }, null, 2));
  }

  const data = fs.readFileSync(DB_FILE);
  return JSON.parse(data);
}

// حفظ قاعدة البيانات إلى ملف
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// إضافة نقاط لطالب
function addPoints(studentId, points) {
  const db = loadDB();
  let student = db.students.find(s => s.id === studentId);

  if (student) {
    student.totalPoints += points;
  } else {
    db.students.push({ id: studentId, totalPoints: points });
  }

  saveDB(db);
}

// فحص نقاط طالب
function getPoints(studentId) {
  const db = loadDB();
  const student = db.students.find(s => s.id === studentId);
  return student ? student.totalPoints : null;
}

// استقبال الرسائل بصيغة: 1234 10
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const parts = text.split(' ');

  if (parts.length === 2 && !isNaN(parts[1])) {
    const studentId = parts[0];
    const points = parseInt(parts[1]);
    addPoints(studentId, points);
    bot.sendMessage(chatId, `✅ تمت إضافة ${points} نقطة للطالب رقم ${studentId}`);
  }
});

// أمر فحص النقاط: /check 1234
bot.onText(/\/check (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const studentId = match[1];
  const points = getPoints(studentId);

  if (points !== null) {
    bot.sendMessage(chatId, `📌 الطالب رقم ${studentId} لديه ${points} نقطة.`);
  } else {
    bot.sendMessage(chatId, '❌ الطالب غير موجود.');
  }
});
