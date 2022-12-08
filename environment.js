const fs = require('fs');
var json = JSON.parse(fs.readFileSync('./environment.json', 'utf-8'));

module.exports = {
    db: json['db'],
    debug: json['debug'],
    port: json['port']
};