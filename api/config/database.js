const {Pool} = require('pg')

class Database {
    constructor(){
        const config = {
            user: process.env.DB_USER || 'ris',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'ris_database',
            password: process.env.DB_PASSWORD || 'Admin1234!',
            port: Number(process.env.DB_PORT) || 5433,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        }
        //SSL configuration for production
        if (process.env.NODE_ENV === 'production') {
            config.ssl = {
                rejectUnauthorized: false
            }
        }
        this.pool = new Pool(config);

        this.pool.on('error',(err)=>{
            console.error('Unexpected error on idle client', err)
            process.exit(-1)
        })

        this.pool.on('connect', (client) => {
            console.log('Database connected successfully');
        });

        this.pool.on('remove', (client) => {
            console.log('Database client removed');
        });
    }

    async query(text, params) {
        const start = Date.now();
        const client = await this.pool.connect();

        try{
            const result = await client.query(text, params);
            const duration = Date.now() - start;

            if(process.env.LOG_LEVEL === 'debug'){
                console.log('Executing query:', {
                    text: text.substring(0, 100),
                    duration,
                    rows: result.rows
                })
            }

            return result;
        }catch(error){
            console.error('Error acquiring client', error.stack);
            throw error;
        }finally{
            client.release();
        }
    }

    async transaction(callback) {
        const client = await this.pool.connect();

        try{
            await client.query('BEGIN');
            const results = await callback(client);
            await client.query('COMMIT');
            return results;
        }catch(error){
            console.error('Transaction error', error.stack);
            throw error;
        }finally{
            client.release();
        }
    }

    async testConnection() {
        const client = await this.pool.connect();

        try {
            const result = await client.query('SELECT NOW()');
            console.log('Database connection is healthy', result.rows[0]);
            return true;
        } catch (error) {
            console.error('Database connection error', error.stack);
            throw error;
        } finally {
            client.release();
        }
    }

}

module.exports = new Database();