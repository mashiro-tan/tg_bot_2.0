export const up = function (knex) {
  return knex.schema.createTable('karma', function (table) {
    table.increments('id').primary().unique().notNull()
    table.string('peer', 32).notNull()
    table.bigint('person').notNull()
    table.bigint('from').notNull()
    table.string('name_from', 24).default(null)
    table.tinyint('value').default(0).notNull()
    table.string('reason', 64).default(null)
    table.timestamp('changed').default(null)
  })
}

export const down = function (knex) {
  return knex.schema.dropTable('karma')
}
