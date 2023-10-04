import { getRandomValues } from 'crypto'

const rdrand8 = (max = 1, min = 0) => {
  const result = getRandomValues(new Uint8Array(1))[0]

  return min + (result * (max - min)) / 255
}

const testFn = async (ctx) => {
  await ctx.reply('Две полоски!')
}

const diceFn = async (ctx) => {
  const count = Number(ctx.args)

  if (count === NaN || count < 1 || count > 6) {
    await ctx.reply('Введи количество, от 1 до 6')

    return
  }

  const results = []

  for (let i = 0; i < count; i++) {
    results.push(Math.round(rdrand8(6, 1)))
  }

  const diceLine = results.join(' + ')
  const sumLine = results.reduce((a, b) => a + b, 0)

  await ctx.reply(
    [diceLine, ...(results.length > 1 ? ['-------', sumLine] : [])].join('\n')
  )
}

export default {
  title: 'Пинг',
  acl: 'base',
  check: (acl) => acl.base === true,
  тест: {
    description: 'Проверка на работоспособность',
    action: testFn,
  },
  дайс: {
    description: 'Дайс для тех, кому лень его искать',
    action: diceFn,
  },
}
