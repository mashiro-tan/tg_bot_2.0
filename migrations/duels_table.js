export const up = function (knex) {
  return knex.schema.createTable('duels', function (table) {
    table.bigint('person').primary().unique().notNull()
    table.smallint('loses').unsigned().default(0).notNull()
    table.smallint('wins').unsigned().default(0).notNull()
    table.timestamp('last_duel').default(null)
  })
}

export const down = function (knex) {
  return knex.schema.dropTable('duels')
}
