import axios from 'axios'
import * as CSS from 'css-select'
import * as DOM from 'domutils'
import { parseDOM } from 'htmlparser2'

const getGiPromos = async () => {
  const page = await axios.get(
    'https://genshin-impact.fandom.com/wiki/Promotional_Code'
  )

  const dom = parseDOM(page.data)

  const rows = CSS.selectAll(
    '.wikitable tbody tr:has(> td:last-child[style*="153,255,153"])',
    dom
  )

  const filteredData = rows
    .map((row) =>
      [
        CSS.selectOne('td:first-child code', row),
        CSS.selectOne('td:nth-child(3)', row),
      ].map((col) => col && DOM.getText(col))
    )
    .filter((record) => record[0])

  return filteredData.map((record) => [
    record[0],
    record[1]
      .split('\n')
      .map((substr) => substr.trim())
      .filter(Boolean)
      .join('; '),
  ])
}

const getTofPromos = async () => {
  const page = await axios.get(
    'https://toweroffantasy.fandom.com/wiki/Promotional_Codes'
  )

  const dom = parseDOM(page.data)

  const rows = CSS.selectAll('.mw-parser-output .article-table tbody tr', dom)

  const filteredData = rows
    .map((row) =>
      [
        CSS.selectOne('td:first-child', row),
        CSS.selectOne('td:nth-child(2)', row),
        CSS.selectOne('td:last-child', row),
      ].map((col) => col && DOM.getText(col))
    )
    .filter((record) => record[0] && record[2] && record[2].includes('- ?'))

  return filteredData
    .map((record) => [
      record[0],
      record[1]
        .split('\n')
        .map((substr) => substr.trim())
        .join('; '),
    ])
    .reverse()
}

const getHiPromos = async () => {
  const page = await axios.get(
    'https://honkaiimpact3.fandom.com/wiki/Exchange_Rewards'
  )

  const dom = parseDOM(page.data)

  const rows = CSS.selectAll('.mw-parser-output .wikitable tbody tr', dom)

  const filteredData = rows
    .map((row) =>
      [
        CSS.selectOne('td:first-child', row),
        CSS.selectOne('td:last-child', row),
      ].map((col) => col && DOM.getText(col))
    )
    .filter((record) => record[0] && record[1] && record[1].includes('No'))

  return filteredData.map((record) => [record[0]])
}

const genPromoBlock = (header, list) => {
  const line = list
    ? list.length > 0
      ? list.map((line) => [line[0], line[1] || 'n/a'].join(': ')).join('\n')
      : 'HUIZASCHEKOI'
    : 'Всё сломалось!'

  return [header, line].join(':\n')
}

const getPromos = async ({ reply }) => {
  const giPromos = await getGiPromos().catch((e) => null)
  const tofPromos = await getTofPromos().catch((e) => null)

  const hiPromos = await getHiPromos().catch((e) => null)

  const giLine = genPromoBlock('Геншин', giPromos)

  const hiLine = genPromoBlock('Хонкай', hiPromos)

  const tofLine = genPromoBlock('ТоФ', tofPromos)

  await reply([giLine, hiLine, tofLine].join('\n---\n'))
}

export default {
  title: 'Промокоды',
  scope: 'public',
  acl: 'base',
  check: (acl) => acl.base === true,
  промки: {
    description: 'Активные промки для Генша/Хонки/Башни.',
    action: getPromos,
  },
}
