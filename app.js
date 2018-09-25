var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var debug = require('debug')('app:app')
const TelegramBot = require('node-telegram-bot-api');
const request = require('request')

const url = process.env.APP_URL || 'http://localhost:3000'
const TOKEN = process.env.TELEGRAM_TOKEN || '';
const sendTo = process.env.SEND_TO ? process.env.SEND_TO.split(',') : []
const jadwalUrl = process.env.JADWAL_URL || null

var indexRouter = require('./routes/index');


const bot = new TelegramBot(TOKEN)

bot.setWebHook(`${url}/bot${TOKEN}`)

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.post(`/crisp`, (req, res, next) => {
  const agent = req.headers['user-agent']
  if (agent !== 'Crisp-HooksDeliver 1.0 (+https://crisp.chat)') {
    debug('invalid request', req.headers)
    return res.sendStatus(200)
  }
  const data = req.body.data
  if (data) {
    var content = ''
    var nickname = data.user ? data.user.nickname : 'guest'
    var message = 'no message'
    switch(data.type) {
      case 'file':
        message = `[${nickname}]\n\n${data.content.name}\n\n${data.content.url}`
        break
      case 'text':
        content = data.content
        message = `[${nickname}]\n\n${content}`
        break
      default:
        debug('invalid request', req.headers, req.body)
        break
    }
    
    sendTo.forEach(item => {
      bot.sendMessage(item, message)
    })
  }
  res.sendStatus(200);
});

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const getPiket = () => {
  return new Promise((resolve, reject) => {
    const dt = new Date()
    if (jadwalUrl === null) {
      debug('JADWAL_URL not set')
      resolve([])
      return
    }
    request({ url: jadwalUrl, json: true }, (err, res, body) => {
      const piket = body[dt.getDate()] || []
      resolve(piket)
    })
  })
}

bot.on('message', (msg) => {
  const id = msg.chat.id
  const text = msg.text || null
  let message = 'thanks for messaging me'
  switch (text) {
    case '/piket':
      getPiket()
        .then(result => {
          message = `
Yang piket hari ini

-------------------------------------
${result.join('\n')}
-------------------------------------
`
          bot.sendMessage(id, message)
        })
        .catch(err => {
          debug(err)
        })
      break
    case '/about':
      message = `
About

-------------------------------------
author: bang tim
url: https://www.timen.net
repo: https://github.com/timenz/crisp-notif-telebot
-------------------------------------
`
      bot.sendMessage(id, message)
      break
    default:
      bot.sendMessage(id, message)
      break
  }
});

module.exports = app;
