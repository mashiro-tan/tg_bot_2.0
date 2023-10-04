import { getRandomValues } from 'crypto'

import { simpleUserName } from '../users.js'

const roulettesByChat = new Map()

const rdrand8 = (max = 1, min = 0) => {
  const result = getRandomValues(new Uint8Array(1))[0]

  return min + (result * (max - min)) / 255
}

const getMinutesString = (timeDifference) => {
  const minutes = timeDifference / (60 * 1000)

  return minutes.toFixed(1)
}

const rouletteCooldown = 2 * 60 * 1000
const selfRollCooldown = 10 * 1000
const rouletteReset = 5 * 60 * 1000
const mutedMinutes = 5
const mutedFatalMinutes = 60

const missLines = [
  'Звон стальных яиц спустившего на курок громче холостого',
  'Сидящих тряхнул раздавшийся за окном гром',
  'На щелчок бойка никто не обратил внимание из-за пропавшей со стола сосиски',
  'Бармен наливает вискаря',
  'Огонь настольной лампы порождает завораживающие узоры на потолке',
]

const winLines = [
  'аккуратное отверстие в стене',
  'разбитую бутылку рома в баре',
  'лишь густой белый дым',
  'картину маслом "майские тюльпаны" на потолке',
  // 'желтое пятно на персидском ковре испугавшегося кота',
  'стремительно проникающий в комнату холод через пробитое окно',
  'погрузившееся в темноту от разбитой керосинки помещение',
  'в прошлом все его надежды и мечты',
  'одинокой его любимую собаку',
  'друга без друга',
  'его любимую с другим мужчиной',
]

const makeFreshStats = () => ({
  lastShooter: null,
  wasShot: false,
  lastShoot: null,
  lastShootReason: null,
})

const rollTheBarrel = async ({
  args = '',
  sender,
  reply,
  chat,
  chatUsers,
  me,
  userById,
  muteFor,
}) => {
  let stats = roulettesByChat.get(chat) || makeFreshStats()

  const currentShotTime = Date.now()

  if (stats.wasShot) {
    const cooldownDifference =
      stats.lastShoot - (currentShotTime - rouletteCooldown)

    if (cooldownDifference > 0) {
      await reply(
        `Дым еще не выветрился... Подожди ${getMinutesString(
          cooldownDifference
        )} мин.`
      )

      return
    }

    stats = makeFreshStats()
  } else if (
    stats.lastShoot &&
    stats.lastShoot - (currentShotTime - rouletteReset) < 0
  ) {
    stats = makeFreshStats()
  }

  const { lastShooter, lastShootReason } = stats

  const repeatDifference =
    stats.lastShoot - (currentShotTime - selfRollCooldown)

  if (lastShooter === sender && repeatDifference > 0) {
    await reply('Ты уже испытал удачу. Придется потерпеть.')

    return
  }

  const lotteryWin = rdrand8(6, 1) > 5

  roulettesByChat.set(chat, {
    lastShooter: sender,
    wasShot: lotteryWin,
    lastShoot: currentShotTime,
    lastShootReason: lotteryWin
      ? lastShootReason
      : args.split('\n')[0].trim() || lastShootReason,
  })

  if (lotteryWin) {
    const groupUsers = await chatUsers()
    const meAdmin = groupUsers[me().id]
    const rollerIsAdmin = groupUsers[sender]

    const rollerName = simpleUserName(await userById(sender))

    const winLine = winLines[Math.round(rdrand8(winLines.length - 1))]

    let muteStr = ''

    const reason = [
      'Громкий выстрел прервал жизнь',
      ` ${rollerName}, оставив `,
      winLine,
      '. ',
      lastShootReason
        ? ['Последней его мыслью было: ', lastShootReason, '.'].join('"')
        : 'Жил без чести, но ушел с честью.',
    ].join('')

    if (meAdmin) {
      if (rollerIsAdmin) {
        muteStr = '(Пистолет был хлопушкой из фикспрайса. С Днем Рождения!)'
      } else {
        const fatality = rdrand8(24, 1) > 23

        const muteForMinutes = fatality ? mutedFatalMinutes : mutedMinutes

        muteStr = [
          '(',
          `Мьют ${rollerName} на ${muteForMinutes} минут`,
          fatality ? '. Покойся с миром, друг' : '',
          ')',
        ]
          .filter(Boolean)
          .join('')

        try {
          await muteFor(sender, muteForMinutes)
        } catch (e) {
          console.log(e)
          muteStr = `(Мьют не удался)`
        }
      }
    }

    await reply([reason, muteStr].filter(Boolean).join('\n'))
  } else {
    const missLineIdx = Math.round(rdrand8(missLines.length - 1))

    await reply(
      [missLines[missLineIdx], 'Передай следующему или подожди 10 сек.'].join(
        '... '
      )
    )
  }
}

export default {
  title: 'Русская рулетка',
  scope: 'public',
  acl: 'base',
  check: (acl) => acl.base === true,
  ролл: {
    description:
      'Крутите барабан, господа! Можно указать мысль следующего игрока.',
    action: rollTheBarrel,
  },
}
