import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import dayjs from 'dayjs';
// logo import removed
import { getAbsoluteAssetUrl } from './appConfig';

const DEFAULT_ADDRESS = 'Plot # 117, Road # 13, Sector # 10, Uttara, Dhaka-1230 | Phone: 01712-345678';

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export default async function generateMonthlyPdf({
    month,
    plData = {},
    breakdown = {},
    staffPerformance = [],
    companyName = 'Mamun Automobiles',
    companyAddress = DEFAULT_ADDRESS
}) {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.padding = '24px';
    container.style.background = '#ffffff';
    container.style.color = '#111';
    container.style.fontFamily = 'Arial, Helvetica, sans-serif';
    container.style.boxSizing = 'border-box';

    const monthLabel = dayjs(month).format('MMMM YYYY');

    const departmentRows = Object.keys(breakdown).map((department) => {
        const bucket = breakdown[department] || { total: 0, pending: 0, completed: 0 };
        return `<tr>
            <td style="padding:6px;border-bottom:1px solid #f3f3f3">${escapeHtml(department)}</td>
            <td style="text-align:right;padding:6px;border-bottom:1px solid #f3f3f3">${bucket.total}</td>
            <td style="text-align:right;padding:6px;border-bottom:1px solid #f3f3f3">${bucket.pending}</td>
            <td style="text-align:right;padding:6px;border-bottom:1px solid #f3f3f3">${bucket.completed}</td>
        </tr>`;
    }).join('');

    const staffRows = (staffPerformance || []).map((row) => {
        const totalTasks = Number(row.totalTasks || 0);
        const completedTasks = Number(row.completedTasks || 0);
        const pendingTasks = Number(row.pendingTasks || 0);
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        return `<tr>
            <td style="padding:6px;border-bottom:1px solid #f3f3f3">${escapeHtml(row.name)}</td>
            <td style="padding:6px;border-bottom:1px solid #f3f3f3">${escapeHtml(row.designation || 'Technician')}</td>
            <td style="text-align:right;padding:6px;border-bottom:1px solid #f3f3f3">${totalTasks}</td>
            <td style="text-align:right;padding:6px;border-bottom:1px solid #f3f3f3;color:#166534">${completedTasks}</td>
            <td style="text-align:right;padding:6px;border-bottom:1px solid #f3f3f3;color:#9f1239">${pendingTasks}</td>
            <td style="text-align:right;padding:6px;border-bottom:1px solid #f3f3f3">${completionRate}%</td>
        </tr>`;
    }).join('');

    const performanceRows = staffRows || `
        <tr>
            <td colspan="6" style="padding:10px;border-bottom:1px solid #f3f3f3;color:#666">
                No technician task activity found for this month.
            </td>
        </tr>
    `;

    const totalRevenue = Number(plData.totalSales || plData.totalRevenue || 0);
    const totalExpenses = Number(plData.totalExpensesAmt || 0);
    const netProfit = Number(plData.netProfit || 0);
    const totalDue = Number(plData.totalDue || 0);

    container.innerHTML = `
        <div>
            <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#1d4ed8 100%);padding:16px 18px;border-radius:14px;color:#fff;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
                    <div style="display:flex;align-items:center;gap:12px">
                        <div style="width:60px;height:60px;border-radius:14px;border:1px solid rgba(255,255,255,0.32);background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900;color:#fff">M</div>
                        <div>
                            <div style="font-size:22px;font-weight:800;letter-spacing:0.3px">${escapeHtml(companyName)}</div>
                            <div style="font-size:12px;color:rgba(255,255,255,0.86);margin-top:2px">Auto Workshop & Spare Parts</div>
                            <div style="font-size:12px;color:rgba(255,255,255,0.76);margin-top:2px">${escapeHtml(companyAddress)}</div>
                        </div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:11px;color:rgba(255,255,255,0.72);letter-spacing:1px;text-transform:uppercase">Monthly Report</div>
                        <div style="font-size:15px;font-weight:700;margin-top:2px">${monthLabel}</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.74);margin-top:8px">Generated ${dayjs().format('DD MMM YYYY, hh:mm A')}</div>
                    </div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px">
                <div style="border-radius:10px;padding:10px;border:1px solid #d1fae5;background:#ecfdf5">
                    <div style="font-size:11px;color:#065f46;text-transform:uppercase;letter-spacing:0.4px">Revenue</div>
                    <div style="font-size:16px;font-weight:800;color:#047857;margin-top:4px">Tk ${totalRevenue.toLocaleString()}</div>
                </div>
                <div style="border-radius:10px;padding:10px;border:1px solid #fee2e2;background:#fef2f2">
                    <div style="font-size:11px;color:#7f1d1d;text-transform:uppercase;letter-spacing:0.4px">Expenses</div>
                    <div style="font-size:16px;font-weight:800;color:#b91c1c;margin-top:4px">Tk ${totalExpenses.toLocaleString()}</div>
                </div>
                <div style="border-radius:10px;padding:10px;border:1px solid ${netProfit >= 0 ? '#bbf7d0' : '#fecaca'};background:${netProfit >= 0 ? '#f0fdf4' : '#fef2f2'}">
                    <div style="font-size:11px;color:${netProfit >= 0 ? '#14532d' : '#7f1d1d'};text-transform:uppercase;letter-spacing:0.4px">Net Profit</div>
                    <div style="font-size:16px;font-weight:800;color:${netProfit >= 0 ? '#15803d' : '#b91c1c'};margin-top:4px">Tk ${netProfit.toLocaleString()}</div>
                </div>
                <div style="border-radius:10px;padding:10px;border:1px solid #dbeafe;background:#eff6ff">
                    <div style="font-size:11px;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.4px">Outstanding Due</div>
                    <div style="font-size:16px;font-weight:800;color:#1d4ed8;margin-top:4px">Tk ${totalDue.toLocaleString()}</div>
                </div>
            </div>

            <h3 style="margin-top:18px;margin-bottom:8px;color:#0f172a">Department Task Matrix</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
                <thead>
                    <tr style="background:#0f172a;color:#f8fafc">
                        <th style="text-align:left;padding:8px;border-bottom:1px solid #1e293b">Department</th>
                        <th style="text-align:right;padding:8px;border-bottom:1px solid #1e293b">Total</th>
                        <th style="text-align:right;padding:8px;border-bottom:1px solid #1e293b">Pending</th>
                        <th style="text-align:right;padding:8px;border-bottom:1px solid #1e293b">Completed</th>
                    </tr>
                </thead>
                <tbody>
                    ${departmentRows}
                </tbody>
            </table>

            <h3 style="margin-top:18px;margin-bottom:8px;color:#0f172a">Staff Performance (Technicians)</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
                <thead>
                    <tr style="background:#0f172a;color:#f8fafc">
                        <th style="text-align:left;padding:8px;border-bottom:1px solid #1e293b">Name</th>
                        <th style="text-align:left;padding:8px;border-bottom:1px solid #1e293b">Designation</th>
                        <th style="text-align:right;padding:8px;border-bottom:1px solid #1e293b">Assigned</th>
                        <th style="text-align:right;padding:8px;border-bottom:1px solid #1e293b">Completed</th>
                        <th style="text-align:right;padding:8px;border-bottom:1px solid #1e293b">Pending</th>
                        <th style="text-align:right;padding:8px;border-bottom:1px solid #1e293b">Completion</th>
                    </tr>
                </thead>
                <tbody>
                    ${staffRows || '<tr><td colspan="6">No activity</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    document.body.appendChild(container);
    try {
        const canvas = await html2canvas(container, { scale: 2 });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        const filename = `Monthly_Report_${dayjs(month).format('YYYY_MM')}.pdf`;
        pdf.save(filename);
    } finally {
        document.body.removeChild(container);
    }
}
