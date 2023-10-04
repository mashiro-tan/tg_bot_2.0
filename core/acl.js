import * as db from './db.js'

const tempAdmins = new Map()

export const isAdmin = async (ctx) => {
  if (tempAdmins.get(ctx.sender) === true) {
    return true
  }

  const admin = await db.getAdmin()

  return ctx.sender === BigInt(admin)
}

export const getConferenceFeatures = async (ctx) => {
  if (ctx.inPrivate || !ctx.chat) {
    return undefined
  }

  const result = await db.getConferenceFeatures(ctx.chat)

  return result
    ? {
        ...result,
        base: Boolean(result.base),
      }
    : undefined
}

export const setConferenceFeatures = async (ctx, config) => {
  const { base } = config

  if (!ctx.inPrivate && ctx.chat && typeof base === 'boolean') {
    await db.setConferenceBaseFeatures(ctx.chat, base)

    return true
  }

  return false
}

export const lendAdmin = (userId) => {
  tempAdmins.set(userId, true)
}

export const revokeAdmin = (userId) => {
  tempAdmins.delete(userId)
}
