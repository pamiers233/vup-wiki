const fs = require('fs');
const dbFile = './database.json';
const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));

if (!db.vups) {
    db.vups = [];
    console.log("Added db.vups array.");
}

// Extract existing VUPs from manuscripts
const uniqueVups = new Set();
db.manuscripts.forEach(m => {
    if (m.vup) {
        if (Array.isArray(m.vup)) {
            m.vup.forEach(v => uniqueVups.add(v));
        } else {
            uniqueVups.add(m.vup);
        }
    }
});

uniqueVups.forEach(vupName => {
    if (!db.vups.find(v => v.name === vupName)) {
        db.vups.push({
            name: vupName,
            createdAt: new Date().toISOString(),
            lastEditor: "System Migration"
        });
        console.log(`Added legacy VUP to wiki: ${vupName}`);
    }
});

fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8');
console.log("Database migrated successfully.");
