
async function loadDeviceUserInfoFromSqlServer(pool: sql.ConnectionPool): Promise<void> {
    try {
        const tablesResult = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME IN ('Employees', 't_person', 'Person', 't_person_info')");
        const tables = tablesResult.recordset.map((r: any) => r.TABLE_NAME.toLowerCase());
        let usersList: any[] = [];

        if (tables.includes('employees')) {
            const result = await pool.request().query(`
        SELECT e.EmployeeCodeInDevice as UserId, e.EmployeeId, e.EmployeeName as Name, e.Designation, d.DepartmentFName as DepartmentName
        FROM Employees e
        LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
        WHERE e.EmployeeCodeInDevice IS NOT NULL AND e.Status = 'Working'
      `);
            usersList = result.recordset.map(u => ({ ...u, Name: u.Name }));
        } else if (tables.includes('t_person') || tables.includes('person') || tables.includes('t_person_info')) {
            const table = tables.includes('t_person') ? 't_person' : (tables.includes('person') ? 'Person' : 't_person_info');
            const result = await pool.request().query(`
            SELECT 
                COALESCE(person_id, id, employee_no, person_code) as UserId, 
                COALESCE(person_name, name, firstName + ' ' + lastName) as Name,
                COALESCE(department_name, dept_name) as DepartmentName
            FROM ${table}
        `);
            usersList = result.recordset.map(u => ({ ...u, Name: u.Name }));
        }

        for (const user of usersList) {
            const deviceUserIdStr = user.UserId?.toString();
            if (!deviceUserIdStr) continue;

            deviceUserInfoCache.set(deviceUserIdStr, {
                UserId: deviceUserIdStr,
                Name: user.Name || `User ${deviceUserIdStr}`,
                DeviceId: 0,
                EmployeeId: user.EmployeeId?.toString(),
                Designation: user.Designation,
                DepartmentName: user.DepartmentName,
            });
        }

        logger.info(`Loaded ${deviceUserInfoCache.size} device users from SQL Server`);
    } catch (error) {
        logger.error('Failed to load device user info from SQL Server:', error);
    }
}
