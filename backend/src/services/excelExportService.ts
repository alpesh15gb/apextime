import ExcelJS from 'exceljs';

/**
 * Excel Export Service
 * Generates Excel reports for attendance data
 */

export class ExcelExportService {
    /**
     * Export detailed attendance report to Excel
     */
    async exportDetailedReport(attendanceLogs: any[], options: any = {}) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Detailed Attendance');

        // Set worksheet properties
        worksheet.properties.defaultRowHeight = 20;

        // Add title
        worksheet.mergeCells('A1:M1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = options.title || 'Detailed Attendance Report';
        titleCell.font = { size: 16, bold: true };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        titleCell.font = { color: { argb: 'FFFFFFFF' } };

        // Add date range
        if (options.startDate && options.endDate) {
            worksheet.mergeCells('A2:M2');
            const dateCell = worksheet.getCell('A2');
            dateCell.value = `Period: ${options.startDate} to ${options.endDate}`;
            dateCell.alignment = { horizontal: 'center' };
            dateCell.font = { italic: true };
        }

        // Add headers
        const headerRow = worksheet.addRow([
            'Date',
            'Employee Code',
            'Employee Name',
            'Department',
            'Designation',
            'First IN',
            'Last OUT',
            'Total Hours',
            'Working Hours',
            'Late Arrival (min)',
            'Early Departure (min)',
            'Status',
            'Total Punches'
        ]);

        // Style headers
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 25;

        // Add data rows
        attendanceLogs.forEach(log => {
            const row = worksheet.addRow([
                this.formatDate(log.date),
                log.employee.code,
                log.employee.name,
                log.employee.department || '-',
                log.employee.designation || '-',
                this.formatTime(log.firstIn),
                this.formatTime(log.lastOut),
                log.totalHours ? log.totalHours.toFixed(2) : '0.00',
                log.workingHours ? log.workingHours.toFixed(2) : '0.00',
                Math.round((log.lateArrival || 0) * 60),
                Math.round((log.earlyDeparture || 0) * 60),
                log.status,
                log.totalPunches
            ]);

            // Color code status
            const statusCell = row.getCell(12);
            if (log.status === 'Absent') {
                statusCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF0000' }
                };
                statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            } else if (log.status === 'Late') {
                statusCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFC000' }
                };
            } else if (log.status === 'Present') {
                statusCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF00B050' }
                };
                statusCell.font = { color: { argb: 'FFFFFFFF' } };
            }

            // Highlight late arrivals
            if (log.lateArrival > 0) {
                row.getCell(10).font = { color: { argb: 'FFFF0000' }, bold: true };
            }

            // Highlight early departures
            if (log.earlyDeparture > 0) {
                row.getCell(11).font = { color: { argb: 'FFFF0000' }, bold: true };
            }
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            // @ts-ignore
            column.eachCell({ includeEmpty: true }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = maxLength < 10 ? 10 : maxLength + 2;
        });

        // Add borders to all cells
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 2) {
                row.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            }
        });

        return workbook;
    }

    /**
     * Export exception report to Excel
     */
    async exportExceptionReport(exceptions: any[], options: any = {}) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Exception Report');

        // Set worksheet properties
        worksheet.properties.defaultRowHeight = 20;

        // Add title
        worksheet.mergeCells('A1:L1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = options.title || 'Attendance Exception Report';
        titleCell.font = { size: 16, bold: true };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF0000' }
        };
        titleCell.font = { color: { argb: 'FFFFFFFF' } };

        // Add summary
        if (options.summary) {
            worksheet.mergeCells('A2:L2');
            const summaryCell = worksheet.getCell('A2');
            summaryCell.value = `Total Exceptions: ${options.summary.totalExceptions} | Late: ${options.summary.lateArrivals} | Early: ${options.summary.earlyDepartures} | Absent: ${options.summary.absences}`;
            summaryCell.alignment = { horizontal: 'center' };
            summaryCell.font = { bold: true };
        }

        // Add headers
        const headerRow = worksheet.addRow([
            'Date',
            'Employee Code',
            'Employee Name',
            'Department',
            'Phone',
            'Exception Type',
            'Shift Start',
            'First IN',
            'Late By (min)',
            'Shift End',
            'Last OUT',
            'Early By (min)'
        ]);

        // Style headers
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF0000' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 25;

        // Add data rows
        exceptions.forEach(exception => {
            const row = worksheet.addRow([
                this.formatDate(exception.date),
                exception.employee.code,
                exception.employee.name,
                exception.employee.department || '-',
                exception.employee.phone || '-',
                exception.exceptionTypes.join(', '),
                this.formatTime(exception.shiftStart),
                this.formatTime(exception.firstIn),
                exception.lateArrivalMinutes,
                this.formatTime(exception.shiftEnd),
                this.formatTime(exception.lastOut),
                exception.earlyDepartureMinutes
            ]);

            // Highlight exception type
            const exceptionCell = row.getCell(6);
            if (exception.exceptionTypes.includes('Absent')) {
                exceptionCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF0000' }
                };
                exceptionCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            } else if (exception.exceptionTypes.includes('Late')) {
                exceptionCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFC000' }
                };
            }

            // Highlight late minutes
            if (exception.lateArrivalMinutes > 0) {
                row.getCell(9).font = { color: { argb: 'FFFF0000' }, bold: true };
            }

            // Highlight early departure minutes
            if (exception.earlyDepartureMinutes > 0) {
                row.getCell(12).font = { color: { argb: 'FFFF0000' }, bold: true };
            }
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            // @ts-ignore
            column.eachCell({ includeEmpty: true }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = maxLength < 10 ? 10 : maxLength + 2;
        });

        // Add borders
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 2) {
                row.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            }
        });

        return workbook;
    }

    /**
     * Export summary report to Excel
     */
    async exportSummaryReport(summaryData: any[], options: any = {}) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Summary Report');

        // Add title
        worksheet.mergeCells('A1:J1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = options.title || 'Monthly Attendance Summary';
        titleCell.font = { size: 16, bold: true };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        titleCell.font = { color: { argb: 'FFFFFFFF' } };

        // Add headers
        const headerRow = worksheet.addRow([
            'Employee Code',
            'Employee Name',
            'Department',
            'Total Days',
            'Present',
            'Absent',
            'Late',
            'Half Day',
            'Total Hours',
            'Avg Hours/Day'
        ]);

        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // Add data rows
        summaryData.forEach(summary => {
            worksheet.addRow([
                summary.employeeCode,
                summary.employeeName,
                summary.department,
                summary.totalDays,
                summary.present,
                summary.absent,
                summary.late,
                summary.halfDay,
                summary.totalHours.toFixed(2),
                summary.avgHours.toFixed(2)
            ]);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            // @ts-ignore
            column.eachCell({ includeEmpty: true }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = maxLength < 10 ? 10 : maxLength + 2;
        });

        return workbook;
    }

    /**
     * Helper: Format date
     */
    formatDate(date: any) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    /**
     * Helper: Format time
     */
    formatTime(datetime: any) {
        if (!datetime) return '-';
        const d = new Date(datetime);
        return d.toISOString().substring(11, 19);
    }
}
