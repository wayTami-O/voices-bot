const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('8017281955:AAHUWgqvjsb_sT7tGTZgcSL9Mte8Wt_GhDk')

const ADMIN_ID = 1006525845;

const userState = {}

bot.start((ctx) => {
  userState[ctx.from.id] = { step: 'start' }
  ctx.reply(
    `Привет! Это бот проекта *Voices*.\n\n` +
    `Мы собираем голосовые истории про то, как меняемся мы и мир вокруг с 2022 года.\n\n` +
    `Правильных ответов нет. Достаточно говорить искренне.\n\n` +
    `Готовы поделиться своей историей? 🎙️`,
    Markup.keyboard([
      ['Хочу рассказать'],
      ['Хочу узнать больше']
    ]).resize()
  )
})

// Хочу узнать больше
bot.hears('Хочу узнать больше', (ctx) => {
  ctx.reply(
    `ℹ️ *Voices* — это документальный веб-зин.\n` +
    `Мы собираем анонимные голосовые сообщения от русскоязычных людей из разных стран, чтобы услышать, как звучит этот мир в момент перемен.\n\n` +
    `Готовы начать?`,
    Markup.keyboard([['Да, давайте']]).resize()
  );
});

// Начать
bot.hears(['Хочу рассказать', 'Да, давайте'], (ctx) => {
  userState[ctx.from.id] = { step: 'await_location' };
  ctx.reply(
    `🏙️ ШАГ 1 — Уточнение города и имени\n\n` +
    `Сначала, пожалуйста, напишите, откуда вы, и как вас зовут. Имя может быть вымышленным.\n\nНапример:\n` +
    `> Артем, Берлин, Германия`
  );
});

// Получаем локацию и имя
bot.on('text', (ctx) => {
  const state = userState[ctx.from.id];

  if (!state) return;

  if (state.step === 'await_location') {
    state.location = ctx.message.text;
    state.step = 'await_voice';
    ctx.reply(
      `🎙️ ШАГ 2 — Запись голосового\n\n` +
      `Спасибо. Теперь — ваш голос.\n\n` +
      `Можно рассказать всё, что хочется. Вот примеры вопросов:\n\n` +
      `• Где вы были, когда всё началось?\n` +
      `• Что изменилось в вашей жизни за 3 года?\n` +
      `• Какие чувства вы испытывали?\n` +
      `• Что помогает вам держаться?\n\n` +
      `Когда будете готовы — запишите голосовое сообщение прямо здесь.`
    );
  } else if (state.step === 'await_contact') {
    state.contact = ctx.message.text;
    state.step = 'done';
    ctx.reply(
      `Спасибо! Мы отправим вам ссылку, когда запись появится на сайте.`,
      Markup.keyboard([['Записать ещё одно'], ['Завершить']]).resize()
    );

    // Отправляем администратору данные
    sendToAdmin(ctx.from.id);
  }
});

// Получаем голосовое
bot.on('voice', async (ctx) => {
  const state = userState[ctx.from.id];
  if (!state || state.step !== 'await_voice') return;

  state.voice = ctx.message.voice.file_id;
  state.step = 'after_voice';

  ctx.reply(
    `✅ Спасибо. Ваш голос — часть живой карты.\n\n` +
    `Хотите оставить контакт, чтобы мы прислали вам ссылку, когда запись появится на сайте? Это не обязательно.`,
    Markup.keyboard([['Оставить контакт'], ['Нет, спасибо']]).resize()
  );
});

// Контакт
bot.hears('Оставить контакт', (ctx) => {
  const state = userState[ctx.from.id];
  if (state) {
    state.step = 'await_contact';
    ctx.reply(`✉️ Вы можете отправить email или Telegram-никнейм.`);
  }
});

// Без контакта
bot.hears('Нет, спасибо', (ctx) => {
  const state = userState[ctx.from.id];
  if (state) {
    state.step = 'done';
    ctx.reply(
      `Спасибо, что поделились. Если захотите — вы всегда можете вернуться и записать ещё.`,
      Markup.keyboard([['Записать ещё одно'], ['Завершить']]).resize()
    );

    // Отправляем администратору данные
    sendToAdmin(ctx.from.id);
  }
});

// Повтор
bot.hears('Записать ещё одно', (ctx) => {
  userState[ctx.from.id] = { step: 'await_location' };
  ctx.reply(
    `🏙️ Снова напишите, откуда вы, и как вас зовут.\n\nНапример:\n> Анна, Париж, Франция`
  );
});

// Завершение
bot.hears('Завершить', (ctx) => {
  delete userState[ctx.from.id];
  ctx.reply(`До встречи. Мы рядом.`);
});

// Отправка данных админу
async function sendToAdmin(userId) {
  const data = userState[userId];
  if (!data) return;

  let message = `📬 Новое сообщение от пользователя:\n\n`;
  message += `🌍 Локация: ${data.location || '—'}\n`;
  message += `📱 Контакт: ${data.contact || '—'}\n`;

  await bot.telegram.sendMessage(ADMIN_ID, message);

  if (data.voice) {
    await bot.telegram.sendVoice(ADMIN_ID, data.voice, {
      caption: '🎙 Голосовое сообщение',
    });
  }
}

bot.launch();
console.log('🤖 Бот запущен');