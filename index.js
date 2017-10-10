var TelegramBot = require('node-telegram-bot-api');
var request = require('request');
var VK = require('vksdk');
var fs = require('fs');

var TOKEN = process.env.TOKEN;
var PORT = process.env.PORT || 3000;
var MODE = process.env.MODE || 'dev';
var APP_SECRET = process.env.APP_SECRET;
var APP_TOKEN = process.env.APP_TOKEN;

if (MODE === 'prod') {
  var url = process.env.APP_URL || 'https://telegram-bot-vk-api.herokuapp.com:443';
}
if (MODE === 'prod') {
  var botOptions = {
      webHook: {
        port: PORT
      }
  };
} else {
  var botOptions = {
    polling: {
      timeout: 0,
      interval: 100
    },
    port: PORT
  };
}
var bot = new TelegramBot(TOKEN, botOptions);
if (MODE === 'prod') {
  bot.setWebHook(`${url}/bot${TOKEN}`);
}
var vk = new VK({
    'appId': 6214737,
    'appSecret': APP_SECRET,
    'language' : 'ru',
    'secure ': true
});

vk.requestServerToken();
vk.setSecureRequests(true);
vk.setToken(APP_TOKEN);

bot.on('text', function(msg) {
  var messageChatId = msg.chat.id;
  var messageText = msg.text;
  var messageUsr = msg.from.username;
  var messageDate = new Date(msg.date);

  var opts = {
    //http://yraaa.ru/graphics/vse-smajliki-vkontakte-emoji-vk emojii
    //reply_to_message_id: msg.message_id,
    reply_markup: JSON.stringify({
      keyboard: [
        ['🏦 Прислать открытку из Питера'],
        ['📅 Афиша'],
        ['🆕 Новости бота','❓ Помощь'],
        ['♥ Понравился бот?']
      ],
      resize_keyboard: true
    })
  };
  var optsLike = {
    reply_markup: JSON.stringify({
      keyboard: [
        ['⭐ Я уже оценил'],
        ['⌛ Я оценю позже']
      ],
      resize_keyboard: true
    })
  };
  var optsAfisha = {
    reply_markup: JSON.stringify({
      keyboard: [
        ['🎭 Концерты, выставки и театры'],
        ['💬 Интересные события в городе'],
        ['⚡ Происходящее в городе'],
        ['⬅ Назад']
      ],
      resize_keyboard: true
    })
  };

  //Main messages
  if ((messageText === '/live') || (messageText === '🏦 Прислать фото Питера')) {
    getVKGeoPhotos(messageChatId, opts, messageDate, function(vkResponse) {
      var items_count = vkResponse.length;
      var responseArr = randd(items_count, vkResponse);
      var img;
      if("photo_604" in vkResponse[responseArr[1]]) {
        img = request(vkResponse[responseArr[1]].photo_604);
      } else if ("photo_807" in vkResponse[responseArr[1]]) {
        img = request(vkResponse[responseArr[1]].photo_807);
      } else if ("photo_130" in vkResponse[responseArr[1]]){
        img = request(vkResponse[responseArr[1]].photo_130);
      } else {
        bot.sendMessage(messageChatId, "Упс, не найдено подходящего размера", opts);
        if (MODE !== 'prod') {
          logging("logs/ResponsePhotoVkLog.log", vkResponse);
        }
      }

      if(vkResponse[responseArr[1]].text.length < 190) {
        opts.caption = vkResponse[responseArr[1]].text + '\r\n/live';
      }else{
        opts.caption = 'Отлично! Давай еще загрузим!\r\n/live';
      }

      bot.sendPhoto(messageChatId, img, opts);
    });
  }
  if (messageText === '/start') {
		  bot.sendMessage(messageChatId, 'Привет! Это бот для наслаждения фотографиями Питера. \r\n\r\nДля того, чтобы загрузить фото из ВКонтакте, ' +
      'сделанное в пределах города, набери команду:\r\n/live\r\n\r\n' +
			'Чтобы просмотреть афишу наберите команду:\r\n/afisha\r\n\r\n' +
			'Следите за обновлениями по тегу:\r\n/news', opts);
  }
  if ((messageText === '/news') || messageText === ('🆕 Новости бота')) {
		  bot.sendMessage(messageChatId, 'Версия бота 0.5.1\r\n' +
        '>бот запущен на heroku и доступен постоянно, исправлена загрузка афиш\r\n' +
        '>добавлена фильтрация по стоп-словам, теперь исключаются многие фотографии\r\n' +
        '>улучшена стабильность\r\n' +
        '>прочие мелкие правки',
        opts);
  }
  if ((messageText === '/help') || messageText === ('❓ Помощь')) {
  	bot.sendMessage(messageChatId, 'Бот умеет загружать фотографии Санкт-Петербурга из ВКонтакте. \r\n' +
  		'Внимание: бот и его разработчики не отвечают за содержание фотографий. \r\n' +
  		'Фотографии берутся из открытых альбомов по гео-меткам. Вполне возможно, что там будет не город, а чей-то портрет, вещь и т.д. ' +
  		'Для поиска подходящей фотографии наберите команду еще раз. Фотографии берутся случайные из самых последний сделанных пользователями.\r\n\r\n' +
      '\r\nТак же бот загружает последнее сообщение со стены новостных пабликов, чтобы предоставить вам список культурных мероприятий и происшествий города.\r\n' +
  		'\r\n\r\nСписок команд:\r\n/news\r\n/help\r\n/live\r\n/afisha\r\n/like\r\n\r\nЕсли вам понравилось, то можете пожертвовать на развитие:\r\nR390746431168\r\nZ204528440705\r\n' +
      'Или оценить бот на ⭐⭐⭐⭐⭐ в https://telegram.me/storebot?start=spblive_bot', opts);
  }
  if ((messageText === '/like') || messageText === ('♥ Понравился бот?')) {
    bot.sendMessage(messageChatId, 'Привет, ' + messageUsr + ' ✌. Если тебе понравился этот бот, то поставь ему 5 звёзд ⭐⭐⭐⭐⭐ тут: https://telegram.me/storebot?start=spblive_bot ' +
      '\r\n' + 'Так же, ты можешь пожертвовать на развитие в разделе помощи:\r\n/help', optsLike);
  }
  //Main messages--->like
  if ((messageText === '/likeyet') || messageText === ('⭐ Я уже оценил')) {
    bot.sendMessage(messageChatId, 'Ого! Спасибо, ' + messageUsr + '!😗 Что смотрим дальше?', opts);
  }
  if ((messageText === '/liketomorrow') || messageText === ('⌛ Я оценю позже')) {
    bot.sendMessage(messageChatId, 'Ну, ладно, ' + messageUsr + '! Это быстро и просто, но я подожду... 🌚', opts);
  }
  if ((messageText === '/afisha') || messageText === ('📅 Афиша')) {
    bot.sendMessage(messageChatId, 'Давай выберем, что нас интересует, ' + messageUsr + '. 📰', optsAfisha);
  }
  //Main messages--->Afisha
  if ((messageText === '/afishaCulture') || messageText === ('🎭 Концерты, выставки и театры')) {
    getVKPublicNews (messageChatId, optsAfisha, messageDate, "-59599229");
  }
  if ((messageText === '/afishaEvents') || messageText === ('💬 Интересные события в городе')) {
    getVKPublicNews (messageChatId, optsAfisha, messageDate, "-26270763");
  }
  if ((messageText === '/afishaNews') || messageText === ('⚡ Происходящее в городе')) {
    getVKPublicNews (messageChatId, optsAfisha, messageDate, "-23303030");
  }
  if ((messageText === '/back') || messageText === ('⬅ Назад')) {
    bot.sendMessage(messageChatId, 'Чего, ' + messageUsr + ', изволишь❓', opts);
  }
});

