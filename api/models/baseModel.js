const db = require('../config/database')
const {v4: uuidv4} = require('uuid')

class BaseModel {
    constructor(tableName){
        this.tableName = tableName;
        this.primaryKey = `${tableName.slice(0,-1)}_id`; //Giả sử primary key là <tableName>_id
    }

    //Tìm kiếm record bằng ID
    async findById(id) {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }
    //Tìm kiếm toàn bộ record với filter và phân trang
    async findAll(filters ={}, pagination={}, orderBy='created_at DESC'){
        let query = `SELECT * FROM ${this.tableName}`;
        const params = []
        const conditions = []

        //Apply filters
        Object.keys(filters).forEach((key, index) => {
            if(filters[key] !== undefined && filters[key] !== null) {
               if(Array.isArray(filters[key])){
                conditions.push(`${key} = ANY($${index + 1})`);
               } else {
                   conditions.push(`${key} = $${index + 1}`);
               }
            }
        })

        if(conditions.length > 0){
            query+= `WHERE ${conditions.join(' AND ')}`;
        }

        //Apply ordering
        query+= `ORDER BY ${orderBy}`;
        
        //Apply pagination
        if(pagination.limit){
            query+= `LIMIT $${params.length + 1}`;
            params.push(pagination.limit);
        }
        if(pagination.offset){
            query+= `OFFSET $${params.length + 1}`;
            params.push(pagination.offset);
        }
        const result = await db.query(query, params);
        return result.rows;
    }

    //Tạo mới record
    async create(data){
        if(!data[this.primaryKey]){
            data[this.primaryKey] = uuidv4();
        }
        //Add timestamps
        data.created_at = new Date();
        data.updated_at = new Date();

        const keys = Object.keys(data);
        const values = Object.values(data);

        const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
        const query = `
            INSERT INTO ${this.tableName} (${keys.join(', ')})
            VALUES (${placeholders})
            RETURNING *`;
        const result = await db.query(query, values);
        return result.rows[0];
    }

    //Cập nhật record bằng ID
    async update(id, data){
        //Add updated timestamps
        data.updated_at = new Date();

        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');

        const query = `
            UPDATE ${this.tableName}
            SET ${setClause}
            WHERE ${this.primaryKey} = $1
            RETURNING *`;
        const result = await db.query(query, [id, ...values]);
        return result.rows[0];
    }

    //Xoá record bằng ID
    async delete(id){
        const query = `
            DELETE FROM ${this.tableName}
            WHERE ${this.primaryKey} = $1
            RETURNING *`;
        const result = await db.query(query, [id]);
        return result.rowCount > 0;
    }
    //Disable giá trị thay gì xoá record
    async softDelete(id){
        return await this.update(id, {is_active: false})
    }
    //Đếm số lượng record
    async count(filters={}){
        let query = `SELECT COUNT(*) FROM ${this.tableName}`
        const params = []
        const conditions = []

        Object.keys(filters).forEach((key, index) => {
            if(filters[key] !== undefined && filters[key] !== null) {
               conditions.push(`${key} = $${index + 1}`);
               params.push(filters[key]);
            }
        })

        if(conditions.length > 0){
            query+= `WHERE ${conditions.join(' AND ')}`;
        }

        const result = await db.query(query, params);
        return parseInt(result.rows[0].count);
    }
    //Kiểm tra tồn tại
    async exists(id) {
        const query = `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
        const result = await db.query(query, [id]);
        return result.rowCount > 0;
    }

    //Tìm 1 record với điều kiện cụ thể
    async findOne(conditions){
        const records = await this.findAll(conditions, {limit: 1});
        return records[0] || null;
    }

    async bulkCreate(records){
        if(!records || records.length === 0) return [];
        const results =[]
        for(const record of records){
            const created = await this.create(record);
            results.push(created);
        }
        return results;
    }
}

module.exports = BaseModel;