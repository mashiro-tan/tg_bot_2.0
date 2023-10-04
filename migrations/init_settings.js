export const up = function (knex) {
  return knex.schema.createTable('settings', function (table) {
    table.increments('id').primary().unique()
    table.string('key', 255).notNullable().unique()
    table.string('value', 4096)
  })
}

export const down = function (knex) {
  return knex.schema.dropTable('settings')
}