//Random integer generator
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

//Logging read and write to sending filename
function logging(filename, datas) {
  var text = '';
  var dataString = JSON.stringify(datas, null, 2);
  var curDate = new Date();

  fs.readFile(filename, function (err, logData) {
    if (err) throw err;

    text = logData.toString();
    curDate = curDate.getDate() + '.' + curDate.getMonth() + '.' + curDate.getFullYear() + " " + curDate.getHours() + ":" + curDate.getMinutes() + ":" + curDate.getSeconds();
    text += "\r\n#-------------------------------\r\n" + curDate + "\r\n#-------------------------------\r\n" + dataString;

    fs.writeFile(filename, text, function(err) {
      if(err) throw err;
    });
  });
}

//Getting VK images
function getVKGeoPhotos(messageChatId, opts, messageDate, callback) {
  vk.request('photos.search', {
      'q' : 'Петербург',
      'lat' : '59.9343533',
      'long': '30.3353828',
      'sort': 0,
      'count': 900,
      'radius': 6000,
      'version':'5.50'
    },
    function (_o) {
      if(_o.response.items.length > 1) {
        callback(_o.response.items);
      }else{
        bot.sendMessage(messageChatId, "Упс, ничего не найдено", opts);
        if (MODE !== 'prod') {
          logging("logs/ResponsePhotoVkLog.log", _o);
        }
      }
    }
  );
}

