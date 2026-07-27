import PDFDocument from "pdfkit";

const formatMoney = (value: unknown, currency: string): string => {
  const amount = Number(value);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const drawLineItem = (
  document: PDFKit.PDFDocument,
  label: string,
  value: string,
  y: number
) => {
  document.font("Helvetica").fontSize(10).text(label, 55, y, { width: 340 });
  document.font("Helvetica").text(value, 400, y, { width: 140, align: "right" });
};

export const createPayslipPdfBuffer = (payslip: any): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    const currency = payslip.currency || "INR";
    const payrollRun = payslip.payrollRun;

    document
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("PAYSLIP", { align: "center" });
    document
      .font("Helvetica")
      .fontSize(10)
      .text(
        `${String(payrollRun.payrollMonth).padStart(2, "0")}/${payrollRun.payrollYear}`,
        { align: "center" }
      );

    document.moveDown(1.5);
    document.font("Helvetica-Bold").fontSize(11).text("Employee Details");
    document.moveDown(0.5);
    const employeeY = document.y;
    drawLineItem(document, "Payslip number", payslip.payslipNumber, employeeY);
    drawLineItem(document, "Employee", payslip.employeeNameSnapshot, employeeY + 18);
    drawLineItem(document, "Employee ID", payslip.employeeId.toString(), employeeY + 36);
    drawLineItem(document, "Department", payslip.employeeDepartmentSnapshot, employeeY + 54);
    drawLineItem(document, "Role", payslip.employeeRoleSnapshot, employeeY + 72);
    if (payslip.bankAccountMasked) {
      drawLineItem(document, "Bank account", payslip.bankAccountMasked, employeeY + 90);
    }

    document.y = employeeY + (payslip.bankAccountMasked ? 125 : 107);
    document.moveTo(50, document.y).lineTo(545, document.y).strokeColor("#cccccc").stroke();
    document.moveDown(1);

    document.font("Helvetica-Bold").fontSize(11).text("Attendance Summary");
    document.moveDown(0.5);
    const attendanceY = document.y;
    drawLineItem(document, "Working days", payslip.workingDays.toString(), attendanceY);
    drawLineItem(document, "Payable days", payslip.payableDays.toString(), attendanceY + 18);
    drawLineItem(document, "Unpaid leave days", payslip.unpaidLeaveDays.toString(), attendanceY + 36);

    document.y = attendanceY + 70;
    document.font("Helvetica-Bold").fontSize(11).text("Earnings");
    document.moveDown(0.5);
    let currentY = document.y;
    for (const earning of payslip.earnings || []) {
      drawLineItem(
        document,
        earning.earningType,
        formatMoney(earning.amount, currency),
        currentY
      );
      currentY += 18;
    }
    drawLineItem(
      document,
      "Total earnings",
      formatMoney(payslip.totalEarnings, currency),
      currentY + 5
    );

    document.y = currentY + 40;
    document.font("Helvetica-Bold").fontSize(11).text("Deductions");
    document.moveDown(0.5);
    currentY = document.y;
    for (const deduction of payslip.deductions || []) {
      drawLineItem(
        document,
        deduction.deductionType,
        formatMoney(deduction.amount, currency),
        currentY
      );
      currentY += 18;
    }
    if ((payslip.deductions || []).length === 0) {
      drawLineItem(document, "No deductions", formatMoney(0, currency), currentY);
      currentY += 18;
    }
    drawLineItem(
      document,
      "Total deductions",
      formatMoney(payslip.totalDeductions, currency),
      currentY + 5
    );

    document.y = currentY + 48;
    document.rect(50, document.y, 495, 38).fill("#f0f4f8");
    document
      .fillColor("#111111")
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("NET SALARY", 65, document.y + 12, { width: 260 });
    document.text(formatMoney(payslip.netSalary, currency), 330, document.y, {
      width: 195,
      align: "right",
    });

    document.moveDown(5);
    document
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#666666")
      .text(
        `Status: ${payslip.status}. This payslip is system generated and uses salary and attendance snapshots from the payroll period.`,
        { align: "center" }
      );

    document.end();
  });
