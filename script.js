const recordsUrl = "https://mokathfa-othman-points-bot.glitch.me/records.json";
//const attendanceUrl = "https://mokathfa-othman-points-bot.glitch.me/attendance.json";

// const recordsUrl = "https://mokathfa-othman-points-bot.glitch.me/show-records";
// const recordsUrl = "./records.json";
const attendanceUrl = "./attendance.json";

const calculatePoints = (type, tajweed, memorization) => {
   const maxTajweed = 5;
   const maxMemorization = 5;

   if (type === "جديد") {
      const mistakes = maxTajweed - tajweed + (maxMemorization - memorization);
      const score = 10 - mistakes;
      return Math.max(0, score); // لا نسمح بأن تكون سالبة
   }

   if (type === "مراجعة") {
      const mistakes = maxTajweed - tajweed + (maxMemorization - memorization);
      const score = 5 - mistakes * 0.5;
      return Math.max(0, score); // لا نسمح بأن تكون سالبة
   }

   return 0;
};

function formatDateKey(date) {
   return date.toISOString().split("T")[0]; // "2025-06-15"
}

function displayDateHeader(dateStr) {
   const d = new Date(dateStr);
   return `${d.getDate()}-${d.getMonth() + 1}`;
}

function getDateRange(from, to) {
   const days = [];
   let current = new Date(from);
   while (current <= to) {
      const day = current.getDay(); // 5 = الجمعة, 6 = السبت
      if (day !== 5 && day !== 6) {
         days.push(formatDateKey(current));
      }
      current.setDate(current.getDate() + 1);
   }
   return days;
}

async function fetchData() {
   const [recordsRes, attendanceRes] = await Promise.all([
      fetch(recordsUrl),
      fetch(attendanceUrl),
   ]);
   const [records, attendance] = await Promise.all([
      recordsRes.json(),
      attendanceRes.json(),
   ]);
   return { records, attendance };
}

function filterData() {
   const fromInput = document.getElementById("fromDate").value;
   const toInput = document.getElementById("toDate").value;

   const fromDate = new Date(fromInput);
   const toDate = new Date(toInput);
   if (isNaN(fromDate) || isNaN(toDate)) {
      alert("يرجى تحديد التاريخين بشكل صحيح");
      return;
   }

   const dateKeys = getDateRange(fromDate, toDate);

   fetchData().then(({ records, attendance }) => {
      const students = {};

      // معالجة التسميع
      records.forEach((rec) => {
         const dateKey = formatDateKey(new Date(rec.date));
         if (!dateKeys.includes(dateKey)) return;

         const id = rec.studentId;
         if (!students[id]) {
            students[id] = {
               name: rec.studentName || "غير معروف",
               days: {},
               total: 0,
            };
         }

         const pts = calculatePoints(
            rec.type,
            rec.tajweedScore,
            rec.memorizationScore
         );
         students[id].days[dateKey] = students[id].days[dateKey] || {
            record: 0,
            attendance: 0,
         };
         students[id].days[dateKey].record += pts;
         students[id].total += pts;
      });

      // معالجة الحضور
      attendance.forEach((att) => {
         const dateKey = formatDateKey(new Date(att.date));
         if (!dateKeys.includes(dateKey)) return;

         const id = att.studentId;
         if (!students[id]) {
            students[id] = {
               name: att.studentName || "غير معروف",
               days: {},
               total: 0,
            };
         }

         students[id].days[dateKey] = students[id].days[dateKey] || {
            record: 0,
            attendance: 0,
         };
         students[id].days[dateKey].attendance += att.points;
         students[id].total += att.points;
      });

      // بناء الجدول
      const thead = document.querySelector("#resultsTable thead");
      const tbody = document.querySelector("#resultsTable tbody");
      thead.innerHTML = "";
      tbody.innerHTML = "";

      const headRow = document.createElement("tr");
      headRow.innerHTML = `<th>الطالب</th>`;
      dateKeys.forEach((d) => {
         headRow.innerHTML += `<th>${displayDateHeader(d)}</th>`;
      });
      headRow.innerHTML += `<th>المجموع</th>`;
      thead.appendChild(headRow);

      Object.values(students).forEach((st) => {
         const tr = document.createElement("tr");
         tr.innerHTML = `<td>${st.name}</td>`;

         dateKeys.forEach((date) => {
            const data = st.days[date];
            let cellContent = "-";

            if (data) {
               cellContent = `
      <div><strong>${data.record}</strong> <span style="font-size: 12px; color: #555;">تسميع</span></div>
      <div><strong>${data.attendance}</strong> <span style="font-size: 12px; color: #555;">حضور</span></div>
    `;
            }

            tr.innerHTML += `<td>${cellContent}</td>`;
         });

         tr.innerHTML += `<td>${st.total}</td>`;
         tbody.appendChild(tr);
      });
      drawChart(students, dateKeys);
   });
}

document.addEventListener("DOMContentLoaded", () => {
   const today = new Date().toISOString().split("T")[0];
   document.getElementById("toDate").value = today;
   document.getElementById("fromDate").value = new Date(
      new Date().setDate(new Date().getDate() - 6)
   )
      .toISOString()
      .split("T")[0];
   filterData();
});

let chart = null; // لتخزين الرسم الحالي

function drawChart(studentsData, dateKeys) {
   const ctx = document.getElementById("pointsChart").getContext("2d");

   // 🧹 حذف الرسم السابق إن وُجد
   if (chart) {
      chart.destroy();
   }

   const datasets = Object.values(studentsData).map((st) => ({
      label: st.name,
      data: dateKeys.map((date) => {
         const d = st.days[date];
         return d ? d.record + d.attendance : 0;
      }),
      borderWidth: 2,
      fill: false,
   }));

   chart = new Chart(ctx, {
      type: "line",
      data: {
         labels: dateKeys.map(displayDateHeader),
         datasets: datasets,
      },
      options: {
         responsive: true,
         plugins: {
            title: {
               display: true,
               text: "تطور النقاط اليومية",
               font: {
                  family: "El Messiri",
                  size: 18,
               },
            },
            legend: {
               labels: {
                  font: {
                     family: "El Messiri",
                  },
               },
            },
         },
         scales: {
            x: {
               reverse: true,
               title: {
                  display: true,
                  text: "التاريخ",
                  font: {
                     family: "El Messiri",
                  },
               },
               ticks: {
                  font: {
                     family: "El Messiri",
                  },
               },
            },
            y: {
               beginAtZero: true,
               position: "right",
               title: {
                  display: true,
                  text: "النقاط",
                  font: {
                     family: "El Messiri",
                  },
               },
               ticks: {
                  font: {
                     family: "El Messiri",
                  },
               },
            },
         },
      },
   });
}
