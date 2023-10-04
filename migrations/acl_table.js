export const up = function (knex) {
  return knex.schema.createTable('acl', function (table) {
    table.increments('id').primary().unique()
    table.bigint('chat').unique().default(null)
    table.bigint('person').unique().default(null)
    table.boolean('base').default(false)
  })
}

export const down = function (knex) {
  return knex.schema.dropTable('acl')
}
