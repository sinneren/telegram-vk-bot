var TelegramBot = require('node-telegram-bot-api');
var request = require('request');
var VK = require('vksdk');
var fs = require('fs');

var PORT = process.env.PORT || 3000;
var MODE = process.env.MODE || 'dev';
var TOKEN = process.env.TOKEN;
var APP_SECRET = process.env.APP_SECRET;
var APP_TOKEN = process.env.APP_TOKEN;

var excludeArr = /работа|женские|мужчкие|cm|tfp|лет|см|полумарафон|модель|медаль|марафон|диплом|конкурс|мужское|жеснкое|обмен|меняю|обменяю|заказы|рост|цена|пересыл|ремонт|личку|куплю|макияж|рублей|руб|размер|услуги|тонировка|туфли|джинсы|бронирование|штаны|футболка|продаю|продам|покупка|звоните|сдам|сниму/gi;

if (MODE === 'prod') {
    var url = process.env.APP_URL || 'https://telegram-bot-vk-api.herokuapp.com:443';
    var botOptions = {
        webHook: {
            port: PORT
        }
    };
} else {
    var botOptions = {
        polling: true
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

var messages = {
    getPhoto: '🏦 Прислать открытку из Питера',
    getEvents: '📅 Афиша',
    getNews: '🆕 Новости бота',
    getHelp: '❓ Помощь',
    setRate: '♥ Понравился бот?',
    alreadyRate: '⭐ Я уже оценил',
    lateRate: '⌛ Я оценю позже',
    sorryMsgSize: '📐 Упс, не найдено подходящего размера',
    sorryMsgAfisha: '💔 Так-так, плохой бот, плохой, - я накосячил. Еще разок?',
    successPhoto: '🏆 Отлично! Давай еще загрузим!\r\n/live',
    afishaConcert: '🎭 Концерты, выставки и театры',
    afishaEvents: '💬 Интересные события в городе',
    afishaFine: '⚡ Это интересно',
    getBack: '⬅ Назад'
}

bot.on('text', function(msg) {
    var messageChatId = msg.chat.id;
    var messageText = msg.text;
    var messageUsr = '%username%';
    var messageDate = new Date(msg.date);

    if (msg.from.username !== undefined) {
        messageUsr = msg.from.username;
    } else {
        messageUsr = msg.from.first_name;
    }
    var opts = {
        //https://yraaa.ru/graphics/vse-smajliki-vkontakte-emoji-vk
        //reply_to_message_id: msg.message_id,
        reply_markup: JSON.stringify({
            keyboard: [
                [messages.getPhoto],
                [messages.getEvents, messages.getHelp],
                [messages.getNews, messages.setRate]
            ],
            resize_keyboard: true,
            parse_mode: 'markdown'
        })
    };
    var optsLike = {
        reply_markup: JSON.stringify({
            keyboard: [
                [messages.alreadyRate, messages.lateRate]
            ],
            resize_keyboard: true,
            parse_mode: 'markdown'
        })
    };
    var optsAfisha = {
        reply_markup: JSON.stringify({
            keyboard: [
                [messages.afishaConcert],
                [messages.afishaEvents],
                [messages.afishaFine],
                [messages.getBack]
            ],
            resize_keyboard: true,
            parse_mode: 'markdown',
            disable_web_page_preview: true
        })
    };

    //Main messages
    if ( (messageText === '/live') || (messageText === messages.getPhoto) ) {
        getVKGeoPhotos(messageChatId, opts, messageDate, function(vkResponse) {
            var items_count = vkResponse.length;
            var responseArr = randd(items_count, vkResponse);
            var img;

            if ("photo_604" in vkResponse[responseArr[1]]) {
                img = request(vkResponse[responseArr[1]].photo_604);
            } else if ("photo_807" in vkResponse[responseArr[1]]) {
                img = request(vkResponse[responseArr[1]].photo_807);
            } else if ("photo_130" in vkResponse[responseArr[1]]){
                img = request(vkResponse[responseArr[1]].photo_130);
            } else {
                bot.sendMessage(messageChatId, messages.sorryMsgSize, opts);
                if (MODE !== 'prod') {
                    logging("logs/ResponsePhotoVkLog.log", vkResponse);
                }
            }
            if (vkResponse[responseArr[1]].text.length < 190) {
                opts.caption = vkResponse[responseArr[1]].text + '\r\n/live';
            } else {
                opts.caption = messages.successPhoto;
            }
            bot.sendPhoto(messageChatId, img, opts);
        });
    }
    if (messageText === '/start') {
        bot.sendMessage(messageChatId,
            'Привет! Это бот для наслаждения фотографиями Питера. \r\n\r\n' +
            'Для того, чтобы загрузить фото из ВКонтакте, сделанное в пределах города, набери команду:\r\n/live\r\n\r\n' +
            'Чтобы просмотреть афишу наберите команду:\r\n/afisha\r\n\r\n' +
            'Следите за обновлениями по тегу:\r\n/news',
        opts);
    }
    if ( (messageText === '/news') || messageText === ('🆕 Новости бота') ) {
        bot.sendMessage(messageChatId,
            'Версия бота 0.7.4\r\n' +
            '>добавлено много источников новостей\r\n' +
            '>улучшена стабильность и переделано меню\r\n' +
            '>прочие мелкие правки (ノ°□°）ノ',
        opts);
    }
    if ( (messageText === '/help') || (messageText ===messages.getHelp) ) {
        bot.sendMessage(messageChatId,
            'Бот умеет загружать фотографии Санкт-Петербурга из ВКонтакте. \r\n' +
            'Внимание: бот и его разработчики не отвечают за содержание фотографий. \r\n' +
            'Фотографии берутся из открытых альбомов по гео-меткам. Вполне возможно, что там будет не город, а чей-то портрет, вещь и т.д. ' +
            'Для поиска подходящей фотографии наберите команду еще раз. Фотографии берутся случайные из самых последний сделанных пользователями.\r\n\r\n' +
            '\r\nТак же бот загружает последнее сообщение со стены новостных пабликов, чтобы предоставить вам список культурных мероприятий и происшествий города.\r\n' +
            '\r\n\r\nСписок команд:\r\n/news\r\n/help\r\n/live\r\n/afisha\r\n/like\r\n\r\nЕсли вам понравилось, то можете пожертвовать на развитие:\r\nR390746431168\r\nZ204528440705\r\n\r\nBTC: 1bSHtYiyiEmq4qXszNYMbo3fHihXvxc5N\r\n\r\n' +
            'Или оценить бот на ⭐⭐⭐⭐⭐ в https://telegram.me/storebot?start=spblive_bot',
        opts);
    }
    if ( (messageText === '/like') || (messageText === messages.setRate) ) {
        bot.sendMessage(messageChatId,
            'Привет, ' + messageUsr + ' ✌. Если тебе понравился этот бот, то поставь ему 5 звёзд ⭐⭐⭐⭐⭐ тут: https://telegram.me/storebot?start=spblive_bot ' +
            '\r\n' + 'Так же, ты можешь пожертвовать на развитие в разделе помощи:\r\n/help',
        optsLike);
    }
    if ( (messageText === '/likeyet') || (messageText === messages.alreadyRate) ) {
        bot.sendMessage(messageChatId,
            'Ого! Спасибо, ' + messageUsr + '!😗 Что смотрим дальше?',
        opts);
    }
    if ((messageText === '/liketomorrow') || (messageText === messages.lateRate) ) {
        bot.sendMessage(messageChatId,
            'Ну, ладно, ' + messageUsr + '! Это быстро и просто, но я подожду... 🌚',
        opts);
    }
    if ( (messageText === '/afisha') || (messageText === messages.getEvents) ) {
        bot.sendMessage(messageChatId,
            'Давай выберем, что нас интересует, ' + messageUsr + '. 📰',
        optsAfisha);
    }
    if ( (messageText === '/afishaCulture') || (messageText === messages.afishaConcert) ) {
        getVKPublicNews (messageChatId, optsAfisha, messageDate, "-59599229");
    }
    if ( (messageText === '/afishaEvents') || (messageText === messages.afishaEvents) ) {
        var publicIdEvents = [
            "-23303030",
            "-26270763",
            "-23702661",
            "-3948346",
            "-40766972",
            "-4568673",
            "-40476768",
            "-12390",
            "-59599229",
            "-124844180"
        ];
        getVKPublicNews (messageChatId, optsAfisha, messageDate, publicIdEvents[getRandomInt(0, publicIdEvents.length)]);
    }
    if ( (messageText === '/afishaFine') || (messageText === messages.afishaFine) ) {
        var publicIdArr = [
            "-49234021",
            "-38228859",
            "-38228859",
            "-58956",
            "-31516466",
            "-88229325",
            "-37437348",
            "-34183022",
            "-61321075",
            "-52293937"
        ];
        getVKPublicNews (messageChatId, optsAfisha, messageDate, publicIdArr[getRandomInt(0, publicIdArr.length)]);
    }
    if ((messageText === '/back') || (messageText === messages.getBack) ) {
        bot.sendMessage(messageChatId,
            'Чего, ' + messageUsr + ', изволишь❓',
        opts);
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
        'version':'5.58'
        },
        function (_o) {
            if (_o.response.items.length > 1) {
                callback(_o.response.items);
            } else {
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
    var randomId = getRandomInt(0, items_count);
    var photoCaption = vkResponse[randomId].text;
    if (photoCaption !== '') {
        if (photoCaption.match(excludeArr) ) {
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
        'offset' : getRandomInt(1, 10),
        'filter': 'owner',
        'version':'5.58'
    },
    function(_o) {
        if (_o.response !== undefined) {
            if (_o.response.items[0].text !== '') {
                var photo_counter = 0;
                _o.response.items[0].attachments.forEach(function (elm, key) {
                    if (photo_counter < 3) {
                        if (elm.type === 'photo') {
                            bot.sendPhoto(messageChatId, request(_o.response.items[0].attachments[key].photo.photo_604), optsAfisha);
                            bot.sendMessage(messageChatId, _o.response.items[0].text, optsAfisha);
                        } else {
                            bot.sendMessage(messageChatId, _o.response.items[0].text, optsAfisha);
                        }
                        photo_counter++;
                    } else {
                        return false;
                    }
                });
            } else if ( (_o.response.items[0].copy_history !== undefined) && (_o.response.items[0].copy_history[0].text !== '') ) {
                _o.response.items[0].copy_history[0].attachments.forEach(function (elm, key) {
                    if (elm.type === 'photo') {
                        if (_o.response.items[0].copy_history[0].text.length < 199 && _o.response.items[0].copy_history[0].text !== '') {
                            bot.sendPhoto(messageChatId, request(_o.response.items[0].copy_history[0].attachments[key].photo.photo_604), optsAfisha);
                        } else {
                            bot.sendPhoto(messageChatId, request(_o.response.items[0].copy_history[0].attachments[key].photo.photo_604), optsAfisha);
                            bot.sendMessage(messageChatId, _o.response.items[0].copy_history[0].text, optsAfisha);
                        }
                    }
                });
            } else {
                bot.sendMessage(messageChatId, messages.sorryMsgAfisha, optsAfisha);
            }
        } else {
            if (MODE !== 'prod') {
                logging("logs/ResponsePhotoVkLog.log", _o);
            }
            bot.sendMessage(messageChatId, messages.sorryMsgAfisha, optsAfisha);
        }

    });
}
