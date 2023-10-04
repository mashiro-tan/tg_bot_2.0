import knex from '../knexInstance.js'

export const getSecret = async () => {
  const result = await knex('settings')
    .select('value')
    .where({ key: 'secret' })
    .first()

  if (result) {
    return result.value
  }

  return undefined
}

export const setSecret = async (value) => {
  await knex('settings')
    .insert({ key: 'secret', value })
    .onConflict('key')
    .merge()
}

export const getAdmin = async () => {
  const result = await knex('settings')
    .select('value')
    .where({ key: 'admin' })
    .first()

  if (result) {
    return result.value
  }

  return undefined
}

export const setAdmin = async (value) => {
  await knex('settings')
    .insert({ key: 'admin', value })
    .onConflict('key')
    .merge()
}

export const getConferenceFeatures = async (conferenceId) => {
  const result = await knex('acl')
    .select('*')
    .where({ chat: conferenceId })
    .first()

  return result
}

export const setConferenceBaseFeatures = async (conferenceId, base) => {
  await knex('acl')
    .insert({ chat: conferenceId, base })
    .onConflict('chat')
    .merge()
}

export const getDuelants = async (participants) => {
  const result = await knex('duels')
    .select('*')
    .whereIn(
      'person',
      participants.map((p) => String(p))
    )

  return result
    ? result.map((record) => ({ ...record, person: BigInt(record.person) }))
    : []
}

export const getDuelant = async (participant) => {
  const result = await knex('duels')
    .select('*')
    .where({ person: String(participant) })
    .first()

  return result && { ...result, person: BigInt(result.person) }
}

export const addDuelant = async (userId) => {
  await knex('duels').insert({
    person: String(userId),
    wins: 0,
    loses: 0,
    last_duel: null,
  })
}

export const finishDuel = async ({ winner, loser }) => {
  const dbState = await getDuelants([winner, loser])

  if (!dbState.find((record) => record.person === winner)) {
    await addDuelant(winner)
  }

  if (!dbState.find((record) => record.person === loser)) {
    await addDuelant(loser)
  }

  const duelFinishedOn = Date.now()

  await knex('duels')
    .update({ last_duel: duelFinishedOn })
    .increment('loses', 1)
    .where({ person: String(loser) })

  const finalStats = await knex('duels')
    .update({ last_duel: duelFinishedOn })
    .increment('wins', 1)
    .where({ person: String(winner) })
    .returning(['wins', 'loses'])

  return finalStats[0]
}

export const getDuelStats = async (participants) => {
  const users = participants.map((p) => String(p))
  const stats = await knex('duels')
    .select(['*', knex.raw('(cast(wins as float) / (wins + loses)) as rate')])
    .whereIn('person', users)

  return stats.map((record) => ({ ...record, person: BigInt(record.person) }))
}

export const changeKarma = async ({
  from,
  to,
  isDecrease,
  reason,
  chat,
  senderName,
}) => {
  await knex('karma').insert({
    person: String(to),
    peer: chat,
    from: String(from),
    value: isDecrease ? -1 : 1,
    reason: reason ? reason.slice(0, 64) : null,
    changed: Date.now(),
    name_from: senderName ? senderName.slice(0, 24) : null,
  })
}

export const getKarmaStats = async (userId, chat, chatUsers) => {
  const overall = await knex('karma')
    .sum('value as value')
    .where({ person: String(userId) })
    .first()

  const fullCount = overall && overall.value

  hurrdurr = 1

  console.log(fullCount)

  if (typeof fullCount !== 'number') {
    return null
  }

  const chatOverall = await knex('karma')
    .sum('value as value')
    .as('sum')
    .where({ person: String(userId), peer: chat })
    .first()

  console.log(chatOverall)

  const bestFriend = await knex
    .select('*')
    .count('* as count')
    .from(knex('karma').select('*').orderBy('changed', 'desc'))
    .where({ person: String(userId), peer: chat, value: 1 })
    .groupBy('from')
    .orderBy('count', 'desc')

  console.log(bestFriend)

  console.log(
    knex
      .select('*')
      .count('* as count')
      .from(knex('karma').select('*').orderBy('changed', 'desc'))
      .where({ person: String(userId), peer: chat, value: 1 })
      .groupBy('from')
      .orderBy('count', 'desc')
      .toSQL()
  )

  const mostHater = await knex('karma')
    .select('*')
    .count('*')
    .where({ person: String(userId), peer: chat, value: -1 })
    .groupBy('from')
    .orderBy('COUNT(*)', 'desc')
    .orderBy('timestamp', 'desc')
}
