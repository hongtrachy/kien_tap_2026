// TASK 1: Xử lý & Tính toán các chỉ số cho toàn bộ 1,197 dòng từ CSV
function processCSVData(rawData) {
    return rawData.map((row, index) => {
        const date = row['date'] || 'N/A';
        const dept = (row['department'] || '').trim();
        const team = row['team'] || '0';
        const target = parseFloat(row['targeted_productivity']) || 0;
        const actual = parseFloat(row['actual_productivity']) || 0;
        const incentive = parseFloat(row['incentive']) || 0;
        const wip = row['wip'] !== "" && row['wip'] !== undefined && !isNaN(parseFloat(row['wip'])) ? parseFloat(row['wip']) : null;
        const idleTime = parseFloat(row['idle_time']) || 0;

        // Tính Achievement Rate = Actual / Target
        const achievementRate = target > 0 ? actual / target : 0;

        // Kiểm tra loại lỗi (Validation Anomaly Status)
        let status = "VALID";
        if (actual < target && incentive > 0) {
            status = "UNEARNED_INCENTIVE"; // Không đạt target nhưng vẫn nhận thưởng!
        } else if (incentive > 200) {
            status = "EXTREME_INCENTIVE"; // Incentive bất thường
        } else if (wip === null && dept === 'finishing') {
            status = "MISSING_WIP"; // Thiếu chỉ số WIP
        } else if (idleTime > 0) {
            status = "IDLE_TIME_ALERT"; // Thời gian chết sản xuất
        }

        return {
            rowId: index + 1,
            date,
            department: dept,
            team,
            target,
            actual,
            achievementRate,
            incentive,
            wip,
            idleTime,
            status
        };
    });
}

// TASK 2: Gom nhóm & tạo thông báo lỗi từ dữ liệu thật
function generateValidationAlerts(processedData) {
    const alerts = [];
    
    // 1. Lỗi Thưởng Sai (Unearned Incentive)
    const unearnedCases = processedData.filter(d => d.status === "UNEARNED_INCENTIVE");
    if (unearnedCases.length > 0) {
        alerts.push({
            type: "DANGER",
            count: unearnedCases.length,
            title: `Chi trả thưởng sai quy định (${unearnedCases.length} trường hợp)`,
            desc: `Phát hiện ${unearnedCases.length} bản ghi có Actual < Target nhưng vẫn được nhận tiền Incentive.`
        });
    }

    // 2. Outlier thưởng quá cao
    const extremeCases = processedData.filter(d => d.status === "EXTREME_INCENTIVE");
    if (extremeCases.length > 0) {
        alerts.push({
            type: "WARNING",
            count: extremeCases.length,
            title: `Tiền thưởng vọt mức bất thường (${extremeCases.length} trường hợp)`,
            desc: `Phát hiện các mức thưởng > 200 (có ca lên tới 3,600) vượt khung chuẩn.`
        });
    }

    // 3. Thiếu dữ liệu WIP
    const missingWip = processedData.filter(d => d.status === "MISSING_WIP");
    if (missingWip.length > 0) {
        alerts.push({
            type: "INFO",
            count: missingWip.length,
            title: `Thiếu chỉ số WIP (${missingWip.length} dòng)`,
            desc: `Toàn bộ khối Finishing chưa ghi nhận thông tin Work-In-Progress.`
        });
    }

    // 4. Gián đoạn sản xuất (Idle time)
    const idleCases = processedData.filter(d => d.status === "IDLE_TIME_ALERT");
    if (idleCases.length > 0) {
        alerts.push({
            type: "WARNING",
            count: idleCases.length,
            title: `Sự cố gián đoạn dây chuyền (${idleCases.length} ngày)`,
            desc: `Ghi nhận thời gian máy nghỉ / công nhân nhàn rỗi (idle_time > 0).`
        });
    }

    return alerts;
}