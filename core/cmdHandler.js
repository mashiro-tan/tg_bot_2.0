import { Api } from 'telegram'

import { getConferenceFeatures, isAdmin as isAdminFn } from './acl.js'
import commandList from './commands/index.js'
import { getAdmin, setAdmin } from './db.js'
import {
  resolver as usernameResolver,
  getSelfUser,
  getMapPtrForPeer,
} from './users.js'

const makeHelp = () => {
  commandList.filter((command) => !['service'].includes(command.acl))
}

const serviceFields = ['title', 'acl', 'check', 'scope']

const eventPrint = (client) => async (event) => {
  const { message, isPrivate } = event

  const { id: messageId, text, peerId } = message

  await message.markAsRead()

  if (!text || message.fwdFrom || !/^\\[a-zа-я]+\s?/.test(text)) {
    return
  }

  const [rawHeader, ...args] = text.replace(/\s+/g, ' ').split(' ')

  const header = rawHeader.replace(/^\\/, '')

  const mentions = (message.getEntitiesText() || []).filter((entity) =>
    entity[0].className.includes('MessageEntityMention')
  )

  const {
    resolveFromMention,
    parseMention,
    userById,
    chatUsers,
  } = usernameResolver(client, peerId)

  const muteFn = async (id, minutes) => {
    const untilDate = Math.round(Date.now() / 1000) + minutes * 60

    await client.invoke(
      new Api.channels.EditBanned({
        channel: peerId,
        participant: id,
        bannedRights: new Api.ChatBannedRights({
          untilDate,
          sendMessages: true,
          sendMedia: true,
          sendStickers: true,
          sendGifs: true,
          sendGames: true,
          sendInline: true,
          sendPolls: true,
          changeInfo: true,
          inviteUsers: true,
          pinMessages: true,
        }),
      })
    )
  }

  const context = {
    _client: client,
    args: args.join(' ').trim(),
    inPrivate: isPrivate,
    chat: getMapPtrForPeer(peerId),
    sender: BigInt(message.senderId),
    reply: (replyMsg, noReply = false) =>
      client.sendMessage(peerId, {
        message: replyMsg,
        ...(noReply ? {} : { replyTo: messageId }),
      }),
    mentions: mentions.map((m) => parseMention(m)),
    userByMention: resolveFromMention,
    chatUsers,
    userById,
    me: getSelfUser,
    muteFor: muteFn,
  }

  if (header === 'reg') {
    const admin = await getAdmin()

    if (!admin && context.inPrivate) {
      if (args[0] === '1111222233334444') {
        await setAdmin(context.sender)

        await context.reply('Администратор установлен.')
      }
    }

    return
  }

  const isAdmin = await isAdminFn(context)

  const acl = await getConferenceFeatures(context)

  if (!isAdmin && !acl) {
    return
  }

  const allowedCommands = commandList.filter(
    (cmdlet) =>
      (isAdmin || (acl && cmdlet.check(acl))) &&
      (!cmdlet.scope || isPrivate === (cmdlet.scope === 'private'))
  )

  if (allowedCommands.length === 0) {
    return
  }

  if (header === 'halp') {
    const response = allowedCommands
      .map((cmdlet) => {
        const title = cmdlet.title || 'н/о'
        const commands = Object.entries(cmdlet).filter(
          ([cmd]) => !serviceFields.includes(cmd)
        )

        const enumerated = commands.map(
          ([cmd, { description }]) => `\\${cmd} - ${description || 'н/о'}`
        )

        return [`${title}:`, ...enumerated].join('\n')
      })
      .join('\n---\n')

    await context.reply(response)

    return
  }

  const commandFns = Object.assign(
    {},
    ...allowedCommands.map((cmdlet) => {
      const commands = Object.entries(cmdlet).filter(
        ([cmd]) => !serviceFields.includes(cmd)
      )

      return Object.assign(
        {},
        ...commands.map(([cmd, { action }]) => ({ [cmd]: action }))
      )
    })
  )

  const fn = commandFns[header]

  if (!fn) {
    return
  }
  // await context.reply('Функция неактивна. Для активации на месяц внесите на счет 5 евро.')

  await fn(context)
}

export default eventPrint
