const { Client } = require('pg');


class DBInitializer {
    constructor(config, max_attempts, timeout) {
        this.config = {
            user: config.user,
            host: config.host,
            database: config.database,
            port: config.port,
            password: config.password
        };
        this.configTmp = {
            user: config.user,
            host: config.host,
            database: config.databaseTmp,
            port: config.port,
            password: config.password
        };
        this.max_attempts = max_attempts;
        this.timeout = timeout;
        this.attempt = 0;
        this.ready = false;
        this.tableQuery = `
            CREATE TABLE detections (
                detection_id serial PRIMARY KEY,
                created_on TIMESTAMP NOT NULL
            );
        `;
        this.dbQuery = `CREATE DATABASE ${this.config.database};`;
    }

    createClient() {
        return new Client(this.config);
    }

    createClientTmp() {
        return new Client(this.configTmp);
    }

    isReady() {
        return this.ready;
    }

    isClosed() {
        return this.attempt >= this.max_attempts;
    }

    _resolveDecorator(resolve, client) {
        let resolve1 = () => {
            client.end();
            return resolve();
        }
        return resolve1;
    }

    _rejectDecorator(reject, client) {
        let reject1 = (err) => {
            client.end();
            return reject(err);
        }
        return reject1;
    }

    _createTable() {
        return new Promise((resolve, reject) => {
            const client = this.createClient();
            resolve = this._resolveDecorator(resolve, client);
            reject = this._rejectDecorator(reject, client);
            client.connect()
            .then(() => {
                client.query(this.tableQuery)
                .then(() => {
                    console.log('Table created!');
                    resolve();
                })
                .catch((err) => {
                    if (err.code === '42P07') {
                        console.log('Table exists!');
                        resolve();
                    } else {
                        console.log('Cannot create table!');
                        reject(err);
                    }
                })
            })
            .catch((err) => {
                reject(err);
            })
        });
    }

    _createDatabase() {
        return new Promise((resolve, reject) => {
            const clientTmp = this.createClientTmp();
            resolve = this._resolveDecorator(resolve, clientTmp);
            reject = this._rejectDecorator(reject, clientTmp);
            clientTmp.connect()
            .then(() => {
                console.log('Connected!');
                clientTmp.query(this.dbQuery)
                .then((res) => {
                    console.log('Database created!');
                    this._createTable()
                    .then(resolve)
                    .catch(reject);
                })
                .catch((err) => {
                    if (err.code === '42P04') {
                        console.log('Database exists!');
                        this._createTable()
                        .then(resolve)
                        .catch(reject);
                    } else {
                        console.log('Cannot create database!');
                        reject(err);
                    }
                });
            })
            .catch((err) => {
                reject(err);
            })
        });
    }

    _initDB() {
        this.attempt += 1;
        this._createDatabase()
        .then(() => this.ready = true)
        .catch((err) => {
            console.log('Reject!');
            console.log(err);
            if (this.attempt < this.max_attempts) {
                setTimeout(() => {this._initDB()}, this.timeout);
            }
        });
    }

    initDB() {
        if (this.attempt === 0) {
            this._initDB();
        }
    }
}

const createRecord = async (client) => {
    const now = new Date();
    const query = {
        text: 'INSERT INTO detections(detection_id, created_on) VALUES(DEFAULT, $1) RETURNING detection_id;',
        values: [now]
    };
    const res = await client.query(query);
    return res.rows[0].detection_id;
}

const lastRecords = async (client, limit) => {
    const query = `SELECT * FROM detections ORDER BY created_on DESC LIMIT ${limit};`;
    const res = await client.query(query);
    return res.rows;
}

const countRecords = async (client) => {
    const query = 'SELECT COUNT(*) FROM detections;'
    const res = await client.query(query);
    return res.rows[0].count;
}

module.exports.DBInitializer = DBInitializer;
module.exports.createRecord = createRecord;
module.exports.lastRecords = lastRecords;
module.exports.countRecords = countRecords;