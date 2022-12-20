require('dotenv').config()
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  // origin: 'https://apps.csj.gob.sv' // limit front end to a given origin, uncomment to test
}));

const fs = require("fs");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth, MessageMedia, Buttons, List } = require("whatsapp-web.js");
const axios = require("axios");


// Path where the session data will be stored
const SESSION_FILE_PATH = "./session.json";
// Environment variables
const country_code = process.env.COUNTRY_CODE;
const number = process.env.NUMBER;
const msg = process.env.MSG;

// Load the session data if it has been previously saved
let sessionData;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: false }
});
client.initialize();

client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on("ready", () => {
    console.log("Client is ready!");

    setTimeout(() => {
      let chatId = `${country_code}${number}@c.us`;
        client.sendMessage(chatId, msg).then((response) => {
            if (response.id.fromMe) {
                console.log("It works!");
            }
        })
    }, 5000);
});

// Database
const mysql = require('mysql');

var mysqlConnection =  mysql.createPool({
  connectionLimit : 10,
  host     : process.env.host_db,  
  user     : process.env.user_db,  
  password : process.env.password_db,  
  database : process.env.name_db,    
});    

mysqlConnection.getConnection(function(err, connection) {
  if (err) {
    console.error(err);
    return;
  } else {
    console.log('db is connected');
  }
});



const myGroupName = "BOT Group";

client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);

    if (msg.body === '!ping reply') {
        // Send a new message as a reply to the current one
        msg.reply('pong');

    } else if (msg.body.toLowerCase() === 'ping') {
        // Send a new message to the same chat
        client.sendMessage(msg.from, 'pong');
    } else if (msg.body === '!buttons') {
        let button = new Buttons('Button body',[{body:'bt1'},{body:'bt2'},{body:'bt3'}],'title','footer');
        client.sendMessage(msg.from, button);
    } else if (msg.body === '!list') {
        let sections = [{title:'sectionTitle',rows:[{title:'ListItem1', description: 'desc'},{title:'ListItem2'}]}];
        let list = new List('List body','btnText',sections,'Title','footer');
        client.sendMessage(msg.from, list);
    } else if (msg.body === '!reaction') {
        msg.react('👍');    
    } else if (msg.body.toLowerCase() === 'buttons') {
        let button = new Buttons('Button body',[{body:'bt1'},{body:'bt2'},{body:'bt3'}],'title','footer');
        client.sendMessage(msg.from, button);
    } else if (msg.body.toLowerCase() === 'list') {
        let sections = [{title:'sectionTitle',rows:[{title:'ListItem1', description: 'desc'},{title:'ListItem2'}]}];
        let list = new List('List body','btnText',sections,'Title','footer');
        client.sendMessage(msg.from, list);
    } else if (msg.body.toLowerCase() === 'menu'){
            // Not Working for WA Business
            let button = new Buttons("Buen día, Gracias por Comunicarse al Centro de Contacto de la Dirección de Desarrollo Tecnológico",[{"body":"😎 Cursos"},{"body":"👉 Youtube"},{"body":"😁 Telegram"}], '', 'Gracias');
            client.sendMessage(msg.from, button);
            
            const productsList = new List(
              "Por favor selecciona una de las siguientes opciones:",
              "Ver Opciones",
              [
                {
                  title: "Products list",
                  rows: [
                    { id: "apple", title: "Reportar solicitud de servicio a equipos informáticos" },
                    { id: "mango", title: "Consulta de solicitud de servicio previamente generado" },
                    { id: "banana", title: "Menu Principal" },
                  ],
                },
              ],
              "Selecciona una opción"
            );
            client.sendMessage(msg.from, productsList);
  
          
        //client.sendMessage(msg.from,'Not Working for WA Business');
    } else if (msg.body.toLowerCase() === "meme") {
        //get media from url
        const media = await MessageMedia.fromUrl(
          "https://raw.githubusercontent.com/ravendano014/IntranetDDTI/54e91dcd3cfce4b31fa0b9ef61b3d541ce58de4f/Integration.png"
        );
    
        //replying with media
        client.sendMessage(msg.from, media, {
          caption: "meme",
        });
      } else if (msg.body) {

        // Query 
        let results = mysqlConnection.query("SELECT * FROM estado WHERE estado LIKE '%"+decodeURI(msg.body)+"%'", [msg.body], (err, rows, fields) => {
          if (!err) {
            //res.json(rows[0]);
            //console.log(results);
            
            if (Object.keys(rows).length === 0){
              console.log(rows);
            } else{
              client.sendMessage(msg.from,`Concepto : ${rows[0].concepto}`, );
            }
          } else {
            client.sendMessage(msg.from,{error: err});
          }
        });

        //https://edictus-production.up.railway.app/api/send-email/p?email=ddti.centrodecontacto@oj.gob.sv&to=ronald.avendano@oj.gob.sv&subject=Test&html=Test
        //client.sendMessage(msg.from, media, `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(msg.body)}`, );
        // `Name : ${res.data.data[0].name}\nType : ${res.data.data[0].type}\nDesc : ${res.data.data[0].desc}`
        //vhttps://edictus-production.up.railway.app/estados/${encodeURIComponent(msg.body)}`
        axios
          .get(`https://edictus-production.up.railway.app/estados/${encodeURIComponent(msg.body)}`
          )
          .then(async (res) => {
            if (res.data.error) {
              msg.reply("Sin resultados.");
            } else {
              /*
              const media = await MessageMedia.fromUrl(
                res.data.data[0].image_url
              );
              */
              client.sendMessage(msg.from,`Id : ${res.data.data[0].id_estado}\nEstado : ${res.data.data[0].estado}\nConcepto : ${res.data.data[0].concepto}`, );
            }
          })
          .catch((error) => {
            console.error(error);
          });
      }
});

client.on("message", (message) => {
    // Not Working for WA Business
    if(message.type === 'list_response'){
      message.reply(`You've selected ${message.body}`);
    }
  });

client.on('message_create', (msg) => {
    // Fired on all message creations, including your own
    if (msg.fromMe) {
        // do stuff here
    }
});

client.on('message_revoke_everyone', async (after, before) => {
    // Fired whenever a message is deleted by anyone (including you)
    console.log(after); // message after it was deleted.
    if (before) {
        console.log(before); // message before it was deleted.
    }
});

client.on('message_revoke_me', async (msg) => {
    // Fired whenever a message is only deleted in your own view.
    console.log(msg.body); // message before it was deleted.
});
