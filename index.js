const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// ✅ Web server لمنع Glitch من النوم
app.get("/", (req, res) => res.send("🤖 البوت يعمل حالياً!"));
app.listen(port, () => console.log(`🌐 Web server running on port ${port}`));

app.use((req, res, next) => {
   res.setHeader("Access-Control-Allow-Origin", "*");
   next();
});

// 🧠 ملفات البيانات
const STUDENTS_FILE = "students.json";
const RECORDS_FILE = "records.json";

// 📦 تحميل أو إنشاء ملف الطلاب
function loadStudents() {
   if (!fs.existsSync(STUDENTS_FILE)) {
      fs.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2));
   }
   return JSON.parse(fs.readFileSync(STUDENTS_FILE));
}

// 📥 تحميل أو إنشاء سجل التسميع
function loadRecords() {
   if (!fs.existsSync(RECORDS_FILE)) {
      fs.writeFileSync(RECORDS_FILE, JSON.stringify([]));
   }
   return JSON.parse(fs.readFileSync(RECORDS_FILE));
}

// 💾 حفظ سجل التسميع
function saveRecords(data) {
   console.log("✅ جاري حفظ السجلات...");
   fs.writeFileSync(RECORDS_FILE, JSON.stringify(data, null, 2));
}

// ✅ التأكد من وجود الطالب
function isValidStudent(studentId) {
   const students = loadStudents();
   return students.some((s) => s.id === studentId);
}  

// 🧠 تحليل السطر
function parseLine(line, teacherId, teacherName) {
   const regex = /^(\d+)\s+(\d+)\s+\((\d+)-(\d+)\)\s+([جم])$/i;
   const match = line.trim().match(regex);
   if (!match) return null;

   const [_, studentId, page, tajweed, memorization, type] = match;

   return {
      studentId,
      page: parseInt(page),
      tajweedScore: parseInt(tajweed),
      memorizationScore: parseInt(memorization),
      type: type.toLowerCase() === "ج" ? "جديد" : "مراجعة",
      teacherId,
      teacherName,
      date: new Date().toISOString(),
   };
}

// 🚀 إعداد البوت
const token = "8019788337:AAEnYsLg5n8KbPp-3VYFb_c76_9zdBeoipk";
const bot = new TelegramBot(token, { polling: true });

// 📩 استقبال الرسائل
bot.on("message", (msg) => {
   const chatId = msg.chat.id;
   const text = msg.text.trim();
   const teacherId = msg.from.id || "مدرّس مجهول";
   const teacherName =
      msg.from.username || msg.from.first_name || "مدرّس مجهول";
   const lines = text.split("\n");
   const records = loadRecords();
   const students = loadStudents();

   let replyLines = [];

   lines.forEach((line) => {
      const entry = parseLine(line, teacherId, teacherName);

      if (!entry) {
         replyLines.push(`❌ لم أفهم التنسيق في السطر:\n${line}`);
         return;
      }

      const studentData = students.find((s) => s.id === entry.studentId);

      if (!studentData) {
         replyLines.push(
            `❌ الطالب برقم ${entry.studentId} غير موجود في القائمة.`
         );
         return;
      }

      const tajweed = entry.tajweedScore;
      const memorization = entry.memorizationScore;

      if (entry.type === "جديد") {
         if (tajweed < 3 || memorization < 3) {
            replyLines.push(
               `📄 الصفحة ${entry.page}: علامة قليلة – بحاجة إلى إعادة`
            );
            return;
         }
         if (
            ![3, 4, 5].includes(tajweed) ||
            ![3, 4, 5].includes(memorization)
         ) {
            replyLines.push(
               `❌ الصفحة ${entry.page}: خطأ في الإدخال – العلامات يجب أن تكون 3 أو 4 أو 5`
            );
            return;
         }
      } else if (entry.type === "مراجعة") {
         if (tajweed < 4 || memorization < 4) {
            replyLines.push(
               `📄 الصفحة ${entry.page}: علامة قليلة – بحاجة إلى إعادة`
            );
            return;
         }
         if (![4, 5].includes(tajweed) || ![4, 5].includes(memorization)) {
            replyLines.push(
               `❌ الصفحة ${entry.page}: خطأ في الإدخال – العلامات يجب أن تكون 4 أو 5`
            );
            return;
         }
      }

      // ✅ بعد التحقق
      entry.studentName = studentData.name;
      records.push(entry);

      replyLines.push(
         `✅ تم إضافة الصفحة ${entry.page} نوع ${entry.type} ` +
            `بالعلامة (${tajweed}ت-${memorization}ح) ` +
            `للطالب ${studentData.name} (${entry.studentId})`
      );
   });

   console.log("📁 سيتم حفظ السجل بعد هذه العملية");
   saveRecords(records);

   const finalReply = replyLines.join("\n");
   bot.sendMessage(chatId, finalReply);
});

app.get("/show-records", (req, res) => {
   try {
      const data = fs.readFileSync(RECORDS_FILE);
      res.setHeader("Content-Type", "application/json");
      res.send(data);
   } catch (err) {
      res.status(500).send("❌ خطأ في قراءة الملف");
   }
});

app.get("/records.json", (req, res) => {
   const records = fs.existsSync("records.json")
      ? JSON.parse(fs.readFileSync("records.json"))
      : [];
   res.json(records);
});
