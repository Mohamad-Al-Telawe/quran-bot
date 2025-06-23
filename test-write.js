const fs = require('fs');

const RECORDS_FILE = 'records.json';

// ✅ خطوة 1: تحميل البيانات إن وجدت، أو إنشاء ملف جديد
function loadRecords() {
  if (!fs.existsSync(RECORDS_FILE)) {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify([]));
    console.log("📄 تم إنشاء ملف records.json فارغ.");
  }

  const data = fs.readFileSync(RECORDS_FILE);
  return JSON.parse(data);
}

// ✅ خطوة 2: حفظ البيانات في الملف
function saveRecords(data) {
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(data, null, 2));
  console.log("💾 تم حفظ البيانات في records.json");
}

// ✅ تجربة عملية
const records = loadRecords();
records.push({
  studentId: "1234",
  page: 111,
  tajweedScore: 3,
  memorizationScore: 3,
  type: "جديد",
  teacherId: "أستاذ تجريبي",
  date: new Date().toISOString()
});
saveRecords(records);

console.log("✅ تجربة ناجحة! تحقق من ملف records.json");
