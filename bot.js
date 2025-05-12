const { Telegraf } = require('telegraf');

const bot = new Telegraf('8017281955:AAHUWgqvjsb_sT7tGTZgcSL9Mte8Wt_GhDk'); // Замените на ваш токен

// Хранилище пользовательских состояний
const userStates = {};

const STATES = {
  START: 'start',
  ASK_CITY: 'ask_city',
  WAITING_VOICE: 'waiting_voice',
  ASK_CONTACT: 'ask_contact',
 FINISHED: 'finished'
};

bot.start((ctx) => {
  userStates[ctx.from.id] = { state: STATES.START };
  ctx.replyWithMarkdownV2(
    `Привет\\! Это бот проекта *Voices*\\.\n\n` +
    `Мы собираем голосовые истории — тёплые, уязвимые, настоящие\\. Про то, как менялись вы и мир вокруг с 2022 года\\.\n\n` +
    `Говорить — не обязательно правильно\\. Достаточно — честно\\.\n\n` +
    `Готовы поделиться голосом? 🎙️`,
    {
      reply_markup: {
        keyboard: [['Хочу рассказать'], ['Хочу узнать больше']],
        resize_keyboard: true,
        one_time_keyboard: true,
      }
    }
  );
});

bot.hears('Хочу узнать больше', (ctx) => {
  ctx.replyWithMarkdownV2(
    `Проект *Voices* — это документальный веб\\-зин и карта голосов\\.\n\n` +
    `Мы собираем истории людей из разных городов и стран:\n` +
    `— Что изменилось за последние годы?\n` +
    `— Как вы себя чувствуете?\n` +
    `— Что помогает вам держаться?\n\n` +
    `Ваше сообщение останется анонимным\\.\n` +
    `Мы просто хотим услышать — и показать, как звучит мир\\.\n\n` +
    `Готовы начать?`,
    {
      reply_markup: {
        keyboard: [['Да, давайте']],
        resize_keyboard: true,
        one_time_keyboard: true,
      }
    }
  );
});

bot.hears(['Хочу рассказать', 'Да, давайте'], (ctx) => {
  userStates[ctx.from.id] = { state: STATES.ASK_CITY };
  ctx.reply('Сначала, пожалуйста, напишите, из какого вы города.\n\nМожно указать только город и страну.\nНапример:\n> Берлин, Германия\n> Ереван, Армения');
});

bot.on('text', (ctx) => {
  const userId = ctx.from.id;
  const userState = userStates[userId];

  if (!userState) return;

  if (userState.state === STATES.ASK_CITY) {
    userStates[userId].city = ctx.message.text;
    userStates[userId].state = STATES.WAITING_VOICE;
    ctx.reply(
      `Спасибо. Теперь — ваш голос.\n\n` +
      `Можно рассказать всё, что хочется. Вот примеры вопросов:\n\n` +
      `• Где вы были, когда всё началось?\n` +
      `• Что изменилось в вашей жизни за 3 года?\n` +
      `• Что помогает вам держаться?\n` +
      `• Что вы хотели бы сказать кому-то, кто переживает похожее?\n\n` +
      `Вы можете выбрать один вопрос или просто говорить, как идёт.\n\n` +
      `Когда будете готовы — запишите голосовое сообщение прямо здесь.`
    );
  } else if (userState.state === STATES.ASK_CONTACT) {
    userStates[userId].contact = ctx.message.text;
    userStates[userId].state = STATES.FINISHED;
    ctx.reply('Спасибо, что поделились.\nЕсли захотите — вы всегда можете вернуться и записать ещё.', {
      reply_markup: {
        keyboard: [['Записать ещё одно'], ['Завершить']],
        resize_keyboard: true,
      }
    });
  }
});

const ADMIN_ID = 1006525845;

bot.on('voice', async (ctx) => {
  const userId = ctx.from.id;
  const userState = userStates[userId];

  if (userState?.state === STATES.WAITING_VOICE) {
    userStates[userId].state = STATES.ASK_CONTACT;

    // Перешлём голосовое сообщение админу
    await ctx.telegram.sendVoice(ADMIN_ID, ctx.message.voice.file_id, {
      caption: `📥 Новый голос от пользователя ${ctx.from.first_name} (${ctx.from.username || 'без username'})\n🌍 Город: ${userState.city || 'не указан'}`,
    });

    ctx.reply(
      'Спасибо. Ваш голос — часть живой карты.\nМы бережно обработаем и разместим его анонимно.\n\nХотите оставить контакт, чтобы мы прислали вам ссылку, когда запись появится на сайте?',
      {
        reply_markup: {
          keyboard: [['Оставить контакт'], ['Нет, спасибо']],
          resize_keyboard: true,
          one_time_keyboard: true,
        }
      }
    );
  }
});


bot.hears('Оставить контакт', (ctx) => {
  userStates[ctx.from.id].state = STATES.ASK_CONTACT;
  ctx.reply('Вы можете отправить email или Telegram-никнейм.\nМы используем его только для отправки ссылки на ваш фрагмент карты.');
});

bot.hears('Нет, спасибо', (ctx) => {
  userStates[ctx.from.id].state = STATES.FINISHED;
  ctx.reply('Спасибо, что поделились.\nЕсли захотите — вы всегда можете вернуться и записать ещё.', {
    reply_markup: {
      keyboard: [['Записать ещё одно'], ['Завершить']],
      resize_keyboard: true,
    }
  });
});

bot.hears('Записать ещё одно', (ctx) => {
  userStates[ctx.from.id] = { state: STATES.ASK_CITY };
  ctx.reply('Сначала, пожалуйста, напишите, из какого вы города.');
});

bot.hears('Завершить', (ctx) => {
  delete userStates[ctx.from.id];
  ctx.reply('До встречи. Мы рядом 🌿', {
    reply_markup: { remove_keyboard: true }
  });
});

bot.launch();
console.log('Бот запущен');
