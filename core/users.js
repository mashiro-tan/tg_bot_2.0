import { Api } from 'telegram'

const userList = new Map()
const chatUsersList = new Map()
const userSelf = {}

const getMapPtrForPeer = (peerId) => {
  const chatType = peerId.className

  const { userId, channelId, chatId, groupId } = peerId

  const head = chatType.toLowerCase().replace(/^peer/, '')

  const conferenceId =
    head === 'user'
      ? userId
      : head === 'channel'
      ? channelId
      : head === 'chat'
      ? chatId
      : groupId || userId || channelId || chatId || null

  return [head, conferenceId].join(':')
}

const userParser = (user) => {
  const bot = user.bot
  const id = BigInt(user.id)
  const username = user.username || null
  const fullname =
    [user.firstName, user.lastName].filter((x) => x !== null).join(' ') || null

  return { bot, id, username, fullname }
}

const usernameCollector = async (client, peerId) => {
  const result = await client.getParticipants(peerId)

  const chatUsers = result.map((user) => {
    const userType = user.participant?.className

    const { bot, id, username, fullname } = userParser(user)

    const isChatAdmin = userType ? !/Participant$/.test(userType) : null

    userList.set(id, { username, fullname, bot })

    return { [id]: isChatAdmin }
  })

  const peerPtr = getMapPtrForPeer(peerId)

  if (!/^user:/.test(peerPtr)) {
    const lastUpdated = Date.now()

    chatUsersList.set(peerPtr, {
      updated: lastUpdated,
      ...Object.assign({}, { [userSelf.id]: false }, ...chatUsers),
    })
  }
}

const getBannedUsersList = async (client, peerId) => {
  const result = await client.getParticipants(peerId)
}

const resolver = (client, peer) => {
  const userById = async (rawId) => {
    const id = BigInt(rawId)

    const preUser = userList.get(id)

    if (!preUser) {
      await usernameCollector(client, peer)
    }

    return preUser || userList.get(id)
  }

  const chatUsers = async () => {
    const peerPtr = getMapPtrForPeer(peer)

    if (/^user:/.test(peerPtr)) {
      return null
    }

    const result = chatUsersList.get(peerPtr)

    if (result && result.updated > Date.now() - 1000 * 60 * 3) {
      const { updated, ...data } = result

      return data
    }

    await usernameCollector(client, peer)

    const fresh = chatUsersList.get(peerPtr)

    const { updated, ...data } = fresh || {}

    return data || null
  }

  const parseMention = (mention) => {
    const [entity, text] = mention

    if (entity.userId) {
      return [BigInt(entity.userId), text]
    }

    return [null, text.replace(/^@/, '')]
  }

  const resolveFromMention = async (mention, peerImportant = false) => {
    const [id, username] = mention

    if (peerImportant) {
      const userData = await client.invoke(
        new Api.channels.GetParticipant({
          channel: peer,
          participant: id || username,
        })
      )

      const { participant, users } = userData || {}

      if (!participant || !users || !users.length) {
        return null
      }

      const participantId = participant?.userId || participant?.peer?.userId
      const muted = participant?.bannedRights?.sendMessages === true

      const user =
        participantId &&
        users
          .map((person) => userParser(person))
          .find((record) => record.id === BigInt(participantId))

      return user ? { ...user, muted } : null
    }

    if (id !== null) {
      const data = await userById(id)

      if (data) {
        return { id: BigInt(id), ...data }
      }

      return null
    }

    const user = [...userList.entries()].find(
      ([id, data]) => data.username === username
    )

    if (user) {
      return { id: BigInt(user[0]), ...user[1] }
    }

    await usernameCollector(client, peer)

    const fresh = [...userList.entries()].find(
      ([id, data]) => data.username === username
    )

    return fresh ? { id: BigInt(fresh[0]), ...fresh[1] } : null
  }

  return {
    parseMention,
    resolveFromMention,
    chatUsers,
    userById,
  }
}

const setSelfUser = (user) => {
  const { bot, id, username, fullname } = userParser(user)

  userList.set(id, { username, fullname, bot })

  userSelf['bot'] = bot
  userSelf['id'] = id
  userSelf['username'] = username
  userSelf['fullname'] = fullname
}

const getSelfUser = () => {
  return userSelf
}

const simpleUserName = (user) => {
  return (
    (user &&
      ((user.fullname && user.fullname.replace(/\s+/g, ' ').trim()) ||
        (user.username && user.username.trim()))) ||
    '[ДАННЫЕ УДАЛЕНЫ]'
  )
}

export { getMapPtrForPeer, getSelfUser, resolver, setSelfUser, simpleUserName }
