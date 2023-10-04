import { getRandomValues } from 'crypto'

import { getDuelants, getDuelStats, finishDuel } from '../db.js'
import { simpleUserName } from '../users.js'

const duelsByChat = new Map()

const rdrand8 = (max = 1, min = 0) => {
  const result = getRandomValues(new Uint8Array(1))[0]

  return min + (result * (max - min)) / 255
}

const defaultReasons = [
  'в ногу',
  'в голову',
  'в сердце',
  'в колено',
  'в живот',
  'в анус',
  'в рот',
]

const duelTimeout = 2 * 60 * 1000
const duelCooldown = 0.5 * 60 * 1000
const mutedMinutes = 5
const mutedFatalMinutes = 60

const makeDuel = async ({
  args,
  sender,
  mentions,
  reply,
  me,
  chat,
  userByMention: getByMention,
  chatUsers,
}) => {
  if (!mentions.length || mentions.length > 1) {
    await reply('Кого стрелять будем?')

    return
  }

  const mention = mentions[0]

  const userByMention = await getByMention(mention, true)

  if (!userByMention) {
    await reply('Не удалось определить соперника!')

    return
  }

  if (userByMention.id === sender) {
    await reply('Веревка в фикспрайсе дешевле!')

    return
  }

  if (userByMention.muted) {
    await reply('Труп не может ответить на вызов...')

    return
  }

  if (userByMention.id === me().id || userByMention.bot) {
    await reply('Боты не играют в игры!')

    return
  }

  const participants = [sender, userByMention.id]

  // const groupUsers = await chatUsers()

  // if (typeof groupUsers[userByMention.id] !== 'boolean') {
  //   await reply('Соперника нет в этой конференции!')

  //   return
  // }

  const activeDuel = [...duelsByChat.entries()].find(
    ([, duel]) =>
      participants.includes(duel.pushkin) || participants.includes(duel.dantes)
  )

  if (activeDuel) {
    await reply('Нельзя принимать участие в двух дуэлях одновременно!')

    return
  }

  const participantStats = await getDuelants(participants)

  if (
    participantStats.find(
      (duelant) =>
        duelant.last_duel && duelant.last_duel > Date.now() - duelCooldown
    )
  ) {
    await reply(
      'Один из участников недавно участвовал в дуэли. Спили пока мушку, ковбой!'
    )

    return
  }

  if (duelsByChat.get(chat)) {
    await reply('В чате уже идет дуэль!')

    return
  }

  const stopDuel = async () => {
    duelsByChat.delete(chat)

    await reply('Дуэль завершена за неактивностью участников!', true)
  }

  const duelReason =
    args && args.replace(new RegExp(`^@?${mention[1]}`), '').trim()

  const duelState = {
    dantes: sender,
    pushkin: userByMention.id,
    nextMovePushkin: true,
    stopDuel,
    timeout: null,
    reason: duelReason || null,
    firstTime: true,
  }

  duelState.timeout = setTimeout(stopDuel, duelTimeout)

  duelsByChat.set(chat, duelState)

  await reply('Дуэль начата, ждём хода противника!')
}

