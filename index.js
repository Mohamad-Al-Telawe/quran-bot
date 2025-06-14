import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const app = express();

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

// إعداد قاعدة البيانات
const adapter = new JSONFile('db.json');
const db = new Low(adapter);

// تحميل البيانات أو إنشاؤها
async function initDB() {
  await db.read();
  db.data ||= { students: [] };
  await db.write();
}
initDB();

app.use(express.json());

// استقبال بيانات من البوت (اختياري من خلال API خارجي)
app.post('/add-points', async (req, res) => {
  const { studentId, points } = req.body;
  await addPoints(studentId, points);
  res.send({ status: 'تم الحفظ' });
});

// تشغيل السيرفر
app.listen(3000, () => {
  console.log('Server running on port 3000');
});

// دالة لإضافة النقاط
async function addPoints(studentId, points) {
  await db.read();
  let student = db.data.students.find(s => s.id === studentId);
  if (!student) {
    student = { id: studentId, totalPoints: 0 };
    db.data.students.push(student);
  }
  student.totalPoints += points;
  await db.write();
}

// الاستماع لرسائل البوت
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // توقع أن الرسالة بهذا الشكل: 1234 5
  const parts = text.split(' ');
  if (parts.length !== 2) {
    bot.sendMessage(chatId, 'أرسل الرسالة بالشكل: رقم_الطالب عدد_النقاط');
    return;
  }

  const studentId = parts[0];
  const points = parseInt(parts[1]);

  if (isNaN(points)) {
    bot.sendMessage(chatId, 'عدد النقاط يجب أن يكون رقمًا.');
    return;
  }

  await addPoints(studentId, points);
  bot.sendMessage(chatId, `تمت إضافة ${points} نقطة للطالب رقم ${studentId}`);
});

// أمر لعرض مجموع نقاط طالب
bot.onText(/\/check (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const studentId = match[1];

  await db.read();
  const student = db.data.students.find(s => s.id === studentId);

  if (!student) {
    bot.sendMessage(chatId, 'الطالب غير موجود.');
  } else {
    bot.sendMessage(chatId, `الطالب رقم ${studentId} لديه ${student.totalPoints} نقطة.`);
  }
});
