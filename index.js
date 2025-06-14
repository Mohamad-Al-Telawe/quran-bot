import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import fs from 'fs';

const app = express();

// ✅ التحقق من وجود التوكن
const token = process.env.TOKEN;
if (!token) {
  console.error('❌ متغير TOKEN غير موجود. تأكد من إضافته في Railway > Variables');
  process.exit(1);
}

// ✅ التحقق من وجود مجلد قاعدة البيانات
const dbFolder = './data';
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder);
}

// ✅ إعداد قاعدة البيانات
const adapter = new JSONFile('./data/db.json');
const db = new Low(adapter);

async function initDB() {
  await db.read();
  if (!db.data) {
    db.data = { students: [] };
    await db.write();
  }
}

await initDB(); // التأكد من جاهزية قاعدة البيانات قبل تشغيل البوت

const bot = new TelegramBot(token, { polling: true });

app.use(express.json());

// ✅ استقبال بيانات من API خارجي (اختياري)
app.post('/add-points', async (req, res) => {
  const { studentId, points } = req.body;
  if (!studentId || typeof points !== 'number') {
    return res.status(400).send({ error: 'بيانات غير صحيحة' });
  }
  await addPoints(studentId, points);
  res.send({ status: 'تم الحفظ' });
});

// ✅ تشغيل السيرفر على المنفذ الصحيح
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// ✅ دالة لإضافة النقاط
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

// ✅ التعامل مع رسائل البوت
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // الشكل المتوقع: 1234 5
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
  bot.sendMessage(chatId, `✅ تمت إضافة ${points} نقطة للطالب رقم ${studentId}`);
});

// ✅ أمر عرض النقاط
bot.onText(/\/check (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const studentId = match[1];

  await db.read();
  const student = db.data.students.find(s => s.id === studentId);

  if (!student) {
    bot.sendMessage(chatId, 'الطالب غير موجود.');
  } else {
    bot.sendMessage(chatId, `📊 الطالب رقم ${studentId} لديه ${student.totalPoints} نقطة.`);
  }
});