const makeShot = async ({
  args,
  sender,
  reply,
  me,
  chat,
  chatUsers,
  userById,
  muteFor,
}) => {
  const duel = duelsByChat.get(chat)

  if (!duel) {
    await reply('В чате засел снайпе')

    return
  }

  const {
    dantes,
    pushkin,
    nextMovePushkin,
    timeout,
    stopDuel,
    firstTime,
  } = duel

  if (![dantes, pushkin].includes(sender)) {
    await reply('Ты не участвуешь в дуэли!')

    return
  }

  if (
    (sender === dantes && nextMovePushkin) ||
    (sender === pushkin && !nextMovePushkin)
  ) {
    await reply('Сначала дождись хода противника!')

    return
  }

  clearTimeout(timeout)

  const shooter = sender
  const target = sender === dantes ? pushkin : dantes

  const shotOnTarget = rdrand8(2) > (firstTime ? 1.33 : 1)

  if (shotOnTarget) {
    duelsByChat.delete(chat)

    const winnerStats = await finishDuel({ winner: shooter, loser: target })

    const loser = await userById(target)

    const loserName = loser && simpleUserName(loser)

    const shotIn =
      (args && args.trim()) ||
      defaultReasons[Math.round(rdrand8(defaultReasons.length - 1))]

    const userList = await chatUsers()

    const isAdmin = userList[me().id]

    const userIsAdmin = userList[target]
    const shooterIsAdmin = userList[shooter]
    const muteDecision = shooterIsAdmin ? rdrand8(3) > 2 : true

    let muteStr = isAdmin
      ? '(На этот раз без трупов, впредь будьте осторожней)'
      : undefined

    if (muteDecision && isAdmin && userIsAdmin !== true) {
      const fatality = rdrand8(24, 1) > 23

      const muteForMinutes = fatality ? mutedFatalMinutes : mutedMinutes

      try {
        await muteFor(target, muteForMinutes)

        muteStr = [
          '(',
          `Мьют ${loserName} на ${muteForMinutes} минут`,
          shooterIsAdmin && shooter === dantes
            ? fatality
              ? ', админу пригорело'
              : ', админу неприятно'
            : '',
          fatality ? '. Займись делом, друг' : '',
          ')',
        ]
          .filter(Boolean)
          .join('')
      } catch (e) {
        console.log(e)
        muteStr = `(Мьют не удался)`
      }
    }

    await reply(
      [
        [`Ты победил! ${loserName} застрелен ${shotIn}`, duel.reason]
          .filter(Boolean)
          .join(' '),
        muteStr,
        `Побед: ${winnerStats.wins}, поражений: ${winnerStats.loses}`,
      ]
        .filter(Boolean)
        .join('\n')
    )

    return
  }

  duelsByChat.set(chat, {
    ...duel,
    firstTime: false,
    nextMovePushkin: !nextMovePushkin,
    timeout: setTimeout(stopDuel, duelTimeout),
  })

  await reply('Промазал, малой!')
}

const getSimpleStats = async (duelists, userById) => {
  const result = []

  for (let duelist of duelists) {
    const { person } = duelist

    const userData = await userById(person)

    const username = simpleUserName(userData)

    result.push({ ...duelist, username })
  }

  return result
}

const makeStatsLine = (records) => {
  if (records.length > 0) {
    return records
      .map(
        (record) =>
          `${record.username}: ${record.wins} побед из ${
            record.wins + record.loses
          } дуэлей`
      )
      .join('\n')
  }

  return 'Отсутствуют...'
}

const duelStats = async ({ sender, reply, chatUsers, userById }) => {
  const userList = await chatUsers()

  const rawStats = await getDuelStats(Object.keys(userList || {}))

  const result = await getSimpleStats(rawStats, userById)

  const { winners, losers } = result.reduce(
    (acc, val) => {
      if (val.rate > 0.55) {
        acc.winners.push(val)
      } else if (val.rate < 0.45) {
        acc.losers.push(val)
      }

      return acc
    },
    { winners: [], losers: [] }
  )

  const topWinners = winners
    .sort((a, b) => b.wins * b.rate - a.wins * a.rate)
    .slice(0, 5)

  const topLosers = losers
    .sort((a, b) => b.loses * (1 - b.rate) - a.loses * (1 - a.rate))
    .slice(0, 5)

  const winnersLine = makeStatsLine(topWinners)
  const losersLine = makeStatsLine(topLosers)

  const senderStats = result.find((record) => record.person === sender)

  const senderLine = senderStats
    ? `Твоих побед: ${senderStats.wins}, поражений: ${senderStats.loses}`
    : 'Ты еще не принимал участия в дуэли.'

  await reply(
    [
      senderLine,
      '',
      'Ковбои 🔫 чата:',
      winnersLine,
      'Мишени 🎯 чата:',
      losersLine,
    ].join('\n')
  )
}

export default {
  title: 'Дуэли',
  scope: 'public',
  acl: 'base',
  check: (acl) => acl.base === true,
  дуэль: {
    description: 'Вызов соперника на дуэль. Можно указать причину.',
    action: makeDuel,
  },
  выстрел: {
    description: 'Нутыпонел. Можно указать цель.',
    action: makeShot,
  },
  ковбои: {
    description: 'Статка',
    action: duelStats,
  },
}
