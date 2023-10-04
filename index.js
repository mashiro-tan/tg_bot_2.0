import os from 'os'

import input from 'input'
import { Api, TelegramClient } from 'telegram'
import { NewMessage } from 'telegram/events/index.js'
import { StringSession } from 'telegram/sessions/index.js'

import cmdHandler from './core/cmdHandler.js'
import { getSecret, setSecret } from './core/db.js'
import { setSelfUser, getSelfUser } from './core/users.js'

const apiId = process.env.TG_API_ID
const apiHash = process.env.TG_API_HASH

const sleepFor = async (seconds) => {
  const promise = new Promise((resolve) => {
    setTimeout(() => resolve(), seconds * 1000)
  })

  await promise
}

const keepOnline = async (client) => {
  const times = {
    online: {
      min: 5,
      max: 30,
    },
    offline: {
      min: 15,
      max: 30,
    },
  }

  let isOffline = false

  const setOnline = async (enabled) => {
    try {
      await client.invoke(
        new Api.account.UpdateStatus({
          offline: !enabled,
        })
      )
    } catch (e) {
      console.log(e)
    }
  }

  while (1) {
    await setOnline(!isOffline)
    const time = isOffline ? times.online : times.offline
    await sleepFor(time.min + Math.round(Math.random() * (time.max - time.min)))
    isOffline = !isOffline
  }
}

const runTask = async () => {
  const secret = (await getSecret()) ?? ''

  const client = new TelegramClient(new StringSession(secret), apiId, apiHash, {
    deviceModel: `Mirai@${os.hostname()}`,
    systemVersion: os.version() || 'Unknown',
    appVersion: '0.0.1',
    useWSS: true,
    testServers: false,
    connectionRetries: 5,
  })

  await client.start({
    phoneNumber: async () => await input.text('Please enter your number: '),
    password: async () => await input.text('Please enter your password: '),
    phoneCode: async () =>
      await input.text('Please enter the code you received: '),

    onError: (err) => console.log('booom', err),
  })

  await setSecret(client.session.save())

  const result = await client.invoke(
    new Api.users.GetFullUser({
      id: 'me',
    })
  )

  setSelfUser(result.users[0])

  console.log('Logged in as', getSelfUser().fullname)

  keepOnline(client).catch((e) => console.log(e))

  client.addEventHandler(cmdHandler(client), new NewMessage({}))

  client.addEventHandler((update) => {
    // console.log('Received new Update')
    // console.log(update)
  })
}

runTask()
