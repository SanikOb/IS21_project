class ORM {
    constructor(pool) {
        this.pool = pool;
    }

    async get(table, condition, fields = '*', operand = 'AND') {
        try {
            let sql = `SELECT ${fields} FROM ${table}`;
            const conditions = [];
            const params = [];
            if (condition) {
                Object.keys(condition).forEach(key => {
                    conditions.push(`${key}=?`);
                    params.push(condition[key]);
                });
                sql += ` WHERE ${conditions.join(` ${operand} `)}`;
            }
            const [rows] = await this.pool.execute(sql, params);
            if (!rows.length) {
                return null;
            }
            return rows[0];
        } catch (e) {
            console.log(e)
            return null;
        }
    }

    async all(table, condition = null, fields = '*', operand = 'AND', orderBy = '', desc = false, limit = '') {
        try {
            let sql = `SELECT ${fields} FROM ${table}`;
            const conditions = [];
            const params = [];
            if (condition) {
                Object.keys(condition).forEach(key => {
                    conditions.push(`${key}=?`);
                    params.push(condition[key]);
                });
                sql += ` WHERE ${conditions.join(` ${operand} `)}`;
            }
            if (orderBy) {
                sql += ` ORDER BY ${orderBy}`;
            }
            sql += desc ? ' DESC' : ' ASC';
            if (limit) {
                sql += ` LIMIT ${limit}`;
            }
            const [rows] = await this.pool.execute(sql, params);
            if (!rows.length) {
                return null;
            }
            return rows;
        } catch (e) {
            return null;
        }
    }

    // condition, field - объекты полей и их значений
    async update(table, condition, field, operand = 'AND') {
        try {
            let sql = `UPDATE ${table}`;
            const fields = [];
            const conditions = [];
            const params = [];
            if (field) {
                Object.keys(field).forEach(key => {
                    fields.push(`${key}=?`);
                    params.push(field[key]);
                });
                sql += ` SET ${fields.join(', ')}`;
            }
            if (condition) {
                Object.keys(condition).forEach(key => {
                    conditions.push(`${key}=?`);
                    params.push(condition[key]);
                });
                sql += ` WHERE ${conditions.join(` ${operand} `)}`;
            }
            const result = await this.pool.execute(sql, params);
            return result.affectedRows > 0;
        } catch (e) {
            return null;
        }
    }

    async insert(table, field) {
        try {
            let sql = `INSERT INTO ${table}`;
            const fields = [];
            const params = [];
            if (field) {
                Object.keys(field).forEach(key => {
                    fields.push(key);
                    params.push(field[key]);
                });
                sql += ` (${fields.join(', ')}) VALUES`;
                sql += ` (${Array(field.length).fill('?').join(', ')})`;
            } 
            const result = await this.pool.execute(sql, params);
            return result.affectedRows > 0;
        } catch (e) {
            return null;
        }
    }
    
    async delete(table, condition, operand = 'AND') {
        try {
            let sql = `DELETE FROM ${table}`;
            const conditions = [];
            const params = [];
            if (condition) {
                Object.keys(field).forEach(key => {
                    conditions.push(`${key}=?`);
                    params.push(condition[key]);
                });
                sql += ` WHERE ${condition.join(` ${operand} `)}`;
            } 
            const result = await this.pool.execute(sql, params);
            return result.affectedRows > 0;
        } catch (e) {
            return null;
        }
    }
}

module.exports = ORM;