const mysql = require('mysql');
const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const FileReader = require('filereader');

require('dotenv').config();


const con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

con.connect( err => {
  if(err)
    console.log("Error connecting to database");
  else {
    console.log("success");
  }
});

function generatePath(name, audioName) {
  return path.join('audio', `${name}-${audioName}.ogg`);
}

function saveAudio(path, audio) {
  try{
    fs.writeFileSync(path, audio.data);
    return true;
  } catch(e) {
    console.log(e);
    return false;
  }
}

app.use(bodyParser());
app.use(fileUpload());
app.use(express.static('build/'));

app.get('/rec/list/:name', function(req, res, next) {
  let name = req.params.name;
  console.log(name);
  con.query(`SELECT audioName FROM useraudio WHERE name = '${name}'`, function(err, rows, fields) {
    if (err)
      console.log(err);
    else {
      res.send(JSON.stringify(rows));
      res.end();
    }
  });
});

app.get('/rec/list/:name/:audioName', function(req, res, next) {

  const {
    name,
    audioName
  } = req.params;

  console.log(name, audioName);
  con.query(`SELECT path FROM useraudio WHERE name = '${name}' and audioName = '${audioName}'`, function(err, rows, fields) {
    if (err)
      console.log(err);
    else {
      let path = rows[0].path;
      let stats = fs.statSync(path);

      // fs.readFile(path, (err, data) => {
      //     if (err) {
      //         res.status(500);
      //         throw err;
      //     }
      //
      //     // res.writeHead(200, {
      //     //   'Content-Type': 'audio/ogg',
      //     //   'Content-Length': stats.size,
      //     // });
      //
      //     // res.send(JSON.stringify(data));
      // });

      res.writeHead(200, {
        'Content-Type': 'audio/ogg',
        'Content-Length': stats.size,
      });
      fs.createReadStream(path).pipe(res);
    }
  });
});

app.post('/rec/save', function(req, res, next) {

  let {
    name,
    audioName
  } = req.body;

  let { recAudio } = req.files;
  console.log(recAudio);

  name = name.toLowerCase();
  audioName = audioName.toLowerCase();

  let success = saveAudio(generatePath(name, audioName), recAudio);

  if(success) {
    con.query(`INSERT into useraudio(name, path, audioName) values(?,?,?)`, [name, generatePath(name, audioName), audioName], function(err, rows, fields) {
      if (err)
        res.sendStatus(500);
      else {
        res.sendStatus(200);
      }
    });
  } else {
    res.sendStatus(500);
  }

});


app.listen(process.env.PORT, () => {
  console.log(`App running on port ${process.env.PORT}`);
})