//Recursion function to get random item from scope
function randd(items_count, vkResponse){
  var randomId = getRandomInt(0, items_count-1);
  var photoCaption = vkResponse[randomId].text;

  if (photoCaption !== ''){
    if (photoCaption.match(/работа|cm|tfp|лет|см|полумарафон|модель|медаль|марафон|диплом|конкурс|мужское|жеснкое|обмен|меняю|обменяю|заказы|рост|цена|пересыл|ремонт|личку|куплю|макияж|рублей|руб|размер|услуги|тонировка|туфли|джинсы|бронирование|штаны|футболка|продаю|продам|покупка|звоните|сдам|сниму/gi) ) {
      return randd(items_count, vkResponse);
    } else {
      return [photoCaption, randomId];
    }
  } else {
    return [photoCaption, randomId];
  }
}

//Function to get wall's content
function getVKPublicNews (messageChatId, optsAfisha, messageDate, pubId) {
  vk.request('wall.get', {
    'owner_id' : pubId,
    'count' : 1,
    'offset' : 2,
    'filter': 'owner',
    'version':'5.50'
    },
    function(_o) {
      if (_o.response.items[0].text !== '' && _o.response !== 'undefined') {
        if ( ("photo" in _o.response.items[0].attachments[0]) && ("post_id" in _o.response.items[0].attachments[0].photo) ) {
          if (_o.response.items[0].text.length < 199) {
            optsAfisha.caption = _o.response.items[0].text;
            bot.sendPhoto(messageChatId, request(_o.response.items[0].attachments[0].photo.photo_604), optsAfisha);
          } else {
            bot.sendPhoto(messageChatId, request(_o.response.items[0].attachments[0].photo.photo_604), optsAfisha);
            bot.sendMessage(messageChatId, _o.response.items[0].text, optsAfisha);
          }
          if (MODE !== 'prod') {
            logging("logs/ResponsePhotoVkLog.log", _o.response.items);
          }
        } else {
          if (MODE !== 'prod') {
            logging("logs/ResponsePhotoVkLog.log", _o.response.items);
          }
          bot.sendMessage(messageChatId, _o.response.items[0].text, optsAfisha);
        }
      } else {
          if (MODE !== 'prod') {
            logging("logs/ResponsePhotoVkLog.log", _o.response.items);
          }
          bot.sendMessage(messageChatId, _o.response.items[0].copy_history[0].text, optsAfisha);
      }
    }
  );
}