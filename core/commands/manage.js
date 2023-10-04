import { Api } from 'telegram'

import { setConferenceFeatures, lendAdmin, revokeAdmin } from '../acl.js'

const supportedACL = ['base']

const conferenceRegister = async (ctx) => {
  const message = ctx.arguments
  const matchResult = message && message.match(/([a-z]+:\d)/g)

  const settings = matchResult
    ? matchResult.map((setting) => {
        const [name, value] = setting.split(':')

        return [name, Number(value)]
      })
    : []

  if (!message) {
    await setConferenceFeatures(ctx, { base: true })
  } else {
    const knownSettings =
      settings && settings.filter(([setting]) => supportedACL.includes(setting))

    if (
      !knownSettings ||
      knownSettings.length === 0 ||
      settings.length !== knownSettings.length
    ) {
      await ctx.reply('Неверно заданы параметры!')

      return
    }

    const baseFeature = knownSettings.find(([setting]) => setting === 'base')[1]

    await setConferenceFeatures(ctx, { base: baseFeature === 1 ? true : false })
  }

  await ctx.reply('Настройки изменены.')
}

const conferenceJoin = async ({ _client, args, reply }) => {
  const hashArr = args.match(/t\.me\/([+a-zA-Z0-9]+)/)

  if (!hashArr) {
    await reply('Ссылка на приватный чат не распознана.')

    return
  }

  const hash = hashArr[1].replace(/^\+/, '')

  try {
    await _client.invoke(
      new Api.messages.ImportChatInvite({
        hash,
      })
    )
  } catch (e) {
    await reply(e.message || 'Неизвестная ошибка')
  }
}

const changeTemporaryAdmin = (isDelete) => async ({
  mentions,
  reply,
  userByMention,
}) => {
  if (mentions.length === 1) {
    const mentioned = await userByMention(mentions[0])

    if (!mentioned || !mentioned.id) {
      await reply('Пользак не опознан.')

      return
    }

    const name = mentioned.fullname || mentioned.username

    if (isDelete) {
      revokeAdmin(mentioned.id)

      await reply(`${name} удален из админов (${mentioned.id})`)
    } else {
      lendAdmin(mentioned.id)

      await reply(`${name} добавлен в админы (${mentioned.id})`)
    }

    return
  }

  await reply('Заебал.')
}

export default {
  title: 'Сервис',
  acl: 'service',
  check: () => false,
  ack: {
    description: 'Регистрация в чате',
    action: conferenceRegister,
  },
  join: {
    description: 'Вход в чат',
    action: conferenceJoin,
  },
  lend: {
    action: changeTemporaryAdmin(false),
  },
  revoke: {
    action: changeTemporaryAdmin(true),
  },
}
